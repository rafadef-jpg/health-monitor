import { cookies } from "next/headers";
import { AUTH_ACCESS_COOKIE } from "@/lib/auth/cookies";
import { getUserFromAccessToken } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { OuraIntegrationForm } from "./integrations-form";

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ setup?: string }>;
}) {
  const { setup } = await searchParams;
  const isFirstSetup = setup === "1";

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_ACCESS_COOKIE)?.value;
  const user = await getUserFromAccessToken(accessToken);

  let isConnected = false;
  let lastSync: string | null = null;

  if (user) {
    const supabase = createSupabaseServerClient(accessToken);
    const { data } = await supabase
      .from("user_integrations")
      .select("access_token, last_sync_at")
      .eq("user_id", user.id)
      .eq("provider", "oura")
      .maybeSingle();
    isConnected = !!data?.access_token;
    lastSync = data?.last_sync_at ?? null;
  }

  return (
    <main className="space-y-6">
      <section className="space-y-2">
        <p className="text-primary text-sm font-medium uppercase tracking-[0.18em]">
          Configurações
        </p>
        <h1 className="text-foreground text-2xl font-semibold sm:text-3xl">
          {isFirstSetup ? "Configure seu Oura Ring para começar" : "Integrações"}
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm leading-6">
          {isFirstSetup
            ? "Você precisa de um Personal Access Token gerado em cloud.ouraring.com."
            : "Conecte suas fontes de dados biométricos."}
        </p>
      </section>

      {isFirstSetup ? (
        <div className="border-primary/25 bg-primary/10 text-primary rounded-md border px-4 py-3 text-sm">
          Para começar, conecte seu Oura Ring.
        </div>
      ) : null}

      <OuraIntegrationForm isConnected={isConnected} lastSync={lastSync} isSetup={isFirstSetup} />
    </main>
  );
}
