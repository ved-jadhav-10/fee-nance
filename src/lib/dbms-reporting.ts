import { Group } from "@/models/Group";
import { Settlement } from "@/models/Settlement";
import { Transaction } from "@/models/Transaction";
import { User } from "@/models/User";

function currentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export interface GroupMembershipRow {
  groupId: string;
  groupName: string;
  inviteCode: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  role: "owner" | "member";
  joinedAt: string;
}

export interface AboveAverageSpenderRow {
  userId: string;
  userName: string;
  totalExpense: number;
  averageExpense: number;
}

export interface CategoryExpenseHavingRow {
  userId: string;
  userName: string;
  categoryId: string;
  categoryName: string;
  totalExpense: number;
}

export interface SettlementHavingRow {
  groupId: string;
  groupName: string;
  settlementTotal: number;
}

export async function getJoinLikeGroupMembershipRows(): Promise<GroupMembershipRow[]> {
  const rows = await Group.aggregate([
    { $unwind: "$members" },
    {
      $lookup: {
        from: "users",
        localField: "members.userId",
        foreignField: "_id",
        as: "memberUser",
      },
    },
    { $unwind: "$memberUser" },
    {
      $project: {
        _id: 0,
        groupId: { $toString: "$_id" },
        groupName: "$name",
        inviteCode: "$inviteCode",
        memberId: { $toString: "$memberUser._id" },
        memberName: "$memberUser.name",
        memberEmail: "$memberUser.email",
        role: "$members.role",
        joinedAt: "$members.joinedAt",
      },
    },
    { $sort: { groupName: 1, joinedAt: 1 } },
  ]);

  return rows.map((row) => ({
    ...row,
    joinedAt: new Date(row.joinedAt).toISOString(),
  })) as GroupMembershipRow[];
}

export async function getAboveAverageSpendersInCurrentMonth(): Promise<AboveAverageSpenderRow[]> {
  const { start, end } = currentMonthRange();

  const aggregateRows = await Transaction.aggregate([
    {
      $match: {
        type: "expense",
        transactionDate: {
          $gte: start,
          $lte: end,
        },
      },
    },
    {
      $group: {
        _id: "$userId",
        totalExpense: { $sum: "$amount" },
      },
    },
    {
      $group: {
        _id: null,
        averageExpense: { $avg: "$totalExpense" },
        userRows: {
          $push: {
            userId: "$_id",
            totalExpense: "$totalExpense",
          },
        },
      },
    },
    { $unwind: "$userRows" },
    {
      $match: {
        $expr: {
          $gt: ["$userRows.totalExpense", "$averageExpense"],
        },
      },
    },
    {
      $project: {
        _id: 0,
        userId: { $toString: "$userRows.userId" },
        totalExpense: "$userRows.totalExpense",
        averageExpense: "$averageExpense",
      },
    },
    { $sort: { totalExpense: -1 } },
  ]);

  if (!aggregateRows.length) {
    return [];
  }

  const userIds = aggregateRows.map((row) => row.userId);
  const users = await User.find({ _id: { $in: userIds } }).select("_id name").lean();
  const nameById = new Map(users.map((user) => [user._id.toString(), user.name]));

  return aggregateRows.map((row) => ({
    userId: row.userId,
    userName: nameById.get(row.userId) ?? "Unknown",
    totalExpense: row.totalExpense,
    averageExpense: row.averageExpense,
  }));
}

export async function getCategoryExpenseHavingRows(
  minExpense = 5000,
): Promise<CategoryExpenseHavingRow[]> {
  const { start, end } = currentMonthRange();

  const rows = await Transaction.aggregate([
    {
      $match: {
        type: "expense",
        transactionDate: {
          $gte: start,
          $lte: end,
        },
      },
    },
    {
      $group: {
        _id: {
          userId: "$userId",
          categoryId: "$categoryId",
        },
        totalExpense: { $sum: "$amount" },
      },
    },
    {
      $match: {
        totalExpense: { $gte: minExpense },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id.userId",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $lookup: {
        from: "categories",
        localField: "_id.categoryId",
        foreignField: "_id",
        as: "category",
      },
    },
    {
      $project: {
        _id: 0,
        userId: { $toString: "$_id.userId" },
        userName: { $ifNull: [{ $arrayElemAt: ["$user.name", 0] }, "Unknown"] },
        categoryId: {
          $cond: {
            if: { $ifNull: ["$_id.categoryId", false] },
            then: { $toString: "$_id.categoryId" },
            else: "uncategorized",
          },
        },
        categoryName: { $ifNull: [{ $arrayElemAt: ["$category.name", 0] }, "Uncategorized"] },
        totalExpense: "$totalExpense",
      },
    },
    { $sort: { totalExpense: -1 } },
  ]);

  return rows as CategoryExpenseHavingRow[];
}

export async function getSettlementHavingRows(
  minSettlementTotal = 500,
): Promise<SettlementHavingRow[]> {
  const rows = await Settlement.aggregate([
    {
      $group: {
        _id: "$groupId",
        settlementTotal: { $sum: "$amount" },
      },
    },
    {
      $match: {
        settlementTotal: { $gt: minSettlementTotal },
      },
    },
    {
      $lookup: {
        from: "groups",
        localField: "_id",
        foreignField: "_id",
        as: "group",
      },
    },
    {
      $project: {
        _id: 0,
        groupId: { $toString: "$_id" },
        groupName: { $ifNull: [{ $arrayElemAt: ["$group.name", 0] }, "Unknown Group"] },
        settlementTotal: "$settlementTotal",
      },
    },
    { $sort: { settlementTotal: -1 } },
  ]);

  return rows as SettlementHavingRow[];
}
