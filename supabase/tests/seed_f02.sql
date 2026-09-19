-- F-02 empirical cache test seed (FICTIONAL data only, local DB).
-- Creates: one auth user, today's physiology snapshot, one active share token.
\set ON_ERROR_STOP on

begin;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
) values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated', 'authenticated', 'f02-test@example.invalid',
  crypt('not-used-in-test', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"F02 Test"}'::jsonb
)
on conflict (id) do nothing;

insert into public.daily_physiology_snapshot
  (user_id, snapshot_date, recovery_score, hrv_avg, rhr_bpm, sleep_dim_score, stress_score, report_text)
values
  ('11111111-1111-1111-1111-111111111111', current_date,
   82, 72.5, 48, 91, 3, 'RELATORIO_FICTICIO_F02_MARCADOR')
on conflict (user_id, snapshot_date) do update
set recovery_score = 82, report_text = 'RELATORIO_FICTICIO_F02_MARCADOR';

insert into public.share_tokens (user_id, token, label, active)
values ('11111111-1111-1111-1111-111111111111', 'f02testtoken1234567890abcdef00', 'F02 Test', true)
on conflict (token) do update set active = true;

commit;
