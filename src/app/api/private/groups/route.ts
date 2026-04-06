import { z } from "zod";
import { requireUserId } from "@/lib/api-auth";
import { connectToDatabase } from "@/lib/db";
import { generateInviteCode } from "@/lib/invite-code";
import { jsonError } from "@/lib/http";
import { toObjectId } from "@/lib/object-id";
import { logger } from "@/lib/logger";
import { Group } from "@/models/Group";

const createGroupSchema = z.object({
  name: z.string().trim().min(2).max(100),
});

const groupListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  sortBy: z.enum(["createdAt", "name"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  search: z.string().trim().max(100).optional(),
});

function getOptionalParam(value: string | null) {
  if (value === null || value.trim() === "") {
    return undefined;
  }

  return value;
}

async function generateUniqueInviteCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const inviteCode = generateInviteCode(8);
    const exists = await Group.findOne({ inviteCode }).lean();
    if (!exists) {
      return inviteCode;
    }
  }

  throw new Error("Failed to generate invite code");
}

export async function GET(request: Request) {
  try {
    const userId = await requireUserId();
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const queryParams = groupListQuerySchema.parse({
      page: getOptionalParam(searchParams.get("page")),
      limit: getOptionalParam(searchParams.get("limit")),
      sortBy: getOptionalParam(searchParams.get("sortBy")),
      sortOrder: getOptionalParam(searchParams.get("sortOrder")),
      search: getOptionalParam(searchParams.get("search")),
    });

    const shouldPaginate = queryParams.page !== undefined || queryParams.limit !== undefined;
    const page = queryParams.page ?? 1;
    const limit = queryParams.limit ?? 20;
    const sortField = queryParams.sortBy ?? "createdAt";
    const sortDirection = queryParams.sortOrder === "asc" ? 1 : -1;

    const query: {
      "members.userId": ReturnType<typeof toObjectId>;
      name?: { $regex: string; $options: "i" };
    } = {
      "members.userId": toObjectId(userId),
    };

    if (queryParams.search) {
      query.name = {
        $regex: queryParams.search,
        $options: "i",
      };
    }

    const totalCountPromise = Group.countDocuments(query);
    const findQuery = Group.find(query)
      .populate("members.userId", "name email")
      .sort({ [sortField]: sortDirection });

    if (shouldPaginate) {
      findQuery.skip((page - 1) * limit).limit(limit);
    }

    const [totalCount, groups] = await Promise.all([totalCountPromise, findQuery.lean()]);

    return Response.json({
      groups,
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
      return jsonError(error.issues[0]?.message ?? "Invalid group query", 422);
    }

    logger.error("Unhandled API route error", error);
    return jsonError("Failed to load groups", 500);
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const payload = createGroupSchema.parse(await request.json());

    await connectToDatabase();

    const inviteCode = await generateUniqueInviteCode();
    const userObjectId = toObjectId(userId);

    const group = await Group.create({
      name: payload.name,
      createdBy: userObjectId,
      inviteCode,
      members: [
        {
          userId: userObjectId,
          role: "owner",
          joinedAt: new Date(),
        },
      ],
    });

    return Response.json({ group }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("Unauthorized", 401);
    }

    if (error instanceof z.ZodError) {
      return jsonError(error.issues[0]?.message ?? "Invalid group input", 422);
    }

    logger.error("Unhandled API route error", error);
    return jsonError("Failed to create group", 500);
  }
}
