import Link from "next/link";
import { cookies } from "next/headers";
import { Activity, Moon, Zap, Wind, Settings } from "lucide-react";
import { AUTH_ACCESS_COOKIE } from "@/lib/auth/cookies";
import { getUserFromAccessToken } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SyncButton } from "@/components/dashboard/sync-button";

type Snapshot = {
  recovery_score: number | null;
  hrv_avg: number | null;
  sleep_dim_score: number | null;
  stress_score: number | null;
  snapshot_date: string;
};

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_ACCESS_COOKIE)?.value;
  const user = await getUserFromAccessToken(accessToken);

  let snapshot: Snapshot | null = null;

  if (user) {
    const supabase = createSupabaseServerClient(accessToken);
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
    const { data } = await supabase
      .from("daily_physiology_snapshot")
      .select("recovery_score, hrv_avg, sleep_dim_score, stress_score, snapshot_date")
      .eq("user_id", user.id)
      .gte("snapshot_date", twoDaysAgo)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    snapshot = data ?? null;
  }

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
        <Link
          href="/settings/integrations"
          className="text-muted-foreground hover:text-foreground flex shrink-0 items-center gap-1.5 text-xs transition"
        >
          <Settings className="size-3.5" />
          Alterar token do Oura
        </Link>
      </section>

      {!snapshot ? (
        <div className="biometric-panel rounded-lg p-5 space-y-3">
          <p className="text-muted-foreground text-sm">Nenhum dado para hoje ainda.</p>
          <SyncButton />
        </div>
      ) : (
        <>
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
        </>
      )}
    </main>
  );
}
