import { requireUserId } from "@/lib/api-auth";
import { connectToDatabase } from "@/lib/db";
import { parseDate, jsonError } from "@/lib/http";
import { toObjectId } from "@/lib/object-id";
import { logger } from "@/lib/logger";
import { Category } from "@/models/Category";
import { Transaction } from "@/models/Transaction";

// Keywords in category names that classify an expense as a "deduction"
const DEDUCTION_KEYWORDS = [
  "tax", "insurance", "emi", "loan", "provident", "pf", "epf", "tds",
  "gst", "levy", "premium", "pension",
];

function isDeductionCategory(name: string) {
  const lower = name.toLowerCase();
  return DEDUCTION_KEYWORDS.some((kw) => lower.includes(kw));
}

export async function GET(request: Request) {
  try {
    const userId = await requireUserId();
    await connectToDatabase();

    const userObjectId = toObjectId(userId);
    const { searchParams } = new URL(request.url);

    // Default: last 12 months
    const defaultEnd = new Date();
    const defaultStart = new Date(defaultEnd);
    defaultStart.setMonth(defaultStart.getMonth() - 11);
    defaultStart.setDate(1);
    defaultStart.setHours(0, 0, 0, 0);

    const startDate = parseDate(searchParams.get("startDate"), defaultStart) as Date;
    const endDate = parseDate(searchParams.get("endDate"), defaultEnd) as Date;

    const match = {
      userId: userObjectId,
      transactionDate: { $gte: startDate, $lte: endDate },
    };

    const [
      summaryByTypeRaw,
      categoryBreakdownRaw,
      incomeBreakdownRaw,
      monthlyTrendRaw,
      quarterlyRaw,
    ] = await Promise.all([
      // 1. Overall income vs expense totals
      Transaction.aggregate([
        { $match: match },
        { $group: { _id: "$type", total: { $sum: "$amount" } } },
      ]),

      // 2. Expense breakdown by category (all categories)
      Transaction.aggregate([
        { $match: { ...match, type: "expense" } },
        { $group: { _id: "$categoryId", total: { $sum: "$amount" } } },
        { $sort: { total: -1 } },
      ]),

      // 3. Income breakdown by category
      Transaction.aggregate([
        { $match: { ...match, type: "income" } },
        { $group: { _id: "$categoryId", total: { $sum: "$amount" } } },
        { $sort: { total: -1 } },
      ]),

      // 4. Monthly trend
      Transaction.aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              year: { $year: "$transactionDate" },
              month: { $month: "$transactionDate" },
            },
            income: { $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] } },
            expense: { $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] } },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),

      // 5. Quarterly aggregation
      Transaction.aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              year: { $year: "$transactionDate" },
              quarter: {
                $ceil: { $divide: [{ $month: "$transactionDate" }, 3] },
              },
            },
            income: { $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] } },
            expense: { $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] } },
          },
        },
        { $sort: { "_id.year": 1, "_id.quarter": 1 } },
      ]),
    ]);

    // Collect all referenced category IDs
    const categoryIds = [
      ...categoryBreakdownRaw.map((e) => e._id),
      ...incomeBreakdownRaw.map((e) => e._id),
    ].filter(Boolean);

    const categories = await Category.find({
      $or: [
        { _id: { $in: categoryIds } },
        { isSystem: true },
        { userId: userObjectId },
      ],
    })
      .select("_id name type isSystem")
      .lean();

    const categoryMap = new Map(
      categories.map((c) => [c._id.toString(), c.name as string]),
    );

    // Resolve expense categories
    const expenseCategories = categoryBreakdownRaw.map((entry) => {
      const name =
        categoryMap.get(entry._id?.toString?.() ?? "") ?? "Uncategorized";
      return {
        categoryId: entry._id?.toString() ?? null,
        categoryName: name,
        total: entry.total as number,
        isDeduction: isDeductionCategory(name),
      };
    });

    // Resolve income categories
    const incomeCategories = incomeBreakdownRaw.map((entry) => {
      const name =
        categoryMap.get(entry._id?.toString?.() ?? "") ?? "Uncategorized";
      return {
        categoryId: entry._id?.toString() ?? null,
        categoryName: name,
        total: entry.total as number,
      };
    });

    // Summary values
    const grossIncome =
      summaryByTypeRaw.find((e) => e._id === "income")?.total ?? 0;
    const totalExpenses =
      summaryByTypeRaw.find((e) => e._id === "expense")?.total ?? 0;

    const totalDeductions = expenseCategories
      .filter((e) => e.isDeduction)
      .reduce((sum, e) => sum + e.total, 0);

    const netIncome = grossIncome - totalDeductions;
    const netSavings = grossIncome - totalExpenses;
    const savingsRate = grossIncome > 0 ? (netSavings / grossIncome) * 100 : 0;
    const expenseRatio = grossIncome > 0 ? (totalExpenses / grossIncome) * 100 : 0;

    // Add percentage to expense categories
    const expenseCategoriesWithPct = expenseCategories.map((e) => ({
      ...e,
      percentage: totalExpenses > 0 ? (e.total / totalExpenses) * 100 : 0,
    }));

    const incomeCategoriesWithPct = incomeCategories.map((e) => ({
      ...e,
      percentage: grossIncome > 0 ? (e.total / grossIncome) * 100 : 0,
    }));

    // Monthly trend with savings
    const monthlyTrend = monthlyTrendRaw.map((entry) => ({
      year: entry._id.year as number,
      month: entry._id.month as number,
      income: entry.income as number,
      expense: entry.expense as number,
      savings: (entry.income as number) - (entry.expense as number),
    }));

    // Quarterly data
    const quarterlyData = quarterlyRaw.map((entry) => {
      const qLabel = `Q${entry._id.quarter} ${entry._id.year}`;
      return {
        label: qLabel,
        income: entry.income as number,
        expense: entry.expense as number,
        savings: (entry.income as number) - (entry.expense as number),
      };
    });

    return Response.json({
      dateRange: { startDate, endDate },
      summary: {
        grossIncome,
        totalDeductions,
        netIncome,
        totalExpenses,
        netSavings,
        savingsRate,
        expenseRatio,
      },
      categoryBreakdown: expenseCategoriesWithPct,
      incomeBreakdown: incomeCategoriesWithPct,
      monthlyTrend,
      quarterlyData,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("Unauthorized", 401);
    }
    logger.error("Analytics API error", error);
    return jsonError("Failed to load analytics data", 500);
  }
}
