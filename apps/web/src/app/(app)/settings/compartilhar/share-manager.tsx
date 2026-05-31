"use client";

import { useState } from "react";
import { Copy, Trash2, Plus, Check } from "lucide-react";

type Token = { id: string; token: string; label: string; active: boolean; created_at: string };

export function ShareManager({ tokens: initial, appUrl }: { tokens: Token[]; appUrl: string }) {
  const [tokens, setTokens] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  async function createToken() {
    setLoading(true);
    const res = await fetch("/api/share", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label: "Personal" }) });
    const json = await res.json();
    if (json.token) {
      const newToken: Token = { id: Date.now().toString(), token: json.token, label: "Personal", active: true, created_at: new Date().toISOString() };
      setTokens(prev => [newToken, ...prev]);
    }
    setLoading(false);
  }

  async function deleteToken(id: string) {
    await fetch("/api/share", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setTokens(prev => prev.filter(t => t.id !== id));
  }

  function copyLink(token: string) {
    navigator.clipboard.writeText(`${appUrl}/view/${token}`);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="space-y-4">
      <button
        onClick={createToken}
        disabled={loading}
        className="flex items-center gap-2 bg-sky-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-sky-600 transition disabled:opacity-50"
      >
        <Plus className="size-4" />
        {loading ? "Gerando..." : "Gerar novo link"}
      </button>

      {tokens.length === 0 && (
        <div className="biometric-panel rounded-2xl p-6 text-center">
          <p className="text-slate-400 text-sm">Nenhum link gerado ainda.</p>
        </div>
      )}

      {tokens.map((t) => (
        <div key={t.id} className="biometric-panel rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-slate-700 text-sm font-semibold">{t.label}</p>
            <button onClick={() => deleteToken(t.id)} className="text-slate-300 hover:text-red-400 transition">
              <Trash2 className="size-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2">
            <p className="text-slate-500 text-xs truncate flex-1">{appUrl}/view/{t.token}</p>
            <button onClick={() => copyLink(t.token)} className="text-sky-500 hover:text-sky-600 transition shrink-0">
              {copied === t.token ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
            </button>
          </div>
          <p className="text-slate-300 text-xs">Criado em {new Date(t.created_at).toLocaleDateString("pt-BR")}</p>
        </div>
      ))}
    </div>
  );
}
