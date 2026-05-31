import Anthropic from "@anthropic-ai/sdk";
import { SupabaseClient } from "@supabase/supabase-js";
import { calcRecovery } from "@repo/physiology";

const client = new Anthropic();

const SYSTEM_PROMPT = `Você é um personal trainer e coach de saúde brasileiro que faz relatórios diários de recuperação física.
Seu estilo é debochado, irreverente e engraçado — usa gírias brasileiras, pode usar palavrão leve (porra, merda),
tira sarro da situação mas nunca da pessoa, e mesmo sendo engraçado mantém a informação útil e prática.

LINGUAGEM: fale como um amigo, nunca como médico. Se um vizinho sem formação não entende a palavra, não usa.

Substituições obrigatórias:
- HRV → "variabilidade do coração" ou "seu coração"
- FC de repouso → "batimento em repouso" ou "coração em descanso"
- Sistema nervoso autônomo → "seu sistema de recuperação"
- Baseline → "seu normal"
- Score → "sua nota"

REGRA ABSOLUTA — âncora nos dados:
Cada frase deve ter uma âncora em dado real. Nunca invente metáforas soltas sem conexão com os dados.

FORMATO OBRIGATÓRIO — siga exatamente:

GANCHO: [uma frase curta e direta, máx 8 palavras, que resume como o usuário está. Pode ser agressiva, engraçada ou motivadora. Ex: "Você está uma bosta hoje.", "Tá verde. Vai treinar pesado.", "Dormiu bem. Corpo pedindo peso."]
---
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

Não use emojis. Não repita os números brutos em todos os blocos — use uma vez e depois referencie naturalmente.`;

type Snapshot = {
  snapshot_date: string;
  recovery_score: number | null;
  hrv_avg: number | null;
  rhr_bpm: number | null;
  sleep_dim_score: number | null;
  stress_score: number | null;
};

type Inputs = {
  pressao_sistolica: number | null;
  pressao_diastolica: number | null;
  medicamentos: string | null;
  sintomas: string | null;
  sentimento: number | null;
} | null;

export async function generateDailyReport(
  userId: string,
  snapshot: Snapshot,
  supabase: SupabaseClient,
  inputs?: Inputs
): Promise<string> {
  // Busca inputs se não foram passados
  let resolvedInputs = inputs;
  if (resolvedInputs === undefined) {
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("daily_inputs")
      .select("pressao_sistolica, pressao_diastolica, medicamentos, sintomas, sentimento")
      .eq("user_id", userId)
      .eq("input_date", today)
      .maybeSingle();
    resolvedInputs = data ?? null;
  }

  const engine = calcRecovery({
    hrv_ms: snapshot.hrv_avg,
    rhr_bpm: snapshot.rhr_bpm,
    sleep_score: snapshot.sleep_dim_score,
  });

  const inputsSection = resolvedInputs
    ? `
Dados manuais de hoje:
- Pressão arterial: ${resolvedInputs.pressao_sistolica && resolvedInputs.pressao_diastolica ? `${resolvedInputs.pressao_sistolica}/${resolvedInputs.pressao_diastolica} mmHg` : "não informado"}
- Como está se sentindo: ${resolvedInputs.sentimento ? ["Péssimo", "Ruim", "Ok", "Bem", "Ótimo"][resolvedInputs.sentimento - 1] : "não informado"} (${resolvedInputs.sentimento ?? "?"}/5)
- Sintomas: ${resolvedInputs.sintomas || "nenhum"}
- Medicamentos: ${resolvedInputs.medicamentos || "não informado"}`
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

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 600,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const report = message.content[0].type === "text" ? message.content[0].text : "";

  // Salva no banco
  await supabase
    .from("daily_physiology_snapshot")
    .update({ report_text: report })
    .eq("user_id", userId)
    .eq("snapshot_date", snapshot.snapshot_date);

  return report;
}
