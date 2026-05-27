import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { createAlertsRepository } from "../repositories/alerts.repository";
import { createAiInsightsRepository } from "../repositories/ai-insights.repository";
import { createOuraRawRepository } from "../repositories/oura-raw.repository";
import { createPhysiologyRepository } from "../repositories/physiology.repository";
import type { OuraRawInput, PhysiologyTimeline, TemporalQuery } from "../types";

export type OuraDailySnapshotInput = {
  raw?: OuraRawInput[];
  readiness?: Prisma.ReadinessScoreUncheckedCreateInput;
  sleep?: Prisma.SleepSessionUncheckedCreateInput[];
  activity?: Prisma.ActivityMetricUncheckedCreateInput;
  stress?: Prisma.StressMetricUncheckedCreateInput;
  recovery?: Prisma.RecoveryMetricUncheckedCreateInput;
  heartRate?: Prisma.HeartRateMetricCreateManyInput[];
  hrv?: Prisma.HrvMetricCreateManyInput[];
  bodyTemperature?: Prisma.BodyTemperatureMetricCreateManyInput[];
};

export function createPhysiologyService() {
  const physiology = createPhysiologyRepository(prisma);
  const ouraRaw = createOuraRawRepository(prisma);
  const alerts = createAlertsRepository(prisma);
  const insights = createAiInsightsRepository(prisma);

  return {
    async ingestOuraDailySnapshot(input: OuraDailySnapshotInput) {
      return prisma.$transaction(async (tx) => {
        const txPhysiology = createPhysiologyRepository(tx);
        const txOuraRaw = createOuraRawRepository(tx);

        const writes: Promise<unknown>[] = [];

        for (const raw of input.raw ?? []) {
          writes.push(txOuraRaw.upsertRaw(raw));
        }

        if (input.readiness) {
          writes.push(txPhysiology.upsertReadiness(input.readiness));
        }

        for (const session of input.sleep ?? []) {
          writes.push(txPhysiology.upsertSleepSession(session));
        }

        if (input.activity) {
          writes.push(txPhysiology.upsertActivity(input.activity));
        }

        if (input.stress) {
          writes.push(txPhysiology.upsertStress(input.stress));
        }

        if (input.recovery) {
          writes.push(txPhysiology.upsertRecovery(input.recovery));
        }

        if (input.heartRate?.length) {
          writes.push(txPhysiology.createHeartRateBatch(input.heartRate));
        }

        if (input.hrv?.length) {
          writes.push(txPhysiology.createHrvBatch(input.hrv));
        }

        if (input.bodyTemperature?.length) {
          writes.push(txPhysiology.createBodyTemperatureBatch(input.bodyTemperature));
        }

        return Promise.all(writes);
      });
    },

    async getTimeline(query: TemporalQuery): Promise<PhysiologyTimeline> {
      const [readiness, sleep, activity, recovery, openAlerts, aiInsights] = await Promise.all([
        physiology.findReadinessRange(query),
        physiology.findSleepRange(query),
        physiology.findActivityRange(query),
        physiology.findRecoveryRange(query),
        alerts.findOpen(query.userId),
        insights.findRange(query),
      ]);

      return {
        readiness,
        sleep,
        activity,
        recovery,
        alerts: openAlerts,
        insights: aiInsights,
      };
    },

    getLatestRecovery(userId: string) {
      return physiology.findLatestRecovery(userId);
    },

    getRecentRaw(userId: string, collection: string, take?: number) {
      return ouraRaw.findByCollection(userId, collection, take);
    },
  };
}
