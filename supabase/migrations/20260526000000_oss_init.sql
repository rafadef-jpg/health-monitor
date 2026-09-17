-- ============================================================================
-- Health Monitor — public OSS baseline migration
-- ----------------------------------------------------------------------------
-- Reproduces, from scratch, the database schema required by the current app:
--   users, user_integrations, share_tokens, daily_physiology_snapshot,
--   daily_inputs, sync_logs, weekly_reports, user_achievements,
--   push_subscriptions, workout_sessions, oura_raw
--
-- Intentionally NOT included (legacy objects from the production baseline):
--   - tables: activity_metrics, ai_insights, alerts, body_temperature_metrics,
--     garmin_raw, heart_rate_metrics, hrv_metrics, physiology_baselines,
--     physiology_metrics, readiness_scores, recovery_metrics, reports,
--     sleep_sessions, stress_metrics
--   - views: v_active_alerts, v_daily_dashboard, v_dashboard_today,
--     v_history_30d, v_hrv_trend_30d
--   - enums: activity_type_enum, alert_severity_enum, alert_status_enum,
--     insight_type_enum, report_type_enum, semaphore_enum
--   - column: public.users.oura_token
--   - function: public.get_current_user_id() (RLS uses auth.uid() directly)
-- ============================================================================

-- pgcrypto provides gen_random_bytes() used for share token generation.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- ----------------------------------------------------------------------------
-- Helper: touch updated_at on update
-- ----------------------------------------------------------------------------
create or replace function public.update_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.update_updated_at() from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- Signup trigger function (SECURITY DEFINER, hardened search_path)
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (
    id,
    auth_user_id,
    email,
    name
  )
  values (
    new.id,
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Trigger-only function: no direct execution by client roles.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- public.users (profile; WITHOUT legacy oura_token column)
-- ----------------------------------------------------------------------------
create table public.users (
  id                  uuid        primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  auth_user_id        uuid        not null unique references auth.users (id) on delete cascade,
  name                text        not null,
  email               text        not null unique,
  timezone            text        not null default 'America/Sao_Paulo',
  hrv_baseline_min    numeric(5,1),
  hrv_baseline_max    numeric(5,1),
  resting_hr_min      numeric(5,1),
  resting_hr_max      numeric(5,1),
  morning_report_time time        not null default '07:00:00',
  evening_report_time time        not null default '22:00:00',
  is_active           boolean     not null default true
);

comment on table public.users is 'User profile with physiological baseline and settings';

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ----------------------------------------------------------------------------
-- public.user_integrations (external provider tokens — server-side sensitive)
-- ----------------------------------------------------------------------------
create table public.user_integrations (
  id               uuid        primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  user_id          uuid        not null references public.users (id) on delete cascade,
  provider         text        not null,
  access_token     text        not null,
  refresh_token    text,
  token_expires_at timestamptz,
  is_active        boolean     not null default true,
  last_sync_at     timestamptz,
  last_sync_status text,
  last_sync_error  text,
  sync_count       integer     not null default 0,
  constraint user_integrations_provider_check
    check (provider = any (array['oura', 'garmin', 'apple_health'])),
  constraint user_integrations_last_sync_status_check
    check (last_sync_status = any (array['success', 'error', 'pending']))
);

create unique index user_integrations_user_id_provider_key
  on public.user_integrations (user_id, provider);

comment on table public.user_integrations is 'OAuth tokens and external integration status';

-- ----------------------------------------------------------------------------
-- public.share_tokens (public read-only sharing links)
-- ----------------------------------------------------------------------------
create table public.share_tokens (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users (id) on delete cascade,
  token            text        not null unique default encode(extensions.gen_random_bytes(16), 'hex'),
  label            text        default 'Personal',
  active           boolean     default true,
  created_at       timestamptz default now(),
  last_accessed_at timestamptz
);

comment on table public.share_tokens is '128-bit random tokens for public read-only share links';

-- ----------------------------------------------------------------------------
-- public.daily_physiology_snapshot (main dashboard table)
-- ----------------------------------------------------------------------------
create table public.daily_physiology_snapshot (
  id                        uuid        primary key default gen_random_uuid(),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  user_id                   uuid        not null references public.users (id) on delete cascade,
  snapshot_date             date        not null,
  recovery_score            integer,
  health_score              integer,
  cardiac_health_score      integer,
  sleep_dim_score           integer,
  stress_score              integer,
  semaphore_morning         text,
  semaphore_evening         text,
  pattern_classification    text,
  pattern_days_count        integer,
  threshold_t1_active       boolean     not null default false,
  threshold_t2_active       boolean     not null default false,
  threshold_t3_active       boolean     not null default false,
  threshold_t4_active       boolean     not null default false,
  threshold_t5_active       boolean     not null default false,
  thresholds_count_active   integer     not null default 0,
  hrv_avg                   numeric(6,2),
  hrv_baseline_7d           numeric(6,2),
  hrv_deviation_pct         numeric(5,2),
  hrv_days_below_threshold  integer     not null default 0,
  hrv_trend                 text,
  resting_hr                numeric(5,1),
  hr_baseline_7d            numeric(5,2),
  hr_delta                  numeric(5,1),
  hr_days_above_threshold   integer     not null default 0,
  sleep_hours               numeric(4,2),
  sleep_efficiency          numeric(5,2),
  sleep_deep_minutes        integer,
  sleep_rem_minutes         integer,
  sleep_score               integer,
  sleep_nights_below_6h     integer     not null default 0,
  oura_readiness            integer,
  cardiac_status            text,
  cardiac_hr_trend_7d       numeric(5,2),
  cardiac_hrv_trend_30d     numeric(5,2),
  consecutive_training_days integer     not null default 0,
  weekly_load               text,
  bp_systolic               integer,
  bp_diastolic              integer,
  medications               text,
  symptoms                  text,
  workout_type              text,
  workout_intensity         text,
  subjective_feeling        integer,
  morning_report_id         uuid,
  evening_report_id         uuid,
  morning_report_generated  boolean     not null default false,
  evening_report_generated  boolean     not null default false,
  rhr_bpm                   integer,
  report_text               text,
  constraint daily_physiology_snapshot_user_date_key unique (user_id, snapshot_date),
  constraint daily_physiology_snapshot_semaphore_morning_check
    check (semaphore_morning = any (array['green', 'yellow', 'orange', 'red'])),
  constraint daily_physiology_snapshot_semaphore_evening_check
    check (semaphore_evening = any (array['green', 'yellow', 'orange', 'red'])),
  constraint daily_physiology_snapshot_recovery_score_check
    check (recovery_score between 0 and 100),
  constraint daily_physiology_snapshot_health_score_check
    check (health_score between 0 and 100),
  constraint daily_physiology_snapshot_cardiac_health_score_check
    check (cardiac_health_score between 0 and 100),
  constraint daily_physiology_snapshot_sleep_dim_score_check
    check (sleep_dim_score between 0 and 100),
  constraint daily_physiology_snapshot_stress_score_check
    check (stress_score between 0 and 100),
  constraint daily_physiology_snapshot_cardiac_status_check
    check (cardiac_status = any (array['good', 'attention', 'pressure', 'critical'])),
  constraint daily_physiology_snapshot_hrv_trend_check
    check (hrv_trend = any (array['rising', 'stable', 'falling'])),
  constraint daily_physiology_snapshot_pattern_classification_check
    check (pattern_classification = any (array['transitory', 'accumulated', 'persistent'])),
  constraint daily_physiology_snapshot_subjective_feeling_check
    check (subjective_feeling between 1 and 5),
  constraint daily_physiology_snapshot_weekly_load_check
    check (weekly_load = any (array['low', 'moderate', 'high', 'very_high'])),
  constraint daily_physiology_snapshot_workout_intensity_check
    check (workout_intensity = any (array['light', 'moderate', 'intense']))
);

comment on table public.daily_physiology_snapshot is 'Denormalized daily snapshot — main dashboard table';

-- ----------------------------------------------------------------------------
-- public.daily_inputs
-- ----------------------------------------------------------------------------
create table public.daily_inputs (
  id                 uuid        primary key default gen_random_uuid(),
  user_id            uuid        not null references auth.users (id) on delete cascade,
  input_date         date        not null default current_date,
  pressao_sistolica  integer,
  pressao_diastolica integer,
  medicamentos       text,
  sintomas           text,
  sentimento         integer,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now(),
  constraint daily_inputs_user_date_key unique (user_id, input_date),
  constraint daily_inputs_sentimento_check
    check (sentimento between 1 and 5)
);

-- ----------------------------------------------------------------------------
-- public.sync_logs
-- ----------------------------------------------------------------------------
create table public.sync_logs (
  id              uuid        primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  user_id         uuid        references public.users (id) on delete set null,
  sync_type       text        not null,
  provider        text        not null default 'oura',
  status          text        not null,
  started_at      timestamptz not null default now(),
  finished_at     timestamptz,
  duration_ms     integer,
  data_date       date,
  records_fetched integer     not null default 0,
  records_saved   integer     not null default 0,
  error_code      text,
  error_message   text,
  retry_count     integer     not null default 0,
  github_run_id   text,
  ip_address      text,
  constraint sync_logs_status_check
    check (status = any (array['started', 'success', 'error', 'partial'])),
  constraint sync_logs_sync_type_check
    check (sync_type = any (array['morning', 'evening', 'manual', 'backfill']))
);

comment on table public.sync_logs is 'Execution log for sync jobs — debugging and monitoring';

-- ----------------------------------------------------------------------------
-- public.weekly_reports
-- ----------------------------------------------------------------------------
create table public.weekly_reports (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users (id) on delete cascade,
  week_start    date        not null,
  week_end      date        not null,
  report_text   text        not null,
  dias_verde    integer     default 0,
  dias_amarelo  integer     default 0,
  dias_laranja  integer     default 0,
  dias_vermelho integer     default 0,
  hrv_media     numeric,
  fc_media      numeric,
  sono_media    numeric,
  created_at    timestamptz default now(),
  constraint weekly_reports_user_week_key unique (user_id, week_start)
);

-- ----------------------------------------------------------------------------
-- public.user_achievements
-- ----------------------------------------------------------------------------
create table public.user_achievements (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references auth.users (id) on delete cascade,
  achievement_id text        not null,
  unlocked_at    timestamptz default now(),
  constraint user_achievements_user_achievement_key unique (user_id, achievement_id)
);

-- ----------------------------------------------------------------------------
-- public.push_subscriptions
-- ----------------------------------------------------------------------------
create table public.push_subscriptions (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users (id) on delete cascade,
  endpoint   text        not null,
  p256dh     text        not null,
  auth       text        not null,
  created_at timestamptz default now(),
  constraint push_subscriptions_user_endpoint_key unique (user_id, endpoint)
);

-- ----------------------------------------------------------------------------
-- public.workout_sessions
-- ----------------------------------------------------------------------------
create table public.workout_sessions (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users (id) on delete cascade,
  session_date     date        not null default current_date,
  exercises        jsonb       not null default '[]'::jsonb,
  notes            text,
  duration_minutes integer,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  constraint workout_sessions_user_date_key unique (user_id, session_date)
);

-- ----------------------------------------------------------------------------
-- public.oura_raw (raw Oura API payloads for reprocessing)
-- ----------------------------------------------------------------------------
create table public.oura_raw (
  id            uuid        primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  user_id       uuid        not null references public.users (id) on delete cascade,
  fetched_at    timestamptz not null default now(),
  data_date     date        not null,
  endpoint      text        not null,
  raw_payload   jsonb       not null,
  is_processed  boolean     not null default false,
  processed_at  timestamptz,
  error_message text,
  constraint oura_raw_user_date_endpoint_key unique (user_id, data_date, endpoint)
);

comment on table public.oura_raw is 'Raw Oura API JSON payloads for reprocessing';


-- ----------------------------------------------------------------------------
-- Indexes (from the audited production baseline)
-- ----------------------------------------------------------------------------
create index idx_users_auth_user_id on public.users using btree (auth_user_id);
create index idx_users_email on public.users using btree (email);

create index idx_user_integrations_user_id on public.user_integrations using btree (user_id);
create index idx_user_integrations_provider on public.user_integrations using btree (provider);
create index idx_user_integrations_active on public.user_integrations using btree (user_id, is_active)
  where is_active = true;

create index idx_daily_snapshot_user_id on public.daily_physiology_snapshot using btree (user_id);
create index idx_daily_snapshot_user_date on public.daily_physiology_snapshot using btree (user_id, snapshot_date desc);
create index idx_daily_snapshot_date on public.daily_physiology_snapshot using btree (snapshot_date desc);
create index idx_daily_snapshot_pattern on public.daily_physiology_snapshot using btree (user_id, pattern_classification);
create index idx_daily_snapshot_semaphore on public.daily_physiology_snapshot using btree (semaphore_morning, semaphore_evening);
create index idx_daily_snapshot_thresholds on public.daily_physiology_snapshot using btree (user_id, thresholds_count_active)
  where thresholds_count_active > 0;

create index idx_sync_logs_user_id on public.sync_logs using btree (user_id);
create index idx_sync_logs_date on public.sync_logs using btree (created_at desc);
create index idx_sync_logs_status on public.sync_logs using btree (status);
create index idx_sync_logs_errors on public.sync_logs using btree (status)
  where status = 'error';

create index idx_oura_raw_user_id on public.oura_raw using btree (user_id);
create index idx_oura_raw_user_date on public.oura_raw using btree (user_id, data_date desc);
create index idx_oura_raw_date on public.oura_raw using btree (data_date desc);
create index idx_oura_raw_endpoint on public.oura_raw using btree (endpoint);
create index idx_oura_raw_unprocessed on public.oura_raw using btree (is_processed)
  where is_processed = false;

-- ----------------------------------------------------------------------------
-- updated_at triggers
-- ----------------------------------------------------------------------------
create trigger users_updated_at
  before update on public.users
  for each row execute function public.update_updated_at();

create trigger user_integrations_updated_at
  before update on public.user_integrations
  for each row execute function public.update_updated_at();

create trigger daily_physiology_snapshot_updated_at
  before update on public.daily_physiology_snapshot
  for each row execute function public.update_updated_at();

create trigger daily_inputs_updated_at
  before update on public.daily_inputs
  for each row execute function public.update_updated_at();

create trigger workout_sessions_updated_at
  before update on public.workout_sessions
  for each row execute function public.update_updated_at();


-- ============================================================================
-- ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
-- Rules:
--   * public.users rows are matched by auth_user_id (Supabase auth user id).
--   * child tables are matched by user_id.
--   * policies apply to the `authenticated` role only; `anon` has no access.
--   * public share links are served exclusively server-side (service role),
--     after token validation — never via anon/authenticated policies.
--   * service_role bypasses RLS by design (server-only, never in the browser).
-- ============================================================================

alter table public.users                     enable row level security;
alter table public.user_integrations         enable row level security;
alter table public.share_tokens              enable row level security;
alter table public.daily_physiology_snapshot enable row level security;
alter table public.daily_inputs              enable row level security;
alter table public.sync_logs                 enable row level security;
alter table public.weekly_reports            enable row level security;
alter table public.user_achievements         enable row level security;
alter table public.push_subscriptions        enable row level security;
alter table public.workout_sessions          enable row level security;
alter table public.oura_raw                  enable row level security;

-- public.users ---------------------------------------------------------------
-- INSERT happens only through the on_auth_user_created trigger
-- (security definer). No client-side INSERT/DELETE.

create policy users_select_own on public.users
  for select to authenticated
  using (auth.uid() = auth_user_id);

create policy users_update_own on public.users
  for update to authenticated
  using (auth.uid() = auth_user_id)
  with check (auth.uid() = auth_user_id);

-- public.user_integrations ---------------------------------------------------

create policy user_integrations_select_own on public.user_integrations
  for select to authenticated
  using (auth.uid() = user_id);

create policy user_integrations_insert_own on public.user_integrations
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy user_integrations_update_own on public.user_integrations
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- public.share_tokens ----------------------------------------------------------
-- last_accessed_at is bumped server-side (service role) after public token
-- validation; the owner can still UPDATE their own rows (e.g. revoke a link).

create policy share_tokens_select_own on public.share_tokens
  for select to authenticated
  using (auth.uid() = user_id);

create policy share_tokens_insert_own on public.share_tokens
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy share_tokens_update_own on public.share_tokens
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy share_tokens_delete_own on public.share_tokens
  for delete to authenticated
  using (auth.uid() = user_id);


-- public.daily_physiology_snapshot ---------------------------------------------

create policy daily_snapshot_select_own on public.daily_physiology_snapshot
  for select to authenticated
  using (auth.uid() = user_id);

create policy daily_snapshot_insert_own on public.daily_physiology_snapshot
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy daily_snapshot_update_own on public.daily_physiology_snapshot
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- public.daily_inputs ----------------------------------------------------------

create policy daily_inputs_select_own on public.daily_inputs
  for select to authenticated
  using (auth.uid() = user_id);

create policy daily_inputs_insert_own on public.daily_inputs
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy daily_inputs_update_own on public.daily_inputs
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- public.sync_logs ---------------------------------------------------------------

create policy sync_logs_select_own on public.sync_logs
  for select to authenticated
  using (auth.uid() = user_id);

create policy sync_logs_insert_own on public.sync_logs
  for insert to authenticated
  with check (auth.uid() = user_id);

-- public.weekly_reports ----------------------------------------------------------

create policy weekly_reports_select_own on public.weekly_reports
  for select to authenticated
  using (auth.uid() = user_id);

create policy weekly_reports_insert_own on public.weekly_reports
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy weekly_reports_update_own on public.weekly_reports
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- public.user_achievements ---------------------------------------------------------

create policy user_achievements_select_own on public.user_achievements
  for select to authenticated
  using (auth.uid() = user_id);

create policy user_achievements_insert_own on public.user_achievements
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy user_achievements_update_own on public.user_achievements
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- public.push_subscriptions ----------------------------------------------------------

create policy push_subscriptions_select_own on public.push_subscriptions
  for select to authenticated
  using (auth.uid() = user_id);

create policy push_subscriptions_insert_own on public.push_subscriptions
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy push_subscriptions_update_own on public.push_subscriptions
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- public.workout_sessions --------------------------------------------------------------

create policy workout_sessions_select_own on public.workout_sessions
  for select to authenticated
  using (auth.uid() = user_id);

create policy workout_sessions_insert_own on public.workout_sessions
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy workout_sessions_update_own on public.workout_sessions
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- public.oura_raw ----------------------------------------------------------------------
-- Raw payloads are written during sync; reads are server-side (service role).

create policy oura_raw_insert_own on public.oura_raw
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy oura_raw_select_own on public.oura_raw
  for select to authenticated
  using (auth.uid() = user_id);

