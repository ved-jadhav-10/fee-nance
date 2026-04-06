import { requireUserId } from "@/lib/api-auth";
import { connectToDatabase } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { toObjectId } from "@/lib/object-id";
import { logger } from "@/lib/logger";
import { Transaction } from "@/models/Transaction";

function getNextDate(date: Date, frequency: "monthly" | "yearly") {
  const next = new Date(date);

  if (frequency === "monthly") {
    next.setMonth(next.getMonth() + 1);
    return next;
  }

  next.setFullYear(next.getFullYear() + 1);
  return next;
}

export async function POST() {
  try {
    const userId = await requireUserId();
    await connectToDatabase();

    const now = new Date();
    const userObjectId = toObjectId(userId);

    const recurringTransactions = await Transaction.find({
      userId: userObjectId,
      "recurring.enabled": true,
      "recurring.nextRunAt": { $lte: now },
      "recurring.frequency": { $in: ["monthly", "yearly"] },
    });

    const generated: Array<{ sourceId: string; newTransactionId: string }> = [];

    for (const source of recurringTransactions) {
      const frequency = source.recurring.frequency as "monthly" | "yearly";
      const runAt = source.recurring.nextRunAt ?? now;

      const clone = await Transaction.create({
        userId: source.userId,
        type: source.type,
        title: source.title,
        notes: source.notes,
        amount: source.amount,
        currency: source.currency,
        categoryId: source.categoryId,
        transactionDate: runAt,
        recurring: {
          enabled: false,
        },
      });

      source.recurring.nextRunAt = getNextDate(runAt, frequency);
      await source.save();

      generated.push({
        sourceId: source._id.toString(),
        newTransactionId: clone._id.toString(),
      });
    }

    return Response.json({
      generatedCount: generated.length,
      generated,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("Unauthorized", 401);
    }

    logger.error("Unhandled API route error", error);
    return jsonError("Failed to generate recurring transactions", 500);
  }
}
