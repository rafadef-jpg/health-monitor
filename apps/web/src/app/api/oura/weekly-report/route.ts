import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { AUTH_ACCESS_COOKIE } from "@/lib/auth/cookies";
import { getUserFromAccessToken } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isCronAuthorized } from "@/lib/auth/cron-secret";
import { logServerError, serverErrorResponse } from "@/lib/api/error-handler";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = SupabaseClient<any, any, any>;

const ai = new Anthropic();

const SEMAPHORE_LABEL: Record<string, string> = {
  green: "verde",
  yellow: "amarelo",
  orange: "laranja",
  red: "vermelho",
};

function scoreToSemaphore(score: number | null): string {
  if (score == null) return "sem dado";
  if (score >= 80) return "green";
  if (score >= 65) return "yellow";
  if (score >= 50) return "orange";
  return "red";
}

async function handleCronWeekly() {
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: integrations } = await service
    .from("user_integrations")
    .select("user_id")
    .eq("provider", "oura")
    .not("access_token", "is", null);

  if (!integrations?.length) {
    return NextResponse.json({ generated: 0 });
  }

  const results = await Promise.allSettled(
    integrations.map((i: { user_id: string }) => generateWeeklyForUser(i.user_id, service))
  );

  const ok = results.filter((r) => r.status === "fulfilled").length;
  return NextResponse.json({ generated: ok, total: integrations.length });
}

async function generateWeeklyForUser(userId: string, supabase: AnySupabase) {
  const today = new Date();
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() - 1); // ontem
  const weekStart = new Date(weekEnd);
  weekStart.setDate(weekEnd.getDate() - 6); // 7 dias atrás

  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);

  const { data: snapshots } = await supabase
    .from("daily_physiology_snapshot")
    .select("snapshot_date, recovery_score, hrv_avg, rhr_bpm, sleep_dim_score, stress_score")
    .eq("user_id", userId)
    .gte("snapshot_date", weekStartStr)
    .lte("snapshot_date", weekEndStr)
    .order("snapshot_date", { ascending: true });

  if (!snapshots?.length) return;

  // Contagem de semáforos
  const contagem = { green: 0, yellow: 0, orange: 0, red: 0 };
  for (const s of snapshots) {
    const sem = scoreToSemaphore(s.recovery_score);
    if (sem in contagem) contagem[sem as keyof typeof contagem]++;
  }

  // Médias
  const avg = (arr: (number | null)[]) => {
    const vals = arr.filter((v): v is number => v != null);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  };
  const hrv_media = avg(snapshots.map((s) => s.hrv_avg));
  const fc_media = avg(snapshots.map((s) => s.rhr_bpm));
  const sono_media = avg(snapshots.map((s) => s.sleep_dim_score));

  // Contexto para a IA
  const diasTexto = snapshots.map((s) => {
    const sem = scoreToSemaphore(s.recovery_score);
    const label = SEMAPHORE_LABEL[sem] ?? "sem dado";
    return `${s.snapshot_date}: ${label} (Recovery ${s.recovery_score ?? "?"}, HRV ${s.hrv_avg ?? "?"}ms, FC ${s.rhr_bpm ?? "?"}bpm, Sono ${s.sleep_dim_score ?? "?"})`;
  }).join("\n");

  const userMessage = `
Resumo da semana (${weekStartStr} a ${weekEndStr}):
${diasTexto}

Totais: ${contagem.green} verde, ${contagem.yellow} amarelo, ${contagem.orange} laranja, ${contagem.red} vermelho
HRV médio: ${hrv_media ?? "?"}ms | FC média: ${fc_media ?? "?"}bpm | Sono médio: ${sono_media ?? "?"}
`.trim();

  const message = await ai.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 600,
    system: `Você é um coach de saúde brasileiro que faz resumos semanais de recuperação.
Mesmo estilo: amigo direto, sem jargão técnico, pode soltar palavrão leve, âncora sempre nos dados.

Substituições obrigatórias:
- HRV → "variabilidade do coração"
- FC de repouso → "coração em descanso"
- Baseline → "seu normal"

Gere o resumo em 3 blocos curtos (máx 4 linhas cada):

**Como foi sua semana**
[Balanço geral — quantos dias bons, quantos ruins, tom direto]

**O que os dados mostram**
[1-2 padrões que se repetiram. Ex: dias ruins após treino duplo, sono curto afetando recuperação]

**Foco da próxima semana**
[1 coisa concreta para melhorar. Não mais que 1.]

Não use emojis. Seja honesto mesmo que a semana foi ruim.`,
    messages: [{ role: "user", content: userMessage }],
  });

  const report = message.content[0].type === "text" ? message.content[0].text : "";

  await supabase.from("weekly_reports").upsert({
    user_id: userId,
    week_start: weekStartStr,
    week_end: weekEndStr,
    report_text: report,
    dias_verde: contagem.green,
    dias_amarelo: contagem.yellow,
    dias_laranja: contagem.orange,
    dias_vermelho: contagem.red,
    hrv_media,
    fc_media,
    sono_media,
  }, { onConflict: "user_id,week_start" });
}

export async function POST(request: Request) {
  // Cron path
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Não configurado." }, { status: 500 });
  }
  if (isCronAuthorized(authHeader)) {
    return handleCronWeekly();
  }

  // User path (manual)
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_ACCESS_COOKIE)?.value;
  const user = await getUserFromAccessToken(accessToken);
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const supabase = createSupabaseServerClient(accessToken);
  try {
    await generateWeeklyForUser(user.id, supabase as AnySupabase);
    return NextResponse.json({ ok: true });
  } catch (err) {
    logServerError("oura/weekly-report", err);
    return serverErrorResponse("Erro ao gerar resumo. Tente novamente em instantes.", 502);
  }
}
