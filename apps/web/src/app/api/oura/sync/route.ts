import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_ACCESS_COOKIE } from "@/lib/auth/cookies";
import { getUserFromAccessToken } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const OURA_BASE = "https://api.ouraring.com/v2/usercollection";

type OuraEndpoint = "daily_readiness" | "daily_sleep" | "sleep" | "daily_stress";

async function fetchOura(endpoint: OuraEndpoint, token: string, startDate: string, endDate: string) {
  const url = `${OURA_BASE}/${endpoint}?start_date=${startDate}&end_date=${endDate}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Oura ${endpoint} retornou ${res.status}`);
  return res.json();
}

function isoDateOffset(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function latestEntry(response: any): any {
  const data: any[] = response?.data ?? [];
  return data.length > 0 ? data[data.length - 1] : null;
}

function bestSleepSession(response: any, targetDate: string): any {
  const sessions: any[] = response?.data ?? [];
  const withHrv = sessions.filter((s) => s.average_hrv != null);
  // prefer session matching target date, longest duration first
  const onTarget = withHrv
    .filter((s) => s.day === targetDate)
    .sort((a, b) => (b.total_sleep_duration ?? 0) - (a.total_sleep_duration ?? 0));
  if (onTarget.length > 0) return onTarget[0];
  // fallback: most recent session with valid HRV
  return withHrv.length > 0 ? withHrv[withHrv.length - 1] : null;
}

export async function POST() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_ACCESS_COOKIE)?.value;
  const user = await getUserFromAccessToken(accessToken);

  if (!user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const supabase = createSupabaseServerClient(accessToken);

  const { data: integration } = await supabase
    .from("user_integrations")
    .select("access_token")
    .eq("user_id", user.id)
    .eq("provider", "oura")
    .maybeSingle();

  if (!integration?.access_token) {
    return NextResponse.json({ error: "Token Oura não configurado." }, { status: 400 });
  }

  const threeDaysAgo = isoDateOffset(-3);
  const yesterday = isoDateOffset(-1);
  const tomorrow = isoDateOffset(1);
  const today = isoDateOffset(0);
  const ouraToken = integration.access_token;

  let readinessData: unknown, sleepData: unknown, sleepSessionData: unknown, stressData: unknown;
  let fetchError: string | null = null;

  try {
    [readinessData, sleepData, sleepSessionData, stressData] = await Promise.all([
      fetchOura("daily_readiness", ouraToken, yesterday, today),
      fetchOura("daily_sleep", ouraToken, yesterday, today),
      fetchOura("sleep", ouraToken, threeDaysAgo, tomorrow),
      fetchOura("daily_stress", ouraToken, yesterday, today).catch(() => ({ data: [] })),
    ]);
  } catch (err) {
    fetchError = err instanceof Error ? err.message : "Erro ao buscar dados da Oura.";
  }

  if (fetchError) {
    await supabase.from("sync_logs").insert({
      user_id: user.id,
      provider: "oura",
      status: "error",
      message: fetchError,
      synced_at: new Date().toISOString(),
    });
    return NextResponse.json({ error: fetchError }, { status: 502 });
  }

  const rd = latestEntry(readinessData);
  const sl = latestEntry(sleepData);
  const st = latestEntry(stressData);
  const snapshotDate = rd?.day ?? sl?.day ?? today;
  const ss = bestSleepSession(sleepSessionData, snapshotDate);

  await supabase.from("oura_raw").insert([
    { user_id: user.id, endpoint: "daily_readiness", date: rd?.day ?? today, payload: readinessData },
    { user_id: user.id, endpoint: "daily_sleep", date: sl?.day ?? today, payload: sleepData },
    { user_id: user.id, endpoint: "sleep", date: ss?.day ?? today, payload: sleepSessionData },
  ]);

  const snapshot = {
    user_id: user.id,
    snapshot_date: snapshotDate,
    recovery_score: rd?.score ?? null,
    hrv_avg: ss?.average_hrv ?? null,
    rhr_bpm: ss?.lowest_heart_rate ?? null,
    sleep_dim_score: sl?.score ?? null,
    stress_score: st?.stress_high != null ? Math.round(st.stress_high / 60) : null,
    updated_at: new Date().toISOString(),
  };

  const { error: snapshotError } = await supabase
    .from("daily_physiology_snapshot")
    .upsert(snapshot, { onConflict: "user_id,snapshot_date" });

  if (snapshotError) {
    console.error("[oura/sync] snapshot error:", snapshotError.code, snapshotError.message);
  } else {
    console.log("[oura/sync] snapshot salvo:", JSON.stringify(snapshot));
  }

  await supabase
    .from("user_integrations")
    .update({ last_sync_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("provider", "oura");

  await supabase.from("sync_logs").insert({
    user_id: user.id,
    provider: "oura",
    status: snapshotError ? "partial" : "success",
    message: snapshotError?.message ?? "Sincronizado com sucesso.",
    synced_at: new Date().toISOString(),
  });

  return NextResponse.json({ snapshot });
}
