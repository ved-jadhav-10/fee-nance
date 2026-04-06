import { hash } from "bcryptjs";
import mongoose from "mongoose";
import { connectToDatabase } from "../lib/db";
import { ensureDefaultCategories } from "../lib/default-categories";
import { generateInviteCode } from "../lib/invite-code";
import { logger } from "../lib/logger";
import { Budget } from "../models/Budget";
import { Category } from "../models/Category";
import { Group } from "../models/Group";
import { GroupExpense } from "../models/GroupExpense";
import { Settlement } from "../models/Settlement";
import { Transaction } from "../models/Transaction";
import { User } from "../models/User";

async function upsertDemoUser(name: string, email: string, password: string) {
  const passwordHash = await hash(password, 12);

  return User.findOneAndUpdate(
    { email: email.toLowerCase() },
    {
      $set: {
        name,
        email: email.toLowerCase(),
        passwordHash,
      },
    },
    { upsert: true, returnDocument: "after" },
  );
}

function atDate(monthOffset: number, day: number) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + monthOffset, day, 10, 0, 0, 0);
}

function monthBounds(monthOffset = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function yearBounds() {
  const now = new Date();
  return {
    start: new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0),
    end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
  };
}

async function getUniqueInviteCode() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = generateInviteCode(8);
    const exists = await Group.exists({ inviteCode: code });
    if (!exists) {
      return code;
    }
  }

  throw new Error("Unable to generate unique invite code for demo group");
}

async function seed() {
  await connectToDatabase();
  await ensureDefaultCategories();

  const [alex, riya, kabir] = await Promise.all([
    upsertDemoUser("Alex Demo", "alex@feenance.demo", "Demo@1234"),
    upsertDemoUser("Riya Demo", "riya@feenance.demo", "Demo@1234"),
    upsertDemoUser("Kabir Demo", "kabir@feenance.demo", "Demo@1234"),
  ]);

  const [salaryCategory, freelanceCategory, foodCategory, rentCategory, travelCategory, shoppingCategory, utilitiesCategory] = await Promise.all([
    Category.findOne({ isSystem: true, name: "Salary", type: "income" }),
    Category.findOne({ isSystem: true, name: "Freelance", type: "income" }),
    Category.findOne({ isSystem: true, name: "Food", type: "expense" }),
    Category.findOne({ isSystem: true, name: "Rent", type: "expense" }),
    Category.findOne({ isSystem: true, name: "Travel", type: "expense" }),
    Category.findOne({ isSystem: true, name: "Shopping", type: "expense" }),
    Category.findOne({ isSystem: true, name: "Utilities", type: "expense" }),
  ]);

  if (
    !salaryCategory ||
    !freelanceCategory ||
    !foodCategory ||
    !rentCategory ||
    !travelCategory ||
    !shoppingCategory ||
    !utilitiesCategory
  ) {
    throw new Error("Default categories were not initialized correctly");
  }

  const demoUserIds = [alex._id, riya._id, kabir._id];

  await Promise.all([
    Transaction.deleteMany({ userId: { $in: demoUserIds } }),
    Budget.deleteMany({ userId: { $in: demoUserIds } }),
    Category.deleteMany({ userId: { $in: demoUserIds }, isSystem: false }),
  ]);

  const [alexHealthCategory, riyaLearningCategory, kabirFitnessCategory] = await Promise.all([
    Category.findOneAndUpdate(
      { userId: alex._id, name: "Health", type: "expense" },
      {
        $set: {
          icon: "heart-pulse",
          color: "#7F77DD",
          isSystem: false,
        },
      },
      { upsert: true, returnDocument: "after" },
    ),
    Category.findOneAndUpdate(
      { userId: riya._id, name: "Learning", type: "expense" },
      {
        $set: {
          icon: "book-open",
          color: "#7F77DD",
          isSystem: false,
        },
      },
      { upsert: true, returnDocument: "after" },
    ),
    Category.findOneAndUpdate(
      { userId: kabir._id, name: "Fitness", type: "expense" },
      {
        $set: {
          icon: "activity",
          color: "#7F77DD",
          isSystem: false,
        },
      },
      { upsert: true, returnDocument: "after" },
    ),
  ]);

  await Transaction.insertMany([
    {
      userId: alex._id,
      type: "income",
      title: "Primary Salary",
      amount: 85000,
      currency: "INR",
      categoryId: salaryCategory._id,
      transactionDate: atDate(0, 1),
      recurring: {
        enabled: true,
        frequency: "monthly",
        nextRunAt: atDate(1, 1),
      },
    },
    {
      userId: alex._id,
      type: "income",
      title: "Quarterly Consulting",
      amount: 22000,
      currency: "INR",
      categoryId: freelanceCategory._id,
      transactionDate: atDate(-1, 19),
      recurring: {
        enabled: false,
      },
    },
    {
      userId: alex._id,
      type: "expense",
      title: "Apartment Rent",
      amount: 28000,
      currency: "INR",
      categoryId: rentCategory._id,
      transactionDate: atDate(0, 3),
      recurring: {
        enabled: true,
        frequency: "monthly",
        nextRunAt: atDate(1, 3),
      },
    },
    {
      userId: alex._id,
      type: "expense",
      title: "Weekend Dining",
      amount: 3200,
      currency: "INR",
      categoryId: foodCategory._id,
      transactionDate: atDate(0, 7),
      recurring: {
        enabled: false,
      },
    },
    {
      userId: alex._id,
      type: "expense",
      title: "Dental Checkup",
      amount: 5400,
      currency: "INR",
      categoryId: alexHealthCategory._id,
      transactionDate: atDate(-1, 11),
      recurring: {
        enabled: false,
      },
    },
    {
      userId: alex._id,
      type: "expense",
      title: "Electricity Bill",
      amount: 2400,
      currency: "INR",
      categoryId: utilitiesCategory._id,
      transactionDate: atDate(0, 9),
      recurring: {
        enabled: true,
        frequency: "monthly",
        nextRunAt: atDate(1, 9),
      },
    },
    {
      userId: riya._id,
      type: "income",
      title: "Primary Salary",
      amount: 72000,
      currency: "INR",
      categoryId: salaryCategory._id,
      transactionDate: atDate(0, 1),
      recurring: {
        enabled: true,
        frequency: "monthly",
        nextRunAt: atDate(1, 1),
      },
    },
    {
      userId: riya._id,
      type: "income",
      title: "Freelance Illustration",
      amount: 9800,
      currency: "INR",
      categoryId: freelanceCategory._id,
      transactionDate: atDate(-2, 16),
      recurring: {
        enabled: false,
      },
    },
    {
      userId: riya._id,
      type: "expense",
      title: "Groceries",
      amount: 2100,
      currency: "INR",
      categoryId: foodCategory._id,
      transactionDate: atDate(0, 5),
      recurring: {
        enabled: false,
      },
    },
    {
      userId: riya._id,
      type: "expense",
      title: "Frontend Course",
      amount: 4500,
      currency: "INR",
      categoryId: riyaLearningCategory._id,
      transactionDate: atDate(-1, 17),
      recurring: {
        enabled: false,
      },
    },
    {
      userId: riya._id,
      type: "expense",
      title: "Airport Cab",
      amount: 1600,
      currency: "INR",
      categoryId: travelCategory._id,
      transactionDate: atDate(-2, 24),
      recurring: {
        enabled: false,
      },
    },
    {
      userId: riya._id,
      type: "expense",
      title: "Mobile Plan",
      amount: 799,
      currency: "INR",
      categoryId: utilitiesCategory._id,
      transactionDate: atDate(0, 8),
      recurring: {
        enabled: true,
        frequency: "monthly",
        nextRunAt: atDate(1, 8),
      },
    },
    {
      userId: kabir._id,
      type: "income",
      title: "Primary Salary",
      amount: 64000,
      currency: "INR",
      categoryId: salaryCategory._id,
      transactionDate: atDate(0, 1),
      recurring: {
        enabled: true,
        frequency: "monthly",
        nextRunAt: atDate(1, 1),
      },
    },
    {
      userId: kabir._id,
      type: "expense",
      title: "Gym Membership",
      amount: 1800,
      currency: "INR",
      categoryId: kabirFitnessCategory._id,
      transactionDate: atDate(0, 4),
      recurring: {
        enabled: true,
        frequency: "monthly",
        nextRunAt: atDate(1, 4),
      },
    },
    {
      userId: kabir._id,
      type: "expense",
      title: "Headphones Purchase",
      amount: 6999,
      currency: "INR",
      categoryId: shoppingCategory._id,
      transactionDate: atDate(-1, 22),
      recurring: {
        enabled: false,
      },
    },
    {
      userId: kabir._id,
      type: "expense",
      title: "Weekend Road Trip",
      amount: 3500,
      currency: "INR",
      categoryId: travelCategory._id,
      transactionDate: atDate(-2, 12),
      recurring: {
        enabled: false,
      },
    },
  ]);

  const thisMonth = monthBounds(0);
  const lastMonth = monthBounds(-1);
  const thisYear = yearBounds();

  await Budget.insertMany([
    {
      userId: alex._id,
      name: "Monthly Essentials",
      amount: 42000,
      currency: "INR",
      cycle: "monthly",
      categoryId: undefined,
      periodStart: thisMonth.start,
      periodEnd: thisMonth.end,
    },
    {
      userId: riya._id,
      name: "Learning Budget",
      amount: 7000,
      currency: "INR",
      cycle: "monthly",
      categoryId: riyaLearningCategory._id,
      periodStart: thisMonth.start,
      periodEnd: thisMonth.end,
    },
    {
      userId: riya._id,
      name: "Travel Buffer",
      amount: 12000,
      currency: "INR",
      cycle: "quarterly",
      categoryId: travelCategory._id,
      periodStart: lastMonth.start,
      periodEnd: thisMonth.end,
    },
    {
      userId: kabir._id,
      name: "Fitness and Wellness",
      amount: 5000,
      currency: "INR",
      cycle: "monthly",
      categoryId: kabirFitnessCategory._id,
      periodStart: thisMonth.start,
      periodEnd: thisMonth.end,
    },
    {
      userId: alex._id,
      name: "Annual Travel Fund",
      amount: 180000,
      currency: "INR",
      cycle: "yearly",
      categoryId: travelCategory._id,
      periodStart: thisYear.start,
      periodEnd: thisYear.end,
    },
  ]);

  const existingGroups = await Group.find({
    name: { $in: ["Weekend Crew", "Flatmates 302"] },
  })
    .select("_id")
    .lean();

  const existingGroupIds = existingGroups.map((group) => group._id);

  if (existingGroupIds.length) {
    await Promise.all([
      GroupExpense.deleteMany({ groupId: { $in: existingGroupIds } }),
      Settlement.deleteMany({ groupId: { $in: existingGroupIds } }),
      Group.deleteMany({ _id: { $in: existingGroupIds } }),
    ]);
  }

  const [weekendCrew, flatmates] = await Promise.all([
    Group.create({
      name: "Weekend Crew",
      createdBy: alex._id,
      inviteCode: await getUniqueInviteCode(),
      members: [
        { userId: alex._id, role: "owner", joinedAt: atDate(-3, 5) },
        { userId: riya._id, role: "member", joinedAt: atDate(-3, 6) },
        { userId: kabir._id, role: "member", joinedAt: atDate(-2, 2) },
      ],
    }),
    Group.create({
      name: "Flatmates 302",
      createdBy: riya._id,
      inviteCode: await getUniqueInviteCode(),
      members: [
        { userId: riya._id, role: "owner", joinedAt: atDate(-4, 9) },
        { userId: alex._id, role: "member", joinedAt: atDate(-4, 10) },
      ],
    }),
  ]);

  await GroupExpense.insertMany([
    {
      groupId: weekendCrew._id,
      createdBy: alex._id,
      title: "Dinner Out",
      notes: "Equal split for all members",
      amount: 3600,
      currency: "INR",
      splitType: "equal",
      paidBy: [
        { userId: alex._id, amount: 3000 },
        { userId: riya._id, amount: 600 },
      ],
      splits: [
        { userId: alex._id, shareAmount: 1200 },
        { userId: riya._id, shareAmount: 1200 },
        { userId: kabir._id, shareAmount: 1200 },
      ],
      incurredAt: atDate(0, 8),
    },
    {
      groupId: weekendCrew._id,
      createdBy: kabir._id,
      title: "Resort Booking",
      notes: "Custom split based on room choices",
      amount: 5400,
      currency: "INR",
      splitType: "custom",
      paidBy: [{ userId: kabir._id, amount: 5400 }],
      splits: [
        { userId: alex._id, amount: 2500, shareAmount: 2500 },
        { userId: riya._id, amount: 1900, shareAmount: 1900 },
        { userId: kabir._id, amount: 1000, shareAmount: 1000 },
      ],
      incurredAt: atDate(-1, 22),
    },
    {
      groupId: weekendCrew._id,
      createdBy: riya._id,
      title: "Road Trip Fuel",
      notes: "Percentage split by travel distance",
      amount: 4200,
      currency: "INR",
      splitType: "percentage",
      paidBy: [
        { userId: alex._id, amount: 2000 },
        { userId: riya._id, amount: 1200 },
        { userId: kabir._id, amount: 1000 },
      ],
      splits: [
        { userId: alex._id, percentage: 50, shareAmount: 2100 },
        { userId: riya._id, percentage: 30, shareAmount: 1260 },
        { userId: kabir._id, percentage: 20, shareAmount: 840 },
      ],
      incurredAt: atDate(-2, 14),
    },
    {
      groupId: flatmates._id,
      createdBy: riya._id,
      title: "Monthly Groceries",
      notes: "Flatmates equal split",
      amount: 5200,
      currency: "INR",
      splitType: "equal",
      paidBy: [
        { userId: riya._id, amount: 3000 },
        { userId: alex._id, amount: 2200 },
      ],
      splits: [
        { userId: riya._id, shareAmount: 2600 },
        { userId: alex._id, shareAmount: 2600 },
      ],
      incurredAt: atDate(0, 10),
    },
  ]);

  await Settlement.insertMany([
    {
      groupId: weekendCrew._id,
      fromUserId: kabir._id,
      toUserId: alex._id,
      amount: 900,
      currency: "INR",
      note: "Partial settle for resort booking",
      settledAt: atDate(0, 12),
      createdBy: kabir._id,
    },
    {
      groupId: flatmates._id,
      fromUserId: alex._id,
      toUserId: riya._id,
      amount: 700,
      currency: "INR",
      note: "Grocery adjustment",
      settledAt: atDate(0, 15),
      createdBy: alex._id,
    },
  ]);

  logger.info("Seed complete", {
    users: 3,
    transactions: 16,
    budgets: 5,
    groups: 2,
    groupExpenses: 4,
    settlements: 2,
  });
  logger.info("Demo accounts:");
  logger.info("- alex@feenance.demo / Demo@1234");
  logger.info("- riya@feenance.demo / Demo@1234");
  logger.info("- kabir@feenance.demo / Demo@1234");

  await mongoose.disconnect();
}

seed().catch(async (error) => {
  logger.error("Seed execution failed", error);
  await mongoose.disconnect();
  process.exit(1);
});
