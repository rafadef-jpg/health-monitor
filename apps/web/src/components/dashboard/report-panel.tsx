"use client";

import { useEffect, useState } from "react";
import { RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, Tooltip } from "recharts";

type Props = {
  initialReport: string | null;
  semaphore?: string;
  recentScores?: { date: string; score: number | null }[];
};

type State =
  | { status: "idle"; text: string }
  | { status: "loading"; text: string }
  | { status: "error"; text: string; message: string };

type Parsed = { word: string; phrase: string; body: string };

function parseReport(text: string): Parsed {
  const wordMatch = text.match(/PALAVRA:\s*(.+)/);
  const phraseMatch = text.match(/FRASE:\s*(.+)/);
  const afterDashes = text.replace(/.*---\n?/s, "").trim();

  const word = wordMatch?.[1]?.trim() ?? "";
  const phrase = phraseMatch?.[1]?.trim() ?? "";

  if (!word) {
    const ganchoMatch = text.match(/GANCHO:\s*([\s\S]+?)(?:\s*---|\n\n(?=\*\*))/);
    const hook = ganchoMatch?.[1]?.replace(/\s*---\s*$/, "").trim() ?? text.split("\n")[0];
    return { word: hook, phrase: "", body: afterDashes };
  }

  return { word, phrase, body: afterDashes };
}

function renderBody(text: string) {
  const normalized = text.replace(/\n(\*\*)/g, "\n\n$1");
  const blocks = normalized.split(/\n{2,}/);
  return blocks.map((block, i) => {
    const heading = block.match(/^\*\*(.+?)\*\*/);
    if (heading) {
      const rest = block.replace(/^\*\*.+?\*\*\s*\n?/, "").trim();
      return (
        <div key={i} className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{heading[1]}</p>
          {rest && <p className="text-slate-700 text-[15px] leading-relaxed">{rest.replace(/\*\*(.+?)\*\*/g, "$1")}</p>}
        </div>
      );
    }
    const clean = block.replace(/^[-]+\s*/gm, "").replace(/\*\*(.+?)\*\*/g, "$1").trim();
    if (!clean) return null;
    return <p key={i} className="text-slate-700 text-[15px] leading-relaxed">{clean}</p>;
  }).filter(Boolean);
}

const SEMAPHORE_STYLE: Record<string, { bg: string; word: string; phrase: string; chart: string; border: string; dot: string; label: string }> = {
  green:  { bg: "bg-gradient-to-b from-green-50 to-white",  word: "text-green-600",  phrase: "text-green-700/70",  chart: "#22c55e", border: "border-green-100",  dot: "bg-green-400",  label: "Otimo" },
  yellow: { bg: "bg-gradient-to-b from-yellow-50 to-white", word: "text-yellow-600", phrase: "text-yellow-700/70", chart: "#eab308", border: "border-yellow-100", dot: "bg-yellow-400", label: "Regular" },
  orange: { bg: "bg-gradient-to-b from-orange-50 to-white", word: "text-orange-500", phrase: "text-orange-600/70", chart: "#f97316", border: "border-orange-100", dot: "bg-orange-400", label: "Atencao" },
  red:    { bg: "bg-gradient-to-b from-red-50 to-white",    word: "text-red-500",    phrase: "text-red-600/70",    chart: "#ef4444", border: "border-red-100",    dot: "bg-red-400",    label: "Critico" },
};

export function ReportPanel({ initialReport, semaphore: semaphoreProp, recentScores = [] }: Props) {
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
      <div className={`rounded-3xl border ${style.border} ${style.bg} p-8 text-center space-y-3`}>
        <div className="h-12 w-32 bg-white/60 rounded-2xl mx-auto animate-pulse" />
        <div className="h-4 w-48 bg-white/60 rounded mx-auto animate-pulse" />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="biometric-panel rounded-3xl p-6 space-y-2 text-center">
        <p className="text-red-500 text-sm">{state.message}</p>
        <button onClick={generate} className="text-sky-500 text-sm underline">Tentar novamente</button>
      </div>
    );
  }

  if (!state.text) return null;

  const { word, phrase, body } = parseReport(state.text);
  const chartData = recentScores.filter(s => s.score != null).map(s => ({ v: s.score }));

  return (
    <div className={`rounded-3xl border ${style.border} ${style.bg} overflow-hidden`}>
      <div className="px-6 pt-8 pb-5 text-center space-y-2 relative">
        <button
          onClick={generate}
          disabled={state.status === "loading"}
          className="absolute top-4 right-4 text-slate-300 hover:text-slate-500 transition"
        >
          <RefreshCw className={`size-4 ${state.status === "loading" ? "animate-spin" : ""}`} />
        </button>

        {/* Farol */}
        <div className="flex items-center justify-center gap-1.5">
          <span className={`size-2.5 rounded-full ${style.dot}`} />
          <span className={`text-xs font-bold uppercase tracking-widest ${style.word}`}>{style.label}</span>
        </div>

        {/* Palavra grande */}
        <p className={`text-5xl font-black tracking-tight ${style.word}`} style={{ fontFamily: "var(--font-inter), system-ui" }}>
          {word}
        </p>

        {/* Frase */}
        {phrase && (
          <p className={`text-base leading-snug font-medium ${style.phrase} max-w-xs mx-auto`}>
            &quot;{phrase}&quot;
          </p>
        )}

        {/* Sparkline */}
        {chartData.length >= 2 && (
          <div className="mt-3 h-14 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                <defs>
                  <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={style.chart} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={style.chart} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <div className="bg-white shadow rounded-lg px-2 py-1 text-xs font-bold text-slate-700">
                        {payload[0].value}
                      </div>
                    ) : null
                  }
                />
                <Area
                  type="monotone" dataKey="v"
                  stroke={style.chart} strokeWidth={2}
                  fill="url(#sparkGrad)" dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Botao expandir */}
      <div className="border-t border-white/60 px-6 py-3">
        <button
          onClick={() => setExpanded(v => !v)}
          className={`flex items-center justify-center gap-1.5 w-full text-sm font-semibold ${style.phrase} hover:opacity-100 opacity-70 transition`}
        >
          {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          {expanded ? "Fechar analise" : "Saiba mais"}
        </button>
      </div>

      {/* Analise completa */}
      {expanded && body && (
        <div className="bg-white/80 border-t border-white/60 px-6 py-5 space-y-5">
          {renderBody(body)}
        </div>
      )}
    </div>
  );
}
