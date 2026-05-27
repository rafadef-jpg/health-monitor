import type { MetricSource, Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import type { DbClient, TemporalQuery } from "../types";

function sourceOrDefault(source?: MetricSource) {
  return source ?? "OURA";
}

export function createPhysiologyRepository(db: DbClient = prisma) {
  return {
    upsertPhysiologyMetric(data: Prisma.PhysiologyMetricUncheckedCreateInput) {
      const source = sourceOrDefault(data.source);

      return db.physiologyMetric.upsert({
        where: {
          userId_source_recordedAt: {
            userId: data.userId,
            source,
            recordedAt: data.recordedAt,
          },
        },
        create: data,
        update: {
          metricDate: data.metricDate,
          sourceRecordId: data.sourceRecordId,
          summary: data.summary,
        },
      });
    },

    upsertReadiness(data: Prisma.ReadinessScoreUncheckedCreateInput) {
      const source = sourceOrDefault(data.source);

      return db.readinessScore.upsert({
        where: {
          userId_source_metricDate: {
            userId: data.userId,
            source,
            metricDate: data.metricDate,
          },
        },
        create: data,
        update: {
          score: data.score,
          temperatureDeviation: data.temperatureDeviation,
          restingHeartRate: data.restingHeartRate,
          hrvBalance: data.hrvBalance,
          sleepBalance: data.sleepBalance,
          previousDayActivity: data.previousDayActivity,
          activityBalance: data.activityBalance,
          recoveryIndex: data.recoveryIndex,
          raw: data.raw,
        },
      });
    },

    upsertActivity(data: Prisma.ActivityMetricUncheckedCreateInput) {
      const source = sourceOrDefault(data.source);

      return db.activityMetric.upsert({
        where: {
          userId_source_metricDate: {
            userId: data.userId,
            source,
            metricDate: data.metricDate,
          },
        },
        create: data,
        update: {
          score: data.score,
          steps: data.steps,
          activeCalories: data.activeCalories,
          totalCalories: data.totalCalories,
          equivalentWalkingKm: data.equivalentWalkingKm,
          highActivitySeconds: data.highActivitySeconds,
          mediumActivitySeconds: data.mediumActivitySeconds,
          lowActivitySeconds: data.lowActivitySeconds,
          sedentarySeconds: data.sedentarySeconds,
          targetCalories: data.targetCalories,
          raw: data.raw,
        },
      });
    },

    upsertRecovery(data: Prisma.RecoveryMetricUncheckedCreateInput) {
      const source = sourceOrDefault(data.source);

      return db.recoveryMetric.upsert({
        where: {
          userId_source_metricDate: {
            userId: data.userId,
            source,
            metricDate: data.metricDate,
          },
        },
        create: data,
        update: {
          recoveryScore: data.recoveryScore,
          readinessScore: data.readinessScore,
          sleepScore: data.sleepScore,
          restingHeartRate: data.restingHeartRate,
          hrvRmssd: data.hrvRmssd,
          temperatureDeviation: data.temperatureDeviation,
          interpretation: data.interpretation,
          raw: data.raw,
        },
      });
    },

    upsertStress(data: Prisma.StressMetricUncheckedCreateInput) {
      const source = sourceOrDefault(data.source);

      return db.stressMetric.upsert({
        where: {
          userId_source_metricDate: {
            userId: data.userId,
            source,
            metricDate: data.metricDate,
          },
        },
        create: data,
        update: {
          recordedAt: data.recordedAt,
          stressHighSeconds: data.stressHighSeconds,
          stressMediumSeconds: data.stressMediumSeconds,
          stressLowSeconds: data.stressLowSeconds,
          recoverySeconds: data.recoverySeconds,
          daySummary: data.daySummary,
          raw: data.raw,
        },
      });
    },

    upsertSleepSession(data: Prisma.SleepSessionUncheckedCreateInput) {
      if (!data.sourceRecordId) {
        return db.sleepSession.create({ data });
      }

      const source = sourceOrDefault(data.source);

      return db.sleepSession.upsert({
        where: {
          userId_source_sourceRecordId: {
            userId: data.userId,
            source,
            sourceRecordId: data.sourceRecordId,
          },
        },
        create: data,
        update: {
          metricDate: data.metricDate,
          bedtimeStart: data.bedtimeStart,
          bedtimeEnd: data.bedtimeEnd,
          totalSleepSeconds: data.totalSleepSeconds,
          timeInBedSeconds: data.timeInBedSeconds,
          awakeSeconds: data.awakeSeconds,
          remSleepSeconds: data.remSleepSeconds,
          deepSleepSeconds: data.deepSleepSeconds,
          lightSleepSeconds: data.lightSleepSeconds,
          efficiency: data.efficiency,
          latencySeconds: data.latencySeconds,
          restlessPeriods: data.restlessPeriods,
          sleepScore: data.sleepScore,
          raw: data.raw,
        },
      });
    },

    createHeartRateBatch(data: Prisma.HeartRateMetricCreateManyInput[]) {
      return db.heartRateMetric.createMany({
        data,
        skipDuplicates: true,
      });
    },

    createHrvBatch(data: Prisma.HrvMetricCreateManyInput[]) {
      return db.hrvMetric.createMany({
        data,
        skipDuplicates: true,
      });
    },

    createBodyTemperatureBatch(data: Prisma.BodyTemperatureMetricCreateManyInput[]) {
      return db.bodyTemperatureMetric.createMany({
        data,
        skipDuplicates: true,
      });
    },

    findReadinessRange({ userId, from, to }: TemporalQuery) {
      return db.readinessScore.findMany({
        where: {
          userId,
          metricDate: {
            gte: from,
            lte: to,
          },
        },
        orderBy: { metricDate: "asc" },
      });
    },

    findSleepRange({ userId, from, to }: TemporalQuery) {
      return db.sleepSession.findMany({
        where: {
          userId,
          metricDate: {
            gte: from,
            lte: to,
          },
        },
        orderBy: { bedtimeStart: "asc" },
      });
    },

    findActivityRange({ userId, from, to }: TemporalQuery) {
      return db.activityMetric.findMany({
        where: {
          userId,
          metricDate: {
            gte: from,
            lte: to,
          },
        },
        orderBy: { metricDate: "asc" },
      });
    },

    findRecoveryRange({ userId, from, to }: TemporalQuery) {
      return db.recoveryMetric.findMany({
        where: {
          userId,
          metricDate: {
            gte: from,
            lte: to,
          },
        },
        orderBy: { metricDate: "asc" },
      });
    },

    findLatestRecovery(userId: string) {
      return db.recoveryMetric.findFirst({
        where: { userId },
        orderBy: { metricDate: "desc" },
      });
    },
  };
}
