import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_ACCESS_COOKIE } from "@/lib/auth/cookies";
import { getUserFromAccessToken } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateDailyReport } from "@/lib/report/generate";

export async function POST() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_ACCESS_COOKIE)?.value;
  const user = await getUserFromAccessToken(accessToken);

  if (!user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const supabase = createSupabaseServerClient(accessToken);
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);

  const { data: snapshot } = await supabase
    .from("daily_physiology_snapshot")
    .select("recovery_score, hrv_avg, rhr_bpm, sleep_dim_score, stress_score, snapshot_date")
    .eq("user_id", user.id)
    .gte("snapshot_date", twoDaysAgo)
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!snapshot) {
    return NextResponse.json(
      { error: "Nenhum dado encontrado. Sincronize primeiro." },
      { status: 404 }
    );
  }

  try {
    const report = await generateDailyReport(user.id, snapshot, supabase);
    return NextResponse.json({ report, snapshot });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao chamar a IA.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
