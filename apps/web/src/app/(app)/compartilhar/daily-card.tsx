"use client";

import { useRef } from "react";

type Snapshot = {
  recovery_score: number | null;
  hrv_avg: number | null;
  rhr_bpm: number | null;
  sleep_dim_score: number | null;
  stress_score: number | null;
  snapshot_date: string;
  report_text: string | null;
} | null;

type EngineResult = {
  score: number;
  semaphore: string;
} | null;

const SEM_COLOR: Record<string, string> = {
  green: "#22c55e",
  yellow: "#eab308",
  orange: "#f97316",
  red: "#ef4444",
};

const SEM_LABEL: Record<string, string> = {
  green: "Otimo",
  yellow: "Regular",
  orange: "Atencao",
  red: "Critico",
};

function metricLabel(value: number | null, thresholds: [number, string][]): string {
  if (value == null) return "—";
  for (const [min, label] of thresholds) if (value >= min) return label;
  return thresholds[thresholds.length - 1][1];
}

export function DailyCard({ snapshot, engineResult }: { snapshot: Snapshot; engineResult: EngineResult }) {
  const cardRef = useRef<HTMLDivElement>(null);

  async function handleSave() {
    const { default: html2canvas } = await import("html2canvas");
    if (!cardRef.current) return;
    const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true, backgroundColor: null });
    const link = document.createElement("a");
    link.download = "health-monitor-hoje.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  if (!snapshot || !engineResult) {
    return (
      <div className="biometric-panel rounded-2xl p-8 text-center space-y-2">
        <p className="text-slate-400">Nenhum dado de hoje disponivel.</p>
        <p className="text-slate-300 text-sm">Sincronize o Oura primeiro.</p>
      </div>
    );
  }

  const color = SEM_COLOR[engineResult.semaphore] ?? "#94a3b8";
  const label = SEM_LABEL[engineResult.semaphore] ?? "—";
  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "short" });

  const hrvLabel = metricLabel(snapshot.hrv_avg, [[70,"Otimo"],[55,"Normal"],[40,"Abaixo"],[0,"Baixo"]]);
  const sleepLabel = metricLabel(snapshot.sleep_dim_score, [[85,"Excelente"],[70,"Bom"],[55,"Regular"],[0,"Ruim"]]);
  const stressLabel = snapshot.stress_score === 0 ? "Tranquilo" : metricLabel(snapshot.stress_score, [[60,"Alto"],[30,"Moderado"],[0,"Leve"]]);

  return (
    <div className="space-y-4">
      <div
        ref={cardRef}
        style={{
          width: "100%",
          aspectRatio: "1/1",
          background: "linear-gradient(135deg, #0f172a 0%, #0c2340 50%, #0f172a 100%)",
          borderRadius: "16px",
          padding: "32px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Círculo decorativo */}
        <div style={{
          position: "absolute", top: "-60px", right: "-60px",
          width: "200px", height: "200px",
          borderRadius: "50%",
          background: `${color}22`,
          border: `1px solid ${color}44`,
        }} />

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", margin: 0 }}>
              Health Monitor
            </p>
            <p style={{ color: "#e2e8f0", fontSize: "13px", margin: "4px 0 0", fontWeight: 500 }}>
              {today}
            </p>
          </div>
          <div style={{
            background: `${color}22`,
            border: `1px solid ${color}44`,
            borderRadius: "20px",
            padding: "4px 12px",
          }}>
            <p style={{ color, fontSize: "11px", fontWeight: 700, margin: 0 }}>{label}</p>
          </div>
        </div>

        {/* Score central */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: "8px" }}>
          <p style={{ color: "#64748b", fontSize: "11px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", margin: 0 }}>
            Como voce esta
          </p>
          <p style={{ color, fontSize: "72px", fontWeight: 900, lineHeight: 1, margin: 0 }}>
            {engineResult.score}
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: "10px" }}>
          {[
            { label: "HRV", value: snapshot.hrv_avg != null ? `${snapshot.hrv_avg}ms` : "—", sub: hrvLabel },
            { label: "Sono", value: snapshot.sleep_dim_score != null ? `${snapshot.sleep_dim_score}` : "—", sub: sleepLabel },
            { label: "Stress", value: stressLabel, sub: snapshot.stress_score != null ? `${snapshot.stress_score}min` : "—" },
          ].map((s) => (
            <div key={s.label} style={{
              flex: 1,
              background: "rgba(255,255,255,0.05)",
              borderRadius: "10px",
              padding: "10px 8px",
              textAlign: "center",
            }}>
              <p style={{ color: "#f1f5f9", fontSize: "16px", fontWeight: 800, margin: 0 }}>{s.value}</p>
              <p style={{ color: "#64748b", fontSize: "9px", fontWeight: 600, margin: "2px 0 0", textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</p>
              <p style={{ color: "#475569", fontSize: "9px", margin: "1px 0 0" }}>{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Rodapé */}
        <p style={{ color: "#334155", fontSize: "10px", textAlign: "center", margin: "12px 0 0", fontWeight: 500 }}>
          health-monitor-web-sigma.vercel.app
        </p>
      </div>

      <button
        onClick={handleSave}
        className="w-full bg-sky-500 text-white font-semibold py-3 rounded-xl hover:bg-sky-600 transition text-sm"
      >
        Salvar imagem para compartilhar
      </button>
    </div>
  );
}
