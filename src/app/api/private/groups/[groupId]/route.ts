import { requireUserId } from "@/lib/api-auth";
import { connectToDatabase } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { toObjectId } from "@/lib/object-id";
import { Group } from "@/models/Group";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  try {
    const userId = await requireUserId();
    const { groupId } = await params;

    await connectToDatabase();

    const group = await Group.findById(toObjectId(groupId))
      .populate("members.userId", "name email")
      .lean();

    if (!group) {
      return jsonError("Group not found", 404);
    }

    const memberIds = group.members.map((member: { userId: { _id: { toString(): string } } }) =>
      member.userId._id.toString(),
    );

    if (!memberIds.includes(userId)) {
      return jsonError("Forbidden", 403);
    }

    return Response.json({ group });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("Unauthorized", 401);
    }

    console.error(error);
    return jsonError("Failed to load group", 500);
  }
}
