"use client";

import { useEffect, useState } from "react";
import { RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

type Props = { initialReport: string | null; semaphore?: string };

type State =
  | { status: "idle"; text: string }
  | { status: "loading"; text: string }
  | { status: "error"; text: string; message: string };

function parseReport(text: string): { hook: string; body: string } {
  const match = text.match(/^GANCHO:\s*(.+?)\n---\n?([\s\S]*)$/);
  if (match) return { hook: match[1].trim(), body: match[2].trim() };
  // fallback: usa primeira linha como gancho
  const lines = text.split("\n");
  return { hook: lines[0].replace(/^\*+|\*+$/g, "").trim(), body: lines.slice(1).join("\n").trim() };
}

const SEMAPHORE_BG: Record<string, string> = {
  green: "bg-green-50 border-green-100",
  yellow: "bg-yellow-50 border-yellow-100",
  orange: "bg-orange-50 border-orange-100",
  red: "bg-red-50 border-red-100",
};
const SEMAPHORE_TEXT: Record<string, string> = {
  green: "text-green-700",
  yellow: "text-yellow-700",
  orange: "text-orange-600",
  red: "text-red-600",
};

export function ReportPanel({ initialReport, semaphore: semaphoreProp }: Props) {
  const [state, setState] = useState<State>({
    status: initialReport ? "idle" : "loading",
    text: initialReport ?? "",
  });
  const [expanded, setExpanded] = useState(false);
  const semaphore = semaphoreProp ?? "green";

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
      <div className="biometric-panel rounded-2xl p-6 animate-pulse">
        <div className="h-7 w-2/3 bg-slate-100 rounded-lg mb-2" />
        <div className="h-4 w-1/3 bg-slate-100 rounded" />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="biometric-panel rounded-2xl p-6 space-y-2">
        <p className="text-red-500 text-sm">{state.message}</p>
        <button onClick={generate} className="text-primary text-sm underline">Tentar novamente</button>
      </div>
    );
  }

  if (!state.text) return null;

  const { hook, body } = parseReport(state.text);
  const bgClass = SEMAPHORE_BG[semaphore] ?? SEMAPHORE_BG.green;
  const textClass = SEMAPHORE_TEXT[semaphore] ?? SEMAPHORE_TEXT.green;

  return (
    <div className={`rounded-2xl border p-6 space-y-4 ${bgClass}`}>
      <div className="flex items-start justify-between gap-3">
        <p className={`text-2xl font-bold leading-tight ${textClass}`}>{hook}</p>
        <button
          onClick={generate}
          disabled={state.status === "loading"}
          className="text-slate-300 hover:text-slate-500 transition shrink-0 mt-1"
          title="Atualizar"
        >
          <RefreshCw className={`size-4 ${state.status === "loading" ? "animate-spin" : ""}`} />
        </button>
      </div>

      {body && (
        <>
          <button
            onClick={() => setExpanded((v) => !v)}
            className={`flex items-center gap-1.5 text-sm font-medium ${textClass} opacity-70 hover:opacity-100 transition`}
          >
            {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            {expanded ? "Fechar análise" : "Ver análise completa"}
          </button>

          {expanded && (
            <div className="text-sm leading-7 text-slate-700 whitespace-pre-wrap border-t border-current/10 pt-4">
              {body}
            </div>
          )}
        </>
      )}
    </div>
  );
}
