import type { InsightStatus, Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import type { DbClient, TemporalQuery } from "../types";

export function createAiInsightsRepository(db: DbClient = prisma) {
  return {
    create(data: Prisma.AiInsightUncheckedCreateInput) {
      return db.aiInsight.create({ data });
    },

    findRange({ userId, from, to }: TemporalQuery) {
      return db.aiInsight.findMany({
        where: {
          userId,
          metricDate: {
            gte: from,
            lte: to,
          },
        },
        orderBy: { createdAt: "desc" },
      });
    },

    updateStatus(id: string, status: InsightStatus) {
      return db.aiInsight.update({
        where: { id },
        data: { status },
      });
    },
  };
}
