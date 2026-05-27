import type { Prisma, PrismaClient } from "@prisma/client";

export type DbClient = PrismaClient | Prisma.TransactionClient;

export type DateRange = {
  from: Date;
  to: Date;
};

export type SupabaseUserIdentity = {
  id: string;
  email: string;
  name?: string | null;
  timezone?: string;
};

export type TemporalQuery = DateRange & {
  userId: string;
};

export type OuraRawInput = {
  userId: string;
  collection: string;
  externalId: string;
  metricDate?: Date | null;
  recordedAt?: Date | null;
  payload: Prisma.InputJsonValue;
  checksum?: string | null;
};

export type PhysiologyTimeline = {
  readiness: Awaited<ReturnType<DbClient["readinessScore"]["findMany"]>>;
  sleep: Awaited<ReturnType<DbClient["sleepSession"]["findMany"]>>;
  activity: Awaited<ReturnType<DbClient["activityMetric"]["findMany"]>>;
  recovery: Awaited<ReturnType<DbClient["recoveryMetric"]["findMany"]>>;
  alerts: Awaited<ReturnType<DbClient["alert"]["findMany"]>>;
  insights: Awaited<ReturnType<DbClient["aiInsight"]["findMany"]>>;
};
