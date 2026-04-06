import { z } from "zod";
import { requireUserId } from "@/lib/api-auth";
import { connectToDatabase } from "@/lib/db";
import { getGroupMemberIds } from "@/lib/group-members";
import { jsonError } from "@/lib/http";
import { isMongoDuplicateKeyError } from "@/lib/mongo-errors";
import { toObjectId } from "@/lib/object-id";
import { logger } from "@/lib/logger";
import { Group } from "@/models/Group";
import { Settlement } from "@/models/Settlement";

const settlementSchema = z.object({
  fromUserId: z.string(),
  toUserId: z.string(),
  amount: z.number().positive(),
  note: z.string().trim().max(500).optional(),
  settledAt: z.string().datetime().optional(),
});

const settlementQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  fromUserId: z.string().optional(),
  toUserId: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  sortBy: z.enum(["settledAt", "amount", "createdAt"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

const idempotencyKeySchema = z
  .string()
  .trim()
  .min(8)
  .max(128)
  .regex(/^[A-Za-z0-9_.:-]+$/);

function getOptionalParam(value: string | null) {
  if (value === null || value.trim() === "") {
    return undefined;
  }

  return value;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  try {
    const userId = await requireUserId();
    const { groupId } = await params;

    await connectToDatabase();

    const group = await Group.findById(toObjectId(groupId)).lean();

    if (!group) {
      return jsonError("Group not found", 404);
    }

    const memberIds = getGroupMemberIds(group);

    if (!memberIds.includes(userId)) {
      return jsonError("Forbidden", 403);
    }

    const { searchParams } = new URL(request.url);
    const queryParams = settlementQuerySchema.parse({
      startDate: getOptionalParam(searchParams.get("startDate")),
      endDate: getOptionalParam(searchParams.get("endDate")),
      fromUserId: getOptionalParam(searchParams.get("fromUserId")),
      toUserId: getOptionalParam(searchParams.get("toUserId")),
      page: getOptionalParam(searchParams.get("page")),
      limit: getOptionalParam(searchParams.get("limit")),
      sortBy: getOptionalParam(searchParams.get("sortBy")),
      sortOrder: getOptionalParam(searchParams.get("sortOrder")),
    });

    if (queryParams.fromUserId && !memberIds.includes(queryParams.fromUserId)) {
      return jsonError("fromUserId filter must be a group member", 422);
    }

    if (queryParams.toUserId && !memberIds.includes(queryParams.toUserId)) {
      return jsonError("toUserId filter must be a group member", 422);
    }

    const shouldPaginate = queryParams.page !== undefined || queryParams.limit !== undefined;
    const page = queryParams.page ?? 1;
    const limit = queryParams.limit ?? 20;
    const sortField = queryParams.sortBy ?? "settledAt";
    const sortDirection = queryParams.sortOrder === "asc" ? 1 : -1;

    const historyQuery: {
      groupId: ReturnType<typeof toObjectId>;
      settledAt?: { $gte?: Date; $lte?: Date };
      fromUserId?: ReturnType<typeof toObjectId>;
      toUserId?: ReturnType<typeof toObjectId>;
    } = {
      groupId: toObjectId(groupId),
    };

    if (queryParams.startDate || queryParams.endDate) {
      historyQuery.settledAt = {};
      if (queryParams.startDate) {
        historyQuery.settledAt.$gte = new Date(queryParams.startDate);
      }
      if (queryParams.endDate) {
        historyQuery.settledAt.$lte = new Date(queryParams.endDate);
      }
    }

    if (queryParams.fromUserId) {
      historyQuery.fromUserId = toObjectId(queryParams.fromUserId);
    }

    if (queryParams.toUserId) {
      historyQuery.toUserId = toObjectId(queryParams.toUserId);
    }

    const totalCountPromise = Settlement.countDocuments(historyQuery);
    const findQuery = Settlement.find(historyQuery).sort({ [sortField]: sortDirection });

    if (shouldPaginate) {
      findQuery.skip((page - 1) * limit).limit(limit);
    }

    const [totalCount, settlements] = await Promise.all([totalCountPromise, findQuery.lean()]);

    return Response.json({
      settlements,
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
      return jsonError(error.issues[0]?.message ?? "Invalid settlement query", 422);
    }

    if (error instanceof Error && error.message === "Invalid identifier") {
      return jsonError("Invalid identifier", 422);
    }

    logger.error("Unhandled API route error", error);
    return jsonError("Failed to load settlements", 500);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  try {
    const userId = await requireUserId();
    const payload = settlementSchema.parse(await request.json());
    const { groupId } = await params;
    const idempotencyKeyRaw =
      request.headers.get("x-idempotency-key") ?? request.headers.get("idempotency-key");
    const idempotencyKey = idempotencyKeyRaw
      ? idempotencyKeySchema.parse(idempotencyKeyRaw)
      : undefined;

    if (payload.fromUserId === payload.toUserId) {
      return jsonError("Settlement users must be different", 422);
    }

    await connectToDatabase();

    const group = await Group.findById(toObjectId(groupId)).lean();

    if (!group) {
      return jsonError("Group not found", 404);
    }

    const memberIds = getGroupMemberIds(group);

    if (!memberIds.includes(userId)) {
      return jsonError("Forbidden", 403);
    }

    if (!memberIds.includes(payload.fromUserId) || !memberIds.includes(payload.toUserId)) {
      return jsonError("Settlement users must belong to the group", 422);
    }

    if (idempotencyKey) {
      const existing = await Settlement.findOne({
        groupId: toObjectId(groupId),
        createdBy: toObjectId(userId),
        idempotencyKey,
      }).lean();

      if (existing) {
        return Response.json({ settlement: existing, idempotent: true });
      }
    }

    const settlement = await Settlement.create({
      groupId: toObjectId(groupId),
      fromUserId: toObjectId(payload.fromUserId),
      toUserId: toObjectId(payload.toUserId),
      amount: payload.amount,
      currency: "INR",
      note: payload.note,
      settledAt: payload.settledAt ? new Date(payload.settledAt) : new Date(),
      createdBy: toObjectId(userId),
      idempotencyKey,
    });

    return Response.json({ settlement }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("Unauthorized", 401);
    }

    if (error instanceof z.ZodError) {
      return jsonError(error.issues[0]?.message ?? "Invalid settlement input", 422);
    }

    if (error instanceof Error && error.message === "Invalid identifier") {
      return jsonError("Invalid identifier", 422);
    }

    if (isMongoDuplicateKeyError(error)) {
      const { groupId } = await params;
      const idempotencyKeyRaw =
        request.headers.get("x-idempotency-key") ?? request.headers.get("idempotency-key");
      const userId = await requireUserId();

      if (idempotencyKeyRaw) {
        const existing = await Settlement.findOne({
          groupId: toObjectId(groupId),
          createdBy: toObjectId(userId),
          idempotencyKey: idempotencyKeyRaw.trim(),
        }).lean();

        if (existing) {
          return Response.json({ settlement: existing, idempotent: true });
        }
      }
    }

    logger.error("Unhandled API route error", error);
    return jsonError("Failed to create settlement", 500);
  }
}
