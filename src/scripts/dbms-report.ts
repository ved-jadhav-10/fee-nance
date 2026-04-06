import { writeFile } from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import { connectToDatabase } from "../lib/db";
import {
  getAboveAverageSpendersInCurrentMonth,
  getCategoryExpenseHavingRows,
  getJoinLikeGroupMembershipRows,
  getSettlementHavingRows,
} from "../lib/dbms-reporting";
import { logger } from "../lib/logger";

async function runDbmsReport() {
  await connectToDatabase();

  const [groupMembershipRows, aboveAverageSpenders, categoryHavingRows, settlementHavingRows] =
    await Promise.all([
      getJoinLikeGroupMembershipRows(),
      getAboveAverageSpendersInCurrentMonth(),
      getCategoryExpenseHavingRows(5000),
      getSettlementHavingRows(500),
    ]);

  const output = {
    generatedAt: new Date().toISOString(),
    summaries: {
      groupMembershipRows: groupMembershipRows.length,
      aboveAverageSpenders: aboveAverageSpenders.length,
      categoryHavingRows: categoryHavingRows.length,
      settlementHavingRows: settlementHavingRows.length,
    },
    reports: {
      joinLikeGroupMembership: groupMembershipRows,
      subqueryLikeAboveAverageSpenders: aboveAverageSpenders,
      groupByHavingCategoryExpenses: categoryHavingRows,
      groupByHavingSettlements: settlementHavingRows,
    },
  };

  const outputPath = path.join(process.cwd(), "docs", "dbms-report-output.json");
  await writeFile(outputPath, JSON.stringify(output, null, 2), "utf8");

  logger.info("DBMS report output generated", {
    outputPath,
    summaries: output.summaries,
  });

  await mongoose.disconnect();
}

runDbmsReport().catch(async (error) => {
  logger.error("DBMS report generation failed", error);
  await mongoose.disconnect();
  process.exit(1);
});
