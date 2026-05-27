import type { AlertStatus, Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { createAlertsRepository } from "../repositories/alerts.repository";

export function createAlertsService() {
  const alerts = createAlertsRepository(prisma);

  return {
    createAlert(data: Prisma.AlertUncheckedCreateInput) {
      return alerts.create(data);
    },

    listOpenAlerts(userId: string) {
      return alerts.findOpen(userId);
    },

    updateAlertStatus(id: string, status: AlertStatus) {
      return alerts.updateStatus(id, status);
    },
  };
}
