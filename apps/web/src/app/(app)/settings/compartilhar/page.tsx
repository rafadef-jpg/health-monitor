import { cookies } from "next/headers";
import { AUTH_ACCESS_COOKIE } from "@/lib/auth/cookies";
import { getUserFromAccessToken } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ShareManager } from "./share-manager";

export default async function CompartilharSettingsPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_ACCESS_COOKIE)?.value;
  const user = await getUserFromAccessToken(accessToken);

  let tokens: { id: string; token: string; label: string; active: boolean; created_at: string }[] = [];

  if (user) {
    const supabase = createSupabaseServerClient(accessToken);
    const { data } = await supabase
      .from("share_tokens")
      .select("id, token, label, active, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    tokens = data ?? [];
  }

  return (
    <main className="space-y-6 max-w-lg">
      <section className="space-y-1">
        <p className="text-sky-500 text-sm font-semibold uppercase tracking-wider">Compartilhar</p>
        <h1 className="text-slate-800 text-2xl font-bold">Link para personal</h1>
        <p className="text-slate-400 text-sm leading-relaxed">
          Gere um link somente leitura para seu personal trainer ver seus dados do dia sem precisar de conta.
        </p>
      </section>
      <ShareManager tokens={tokens} appUrl={process.env.APP_URL ?? "https://health-monitor-web-sigma.vercel.app"} />
    </main>
  );
}
