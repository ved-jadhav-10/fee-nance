import { Schema, model, models, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: false,
    },
    image: {
      type: String,
      required: false,
    },
    googleId: {
      type: String,
      required: false,
      index: true,
    },
    preferences: {
      currency: {
        type: String,
        enum: ["INR"],
        default: "INR",
      },
      dashboardDefaultRange: {
        type: String,
        enum: ["thisMonth", "last30Days", "thisYear"],
        default: "thisMonth",
      },
    },
  },
  {
    timestamps: true,
  },
);

export type UserDocument = InferSchemaType<typeof userSchema>;

export const User = models.User || model("User", userSchema);
