import Link from "next/link";
import { cookies } from "next/headers";
import { Activity, Moon, Zap, Wind, Heart, Settings } from "lucide-react";
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
  yellow: "text-yellow-400",
  orange: "text-orange-400",
  red: "text-red-500",
};

const SEMAPHORE_BG: Record<string, string> = {
  green: "bg-green-500/10",
  yellow: "bg-yellow-400/10",
  orange: "bg-orange-400/10",
  red: "bg-red-500/10",
};

const SEMAPHORE_LABEL: Record<string, string> = {
  green: "Ótimo",
  yellow: "Regular",
  orange: "Atenção",
  red: "Crítico",
};

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_ACCESS_COOKIE)?.value;
  const user = await getUserFromAccessToken(accessToken);

  let snapshot: Snapshot | null = null;
  let weeklyReport: { report_text: string; week_start: string; week_end: string; dias_verde: number; dias_amarelo: number; dias_laranja: number; dias_vermelho: number } | null = null;

  if (user) {
    const supabase = createSupabaseServerClient(accessToken);
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
    const [snapshotResult, weeklyResult] = await Promise.all([
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
    ]);
    snapshot = snapshotResult.data ?? null;
    weeklyReport = weeklyResult.data ?? null;
  }

  const engineResult = snapshot
    ? calcRecovery({
        hrv_ms: snapshot.hrv_avg,
        rhr_bpm: snapshot.rhr_bpm,
        sleep_score: snapshot.sleep_dim_score,
      })
    : null;

  const metrics = [
    { title: "HRV", value: snapshot?.hrv_avg != null ? `${snapshot.hrv_avg} ms` : null, icon: Activity },
    { title: "Recovery", value: snapshot?.recovery_score != null ? `${snapshot.recovery_score}` : null, icon: Zap },
    { title: "Sono", value: snapshot?.sleep_dim_score != null ? `${snapshot.sleep_dim_score}` : null, icon: Moon },
    { title: "Stress alto", value: snapshot?.stress_score != null ? `${snapshot.stress_score} min` : null, icon: Wind },
  ];

  return (
    <main className="space-y-6">
      <section className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-primary text-sm font-medium uppercase tracking-[0.18em]">Dashboard</p>
          <h1 className="text-foreground text-2xl font-semibold sm:text-3xl">Hoje</h1>
          <p className="text-muted-foreground max-w-2xl text-sm leading-6 sm:text-base">
            {new Date().toLocaleDateString("pt-BR", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Link
            href="/settings/integrations"
            className="text-muted-foreground hover:text-foreground flex shrink-0 items-center gap-1.5 text-xs transition"
          >
            <Settings className="size-3.5" />
            Alterar token do Oura
          </Link>
          <PushButton vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} />
        </div>
      </section>

      {!snapshot ? (
        <div className="biometric-panel rounded-lg p-5 space-y-3">
          <p className="text-muted-foreground text-sm">Nenhum dado para hoje ainda.</p>
          <SyncButton />
        </div>
      ) : (
        <>
          {/* Recovery Score engine */}
          {engineResult && (
            <section className="biometric-panel rounded-lg p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`flex size-14 items-center justify-center rounded-xl ${SEMAPHORE_BG[engineResult.semaphore]}`}
                  >
                    <Heart className={`size-7 ${SEMAPHORE_COLOR[engineResult.semaphore]}`} />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-widest">
                      Recovery Score
                    </p>
                    <p className={`text-4xl font-bold ${SEMAPHORE_COLOR[engineResult.semaphore]}`}>
                      {engineResult.score}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${SEMAPHORE_BG[engineResult.semaphore]} ${SEMAPHORE_COLOR[engineResult.semaphore]}`}
                  >
                    {SEMAPHORE_LABEL[engineResult.semaphore]}
                  </span>
                  <div className="text-muted-foreground mt-2 space-y-0.5 text-xs">
                    {engineResult.components.hrv != null && (
                      <p>HRV: {Math.round(engineResult.components.hrv)}/100</p>
                    )}
                    {engineResult.components.rhr != null && (
                      <p>FC repouso: {Math.round(engineResult.components.rhr)}/100</p>
                    )}
                    {engineResult.components.sleep != null && (
                      <p>Sono: {Math.round(engineResult.components.sleep)}/100</p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Cards biométricos */}
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <article key={metric.title} className="biometric-panel rounded-lg p-4">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-md">
                    <metric.icon className="size-5" />
                  </div>
                  <span className="bg-primary h-2 w-2 rounded-full shadow-[0_0_18px_hsl(var(--primary))]" />
                </div>
                <h2 className="text-base font-semibold">{metric.title}</h2>
                <p className="text-foreground mt-1 text-xl font-bold">
                  {metric.value ?? <span className="text-muted-foreground text-sm font-normal">—</span>}
                </p>
              </article>
            ))}
          </section>

          <div className="flex justify-end">
            <SyncButton />
          </div>

          <ReportPanel initialReport={snapshot.report_text ?? null} />

          {weeklyReport && (
            <section className="biometric-panel rounded-lg p-5 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <p className="text-primary text-xs font-medium uppercase tracking-widest">
                  Semana {new Date(weeklyReport.week_start + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} – {new Date(weeklyReport.week_end + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                </p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-green-500 font-semibold">{weeklyReport.dias_verde}🟢</span>
                  <span className="text-yellow-400 font-semibold">{weeklyReport.dias_amarelo}🟡</span>
                  <span className="text-orange-400 font-semibold">{weeklyReport.dias_laranja}🟠</span>
                  <span className="text-red-500 font-semibold">{weeklyReport.dias_vermelho}🔴</span>
                </div>
              </div>
              <div className="text-foreground text-sm leading-7 whitespace-pre-wrap">
                {weeklyReport.report_text}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
