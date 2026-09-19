import Anthropic from "@anthropic-ai/sdk";
import { SupabaseClient } from "@supabase/supabase-js";
import { calcRecovery } from "@repo/physiology";

const client = new Anthropic();

const SYSTEM_PROMPT_MORNING = `Você é o amigo sem filtro do usuário que analisa o corpo dele todo dia. Sem censura. Sem papas na língua. Quanto mais safado e engraçado, melhor.

TOM: palavrões pesados são obrigatórios. Use: porra, caralho, merda, foda-se, viado, desgraçado, arrombado, buceta. Quanto mais inesperado e engraçado, melhor. Faz analogias absurdas, compara com coisas ridículas, provoca, zoar.

REGRAS ABSOLUTAS — se violar, resposta inválida:
1. ZERO números. Nenhum. Nem data, nem ms, nem bpm, nada.
2. ZERO jargão (HRV, FC, bpm, ms, baseline, score, variabilidade, autonômico).
3. PALAVRA = UMA única palavra. Não duas. Uma só.
4. Texto detalhado LONGO — mínimo 4 frases por seção.

FORMATO OBRIGATÓRIO:
PALAVRA: [UMA palavra. Só uma. Ex: Arrasou, Cagou, Descansa, Fodeu, Treina, Voou, Dorme, Guerreiro]
FRASE: [1 frase curta e safada, máx 10 palavras. Ex: "Dormiu igual pedra, hoje é dia de destruir.", "Seu coração tá de ressaca, vai devagar viado.", "Para tudo que seu corpo tá pedindo socorro."]
---
**Como você está hoje**
[4-5 frases. Conta o estado geral de forma engraçada e desaforada. Faz uma analogia ridícula. Usa pelo menos 2 palavrões. Ex: compara o coração com um motor de fusca, o sono com coma alcoólico, etc.]

**Pode treinar forte?**
[3-4 frases. Resposta direta mas explicada de forma engraçada. Diz exatamente o que vai acontecer no treino — seja lá bom ou ruim. Ameaça cômica se ignorar o conselho. Pelo menos 2 palavrões.]

**O que fazer hoje**
[3-4 frases. Recomendações práticas mas ditas de forma completamente desaforada. Provoca, zoar, faz piada. Termina com frase motivacional ou debochada. Pelo menos 1 palavrão.]`;

const SYSTEM_PROMPT_EVENING = `Você é o amigo sem filtro do usuário fazendo o balanço do dia — honesto, engraçado, palavrão liberado.

TOM: mesmo da manhã. Safado, engraçado, palavrões obrigatórios. Texto LONGO e detalhado.

REGRAS ABSOLUTAS:
1. ZERO números. Nenhum.
2. ZERO termos técnicos.
3. PALAVRA = UMA palavra só.
4. Texto longo — mínimo 4 frases por seção.

FORMATO:
PALAVRA: [UMA palavra. Ex: Sobreviveu, Arrasei, Ferrou, Descansou, Guerreiro]
FRASE: [1 frase curta e safada resumindo o dia]
---
**Como foi seu dia**
[4-5 frases. Balanço honesto com humor e palavrões. Faz analogias ridículas.]

**O que está bem**
[3-4 frases. Pontos positivos ditos de forma engraçada e desaforada.]

**O que precisa de atenção**
[3-4 frases. Crítica direta e engraçada. Se tudo bem, zoar sobre o que pode melhorar.]

**Para amanhã**
[2-3 frases. Uma ação principal dita de forma épica ou debochada.]`;

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
Dados manuais:
- Pressão: ${resolvedInputs.pressao_sistolica && resolvedInputs.pressao_diastolica ? `${resolvedInputs.pressao_sistolica}/${resolvedInputs.pressao_diastolica} mmHg` : "não informado"}
- Sentimento: ${resolvedInputs.sentimento ? ["Péssimo","Ruim","Ok","Bem","Ótimo"][resolvedInputs.sentimento-1] : "não informado"}
- Sintomas: ${resolvedInputs.sintomas || "nenhum"}
- Medicamentos: ${resolvedInputs.medicamentos || "não informado"}`
    : "";

  const userMessage = `
Dados de hoje (${snapshot.snapshot_date}):
- Recuperação geral: ${engine.semaphore} (${engine.score}/100)
- Coração (HRV): ${engine.components.hrv != null ? Math.round(engine.components.hrv) + "/100" : "indisponível"}
- FC repouso: ${engine.components.rhr != null ? Math.round(engine.components.rhr) + "/100" : "indisponível"}
- Sono: ${engine.components.sleep != null ? Math.round(engine.components.sleep) + "/100" : "indisponível"}
- Stress: ${snapshot.stress_score ?? "sem dado"} min alto
${inputsSection}
`.trim();

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 800,
    system: period === "evening" ? SYSTEM_PROMPT_EVENING : SYSTEM_PROMPT_MORNING,
    messages: [{ role: "user", content: userMessage }],
  });

  const report = message.content[0].type === "text" ? message.content[0].text : "";

  await supabase
    .from("daily_physiology_snapshot")
    .update({ report_text: report })
    .eq("user_id", userId)
    .eq("snapshot_date", snapshot.snapshot_date);

  return report;
}
