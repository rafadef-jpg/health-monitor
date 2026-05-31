import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { AUTH_ACCESS_COOKIE } from "@/lib/auth/cookies";
import { getUserFromAccessToken } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateDailyReport } from "@/lib/report/generate";

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

function latestEntry(response: unknown): Record<string, unknown> | null {
  const data = (response as { data?: unknown[] })?.data ?? [];
  return data.length > 0 ? (data[data.length - 1] as Record<string, unknown>) : null;
}

function bestSleepSession(response: unknown, targetDate: string): Record<string, unknown> | null {
  const sessions = ((response as { data?: unknown[] })?.data ?? []) as Record<string, unknown>[];
  const withHrv = sessions.filter((s) => s.average_hrv != null);
  const onTarget = withHrv
    .filter((s) => s.day === targetDate)
    .sort((a, b) => ((b.total_sleep_duration as number) ?? 0) - ((a.total_sleep_duration as number) ?? 0));
  if (onTarget.length > 0) return onTarget[0];
  return withHrv.length > 0 ? withHrv[withHrv.length - 1] : null;
}

async function syncUser(userId: string, ouraToken: string, supabase: SupabaseClient) {
  const threeDaysAgo = isoDateOffset(-3);
  const yesterday = isoDateOffset(-1);
  const tomorrow = isoDateOffset(1);
  const today = isoDateOffset(0);

  const [readinessData, sleepData, sleepSessionData, stressData] = await Promise.all([
    fetchOura("daily_readiness", ouraToken, yesterday, today),
    fetchOura("daily_sleep", ouraToken, yesterday, today),
    fetchOura("sleep", ouraToken, threeDaysAgo, tomorrow),
    fetchOura("daily_stress", ouraToken, yesterday, today).catch(() => ({ data: [] })),
  ]);

  const rd = latestEntry(readinessData);
  const sl = latestEntry(sleepData);
  const st = latestEntry(stressData);
  const snapshotDate = (rd?.day ?? sl?.day ?? today) as string;
  const ss = bestSleepSession(sleepSessionData, snapshotDate);

  await supabase.from("oura_raw").insert([
    { user_id: userId, endpoint: "daily_readiness", date: rd?.day ?? today, payload: readinessData },
    { user_id: userId, endpoint: "daily_sleep", date: sl?.day ?? today, payload: sleepData },
    { user_id: userId, endpoint: "sleep", date: ss?.day ?? today, payload: sleepSessionData },
  ]);

  const snapshot = {
    user_id: userId,
    snapshot_date: snapshotDate,
    recovery_score: (rd?.score as number) ?? null,
    hrv_avg: (ss?.average_hrv as number) ?? null,
    rhr_bpm: (ss?.lowest_heart_rate as number) ?? null,
    sleep_dim_score: (sl?.score as number) ?? null,
    stress_score: st?.stress_high != null ? Math.round((st.stress_high as number) / 60) : null,
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
    .eq("user_id", userId)
    .eq("provider", "oura");

  await supabase.from("sync_logs").insert({
    user_id: userId,
    provider: "oura",
    status: snapshotError ? "partial" : "success",
    message: snapshotError?.message ?? "Sincronizado com sucesso.",
    synced_at: new Date().toISOString(),
  });

  return snapshot;
}

async function handleCronSync() {
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: integrations, error } = await service
    .from("user_integrations")
    .select("user_id, access_token")
    .eq("provider", "oura")
    .not("access_token", "is", null);

  if (error || !integrations?.length) {
    return NextResponse.json({ synced: 0, error: error?.message });
  }

  const results = await Promise.allSettled(
    integrations.map((i: { user_id: string; access_token: string }) =>
      syncUser(i.user_id, i.access_token, service)
    )
  );

  const ok = results.filter((r) => r.status === "fulfilled").length;
  console.log(`[oura/sync] cron: ${ok}/${integrations.length} usuários sincronizados`);

  // Gera relatório para cada usuário sincronizado com sucesso
  const reportResults = await Promise.allSettled(
    integrations.map(async (i: { user_id: string; access_token: string }) => {
      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const { data: snapshot } = await service
        .from("daily_physiology_snapshot")
        .select("recovery_score, hrv_avg, rhr_bpm, sleep_dim_score, stress_score, snapshot_date")
        .eq("user_id", i.user_id)
        .gte("snapshot_date", yesterday)
        .lte("snapshot_date", today)
        .order("snapshot_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!snapshot) return;
      await generateDailyReport(i.user_id, snapshot, service);
    })
  );

  const reportsOk = reportResults.filter((r) => r.status === "fulfilled").length;
  console.log(`[oura/sync] relatórios gerados: ${reportsOk}/${integrations.length}`);

  // Envia push notification para cada usuário
  const appUrl = process.env.APP_URL ?? "";
  await Promise.allSettled(
    integrations.map((i: { user_id: string }) =>
      fetch(`${appUrl}/api/push/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
        body: JSON.stringify({
          user_id: i.user_id,
          title: "Relatório pronto",
          body: "Seu relatório de hoje está no app.",
          url: "/dashboard",
        }),
      })
    )
  );

  return NextResponse.json({ synced: ok, total: integrations.length, reports: reportsOk });
}

export async function POST(request: Request) {
  // — Cron path —
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return handleCronSync();
  }

  // — User path (cookie) —
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

  let snapshot;
  try {
    snapshot = await syncUser(user.id, integration.access_token, supabase);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao buscar dados da Oura.";
    await supabase.from("sync_logs").insert({
      user_id: user.id,
      provider: "oura",
      status: "error",
      message,
      synced_at: new Date().toISOString(),
    });
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({ snapshot });
}
