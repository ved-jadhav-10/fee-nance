import { z } from "zod";
import { requireUserId } from "@/lib/api-auth";
import { connectToDatabase } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { toObjectId } from "@/lib/object-id";
import { Budget } from "@/models/Budget";

const updateBudgetSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  amount: z.number().positive().optional(),
  cycle: z.enum(["monthly", "quarterly", "yearly"]).optional(),
  categoryId: z.string().nullable().optional(),
  periodStart: z.string().datetime().optional(),
  periodEnd: z.string().datetime().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ budgetId: string }> },
) {
  try {
    const userId = await requireUserId();
    const payload = updateBudgetSchema.parse(await request.json());
    const { budgetId } = await params;

    await connectToDatabase();

    const budget = await Budget.findOne({
      _id: toObjectId(budgetId),
      userId: toObjectId(userId),
    });

    if (!budget) {
      return jsonError("Budget not found", 404);
    }

    const periodStart = payload.periodStart ? new Date(payload.periodStart) : budget.periodStart;
    const periodEnd = payload.periodEnd ? new Date(payload.periodEnd) : budget.periodEnd;

    if (periodEnd <= periodStart) {
      return jsonError("Budget period end must be after period start", 422);
    }

    if (payload.name) {
      budget.name = payload.name;
    }
    if (payload.amount) {
      budget.amount = payload.amount;
    }
    if (payload.cycle) {
      budget.cycle = payload.cycle;
    }
    if (payload.categoryId !== undefined) {
      budget.categoryId = payload.categoryId ? toObjectId(payload.categoryId) : undefined;
    }

    budget.periodStart = periodStart;
    budget.periodEnd = periodEnd;

    await budget.save();

    return Response.json({ budget });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("Unauthorized", 401);
    }

    if (error instanceof z.ZodError) {
      return jsonError(error.issues[0]?.message ?? "Invalid budget update", 422);
    }

    if (error instanceof Error) {
      return jsonError(error.message, 422);
    }

    console.error(error);
    return jsonError("Failed to update budget", 500);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ budgetId: string }> },
) {
  try {
    const userId = await requireUserId();
    const { budgetId } = await params;

    await connectToDatabase();

    const deleted = await Budget.findOneAndDelete({
      _id: toObjectId(budgetId),
      userId: toObjectId(userId),
    });

    if (!deleted) {
      return jsonError("Budget not found", 404);
    }

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("Unauthorized", 401);
    }

    console.error(error);
    return jsonError("Failed to delete budget", 500);
  }
}
