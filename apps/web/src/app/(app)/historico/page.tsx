import { cookies } from "next/headers";
import { AUTH_ACCESS_COOKIE } from "@/lib/auth/cookies";
import { getUserFromAccessToken } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RecoveryChart, HrvChart, RhrChart, SleepChart } from "@/components/historico/charts";

export default async function HistoricoPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_ACCESS_COOKIE)?.value;
  const user = await getUserFromAccessToken(accessToken);

  let snapshots: Array<{
    snapshot_date: string;
    recovery_score: number | null;
    hrv_avg: number | null;
    rhr_bpm: number | null;
    sleep_dim_score: number | null;
    stress_score: number | null;
  }> = [];

  if (user) {
    const supabase = createSupabaseServerClient(accessToken);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const { data } = await supabase
      .from("daily_physiology_snapshot")
      .select("snapshot_date, recovery_score, hrv_avg, rhr_bpm, sleep_dim_score, stress_score")
      .eq("user_id", user.id)
      .gte("snapshot_date", thirtyDaysAgo)
      .order("snapshot_date", { ascending: true });
    snapshots = data ?? [];
  }

  const totalDias = snapshots.length;
  const diasVerdes = snapshots.filter((s) => (s.recovery_score ?? 0) >= 80).length;
  const diasVermelhos = snapshots.filter((s) => (s.recovery_score ?? 101) < 50).length;

  return (
    <main className="space-y-6">
      <section className="space-y-2">
        <p className="text-primary text-sm font-medium uppercase tracking-[0.18em]">Histórico</p>
        <h1 className="text-foreground text-2xl font-semibold sm:text-3xl">Últimos 30 dias</h1>
        <p className="text-muted-foreground text-sm">
          {totalDias} {totalDias === 1 ? "dia registrado" : "dias registrados"}
        </p>
      </section>

      {totalDias === 0 ? (
        <div className="biometric-panel rounded-lg p-5">
          <p className="text-muted-foreground text-sm">Nenhum dado ainda. Sincronize pelo dashboard.</p>
        </div>
      ) : (
        <>
          {/* Resumo */}
          <section className="grid gap-3 sm:grid-cols-3">
            <div className="biometric-panel rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-green-500">{diasVerdes}</p>
              <p className="text-muted-foreground text-xs mt-1">dias verdes</p>
            </div>
            <div className="biometric-panel rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-foreground">{totalDias - diasVerdes - diasVermelhos}</p>
              <p className="text-muted-foreground text-xs mt-1">dias ok</p>
            </div>
            <div className="biometric-panel rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-red-500">{diasVermelhos}</p>
              <p className="text-muted-foreground text-xs mt-1">dias ruins</p>
            </div>
          </section>

          {/* Gráficos */}
          <section className="space-y-4">
            <RecoveryChart data={snapshots.map((s) => ({ ...s, date: s.snapshot_date }))} />
            <div className="grid gap-4 sm:grid-cols-2">
              <HrvChart data={snapshots.map((s) => ({ ...s, date: s.snapshot_date }))} />
              <RhrChart data={snapshots.map((s) => ({ ...s, date: s.snapshot_date }))} />
            </div>
            <SleepChart data={snapshots.map((s) => ({ ...s, date: s.snapshot_date }))} />
          </section>
        </>
      )}
    </main>
  );
}
