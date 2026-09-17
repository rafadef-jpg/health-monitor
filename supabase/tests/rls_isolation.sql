-- ============================================================================
-- Health Monitor — RLS cross-user isolation tests
-- ----------------------------------------------------------------------------
-- Reproducible test suite for the OSS baseline security model.
-- Run against a local Supabase instance (supabase start + db reset):
--
--   Get-Content supabase/tests/rls_isolation.sql |
--     docker exec -i supabase_db_crie-um-projeto-next-js-15 \
--       psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f -
--
-- Every test raises an exception on failure and prints PASS on success.
-- ============================================================================

set client_min_messages = notice;

-- ---------------------------------------------------------------------------
-- Fixture: two auth users. Inserting into auth.users exercises the
-- on_auth_user_created trigger (test K below).
-- ---------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
) values
  ('00000000-0000-0000-0000-000000000000',
   '11111111-1111-1111-1111-111111111111',
   'authenticated', 'authenticated', 'user.a@test.local', crypt('pw', gen_salt('bf')),
   now(), now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000',
   '22222222-2222-2222-2222-222222222222',
   'authenticated', 'authenticated', 'user.b@test.local', crypt('pw', gen_salt('bf')),
   now(), now(), now(), '{}'::jsonb, '{}'::jsonb);

-- TEST K: signup trigger creates public.users rows per auth user
do $$
begin
  if (select count(*) from public.users
      where auth_user_id in ('11111111-1111-1111-1111-111111111111',
                             '22222222-2222-2222-2222-222222222222')) <> 2 then
    raise exception 'FAIL K: handle_new_user did not create public.users rows';
  end if;
  raise notice 'PASS K: signup trigger created public.users for both auth users';
end $$;

-- Seed one owned row per table for each user (as superuser)
insert into public.user_integrations (user_id, provider, access_token)
values
  ('11111111-1111-1111-1111-111111111111', 'oura', '{}'),
  ('22222222-2222-2222-2222-222222222222', 'oura', '{}');

insert into public.share_tokens (user_id, token)
values
  ('11111111-1111-1111-1111-111111111111', 'aaaa1111-aaaa-1111-aaaa-111111111111'),
  ('22222222-2222-2222-2222-222222222222', 'bbbb2222-bbbb-2222-bbbb-222222222222');

insert into public.daily_physiology_snapshot (user_id, snapshot_date, report_text)
values
  ('11111111-1111-1111-1111-111111111111', '2026-05-20', 'A snapshot'),
  ('22222222-2222-2222-2222-222222222222', '2026-05-20', 'B snapshot');

insert into public.daily_inputs (user_id, input_date)
values
  ('11111111-1111-1111-1111-111111111111', '2026-05-20'),
  ('22222222-2222-2222-2222-222222222222', '2026-05-20');

insert into public.sync_logs (user_id, sync_type, status)
values
  ('11111111-1111-1111-1111-111111111111', 'manual', 'success'),
  ('22222222-2222-2222-2222-222222222222', 'manual', 'success');

insert into public.weekly_reports (user_id, week_start, week_end, report_text)
values
  ('11111111-1111-1111-1111-111111111111', '2026-05-18', '2026-05-24', 'A report'),
  ('22222222-2222-2222-2222-222222222222', '2026-05-18', '2026-05-24', 'B report');

insert into public.user_achievements (user_id, achievement_id)
values
  ('11111111-1111-1111-1111-111111111111', 'first_sync'),
  ('22222222-2222-2222-2222-222222222222', 'first_sync');

insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
values
  ('11111111-1111-1111-1111-111111111111', 'https://push/a', 'k', 'a'),
  ('22222222-2222-2222-2222-222222222222', 'https://push/b', 'k', 'a');

insert into public.workout_sessions (user_id, session_date, exercises)
values
  ('11111111-1111-1111-1111-111111111111', '2026-05-20', '[]'),
  ('22222222-2222-2222-2222-222222222222', '2026-05-20', '[]');

insert into public.oura_raw (user_id, data_date, endpoint, raw_payload)
values
  ('11111111-1111-1111-1111-111111111111', '2026-05-20', 'daily_sleep', '{}'),
  ('22222222-2222-2222-2222-222222222222', '2026-05-20', 'daily_sleep', '{}');

-- ============================================================================
-- Authenticated cross-user tests: session acts as user A (1111...)
-- ============================================================================
do $$
declare
  n bigint;
  uid_a constant uuid := '11111111-1111-1111-1111-111111111111';
  uid_b constant uuid := '22222222-2222-2222-2222-222222222222';
begin
  set local role authenticated;
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid_a::text, 'role', 'authenticated')::text, true);

  -- TEST A: SELECT sees only own rows (all 11 tables)
  if (select count(*) from public.users) <> 1
     or (select count(*) from public.user_integrations) <> 1
     or (select count(*) from public.share_tokens) <> 1
     or (select count(*) from public.daily_physiology_snapshot) <> 1
     or (select count(*) from public.daily_inputs) <> 1
     or (select count(*) from public.sync_logs) <> 1
     or (select count(*) from public.weekly_reports) <> 1
     or (select count(*) from public.user_achievements) <> 1
     or (select count(*) from public.push_subscriptions) <> 1
     or (select count(*) from public.workout_sessions) <> 1
     or (select count(*) from public.oura_raw) <> 1 then
    raise exception 'FAIL A: cross-user rows visible to authenticated user A';
  end if;
  raise notice 'PASS A: user A sees exactly 1 own row in all 11 tables';

  -- TEST B/C: UPDATE own row allowed, cross-user UPDATE affects 0 rows
  update public.share_tokens set active = false where token = 'aaaa1111-aaaa-1111-aaaa-111111111111';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL C: own legit write blocked'; end if;
  update public.share_tokens set active = false where token = 'bbbb2222-bbbb-2222-bbbb-222222222222';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL B: cross-user UPDATE affected a row'; end if;
  update public.daily_inputs set sentimento = 5 where user_id = uid_b;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL B: cross-user UPDATE on daily_inputs affected a row'; end if;
  raise notice 'PASS B/C: cross-user UPDATE affects 0 rows; own UPDATE works';

  -- TEST D: INSERT impersonating user B must be rejected
  begin
    insert into public.daily_physiology_snapshot (user_id, snapshot_date, report_text)
    values (uid_b, '2026-05-21', 'impersonation attempt');
    raise exception 'FAIL D: cross-user INSERT was allowed';
  exception when insufficient_privilege then
    raise notice 'PASS D: cross-user INSERT rejected (42501)';
  end;

  -- TEST E/F: cross-user DELETE affects 0 rows
  delete from public.share_tokens where user_id = uid_b;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL E: cross-user UPDATE affected a row'; end if;
  raise notice 'PASS E/F: cross-user DELETE affects 0 rows';

  -- TEST G: public.users rows are created only by the signup trigger —
  -- direct client INSERT must be rejected (no INSERT policy).
  begin
    insert into public.users (auth_user_id, name, email)
    values (uid_a, 'forged', 'forged@test.local');
    raise exception 'FAIL G: client INSERT into public.users was allowed';
  exception when insufficient_privilege then
    raise notice 'PASS G: direct INSERT into public.users denied (trigger-only)';
  end;
end $$;

-- ============================================================================
-- TEST H: anon role sees nothing
-- ============================================================================
do $$
begin
  set local role anon;
  perform set_config('request.jwt.claims', '{}', true);
  if (select count(*) from public.users) <> 0
     or (select count(*) from public.user_integrations) <> 0
     or (select count(*) from public.share_tokens) <> 0
     or (select count(*) from public.daily_physiology_snapshot) <> 0
     or (select count(*) from public.daily_inputs) <> 0
     or (select count(*) from public.sync_logs) <> 0
     or (select count(*) from public.weekly_reports) <> 0
     or (select count(*) from public.user_achievements) <> 0
     or (select count(*) from public.push_subscriptions) <> 0
     or (select count(*) from public.workout_sessions) <> 0
     or (select count(*) from public.oura_raw) <> 0 then
    raise exception 'FAIL H: anon role can read app tables';
  end if;
  raise notice 'PASS H: anon role sees 0 rows in all 11 tables';
end $$;

-- Cleanup fixtures (also verifies cascade FK public.users <- auth.users)
delete from auth.users
where id in ('11111111-1111-1111-1111-111111111111',
             '22222222-2222-2222-2222-222222222222');

do $$
begin
  if exists (select 1 from public.users
             where auth_user_id in ('11111111-1111-1111-1111-111111111111',
                                    '22222222-2222-2222-2222-222222222222')) then
    raise exception 'FAIL FK: public.users rows not cascaded on auth.users delete';
  end if;
  raise notice 'PASS FK: public.users cascade-deleted with auth.users';
  raise notice 'ALL RLS ISOLATION TESTS PASSED';
end $$;
