import { requireUserId } from "@/lib/api-auth";
import { connectToDatabase } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { toObjectId } from "@/lib/object-id";
import { defaultUserPreferences, dashboardRangeValues } from "@/lib/user-preferences";
import { logger } from "@/lib/logger";
import { User } from "@/models/User";
import { z } from "zod";

const preferenceSchema = z.object({
  currency: z.literal("INR").optional(),
  dashboardDefaultRange: z.enum(dashboardRangeValues).optional(),
});

const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    preferences: preferenceSchema.optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.preferences?.currency !== undefined ||
      value.preferences?.dashboardDefaultRange !== undefined,
    {
    message: "At least one field is required",
    },
  );

function serializeUser(user: {
  _id: { toString(): string };
  name: string;
  email: string;
  image?: string;
  preferences?: {
    currency?: "INR";
    dashboardDefaultRange?: (typeof dashboardRangeValues)[number];
  };
}) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    image: user.image,
    preferences: {
      currency: user.preferences?.currency ?? defaultUserPreferences.currency,
      dashboardDefaultRange:
        user.preferences?.dashboardDefaultRange ?? defaultUserPreferences.dashboardDefaultRange,
    },
  };
}

export async function GET() {
  try {
    const userId = await requireUserId();
    await connectToDatabase();

    const user = await User.findById(toObjectId(userId))
      .select("_id name email image preferences")
      .lean();

    if (!user) {
      return jsonError("User not found", 404);
    }

    return Response.json({ user: serializeUser(user) });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("Unauthorized", 401);
    }

    logger.error("Unhandled API route error", error);
    return jsonError("Failed to load user profile", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await requireUserId();
    const payload = updateProfileSchema.parse(await request.json());

    await connectToDatabase();

    const updates: Record<string, unknown> = {};

    if (payload.name !== undefined) {
      updates.name = payload.name;
    }

    if (payload.preferences?.currency !== undefined) {
      updates["preferences.currency"] = payload.preferences.currency;
    }

    if (payload.preferences?.dashboardDefaultRange !== undefined) {
      updates["preferences.dashboardDefaultRange"] = payload.preferences.dashboardDefaultRange;
    }

    const user = await User.findByIdAndUpdate(
      toObjectId(userId),
      { $set: updates },
      { new: true, runValidators: true },
    )
      .select("_id name email image preferences")
      .lean();

    if (!user) {
      return jsonError("User not found", 404);
    }

    return Response.json({ user: serializeUser(user) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(error.issues[0]?.message ?? "Invalid input", 422);
    }

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("Unauthorized", 401);
    }

    logger.error("Unhandled API route error", error);
    return jsonError("Failed to update user profile", 500);
  }
}
