import { z } from "zod";
import { requireUserId } from "@/lib/api-auth";
import { resolveAccessibleCategoryId } from "@/lib/category-access";
import { connectToDatabase } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { toObjectId } from "@/lib/object-id";
import { logger } from "@/lib/logger";
import { Transaction } from "@/models/Transaction";

const transactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  title: z.string().trim().min(2).max(100),
  notes: z.string().trim().max(500).optional(),
  amount: z.number().positive(),
  categoryId: z.string().optional(),
  transactionDate: z.string().datetime(),
  recurring: z
    .object({
      enabled: z.boolean(),
      frequency: z.enum(["monthly", "yearly"]).optional(),
      nextRunAt: z.string().datetime().optional(),
    })
    .optional(),
});

const transactionQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  type: z.enum(["income", "expense"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  sortBy: z.enum(["transactionDate", "amount", "createdAt", "title"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

function getOptionalParam(value: string | null) {
  if (value === null || value.trim() === "") {
    return undefined;
  }

  return value;
}

export async function GET(request: Request) {
  try {
    const userId = await requireUserId();
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const queryParams = transactionQuerySchema.parse({
      startDate: getOptionalParam(searchParams.get("startDate")),
      endDate: getOptionalParam(searchParams.get("endDate")),
      type: getOptionalParam(searchParams.get("type")),
      page: getOptionalParam(searchParams.get("page")),
      limit: getOptionalParam(searchParams.get("limit")),
      sortBy: getOptionalParam(searchParams.get("sortBy")),
      sortOrder: getOptionalParam(searchParams.get("sortOrder")),
    });

    const startDate = queryParams.startDate ? new Date(queryParams.startDate) : undefined;
    const endDate = queryParams.endDate ? new Date(queryParams.endDate) : undefined;
    const type = queryParams.type;
    const shouldPaginate = queryParams.page !== undefined || queryParams.limit !== undefined;
    const page = queryParams.page ?? 1;
    const limit = queryParams.limit ?? 20;
    const sortField = queryParams.sortBy ?? "transactionDate";
    const sortDirection = queryParams.sortOrder === "asc" ? 1 : -1;

    const query: {
      userId: ReturnType<typeof toObjectId>;
      transactionDate?: { $gte?: Date; $lte?: Date };
      type?: "income" | "expense";
    } = {
      userId: toObjectId(userId),
    };

    if (startDate || endDate) {
      query.transactionDate = {};
      if (startDate) {
        query.transactionDate.$gte = startDate;
      }
      if (endDate) {
        query.transactionDate.$lte = endDate;
      }
    }

    if (type === "income" || type === "expense") {
      query.type = type;
    }

    const totalCountPromise = Transaction.countDocuments(query);

    const findQuery = Transaction.find(query).sort({ [sortField]: sortDirection });

    if (shouldPaginate) {
      findQuery.skip((page - 1) * limit).limit(limit);
    }

    const transactionsPromise = findQuery.lean();

    const summaryByTypePromise = Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" },
        },
      },
    ]);

    const [totalCount, transactions, summaryByType] = await Promise.all([
      totalCountPromise,
      transactionsPromise,
      summaryByTypePromise,
    ]);

    const summary = {
      totalIncome: summaryByType.find((entry) => entry._id === "income")?.total ?? 0,
      totalExpense: summaryByType.find((entry) => entry._id === "expense")?.total ?? 0,
    };

    return Response.json({
      transactions,
      summary: {
        ...summary,
        balance: summary.totalIncome - summary.totalExpense,
      },
      pagination: shouldPaginate
        ? {
            page,
            limit,
            totalCount,
            totalPages: Math.max(1, Math.ceil(totalCount / limit)),
            hasNextPage: page * limit < totalCount,
            hasPrevPage: page > 1,
          }
        : null,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("Unauthorized", 401);
    }

    if (error instanceof z.ZodError) {
      return jsonError(error.issues[0]?.message ?? "Invalid transaction query", 422);
    }

    logger.error("Unhandled API route error", error);
    return jsonError("Failed to load transactions", 500);
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const payload = transactionSchema.parse(await request.json());

    if (payload.recurring?.enabled && !payload.recurring.frequency) {
      return jsonError("Recurring frequency is required", 422);
    }

    await connectToDatabase();

    const categoryId = await resolveAccessibleCategoryId(payload.categoryId, userId);

    const transaction = await Transaction.create({
      userId: toObjectId(userId),
      type: payload.type,
      title: payload.title,
      notes: payload.notes,
      amount: payload.amount,
      currency: "INR",
      categoryId,
      transactionDate: new Date(payload.transactionDate),
      recurring: payload.recurring
        ? {
            enabled: payload.recurring.enabled,
            frequency: payload.recurring.frequency,
            nextRunAt: payload.recurring.nextRunAt
              ? new Date(payload.recurring.nextRunAt)
              : new Date(payload.transactionDate),
          }
        : {
            enabled: false,
          },
    });

    return Response.json({ transaction }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("Unauthorized", 401);
    }

    if (error instanceof z.ZodError) {
      return jsonError(error.issues[0]?.message ?? "Invalid transaction input", 422);
    }

    logger.error("Unhandled API route error", error);
    return jsonError("Failed to create transaction", 500);
  }
}
