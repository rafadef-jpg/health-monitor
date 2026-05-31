import Link from "next/link";
import { cookies } from "next/headers";
import { Activity, Moon, Zap, Wind, Settings } from "lucide-react";
import { AUTH_ACCESS_COOKIE } from "@/lib/auth/cookies";
import { getUserFromAccessToken } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SyncButton } from "@/components/dashboard/sync-button";
import { ReportPanel } from "@/components/dashboard/report-panel";
import { PushButton } from "@/components/dashboard/push-button";
import { calcRecovery } from "@repo/physiology";

type Snapshot = {
  recovery_score: number | null;
  hrv_avg: number | null;
  rhr_bpm: number | null;
  sleep_dim_score: number | null;
  stress_score: number | null;
  snapshot_date: string;
  report_text: string | null;
};

const SEMAPHORE_COLOR: Record<string, string> = {
  green: "text-green-500",
  yellow: "text-yellow-500",
  orange: "text-orange-500",
  red: "text-red-500",
};

const SEMAPHORE_LABEL: Record<string, string> = {
  green: "Ótimo",
  yellow: "Regular",
  orange: "Atenção",
  red: "Crítico",
};

const SEMAPHORE_DOT: Record<string, string> = {
  green: "bg-green-400",
  yellow: "bg-yellow-400",
  orange: "bg-orange-400",
  red: "bg-red-400",
};

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_ACCESS_COOKIE)?.value;
  const user = await getUserFromAccessToken(accessToken);

  let snapshot: Snapshot | null = null;
  let weeklyReport: { report_text: string; week_start: string; week_end: string; dias_verde: number; dias_amarelo: number; dias_laranja: number; dias_vermelho: number } | null = null;
  let streak = 0;

  if (user) {
    const supabase = createSupabaseServerClient(accessToken);
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

    const [snapshotResult, weeklyResult, streakResult] = await Promise.all([
      supabase
        .from("daily_physiology_snapshot")
        .select("recovery_score, hrv_avg, rhr_bpm, sleep_dim_score, stress_score, snapshot_date, report_text")
        .eq("user_id", user.id)
        .gte("snapshot_date", twoDaysAgo)
        .order("snapshot_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("weekly_reports")
        .select("report_text, week_start, week_end, dias_verde, dias_amarelo, dias_laranja, dias_vermelho")
        .eq("user_id", user.id)
        .order("week_start", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("daily_physiology_snapshot")
        .select("snapshot_date")
        .eq("user_id", user.id)
        .gte("snapshot_date", thirtyDaysAgo)
        .order("snapshot_date", { ascending: false }),
    ]);

    snapshot = snapshotResult.data ?? null;
    weeklyReport = weeklyResult.data ?? null;

    // Calcula streak de dias consecutivos
    const dates = (streakResult.data ?? []).map((d: { snapshot_date: string }) => d.snapshot_date);
    let count = 0;
    let expected = new Date();
    expected.setHours(12, 0, 0, 0);
    for (const date of dates) {
      const d = new Date(date + "T12:00:00");
      const diff = Math.round((expected.getTime() - d.getTime()) / 86400000);
      if (diff <= 1) { count++; expected = d; }
      else break;
    }
    streak = count;
  }

  const engineResult = snapshot
    ? calcRecovery({ hrv_ms: snapshot.hrv_avg, rhr_bpm: snapshot.rhr_bpm, sleep_score: snapshot.sleep_dim_score })
    : null;

  const metrics = [
    { title: "HRV", value: snapshot?.hrv_avg != null ? `${snapshot.hrv_avg}` : null, unit: "ms", icon: Activity },
    { title: "Recovery", value: snapshot?.recovery_score != null ? `${snapshot.recovery_score}` : null, unit: "/100", icon: Zap },
    { title: "Sono", value: snapshot?.sleep_dim_score != null ? `${snapshot.sleep_dim_score}` : null, unit: "/100", icon: Moon },
    { title: "Stress", value: snapshot?.stress_score != null ? `${snapshot.stress_score}` : null, unit: "min", icon: Wind },
  ];

  return (
    <main className="space-y-5 pb-6">
      {/* Header */}
      <section className="flex items-center justify-between gap-4 pt-1">
        <div>
          <p className="text-slate-400 text-sm">
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <div className="flex items-center gap-3">
            <h1 className="text-slate-800 text-2xl font-bold">Hoje</h1>
            {streak > 0 && (
              <span className="text-xs font-semibold text-sky-500 bg-sky-50 px-2 py-0.5 rounded-full">
                dia {streak}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Link href="/settings/integrations" className="text-slate-400 hover:text-slate-600 flex items-center gap-1 text-xs transition">
            <Settings className="size-3" />
            Oura
          </Link>
          <PushButton vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} />
        </div>
      </section>

      {!snapshot ? (
        <div className="biometric-panel rounded-2xl p-6 space-y-3 text-center">
          <p className="text-slate-400 text-sm">Nenhum dado para hoje ainda.</p>
          <SyncButton />
        </div>
      ) : (
        <>
          {/* Relatório IA — primeiro e em destaque */}
          <ReportPanel initialReport={snapshot.report_text ?? null} semaphore={engineResult?.semaphore ?? "green"} />

          {/* Recovery Score */}
          {engineResult && (
            <section className="biometric-panel rounded-2xl p-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Recovery Score</p>
                <p className={`text-5xl font-black ${SEMAPHORE_COLOR[engineResult.semaphore]}`}>
                  {engineResult.score}
                </p>
              </div>
              <div className="text-right space-y-1">
                <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${SEMAPHORE_COLOR[engineResult.semaphore]}`}>
                  <span className={`size-2 rounded-full ${SEMAPHORE_DOT[engineResult.semaphore]}`} />
                  {SEMAPHORE_LABEL[engineResult.semaphore]}
                </span>
                <div className="text-slate-400 text-xs space-y-0.5 mt-1">
                  {engineResult.components.hrv != null && <p>HRV {Math.round(engineResult.components.hrv)}/100</p>}
                  {engineResult.components.rhr != null && <p>FC {Math.round(engineResult.components.rhr)}/100</p>}
                  {engineResult.components.sleep != null && <p>Sono {Math.round(engineResult.components.sleep)}/100</p>}
                </div>
              </div>
            </section>
          )}

          {/* Cards métricas */}
          <section className="grid grid-cols-2 gap-3">
            {metrics.map((metric) => (
              <article key={metric.title} className="biometric-panel rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-sky-50 text-sky-500 flex size-8 items-center justify-center rounded-lg">
                    <metric.icon className="size-4" />
                  </div>
                  <p className="text-slate-400 text-xs font-medium">{metric.title}</p>
                </div>
                {metric.value ? (
                  <p className="text-slate-800 text-2xl font-bold">
                    {metric.value}<span className="text-slate-400 text-sm font-normal ml-0.5">{metric.unit}</span>
                  </p>
                ) : (
                  <p className="text-slate-300 text-lg">—</p>
                )}
              </article>
            ))}
          </section>

          <div className="flex justify-end">
            <SyncButton />
          </div>

          {/* Resumo semanal */}
          {weeklyReport && (
            <section className="biometric-panel rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  Semana {new Date(weeklyReport.week_start + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} – {new Date(weeklyReport.week_end + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                </p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-green-500 font-bold">{weeklyReport.dias_verde}🟢</span>
                  <span className="text-yellow-500 font-bold">{weeklyReport.dias_amarelo}🟡</span>
                  <span className="text-orange-500 font-bold">{weeklyReport.dias_laranja}🟠</span>
                  <span className="text-red-500 font-bold">{weeklyReport.dias_vermelho}🔴</span>
                </div>
              </div>
              <div className="text-slate-600 text-sm leading-7 whitespace-pre-wrap">
                {weeklyReport.report_text}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
