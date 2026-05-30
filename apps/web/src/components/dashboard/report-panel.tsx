"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

type Props = {
  initialReport: string | null;
};

type State =
  | { status: "idle"; text: string }
  | { status: "loading"; text: string }
  | { status: "error"; text: string; message: string };

export function ReportPanel({ initialReport }: Props) {
  const [state, setState] = useState<State>({
    status: initialReport ? "idle" : "loading",
    text: initialReport ?? "",
  });

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

  // Auto-gera se não tiver relatório
  useEffect(() => {
    if (!initialReport) {
      generate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-3">
      {state.status === "loading" && !state.text && (
        <div className="biometric-panel rounded-lg p-5 space-y-3 animate-pulse">
          <p className="text-primary text-xs font-medium uppercase tracking-widest">
            Análise do dia
          </p>
          <p className="text-muted-foreground text-sm">Gerando relatório...</p>
        </div>
      )}

      {state.text && (
        <div className="biometric-panel rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <p className="text-primary text-xs font-medium uppercase tracking-widest">
              Análise do dia
            </p>
            <button
              onClick={generate}
              disabled={state.status === "loading"}
              className="text-muted-foreground hover:text-foreground transition disabled:opacity-40"
              title="Atualizar relatório"
            >
              <RefreshCw className={`size-3.5 ${state.status === "loading" ? "animate-spin" : ""}`} />
            </button>
          </div>
          <div className="text-foreground text-sm leading-7 whitespace-pre-wrap">
            {state.text}
          </div>
        </div>
      )}

      {state.status === "error" && (
        <div className="biometric-panel rounded-lg p-5 space-y-3">
          <p className="text-red-500 text-sm">{state.message}</p>
          <button
            onClick={generate}
            className="text-primary text-sm underline"
          >
            Tentar novamente
          </button>
        </div>
      )}
    </div>
  );
}
