import type { AlertStatus, Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import type { DbClient } from "../types";

export function createAlertsRepository(db: DbClient = prisma) {
  return {
    create(data: Prisma.AlertUncheckedCreateInput) {
      return db.alert.create({ data });
    },

    findOpen(userId: string) {
      return db.alert.findMany({
        where: {
          userId,
          status: "OPEN",
        },
        orderBy: [{ severity: "desc" }, { triggeredAt: "desc" }],
      });
    },

    updateStatus(id: string, status: AlertStatus) {
      return db.alert.update({
        where: { id },
        data: {
          status,
          resolvedAt: status === "RESOLVED" ? new Date() : undefined,
        },
      });
    },
  };
}
