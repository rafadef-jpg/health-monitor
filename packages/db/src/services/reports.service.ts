import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { createAiInsightsRepository } from "../repositories/ai-insights.repository";
import { createReportsRepository } from "../repositories/reports.repository";
import type { TemporalQuery } from "../types";

export type CreateReportWithInsightsInput = {
  report: Prisma.ReportUncheckedCreateInput;
  insights?: Omit<Prisma.AiInsightUncheckedCreateInput, "reportId">[];
};

export function createReportsService() {
  const reports = createReportsRepository(prisma);

  return {
    async createReportWithInsights(input: CreateReportWithInsightsInput) {
      return prisma.$transaction(async (tx) => {
        const txReports = createReportsRepository(tx);
        const txInsights = createAiInsightsRepository(tx);
        const report = await txReports.create(input.report);

        const insights = await Promise.all(
          (input.insights ?? []).map((insight) =>
            txInsights.create({
              ...insight,
              reportId: report.id,
            }),
          ),
        );

        return {
          report,
          insights,
        };
      });
    },

    findReports(query: TemporalQuery) {
      return reports.findRange(query);
    },
  };
}
