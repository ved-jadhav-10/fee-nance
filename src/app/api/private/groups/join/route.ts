import { z } from "zod";
import { requireUserId } from "@/lib/api-auth";
import { connectToDatabase } from "@/lib/db";
import { getGroupMemberIds } from "@/lib/group-members";
import { jsonError } from "@/lib/http";
import { toObjectId } from "@/lib/object-id";
import { logger } from "@/lib/logger";
import { Group } from "@/models/Group";

const joinGroupSchema = z.object({
  inviteCode: z.string().trim().min(4).max(20),
});

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const payload = joinGroupSchema.parse(await request.json());

    await connectToDatabase();

    const group = await Group.findOne({
      inviteCode: payload.inviteCode.toUpperCase(),
    }).lean();

    if (!group) {
      return jsonError("Invalid invite code", 404);
    }

    const memberIds = getGroupMemberIds(group);
    const userObjectId = toObjectId(userId);
    const alreadyMember = memberIds.includes(userId);

    if (alreadyMember) {
      return Response.json({ group });
    }

    await Group.updateOne(
      {
        _id: group._id,
        "members.userId": { $ne: userObjectId },
      },
      {
        $push: {
          members: {
            userId: userObjectId,
            role: "member",
            joinedAt: new Date(),
          },
        },
      },
    );

    const updatedGroup = await Group.findById(group._id).lean();

    if (!updatedGroup) {
      return jsonError("Group not found", 404);
    }

    return Response.json({ group: updatedGroup });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("Unauthorized", 401);
    }

    if (error instanceof z.ZodError) {
      return jsonError(error.issues[0]?.message ?? "Invalid invite code", 422);
    }

    logger.error("Unhandled API route error", error);
    return jsonError("Failed to join group", 500);
  }
}
