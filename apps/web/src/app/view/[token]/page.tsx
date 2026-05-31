import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { Activity, Moon, Zap, Wind } from "lucide-react";
import { calcRecovery } from "@repo/physiology";

function scoreToLabel(score: number | null, thresholds: [number, string, string][]): { label: string; color: string } | null {
  if (score == null) return null;
  for (const [min, label, color] of thresholds) if (score >= min) return { label, color };
  const last = thresholds[thresholds.length - 1];
  return { label: last[1], color: last[2] };
}

export default async function ViewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Valida token
  const { data: tokenData } = await service
    .from("share_tokens")
    .select("user_id, label, active")
    .eq("token", token)
    .eq("active", true)
    .maybeSingle();

  if (!tokenData) return notFound();

  // Atualiza last_accessed_at
  await service.from("share_tokens").update({ last_accessed_at: new Date().toISOString() }).eq("token", token);

  // Busca dados do usuário
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
  const { data: snapshot } = await service
    .from("daily_physiology_snapshot")
    .select("recovery_score, hrv_avg, rhr_bpm, sleep_dim_score, stress_score, snapshot_date, report_text")
    .eq("user_id", tokenData.user_id)
    .gte("snapshot_date", twoDaysAgo)
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const engine = snapshot ? calcRecovery({ hrv_ms: snapshot.hrv_avg, rhr_bpm: snapshot.rhr_bpm, sleep_score: snapshot.sleep_dim_score }) : null;

  const SEMAPHORE_COLOR: Record<string, string> = { green: "text-green-500", yellow: "text-yellow-500", orange: "text-orange-500", red: "text-red-500" };
  const SEMAPHORE_LABEL: Record<string, string> = { green: "Ótimo", yellow: "Regular", orange: "Atenção", red: "Crítico" };
  const SEMAPHORE_DOT: Record<string, string> = { green: "bg-green-400", yellow: "bg-yellow-400", orange: "bg-orange-400", red: "bg-red-400" };

  const metrics = [
    { title: "Coração", value: scoreToLabel(snapshot?.hrv_avg ?? null, [[70,"Ótimo","text-green-500"],[55,"Normal","text-yellow-500"],[40,"Abaixo","text-orange-500"],[0,"Baixo","text-red-500"]]), sub: snapshot?.hrv_avg != null ? `${snapshot.hrv_avg} ms` : null, icon: Activity },
    { title: "Sono", value: scoreToLabel(snapshot?.sleep_dim_score ?? null, [[85,"Excelente","text-green-500"],[70,"Bom","text-green-500"],[55,"Regular","text-yellow-500"],[0,"Ruim","text-red-500"]]), sub: snapshot?.sleep_dim_score != null ? `nota ${snapshot.sleep_dim_score}` : null, icon: Moon },
    { title: "Recuperação", value: scoreToLabel(snapshot?.recovery_score ?? null, [[80,"Ótima","text-green-500"],[65,"Boa","text-yellow-500"],[50,"Regular","text-orange-500"],[0,"Baixa","text-red-500"]]), sub: snapshot?.recovery_score != null ? `nota ${snapshot.recovery_score}` : null, icon: Zap },
    { title: "Estresse", value: snapshot?.stress_score != null ? (snapshot.stress_score === 0 ? { label: "Tranquilo", color: "text-green-500" } : snapshot.stress_score < 30 ? { label: "Leve", color: "text-yellow-500" } : snapshot.stress_score < 60 ? { label: "Moderado", color: "text-orange-500" } : { label: "Alto", color: "text-red-500" }) : null, sub: null, icon: Wind },
  ];

  return (
    <main className="min-h-screen bg-[#f5f5f7] pb-10">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-sky-500 size-8 rounded-xl flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 512 512" fill="none">
                <polyline points="80,256 160,256 196,160 232,340 268,200 300,300 336,256 432,256" fill="none" stroke="white" strokeWidth="52" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-sm font-bold text-slate-800">Health Monitor</span>
          </div>
          <span className="text-xs text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
            Visualização — {tokenData.label}
          </span>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-5 py-6 space-y-4">
        <div>
          <p className="text-slate-400 text-sm">{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="text-slate-800 text-2xl font-bold">Hoje</h1>
        </div>

        {!snapshot ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 text-center">
            <p className="text-slate-400 text-sm">Nenhum dado disponível ainda.</p>
          </div>
        ) : (
          <>
            {/* Recovery */}
            {engine && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Como está</p>
                  <p className={`text-5xl font-black ${SEMAPHORE_COLOR[engine.semaphore]}`}>{engine.score}</p>
                </div>
                <span className={`flex items-center gap-1.5 text-base font-semibold ${SEMAPHORE_COLOR[engine.semaphore]}`}>
                  <span className={`size-2.5 rounded-full ${SEMAPHORE_DOT[engine.semaphore]}`} />
                  {SEMAPHORE_LABEL[engine.semaphore]}
                </span>
              </div>
            )}

            {/* Cards */}
            <div className="grid grid-cols-2 gap-3">
              {metrics.map((m) => (
                <div key={m.title} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-slate-50 size-7 flex items-center justify-center rounded-lg">
                      <m.icon className="size-3.5 text-slate-400" />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{m.title}</p>
                  </div>
                  {m.value ? (
                    <div>
                      <p className={`text-2xl font-bold ${m.value.color}`}>{m.value.label}</p>
                      {m.sub && <p className="text-slate-400 text-xs mt-0.5">{m.sub}</p>}
                    </div>
                  ) : <p className="text-slate-200 text-xl">—</p>}
                </div>
              ))}
            </div>

            {/* Relatório se existir */}
            {snapshot.report_text && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Análise do dia</p>
                <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                  {snapshot.report_text.replace(/PALAVRA:.*\n?/g, "").replace(/FRASE:.*\n?/g, "").replace(/GANCHO:.*\n?/g, "").replace(/^---\n?/m, "").replace(/\*\*(.+?)\*\*/g, "$1").trim()}
                </p>
              </div>
            )}
          </>
        )}

        <p className="text-center text-slate-300 text-xs pt-2">
          Acesso somente leitura · Health Monitor
        </p>
      </div>
    </main>
  );
}
