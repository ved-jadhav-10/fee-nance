import { z } from "zod";
import { requireUserId } from "@/lib/api-auth";
import { connectToDatabase } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { toObjectId } from "@/lib/object-id";
import { Transaction } from "@/models/Transaction";

const updateTransactionSchema = z.object({
  type: z.enum(["income", "expense"]).optional(),
  title: z.string().trim().min(2).max(100).optional(),
  notes: z.string().trim().max(500).optional(),
  amount: z.number().positive().optional(),
  categoryId: z.string().nullable().optional(),
  transactionDate: z.string().datetime().optional(),
  recurring: z
    .object({
      enabled: z.boolean(),
      frequency: z.enum(["monthly", "yearly"]).optional(),
      nextRunAt: z.string().datetime().optional(),
    })
    .optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ transactionId: string }> },
) {
  try {
    const userId = await requireUserId();
    const payload = updateTransactionSchema.parse(await request.json());
    const { transactionId } = await params;

    await connectToDatabase();

    const transaction = await Transaction.findOne({
      _id: toObjectId(transactionId),
      userId: toObjectId(userId),
    });

    if (!transaction) {
      return jsonError("Transaction not found", 404);
    }

    if (payload.recurring?.enabled && !payload.recurring.frequency) {
      return jsonError("Recurring frequency is required", 422);
    }

    if (payload.type) {
      transaction.type = payload.type;
    }
    if (payload.title) {
      transaction.title = payload.title;
    }
    if (payload.notes !== undefined) {
      transaction.notes = payload.notes;
    }
    if (payload.amount) {
      transaction.amount = payload.amount;
    }
    if (payload.categoryId !== undefined) {
      transaction.categoryId = payload.categoryId ? toObjectId(payload.categoryId) : undefined;
    }
    if (payload.transactionDate) {
      transaction.transactionDate = new Date(payload.transactionDate);
    }
    if (payload.recurring) {
      transaction.recurring = {
        enabled: payload.recurring.enabled,
        frequency: payload.recurring.frequency,
        nextRunAt: payload.recurring.nextRunAt
          ? new Date(payload.recurring.nextRunAt)
          : undefined,
      };
    }

    await transaction.save();

    return Response.json({ transaction });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("Unauthorized", 401);
    }

    if (error instanceof z.ZodError) {
      return jsonError(error.issues[0]?.message ?? "Invalid transaction update", 422);
    }

    if (error instanceof Error) {
      return jsonError(error.message, 422);
    }

    console.error(error);
    return jsonError("Failed to update transaction", 500);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ transactionId: string }> },
) {
  try {
    const userId = await requireUserId();
    const { transactionId } = await params;

    await connectToDatabase();

    const deleted = await Transaction.findOneAndDelete({
      _id: toObjectId(transactionId),
      userId: toObjectId(userId),
    });

    if (!deleted) {
      return jsonError("Transaction not found", 404);
    }

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("Unauthorized", 401);
    }

    console.error(error);
    return jsonError("Failed to delete transaction", 500);
  }
}
