import type { InsightStatus, Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { createAiInsightsRepository } from "../repositories/ai-insights.repository";
import type { TemporalQuery } from "../types";

export function createAiInsightsService() {
  const insights = createAiInsightsRepository(prisma);

  return {
    createInsight(data: Prisma.AiInsightUncheckedCreateInput) {
      return insights.create(data);
    },

    listInsights(query: TemporalQuery) {
      return insights.findRange(query);
    },

    updateInsightStatus(id: string, status: InsightStatus) {
      return insights.updateStatus(id, status);
    },
  };
}
