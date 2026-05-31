import { cookies } from "next/headers";
import { AUTH_ACCESS_COOKIE } from "@/lib/auth/cookies";
import { getUserFromAccessToken } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ShareCard } from "./share-card";

export default async function CompartilharPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_ACCESS_COOKIE)?.value;
  const user = await getUserFromAccessToken(accessToken);

  let weekly = null;

  if (user) {
    const supabase = createSupabaseServerClient(accessToken);
    const { data } = await supabase
      .from("weekly_reports")
      .select("report_text, week_start, week_end, dias_verde, dias_amarelo, dias_laranja, dias_vermelho, hrv_media, fc_media, sono_media")
      .eq("user_id", user.id)
      .order("week_start", { ascending: false })
      .limit(1)
      .maybeSingle();
    weekly = data ?? null;
  }

  return (
    <main className="space-y-6 pb-10">
      <section className="space-y-1">
        <p className="text-sky-500 text-sm font-semibold uppercase tracking-wider">Compartilhar</p>
        <h1 className="text-slate-800 text-2xl font-bold">Card semanal</h1>
        <p className="text-slate-400 text-sm">Salve a imagem e poste no Instagram.</p>
      </section>
      <ShareCard weekly={weekly} />
    </main>
  );
}
