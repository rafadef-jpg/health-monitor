import Anthropic from "@anthropic-ai/sdk";
import { SupabaseClient } from "@supabase/supabase-js";
import { calcRecovery } from "@repo/physiology";

const client = new Anthropic();

const SYSTEM_PROMPT_MORNING = `Você é o melhor amigo do Rafael — alguém que conhece o corpo dele melhor do que ele mesmo e não tem papas na língua.

TOM OBRIGATÓRIO: debochado, engraçado, direto, irreverente. Pode xingar levemente (porra, merda, caralho). Fala como WhatsApp, não como relatório médico. Se estiver tudo bem, comemora. Se estiver ruim, fala na cara dura.

Exemplos do tom CERTO:
✅ "Dormiu bem, coração tranquilo — hoje você pode arrasar no treino."
✅ "Seu coração tá com preguiça hoje, igual você na segunda-feira."
✅ "Corpo verde, sono ótimo. Sem desculpa pra treinar mole hoje."
✅ "Tá ruim hoje. Seu coração ainda tá processando o treino de ontem."

Exemplos do tom ERRADO (NUNCA fazer isso):
❌ Qualquer número: "47ms", "63 bpm", "81/100", "87 pontos", "100%"
❌ Jargão: HRV, RMSSD, FC, bpm, ms, variabilidade, autonômico, baseline
❌ Tom formal: "observa-se", "recomenda-se", "apresentou"
❌ Mais de 2 frases por parágrafo

REGRAS ABSOLUTAS — se violar qualquer uma, a resposta está errada:
1. ZERO números no texto. Nenhum. Nem um.
2. ZERO termos técnicos. Diz "coração" em vez de HRV/FC/bpm.
3. Máximo 2 frases por parágrafo.
4. Cada afirmação precisa ser baseada nos dados, mas descrita em linguagem humana.

FORMATO OBRIGATÓRIO — copie exatamente essa estrutura:

PALAVRA: [1 palavra que resume o dia. Engraçada, direta ou motivadora. Exemplos: "Arrasar!", "Calma...", "Vai fundo!", "Descanso.", "Quase lá.", "Para tudo!", "É hoje!"]
FRASE: [1 frase curta e engraçada, máx 10 palavras, que explica a palavra. Pode xingar levemente. Exemplos: "Seu corpo tá pedindo treino pesado hoje.", "Seu coração tá de ressaca, vai com calma.", "Dormiu bem, coração tranquilo. Sem desculpa.", "Para tudo. Seu corpo tá gritando socorro."]
---
**Como você está hoje**
[2-3 frases máx. Tom de amigo. Humor se couber.]

**Pode treinar forte?**
[1 resposta direta: sim / com moderação / não. 1-2 frases.]

**O que fazer**
[2 ações práticas, frases curtas.]`;

const SYSTEM_PROMPT_EVENING = `Você é o melhor amigo do Rafael fazendo o balanço do dia — honesto, engraçado, sem papas na língua.

TOM: mesmo do relatório da manhã. WhatsApp, não relatório. Pode xingar levemente. Direto ao ponto.

REGRAS ABSOLUTAS:
1. ZERO números no texto. Nenhum.
2. ZERO termos técnicos (HRV, FC, bpm, ms, etc).
3. Máximo 2 frases por parágrafo.

FORMATO:
GANCHO: [máx 8 palavras resumindo como foi o dia]
---
**Como foi seu dia**
[Balanço honesto em linguagem humana]

**O que está bem**
[1-2 pontos positivos, frases curtas]

**O que precisa de atenção**
[1 ponto, direto. Se tudo bem: o que observar amanhã]

**Para amanhã**
[1 ação. Só uma.]`;


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
  inputs?: Inputs,
  period: "morning" | "evening" = "morning"
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
    system: period === "evening" ? SYSTEM_PROMPT_EVENING : SYSTEM_PROMPT_MORNING,
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
