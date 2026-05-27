import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import type { DbClient, TemporalQuery } from "../types";

export function createReportsRepository(db: DbClient = prisma) {
  return {
    create(data: Prisma.ReportUncheckedCreateInput) {
      return db.report.create({ data });
    },

    findRange({ userId, from, to }: TemporalQuery) {
      return db.report.findMany({
        where: {
          userId,
          periodStart: { gte: from },
          periodEnd: { lte: to },
        },
        orderBy: { createdAt: "desc" },
      });
    },

    update(id: string, data: Prisma.ReportUpdateInput) {
      return db.report.update({
        where: { id },
        data,
      });
    },
  };
}
