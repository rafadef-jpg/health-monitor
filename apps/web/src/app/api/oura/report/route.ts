import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import Anthropic from "@anthropic-ai/sdk";
import { AUTH_ACCESS_COOKIE } from "@/lib/auth/cookies";
import { getUserFromAccessToken } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { calcRecovery } from "@repo/physiology";

const client = new Anthropic();

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

  const engine = calcRecovery({
    hrv_ms: snapshot.hrv_avg,
    rhr_bpm: snapshot.rhr_bpm,
    sleep_score: snapshot.sleep_dim_score,
  });

  const userMessage = `
Dados de hoje (${snapshot.snapshot_date}):
- Recovery Score (engine): ${engine.score}/100 (${engine.semaphore})
- HRV: ${snapshot.hrv_avg ?? "sem dado"} ms (baseline pessoal: 63ms)
- FC de repouso: ${snapshot.rhr_bpm ?? "sem dado"} bpm (baseline: 62bpm)
- Score de sono (Oura): ${snapshot.sleep_dim_score ?? "sem dado"}/100
- Stress alto: ${snapshot.stress_score ?? "sem dado"} min
- Recovery Oura: ${snapshot.recovery_score ?? "sem dado"}/100

Componentes do score:
- HRV: ${engine.components.hrv != null ? Math.round(engine.components.hrv) + "/100" : "indisponível"}
- FC repouso: ${engine.components.rhr != null ? Math.round(engine.components.rhr) + "/100" : "indisponível"}
- Sono: ${engine.components.sleep != null ? Math.round(engine.components.sleep) + "/100" : "indisponível"}
`.trim();

  let message;
  try {
    message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
    system: `Você é um personal trainer e coach de saúde brasileiro que faz relatórios diários de recuperação física.
Seu estilo é debochado, irreverente e engraçado — usa gírias brasileiras, pode usar palavrão leve (porra, merda),
tira sarro da situação mas nunca da pessoa, e mesmo sendo engraçado mantém a informação útil e prática.

Gere um relatório em 3 blocos curtos (máx 4 linhas cada):

**Como você está hoje**
[Avalia o estado geral com base nos dados, com humor]

**Pode treinar forte?**
[Resposta direta: sim / com moderação / não. Justifica com os dados, ainda com bom humor]

**O que fazer**
[2-3 recomendações práticas e diretas para o dia de hoje]

Não use emojis. Não repita os números brutos em todos os blocos — use uma vez e depois referencie naturalmente.`,
      messages: [{ role: "user", content: userMessage }],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao chamar a Claude API.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const report =
    message.content[0].type === "text" ? message.content[0].text : "";

  return NextResponse.json({ report, snapshot, engine });
}
