"use client";

import { useRef } from "react";

type Weekly = {
  report_text: string;
  week_start: string;
  week_end: string;
  dias_verde: number;
  dias_amarelo: number;
  dias_laranja: number;
  dias_vermelho: number;
  hrv_media: number | null;
  fc_media: number | null;
  sono_media: number | null;
} | null;

function parseHook(text: string): string {
  const match = text.match(/GANCHO:\s*(.+?)(?=\n---|\n\n)/s);
  if (match) return match[1].trim();
  return text.split("\n")[0].replace(/^\*+|\*+$/g, "").trim();
}

function semaphoreLabel(verde: number, amarelo: number, laranja: number, vermelho: number) {
  const total = verde + amarelo + laranja + vermelho;
  if (total === 0) return { label: "—", color: "#94a3b8" };
  const pct = verde / total;
  if (pct >= 0.7) return { label: "Ótima semana", color: "#22c55e" };
  if (pct >= 0.4) return { label: "Semana regular", color: "#eab308" };
  return { label: "Semana difícil", color: "#ef4444" };
}

export function ShareCard({ weekly }: { weekly: Weekly }) {
  const cardRef = useRef<HTMLDivElement>(null);

  async function handleSave() {
    const { default: html2canvas } = await import("html2canvas");
    if (!cardRef.current) return;
    const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true, backgroundColor: null });
    const link = document.createElement("a");
    link.download = "health-monitor-semana.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  if (!weekly) {
    return (
      <div className="biometric-panel rounded-2xl p-8 text-center space-y-2">
        <p className="text-slate-400">Nenhum resumo semanal disponível ainda.</p>
        <p className="text-slate-300 text-sm">O resumo é gerado toda segunda-feira.</p>
      </div>
    );
  }

  const hook = parseHook(weekly.report_text);
  const { label: semLabel, color: semColor } = semaphoreLabel(
    weekly.dias_verde, weekly.dias_amarelo, weekly.dias_laranja, weekly.dias_vermelho
  );
  const total = weekly.dias_verde + weekly.dias_amarelo + weekly.dias_laranja + weekly.dias_vermelho;
  const weekStartFmt = new Date(weekly.week_start + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  const weekEndFmt = new Date(weekly.week_end + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

  return (
    <div className="space-y-4">
      {/* Card Instagram 1:1 */}
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
          background: `${semColor}22`,
          border: `1px solid ${semColor}44`,
        }} />

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", margin: 0 }}>
              Health Monitor
            </p>
            <p style={{ color: "#e2e8f0", fontSize: "13px", margin: "4px 0 0", fontWeight: 500 }}>
              {weekStartFmt} – {weekEndFmt}
            </p>
          </div>
          <div style={{
            background: `${semColor}22`,
            border: `1px solid ${semColor}44`,
            borderRadius: "20px",
            padding: "4px 12px",
          }}>
            <p style={{ color: semColor, fontSize: "11px", fontWeight: 700, margin: 0 }}>{semLabel}</p>
          </div>
        </div>

        {/* Frase central */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", padding: "20px 0" }}>
          <p style={{
            color: "#f1f5f9",
            fontSize: "clamp(16px, 4vw, 22px)",
            fontWeight: 800,
            lineHeight: 1.35,
            margin: 0,
          }}>
            &ldquo;{hook}&rdquo;
          </p>
        </div>

        {/* Dias da semana */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "20px" }}>
          {[
            ...Array(weekly.dias_verde).fill({ color: "#22c55e", label: "V" }),
            ...Array(weekly.dias_amarelo).fill({ color: "#eab308", label: "A" }),
            ...Array(weekly.dias_laranja).fill({ color: "#f97316", label: "L" }),
            ...Array(weekly.dias_vermelho).fill({ color: "#ef4444", label: "R" }),
            ...Array(Math.max(0, 7 - total)).fill({ color: "#334155", label: "–" }),
          ].slice(0, 7).map((d, i) => (
            <div key={i} style={{
              flex: 1, aspectRatio: "1/1", borderRadius: "6px",
              background: `${d.color}33`, border: `1px solid ${d.color}66`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ color: d.color, fontSize: "10px", fontWeight: 700 }}>{d.label}</span>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: "12px" }}>
          {[
            { label: "dias verdes", value: weekly.dias_verde },
            { label: "coração", value: weekly.hrv_media ? (weekly.hrv_media >= 60 ? "Ótimo" : weekly.hrv_media >= 48 ? "Normal" : "Baixo") : "—" },
            { label: "sono", value: weekly.sono_media ? (weekly.sono_media >= 80 ? "Ótimo" : weekly.sono_media >= 65 ? "Bom" : "Regular") : "—" },
          ].map((s) => (
            <div key={s.label} style={{
              flex: 1,
              background: "rgba(255,255,255,0.05)",
              borderRadius: "10px",
              padding: "10px 8px",
              textAlign: "center",
            }}>
              <p style={{ color: "#f1f5f9", fontSize: "18px", fontWeight: 800, margin: 0 }}>{s.value}</p>
              <p style={{ color: "#64748b", fontSize: "10px", fontWeight: 500, margin: "2px 0 0", textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</p>
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
        Salvar imagem para o Instagram
      </button>
    </div>
  );
}
