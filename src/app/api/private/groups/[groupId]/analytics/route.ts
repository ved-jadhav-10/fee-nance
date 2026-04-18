/**
 * GET /api/private/groups/[groupId]/analytics
 *
 * Deep analytics for a single group:
 *   - spendByMember     — total paid and owed per member
 *   - spendByMonth      — monthly expense timeline with per-member breakdown
 *   - topExpenses       — top 10 largest individual expenses
 *   - splitTypeBreakdown — how much was split equally vs custom vs percentage
 *   - settlementFlow    — pairwise settled amounts (for Sankey)
 *   - memberNetPositions — final net for each member after settlements
 */

import { requireUserId } from "@/lib/api-auth";
import { connectToDatabase } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { roundCurrency } from "@/lib/money";
import { toObjectId } from "@/lib/object-id";
import { logger } from "@/lib/logger";
import { Group } from "@/models/Group";
import { GroupExpense } from "@/models/GroupExpense";
import { Settlement } from "@/models/Settlement";
import { User } from "@/models/User";
import { NextResponse } from "next/server";
import { Types } from "mongoose";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  try {
    const userId = await requireUserId();
    const { groupId } = await params;

    await connectToDatabase();

    const group = await Group.findById(toObjectId(groupId))
      .select("_id name members")
      .lean();

    if (!group) return jsonError("Group not found", 404);

    const memberIds: string[] = (group.members as Array<{ userId: Types.ObjectId }>).map(
      (m) => m.userId.toString(),
    );

    if (!memberIds.includes(userId)) return jsonError("Forbidden", 403);

    const groupOid = toObjectId(groupId);

    const [expenses, settlements, users] = await Promise.all([
      GroupExpense.find({ groupId: groupOid })
        .select("title amount splitType paidBy splits incurredAt createdBy")
        .sort({ incurredAt: 1 })
        .lean(),
      Settlement.find({ groupId: groupOid })
        .select("fromUserId toUserId amount settledAt")
        .lean(),
      User.find({ _id: { $in: memberIds.map(toObjectId) } })
        .select("_id name")
        .lean(),
    ]);

    const nameMap = new Map<string, string>(
      users.map((u) => [(u._id as Types.ObjectId).toString(), u.name as string]),
    );
    const memberName = (id: string) => nameMap.get(id) ?? id.slice(-4);

    // ── 1. Spend by member (paid vs owed) ──────────────────────────────────
    const memberStats = new Map<string, { paid: number; owed: number }>(
      memberIds.map((id) => [id, { paid: 0, owed: 0 }]),
    );
    for (const expense of expenses) {
      for (const p of expense.paidBy) {
        const id = p.userId.toString();
        const entry = memberStats.get(id) ?? { paid: 0, owed: 0 };
        entry.paid += p.amount;
        memberStats.set(id, entry);
      }
      for (const s of expense.splits) {
        const id = s.userId.toString();
        const entry = memberStats.get(id) ?? { paid: 0, owed: 0 };
        entry.owed += s.shareAmount;
        memberStats.set(id, entry);
      }
    }

    const spendByMember = memberIds.map((id) => {
      const s = memberStats.get(id)!;
      return {
        memberId: id,
        name: memberName(id),
        paid: roundCurrency(s.paid),
        owed: roundCurrency(s.owed),
        net: roundCurrency(s.paid - s.owed),
      };
    });

    // ── 2. Monthly timeline ────────────────────────────────────────────────
    type MonthKey = string; // "YYYY-MM"
    const monthlyMap = new Map<MonthKey, { total: number; byMember: Map<string, number> }>();

    for (const expense of expenses) {
      const d = new Date(expense.incurredAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, { total: 0, byMember: new Map() });
      }
      const bucket = monthlyMap.get(key)!;
      bucket.total += expense.amount;

      // Credit the payers in the timeline (who actually spent)
      for (const p of expense.paidBy) {
        const mid = p.userId.toString();
        bucket.byMember.set(mid, (bucket.byMember.get(mid) ?? 0) + p.amount);
      }
    }

    const spendByMonth = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, bucket]) => ({
        month,
        total: roundCurrency(bucket.total),
        byMember: memberIds.map((id) => ({
          memberId: id,
          name: memberName(id),
          amount: roundCurrency(bucket.byMember.get(id) ?? 0),
        })),
      }));

    // ── 3. Top 10 expenses ─────────────────────────────────────────────────
    const topExpenses = [...expenses]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)
      .map((e) => ({
        title: e.title as string,
        amount: e.amount,
        splitType: e.splitType as string,
        date: new Date(e.incurredAt).toISOString().slice(0, 10),
        paidBy: (e.paidBy as Array<{ userId: Types.ObjectId; amount: number }>).map((p) => ({
          name: memberName(p.userId.toString()),
          amount: p.amount,
        })),
      }));

    // ── 4. Split type breakdown ────────────────────────────────────────────
    const splitTotals: Record<string, number> = {};
    for (const expense of expenses) {
      splitTotals[expense.splitType] = (splitTotals[expense.splitType] ?? 0) + expense.amount;
    }
    const splitTypeBreakdown = Object.entries(splitTotals).map(([type, amount]) => ({
      type,
      amount: roundCurrency(amount),
    }));

    // ── 5. Settlement flow (for Sankey) ────────────────────────────────────
    type PairKey = string;
    const settlementMap = new Map<PairKey, number>();
    for (const s of settlements) {
      const from = s.fromUserId.toString();
      const to = s.toUserId.toString();
      const key: PairKey = `${from}→${to}`;
      settlementMap.set(key, roundCurrency((settlementMap.get(key) ?? 0) + s.amount));
    }
    const settlementFlow = Array.from(settlementMap.entries()).map(([key, amount]) => {
      const [from, to] = key.split("→");
      return { fromId: from, fromName: memberName(from), toId: to, toName: memberName(to), amount };
    });

    // ── 6. Member net positions ─────────────────────────────────────────────
    const netMap = new Map<string, number>(
      memberIds.map((id) => [id, (memberStats.get(id)!.paid - memberStats.get(id)!.owed)]),
    );
    for (const s of settlements) {
      const from = s.fromUserId.toString();
      const to = s.toUserId.toString();
      netMap.set(from, roundCurrency((netMap.get(from) ?? 0) + s.amount));
      netMap.set(to, roundCurrency((netMap.get(to) ?? 0) - s.amount));
    }
    const memberNetPositions = memberIds.map((id) => ({
      memberId: id,
      name: memberName(id),
      net: roundCurrency(netMap.get(id) ?? 0),
    }));

    // ── 7. Per-member share of total spend (for donut) ─────────────────────
    const totalGroupSpend = expenses.reduce((sum, e) => sum + e.amount, 0);
    const memberShareOfSpend = spendByMember.map((m) => ({
      memberId: m.memberId,
      name: m.name,
      amount: m.owed,
      percentage: totalGroupSpend > 0 ? (m.owed / totalGroupSpend) * 100 : 0,
    }));

    return NextResponse.json({
      groupName: group.name,
      memberCount: memberIds.length,
      totalGroupSpend: roundCurrency(totalGroupSpend),
      spendByMember,
      spendByMonth,
      topExpenses,
      splitTypeBreakdown,
      settlementFlow,
      memberNetPositions,
      memberShareOfSpend,
    });
  } catch (error) {
    logger.error("Group detail analytics error", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("Unauthorized", 401);
    }
    return jsonError("Internal Server Error", 500);
  }
}
