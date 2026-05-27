-- EnableExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- CreateEnum
CREATE TYPE "MetricSource" AS ENUM ('OURA', 'GARMIN', 'MANUAL', 'AI', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'READY', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "InsightStatus" AS ENUM ('PENDING', 'REVIEWED', 'APPLIED', 'DISMISSED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "oura_external_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "physiology_metrics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "metric_date" DATE NOT NULL,
    "recorded_at" TIMESTAMPTZ(6) NOT NULL,
    "source" "MetricSource" NOT NULL DEFAULT 'OURA',
    "source_record_id" TEXT,
    "summary" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "physiology_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sleep_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "physiology_metric_id" UUID,
    "metric_date" DATE NOT NULL,
    "source" "MetricSource" NOT NULL DEFAULT 'OURA',
    "source_record_id" TEXT,
    "bedtime_start" TIMESTAMPTZ(6) NOT NULL,
    "bedtime_end" TIMESTAMPTZ(6) NOT NULL,
    "total_sleep_seconds" INTEGER,
    "time_in_bed_seconds" INTEGER,
    "awake_seconds" INTEGER,
    "rem_sleep_seconds" INTEGER,
    "deep_sleep_seconds" INTEGER,
    "light_sleep_seconds" INTEGER,
    "efficiency" DOUBLE PRECISION,
    "latency_seconds" INTEGER,
    "restless_periods" INTEGER,
    "sleep_score" INTEGER,
    "raw" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sleep_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "readiness_scores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "physiology_metric_id" UUID,
    "metric_date" DATE NOT NULL,
    "source" "MetricSource" NOT NULL DEFAULT 'OURA',
    "source_record_id" TEXT,
    "score" INTEGER,
    "temperature_deviation" DOUBLE PRECISION,
    "resting_heart_rate" INTEGER,
    "hrv_balance" INTEGER,
    "sleep_balance" INTEGER,
    "previous_day_activity" INTEGER,
    "activity_balance" INTEGER,
    "recovery_index" INTEGER,
    "raw" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "readiness_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stress_metrics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "physiology_metric_id" UUID,
    "metric_date" DATE NOT NULL,
    "recorded_at" TIMESTAMPTZ(6) NOT NULL,
    "source" "MetricSource" NOT NULL DEFAULT 'OURA',
    "source_record_id" TEXT,
    "stress_high_seconds" INTEGER,
    "stress_medium_seconds" INTEGER,
    "stress_low_seconds" INTEGER,
    "recovery_seconds" INTEGER,
    "day_summary" TEXT,
    "raw" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stress_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_metrics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "physiology_metric_id" UUID,
    "metric_date" DATE NOT NULL,
    "source" "MetricSource" NOT NULL DEFAULT 'OURA',
    "source_record_id" TEXT,
    "score" INTEGER,
    "steps" INTEGER,
    "active_calories" INTEGER,
    "total_calories" INTEGER,
    "equivalent_walking_km" DOUBLE PRECISION,
    "high_activity_seconds" INTEGER,
    "medium_activity_seconds" INTEGER,
    "low_activity_seconds" INTEGER,
    "sedentary_seconds" INTEGER,
    "target_calories" INTEGER,
    "raw" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "heart_rate_metrics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "physiology_metric_id" UUID,
    "metric_date" DATE NOT NULL,
    "recorded_at" TIMESTAMPTZ(6) NOT NULL,
    "source" "MetricSource" NOT NULL DEFAULT 'OURA',
    "source_record_id" TEXT,
    "bpm" INTEGER NOT NULL,
    "context" TEXT,
    "raw" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "heart_rate_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hrv_metrics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "physiology_metric_id" UUID,
    "metric_date" DATE NOT NULL,
    "recorded_at" TIMESTAMPTZ(6) NOT NULL,
    "source" "MetricSource" NOT NULL DEFAULT 'OURA',
    "source_record_id" TEXT,
    "rmssd" DOUBLE PRECISION,
    "sdnn" DOUBLE PRECISION,
    "coverage" TEXT,
    "raw" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hrv_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "body_temperature_metrics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "physiology_metric_id" UUID,
    "metric_date" DATE NOT NULL,
    "recorded_at" TIMESTAMPTZ(6) NOT NULL,
    "source" "MetricSource" NOT NULL DEFAULT 'OURA',
    "source_record_id" TEXT,
    "temperature_celsius" DOUBLE PRECISION,
    "deviation_celsius" DOUBLE PRECISION,
    "raw" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "body_temperature_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recovery_metrics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "physiology_metric_id" UUID,
    "metric_date" DATE NOT NULL,
    "source" "MetricSource" NOT NULL DEFAULT 'OURA',
    "source_record_id" TEXT,
    "recovery_score" INTEGER,
    "readiness_score" INTEGER,
    "sleep_score" INTEGER,
    "resting_heart_rate" INTEGER,
    "hrv_rmssd" DOUBLE PRECISION,
    "temperature_deviation" DOUBLE PRECISION,
    "interpretation" TEXT,
    "raw" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recovery_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oura_raw" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "collection" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "metric_date" DATE,
    "recorded_at" TIMESTAMPTZ(6),
    "payload" JSONB NOT NULL,
    "checksum" TEXT,
    "ingested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oura_raw_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "content" JSONB NOT NULL,
    "generated_by" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "metric_date" DATE,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'INFO',
    "status" "AlertStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "signal_type" TEXT,
    "metadata" JSONB,
    "triggered_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_insights" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "report_id" UUID,
    "metric_date" DATE,
    "status" "InsightStatus" NOT NULL DEFAULT 'PENDING',
    "model" TEXT NOT NULL,
    "prompt_hash" TEXT,
    "insight_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "evidence" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_insights_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_oura_external_id_key" ON "users"("oura_external_id");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "physiology_metrics_user_id_metric_date_idx" ON "physiology_metrics"("user_id", "metric_date");

-- CreateIndex
CREATE INDEX "physiology_metrics_user_id_recorded_at_idx" ON "physiology_metrics"("user_id", "recorded_at");

-- CreateIndex
CREATE UNIQUE INDEX "physiology_metrics_user_id_source_recorded_at_key" ON "physiology_metrics"("user_id", "source", "recorded_at");

-- CreateIndex
CREATE UNIQUE INDEX "physiology_metrics_user_id_source_source_record_id_key" ON "physiology_metrics"("user_id", "source", "source_record_id");

-- CreateIndex
CREATE UNIQUE INDEX "sleep_sessions_physiology_metric_id_key" ON "sleep_sessions"("physiology_metric_id");

-- CreateIndex
CREATE INDEX "sleep_sessions_user_id_metric_date_idx" ON "sleep_sessions"("user_id", "metric_date");

-- CreateIndex
CREATE INDEX "sleep_sessions_user_id_bedtime_start_idx" ON "sleep_sessions"("user_id", "bedtime_start");

-- CreateIndex
CREATE UNIQUE INDEX "sleep_sessions_user_id_source_source_record_id_key" ON "sleep_sessions"("user_id", "source", "source_record_id");

-- CreateIndex
CREATE UNIQUE INDEX "readiness_scores_physiology_metric_id_key" ON "readiness_scores"("physiology_metric_id");

-- CreateIndex
CREATE INDEX "readiness_scores_user_id_metric_date_idx" ON "readiness_scores"("user_id", "metric_date");

-- CreateIndex
CREATE UNIQUE INDEX "readiness_scores_user_id_source_metric_date_key" ON "readiness_scores"("user_id", "source", "metric_date");

-- CreateIndex
CREATE UNIQUE INDEX "readiness_scores_user_id_source_source_record_id_key" ON "readiness_scores"("user_id", "source", "source_record_id");

-- CreateIndex
CREATE UNIQUE INDEX "stress_metrics_physiology_metric_id_key" ON "stress_metrics"("physiology_metric_id");

-- CreateIndex
CREATE INDEX "stress_metrics_user_id_metric_date_idx" ON "stress_metrics"("user_id", "metric_date");

-- CreateIndex
CREATE INDEX "stress_metrics_user_id_recorded_at_idx" ON "stress_metrics"("user_id", "recorded_at");

-- CreateIndex
CREATE UNIQUE INDEX "stress_metrics_user_id_source_metric_date_key" ON "stress_metrics"("user_id", "source", "metric_date");

-- CreateIndex
CREATE UNIQUE INDEX "stress_metrics_user_id_source_source_record_id_key" ON "stress_metrics"("user_id", "source", "source_record_id");

-- CreateIndex
CREATE UNIQUE INDEX "activity_metrics_physiology_metric_id_key" ON "activity_metrics"("physiology_metric_id");

-- CreateIndex
CREATE INDEX "activity_metrics_user_id_metric_date_idx" ON "activity_metrics"("user_id", "metric_date");

-- CreateIndex
CREATE UNIQUE INDEX "activity_metrics_user_id_source_metric_date_key" ON "activity_metrics"("user_id", "source", "metric_date");

-- CreateIndex
CREATE UNIQUE INDEX "activity_metrics_user_id_source_source_record_id_key" ON "activity_metrics"("user_id", "source", "source_record_id");

-- CreateIndex
CREATE UNIQUE INDEX "heart_rate_metrics_physiology_metric_id_key" ON "heart_rate_metrics"("physiology_metric_id");

-- CreateIndex
CREATE INDEX "heart_rate_metrics_user_id_metric_date_idx" ON "heart_rate_metrics"("user_id", "metric_date");

-- CreateIndex
CREATE INDEX "heart_rate_metrics_user_id_recorded_at_idx" ON "heart_rate_metrics"("user_id", "recorded_at");

-- CreateIndex
CREATE UNIQUE INDEX "heart_rate_metrics_user_id_source_recorded_at_context_key" ON "heart_rate_metrics"("user_id", "source", "recorded_at", "context");

-- CreateIndex
CREATE UNIQUE INDEX "heart_rate_metrics_user_id_source_source_record_id_key" ON "heart_rate_metrics"("user_id", "source", "source_record_id");

-- CreateIndex
CREATE UNIQUE INDEX "hrv_metrics_physiology_metric_id_key" ON "hrv_metrics"("physiology_metric_id");

-- CreateIndex
CREATE INDEX "hrv_metrics_user_id_metric_date_idx" ON "hrv_metrics"("user_id", "metric_date");

-- CreateIndex
CREATE INDEX "hrv_metrics_user_id_recorded_at_idx" ON "hrv_metrics"("user_id", "recorded_at");

-- CreateIndex
CREATE UNIQUE INDEX "hrv_metrics_user_id_source_recorded_at_key" ON "hrv_metrics"("user_id", "source", "recorded_at");

-- CreateIndex
CREATE UNIQUE INDEX "hrv_metrics_user_id_source_source_record_id_key" ON "hrv_metrics"("user_id", "source", "source_record_id");

-- CreateIndex
CREATE UNIQUE INDEX "body_temperature_metrics_physiology_metric_id_key" ON "body_temperature_metrics"("physiology_metric_id");

-- CreateIndex
CREATE INDEX "body_temperature_metrics_user_id_metric_date_idx" ON "body_temperature_metrics"("user_id", "metric_date");

-- CreateIndex
CREATE INDEX "body_temperature_metrics_user_id_recorded_at_idx" ON "body_temperature_metrics"("user_id", "recorded_at");

-- CreateIndex
CREATE UNIQUE INDEX "body_temperature_metrics_user_id_source_recorded_at_key" ON "body_temperature_metrics"("user_id", "source", "recorded_at");

-- CreateIndex
CREATE UNIQUE INDEX "body_temperature_metrics_user_id_source_source_record_id_key" ON "body_temperature_metrics"("user_id", "source", "source_record_id");

-- CreateIndex
CREATE UNIQUE INDEX "recovery_metrics_physiology_metric_id_key" ON "recovery_metrics"("physiology_metric_id");

-- CreateIndex
CREATE INDEX "recovery_metrics_user_id_metric_date_idx" ON "recovery_metrics"("user_id", "metric_date");

-- CreateIndex
CREATE UNIQUE INDEX "recovery_metrics_user_id_source_metric_date_key" ON "recovery_metrics"("user_id", "source", "metric_date");

-- CreateIndex
CREATE UNIQUE INDEX "recovery_metrics_user_id_source_source_record_id_key" ON "recovery_metrics"("user_id", "source", "source_record_id");

-- CreateIndex
CREATE INDEX "oura_raw_user_id_collection_idx" ON "oura_raw"("user_id", "collection");

-- CreateIndex
CREATE INDEX "oura_raw_user_id_metric_date_idx" ON "oura_raw"("user_id", "metric_date");

-- CreateIndex
CREATE INDEX "oura_raw_user_id_ingested_at_idx" ON "oura_raw"("user_id", "ingested_at");

-- CreateIndex
CREATE UNIQUE INDEX "oura_raw_user_id_collection_external_id_key" ON "oura_raw"("user_id", "collection", "external_id");

-- CreateIndex
CREATE INDEX "reports_user_id_period_start_period_end_idx" ON "reports"("user_id", "period_start", "period_end");

-- CreateIndex
CREATE INDEX "reports_user_id_created_at_idx" ON "reports"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "alerts_user_id_status_triggered_at_idx" ON "alerts"("user_id", "status", "triggered_at");

-- CreateIndex
CREATE INDEX "alerts_user_id_metric_date_idx" ON "alerts"("user_id", "metric_date");

-- CreateIndex
CREATE INDEX "ai_insights_user_id_metric_date_idx" ON "ai_insights"("user_id", "metric_date");

-- CreateIndex
CREATE INDEX "ai_insights_user_id_insight_type_created_at_idx" ON "ai_insights"("user_id", "insight_type", "created_at");

-- CreateIndex
CREATE INDEX "ai_insights_report_id_idx" ON "ai_insights"("report_id");

-- AddForeignKey
ALTER TABLE "physiology_metrics" ADD CONSTRAINT "physiology_metrics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sleep_sessions" ADD CONSTRAINT "sleep_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sleep_sessions" ADD CONSTRAINT "sleep_sessions_physiology_metric_id_fkey" FOREIGN KEY ("physiology_metric_id") REFERENCES "physiology_metrics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "readiness_scores" ADD CONSTRAINT "readiness_scores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "readiness_scores" ADD CONSTRAINT "readiness_scores_physiology_metric_id_fkey" FOREIGN KEY ("physiology_metric_id") REFERENCES "physiology_metrics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stress_metrics" ADD CONSTRAINT "stress_metrics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stress_metrics" ADD CONSTRAINT "stress_metrics_physiology_metric_id_fkey" FOREIGN KEY ("physiology_metric_id") REFERENCES "physiology_metrics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_metrics" ADD CONSTRAINT "activity_metrics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_metrics" ADD CONSTRAINT "activity_metrics_physiology_metric_id_fkey" FOREIGN KEY ("physiology_metric_id") REFERENCES "physiology_metrics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "heart_rate_metrics" ADD CONSTRAINT "heart_rate_metrics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "heart_rate_metrics" ADD CONSTRAINT "heart_rate_metrics_physiology_metric_id_fkey" FOREIGN KEY ("physiology_metric_id") REFERENCES "physiology_metrics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hrv_metrics" ADD CONSTRAINT "hrv_metrics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hrv_metrics" ADD CONSTRAINT "hrv_metrics_physiology_metric_id_fkey" FOREIGN KEY ("physiology_metric_id") REFERENCES "physiology_metrics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "body_temperature_metrics" ADD CONSTRAINT "body_temperature_metrics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "body_temperature_metrics" ADD CONSTRAINT "body_temperature_metrics_physiology_metric_id_fkey" FOREIGN KEY ("physiology_metric_id") REFERENCES "physiology_metrics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recovery_metrics" ADD CONSTRAINT "recovery_metrics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recovery_metrics" ADD CONSTRAINT "recovery_metrics_physiology_metric_id_fkey" FOREIGN KEY ("physiology_metric_id") REFERENCES "physiology_metrics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oura_raw" ADD CONSTRAINT "oura_raw_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_insights" ADD CONSTRAINT "ai_insights_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_insights" ADD CONSTRAINT "ai_insights_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

