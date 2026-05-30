"use client";

import { useState } from "react";

type ReportState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; text: string }
  | { status: "error"; message: string };

export function ReportButton() {
  const [state, setState] = useState<ReportState>({ status: "idle" });

  async function handleClick() {
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/oura/report", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setState({ status: "error", message: json.error ?? "Erro desconhecido." });
        return;
      }
      setState({ status: "done", text: json.report });
    } catch {
      setState({ status: "error", message: "Falha ao conectar com a IA." });
    }
  }

  return (
    <div className="space-y-4">
      <button
        onClick={handleClick}
        disabled={state.status === "loading"}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
      >
        {state.status === "loading" ? "Gerando relatório..." : "Relatório da IA"}
      </button>

      {state.status === "done" && (
        <div className="biometric-panel rounded-lg p-5 space-y-3">
          <p className="text-primary text-xs font-medium uppercase tracking-widest">
            Análise do dia
          </p>
          <div className="text-foreground text-sm leading-7 whitespace-pre-wrap">
            {state.text}
          </div>
        </div>
      )}

      {state.status === "error" && (
        <p className="text-red-500 text-sm">{state.message}</p>
      )}
    </div>
  );
}
