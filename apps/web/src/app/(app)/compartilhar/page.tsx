import { cookies } from "next/headers";
import { AUTH_ACCESS_COOKIE } from "@/lib/auth/cookies";
import { getUserFromAccessToken } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { calcRecovery } from "@repo/physiology";
import { ShareCard } from "./share-card";
import { DailyCard } from "./daily-card";
import { ShareManager } from "../settings/compartilhar/share-manager";

export default async function CompartilharPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_ACCESS_COOKIE)?.value;
  const user = await getUserFromAccessToken(accessToken);

  let weekly = null;
  let snapshot = null;
  let engineResult = null;
  let tokens: { id: string; token: string; label: string; active: boolean; created_at: string }[] = [];

  if (user) {
    const supabase = createSupabaseServerClient(accessToken);
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);

    const [weeklyResult, snapshotResult, tokensResult] = await Promise.all([
      supabase
        .from("weekly_reports")
        .select("report_text, week_start, week_end, dias_verde, dias_amarelo, dias_laranja, dias_vermelho, hrv_media, fc_media, sono_media")
        .eq("user_id", user.id)
        .order("week_start", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("daily_physiology_snapshot")
        .select("recovery_score, hrv_avg, rhr_bpm, sleep_dim_score, stress_score, snapshot_date, report_text")
        .eq("user_id", user.id)
        .gte("snapshot_date", twoDaysAgo)
        .order("snapshot_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("share_tokens")
        .select("id, token, label, active, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    weekly = weeklyResult.data ?? null;
    snapshot = snapshotResult.data ?? null;
    tokens = tokensResult.data ?? [];

    if (snapshot) {
      engineResult = calcRecovery({
        hrv_ms: snapshot.hrv_avg,
        rhr_bpm: snapshot.rhr_bpm,
        sleep_score: snapshot.sleep_dim_score,
      });
    }
  }

  return (
    <main className="space-y-8 pb-10">
      {/* Card Diário */}
      <section className="space-y-3">
        <div className="space-y-0.5">
          <p className="text-sky-500 text-xs font-bold uppercase tracking-widest">Compartilhar</p>
          <h2 className="text-slate-800 text-xl font-bold">Card de Hoje</h2>
          <p className="text-slate-400 text-sm">Salve e compartilhe como está hoje.</p>
        </div>
        <DailyCard snapshot={snapshot} engineResult={engineResult} />
      </section>

      <div className="border-t border-slate-100" />

      {/* Card Semanal */}
      <section className="space-y-3">
        <div className="space-y-0.5">
          <p className="text-sky-500 text-xs font-bold uppercase tracking-widest">Compartilhar</p>
          <h2 className="text-slate-800 text-xl font-bold">Card Semanal</h2>
          <p className="text-slate-400 text-sm">Resumo da semana para o Instagram.</p>
        </div>
        <ShareCard weekly={weekly} />
      </section>

      <div className="border-t border-slate-100" />

      {/* Link para Personal */}
      <section className="space-y-3">
        <div className="space-y-0.5">
          <p className="text-sky-500 text-xs font-bold uppercase tracking-widest">Personal Trainer</p>
          <h2 className="text-slate-800 text-xl font-bold">Link de acesso</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Gere um link somente leitura para seu personal ver seus dados sem precisar de conta.
          </p>
        </div>
        <ShareManager
          tokens={tokens}
          appUrl={process.env.APP_URL ?? "https://health-monitor-web-sigma.vercel.app"}
        />
      </section>
    </main>
  );
}
