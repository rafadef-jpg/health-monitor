"use client";

import { useEffect, useState } from "react";
import { RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

type Props = { initialReport: string | null; semaphore?: string };

type State =
  | { status: "idle"; text: string }
  | { status: "loading"; text: string }
  | { status: "error"; text: string; message: string };

function parseReport(text: string): { hook: string; body: string } {
  const match = text.match(/GANCHO:\s*(.+?)(?=\n---|\n\n\*\*)/s);
  if (match) {
    const hook = match[1].trim();
    const rest = text.slice(text.indexOf(match[0]) + match[0].length).replace(/^[\s\n]*---[\s\n]*/, "").trim();
    return { hook, body: rest };
  }
  const lines = text.split("\n").filter((l) => l.trim());
  const firstBold = lines.findIndex((l) => l.startsWith("**"));
  if (firstBold > 0) {
    return { hook: lines.slice(0, firstBold).join(" ").replace(/^\*+|\*+$/g, "").trim(), body: lines.slice(firstBold).join("\n") };
  }
  return { hook: lines[0].replace(/^\*+|\*+$/g, "").trim(), body: lines.slice(1).join("\n").trim() };
}

function renderBody(text: string) {
  const blocks = text.split(/\n{2,}/);
  return blocks.map((block, i) => {
    const heading = block.match(/^\*\*(.+?)\*\*/);
    if (heading) {
      const rest = block.replace(/^\*\*.+?\*\*\s*\n?/, "").trim();
      return (
        <div key={i} className="space-y-1.5">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{heading[1]}</p>
          {rest && <p className="text-slate-700 text-base leading-relaxed">{rest}</p>}
        </div>
      );
    }
    const clean = block.replace(/\*\*(.+?)\*\*/g, "$1").trim();
    if (!clean) return null;
    return <p key={i} className="text-slate-700 text-base leading-relaxed">{clean}</p>;
  }).filter(Boolean);
}

const SEMAPHORE_STYLE: Record<string, { bg: string; text: string; border: string; dot: string; glow: string }> = {
  green:  { bg: "bg-green-50",  text: "text-green-700",  border: "border-green-100", dot: "bg-green-400",  glow: "shadow-[0_0_12px_4px_rgba(74,222,128,0.5)]" },
  yellow: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-100", dot: "bg-yellow-400", glow: "shadow-[0_0_12px_4px_rgba(250,204,21,0.5)]" },
  orange: { bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-100", dot: "bg-orange-400", glow: "shadow-[0_0_12px_4px_rgba(251,146,60,0.5)]" },
  red:    { bg: "bg-red-50",    text: "text-red-600",    border: "border-red-100",    dot: "bg-red-400",    glow: "shadow-[0_0_12px_4px_rgba(248,113,113,0.5)]" },
};

export function ReportPanel({ initialReport, semaphore: semaphoreProp }: Props) {
  const [state, setState] = useState<State>({
    status: initialReport ? "idle" : "loading",
    text: initialReport ?? "",
  });
  const [expanded, setExpanded] = useState(false);
  const semaphore = semaphoreProp ?? "green";
  const style = SEMAPHORE_STYLE[semaphore] ?? SEMAPHORE_STYLE.green;

  async function generate() {
    setState((prev) => ({ ...prev, status: "loading" }));
    try {
      const res = await fetch("/api/oura/report", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setState({ status: "error", text: "", message: json.error ?? "Erro desconhecido." });
        return;
      }
      setState({ status: "idle", text: json.report });
    } catch {
      setState({ status: "error", text: "", message: "Falha ao conectar com a IA." });
    }
  }

  useEffect(() => {
    if (!initialReport) generate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state.status === "loading" && !state.text) {
    return (
      <div className={`rounded-2xl border p-6 space-y-3 ${style.bg} ${style.border}`}>
        <div className="h-7 w-3/4 bg-white/60 rounded-lg animate-pulse" />
        <div className="h-4 w-1/2 bg-white/60 rounded animate-pulse" />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="biometric-panel rounded-2xl p-6 space-y-2">
        <p className="text-red-500 text-sm">{state.message}</p>
        <button onClick={generate} className="text-sky-500 text-sm underline">Tentar novamente</button>
      </div>
    );
  }

  if (!state.text) return null;

  const { hook, body } = parseReport(state.text);

  return (
    <div className={`rounded-2xl border ${style.bg} ${style.border} overflow-hidden`}>
      {/* Gancho */}
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            {/* Indicador de semáforo */}
            <div className={`size-4 rounded-full shrink-0 mt-1.5 ${style.dot} ${style.glow}`} />
            <p className={`text-xl font-bold leading-snug ${style.text}`}>{hook}</p>
          </div>
          <button
            onClick={generate}
            disabled={state.status === "loading"}
            className="text-slate-300 hover:text-slate-500 transition shrink-0 mt-0.5"
            title="Atualizar"
          >
            <RefreshCw className={`size-4 ${state.status === "loading" ? "animate-spin" : ""}`} />
          </button>
        </div>

        <button
          onClick={() => setExpanded((v) => !v)}
          className={`flex items-center gap-1 mt-3 text-sm font-medium ${style.text} opacity-60 hover:opacity-100 transition`}
        >
          {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          {expanded ? "Fechar" : "Ver análise completa"}
        </button>
      </div>

      {/* Análise expandida */}
      {expanded && body && (
        <div className="bg-white/70 border-t border-white/80 px-5 py-5 space-y-5">
          {renderBody(body)}
        </div>
      )}
    </div>
  );
}
