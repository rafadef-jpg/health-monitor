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

  // Busca inputs manuais de hoje
  const today = new Date().toISOString().slice(0, 10);
  const { data: inputs } = await supabase
    .from("daily_inputs")
    .select("pressao_sistolica, pressao_diastolica, medicamentos, sintomas, sentimento")
    .eq("user_id", user.id)
    .eq("input_date", today)
    .maybeSingle();

  const engine = calcRecovery({
    hrv_ms: snapshot.hrv_avg,
    rhr_bpm: snapshot.rhr_bpm,
    sleep_score: snapshot.sleep_dim_score,
  });

  const inputsSection = inputs
    ? `
Dados manuais de hoje:
- Pressão arterial: ${inputs.pressao_sistolica && inputs.pressao_diastolica ? `${inputs.pressao_sistolica}/${inputs.pressao_diastolica} mmHg` : "não informado"}
- Como está se sentindo: ${inputs.sentimento ? ["Péssimo", "Ruim", "Ok", "Bem", "Ótimo"][inputs.sentimento - 1] : "não informado"} (${inputs.sentimento ?? "?"}/5)
- Sintomas: ${inputs.sintomas || "nenhum"}
- Medicamentos: ${inputs.medicamentos || "não informado"}`
    : "\nDados manuais: não registrados hoje.";

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
${inputsSection}
`.trim();

  let message;
  try {
    message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
    system: `Você é um personal trainer e coach de saúde brasileiro que faz relatórios diários de recuperação física.
Seu estilo é debochado, irreverente e engraçado — usa gírias brasileiras, pode usar palavrão leve (porra, merda),
tira sarro da situação mas nunca da pessoa, e mesmo sendo engraçado mantém a informação útil e prática.

LINGUAGEM: fale como um amigo, nunca como médico. Se um vizinho sem formação não entende a palavra, não usa.

Substituições obrigatórias:
- HRV → "variabilidade do coração" ou "seu coração"
- FC de repouso → "batimento em repouso" ou "coração em descanso"
- Sistema nervoso autônomo → "seu sistema de recuperação"
- Baseline → "seu normal"
- Score → "sua nota"

Exemplos do tom certo:
❌ "seu HRV de 41ms está abaixo do baseline"
✅ "seu coração tá mostrando que não recuperou direito"

❌ "FC de repouso quase perfeita"
✅ "seu coração em descanso tá ótimo"

❌ "sistema nervoso autônomo com ressaca"
✅ "seu corpo ainda tá processando o cansaço"

REGRA ABSOLUTA — âncora nos dados:
Cada frase deve ter uma âncora em dado real. Nunca invente metáforas soltas sem conexão com os dados.
Antes de escrever qualquer frase, responda mentalmente: "baseado em qual dado?". Se não tem dado, não fala.

Exemplos:
❌ "tá verde no papel, som bonito"
✅ "82 pontos — seu coração descansou bem e o sono foi decente"

❌ "ressaca emocional"
✅ "seu corpo ainda tá cansado — dá pra ver pelo coração que não variou muito essa noite"

Gere um relatório em 3 blocos curtos (máx 4 linhas cada):

**Como você está hoje**
[Avalia o estado geral com base nos dados, com humor]

**Pode treinar forte?**
[Resposta direta: sim / com moderação / não. Justifica com os dados, ainda com bom humor]

**O que fazer**
[2-3 recomendações práticas e diretas para o dia de hoje]

DADOS MANUAIS — como usar:
- Pressão > 135/85: menciona no bloco "Como você está hoje", sem alarmar se for evento único.
- Sintomas presentes: leva em conta na recomendação de treino.
- Sentimento 1-2: suaviza a recomendação de treino independente do score.
- Medicamentos: contexto apenas — não comenta nem recomenda nada sobre eles.
- Se dados manuais não foram registrados: não menciona a ausência.

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
