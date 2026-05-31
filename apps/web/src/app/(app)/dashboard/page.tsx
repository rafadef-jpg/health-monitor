import Link from "next/link";
import { cookies } from "next/headers";
import { Activity, Moon, Zap, Wind, Settings } from "lucide-react";
import { AUTH_ACCESS_COOKIE } from "@/lib/auth/cookies";
import { getUserFromAccessToken } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SyncButton } from "@/components/dashboard/sync-button";
import { ReportPanel } from "@/components/dashboard/report-panel";
import { PushButton } from "@/components/dashboard/push-button";
import { AchievementsRow } from "@/components/dashboard/achievements-row";
import { CrueldadeMatinal } from "@/components/dashboard/crueldade-matinal";
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
  let recentScores: { date: string; recovery_score: number | null }[] = [];
  let achievements: { achievement_id: string; unlocked_at: string }[] = [];

  if (user) {
    const supabase = createSupabaseServerClient(accessToken);
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

    const [snapshotResult, weeklyResult, streakResult, achievementsResult] = await Promise.all([
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
        .select("snapshot_date, recovery_score")
        .eq("user_id", user.id)
        .gte("snapshot_date", thirtyDaysAgo)
        .order("snapshot_date", { ascending: false }),
      supabase
        .from("user_achievements")
        .select("achievement_id, unlocked_at")
        .eq("user_id", user.id)
        .order("unlocked_at", { ascending: false }),
    ]);

    snapshot = snapshotResult.data ?? null;
    weeklyReport = weeklyResult.data ?? null;
    achievements = achievementsResult.data ?? [];

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
    recentScores = (streakResult.data ?? []).map((d: { snapshot_date: string; recovery_score?: number | null }) => ({ date: d.snapshot_date, recovery_score: d.recovery_score ?? null })).reverse();
  }

  const engineResult = snapshot
    ? calcRecovery({ hrv_ms: snapshot.hrv_avg, rhr_bpm: snapshot.rhr_bpm, sleep_score: snapshot.sleep_dim_score })
    : null;

  function scoreToLabel(score: number | null, thresholds: [number, string, string][]): { label: string; color: string } | null {
    if (score == null) return null;
    for (const [min, label, color] of thresholds) if (score >= min) return { label, color };
    const last = thresholds[thresholds.length - 1];
    return { label: last[1], color: last[2] };
  }

  const metrics = [
    {
      title: "Coração",
      value: scoreToLabel(snapshot?.hrv_avg ?? null, [[70,"Ótimo","text-green-500"],[55,"Normal","text-yellow-500"],[40,"Abaixo","text-orange-500"],[0,"Baixo","text-red-500"]]),
      sub: snapshot?.hrv_avg != null ? `${snapshot.hrv_avg} ms` : null,
      icon: Activity,
    },
    {
      title: "Sono",
      value: scoreToLabel(snapshot?.sleep_dim_score ?? null, [[85,"Excelente","text-green-500"],[70,"Bom","text-green-500"],[55,"Regular","text-yellow-500"],[0,"Ruim","text-red-500"]]),
      sub: snapshot?.sleep_dim_score != null ? `nota ${snapshot.sleep_dim_score}` : null,
      icon: Moon,
    },
    {
      title: "Recuperação",
      value: scoreToLabel(snapshot?.recovery_score ?? null, [[80,"Ótima","text-green-500"],[65,"Boa","text-yellow-500"],[50,"Regular","text-orange-500"],[0,"Baixa","text-red-500"]]),
      sub: snapshot?.recovery_score != null ? `nota ${snapshot.recovery_score}` : null,
      icon: Zap,
    },
    {
      title: "Estresse",
      value: snapshot?.stress_score != null ? (() => {
        if (snapshot.stress_score === 0) return { label: "Tranquilo", color: "text-green-500" };
        if (snapshot.stress_score! < 30) return { label: "Leve", color: "text-yellow-500" };
        if (snapshot.stress_score! < 60) return { label: "Moderado", color: "text-orange-500" };
        return { label: "Alto", color: "text-red-500" };
      })() : null,
      sub: snapshot?.stress_score != null && snapshot.stress_score > 0 ? `${snapshot.stress_score} min` : null,
      icon: Wind,
    },
  ];

  return (
    <main className="space-y-5 pb-6">
      {/* Header */}
      <section className="flex items-center justify-between gap-4 pt-1">
        <div>
          <p className="text-slate-400 text-sm">
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
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
          <ReportPanel
            initialReport={snapshot.report_text ?? null}
            semaphore={engineResult?.semaphore ?? "green"}
            recentScores={recentScores.map(d => ({ date: d.date, score: d.recovery_score }))}
          />

          {/* Recovery Score */}
          {engineResult && (
            <section className="biometric-panel rounded-2xl p-5 flex items-center justify-between gap-4">
              <div>
                <p className="metric-label mb-1">Como você está</p>
                <p className={`text-5xl font-black ${SEMAPHORE_COLOR[engineResult.semaphore]}`}>
                  {engineResult.score}
                </p>
              </div>
              <span className={`inline-flex items-center gap-1.5 text-base font-semibold ${SEMAPHORE_COLOR[engineResult.semaphore]}`}>
                <span className={`size-2.5 rounded-full ${SEMAPHORE_DOT[engineResult.semaphore]}`} />
                {SEMAPHORE_LABEL[engineResult.semaphore]}
              </span>
            </section>
          )}

          {/* Crueldade Matinal */}
          <CrueldadeMatinal
            semaphore={engineResult?.semaphore ?? "green"}
            sleepScore={snapshot.sleep_dim_score}
            stressScore={snapshot.stress_score}
            streak={streak}
          />

          {/* Cards métricas — estilo Oura */}
          <section className="grid grid-cols-2 gap-3">
            {metrics.map((metric) => (
              <article key={metric.title} className="biometric-panel rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="bg-slate-50 text-slate-400 flex size-7 items-center justify-center rounded-lg">
                    <metric.icon className="size-3.5" />
                  </div>
                  <p className="metric-label">{metric.title}</p>
                </div>
                {metric.value ? (
                  <div>
                    <p className={`text-2xl font-bold tracking-tight ${metric.value.color}`}>{metric.value.label}</p>
                    {metric.sub && <p className="text-slate-400 text-xs mt-0.5 font-medium">{metric.sub}</p>}
                  </div>
                ) : (
                  <p className="text-slate-200 text-xl font-bold">—</p>
                )}
              </article>
            ))}
          </section>

          <div className="flex justify-end">
            <SyncButton />
          </div>

          {/* Conquistas */}
          <AchievementsRow unlocked={achievements} />

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
