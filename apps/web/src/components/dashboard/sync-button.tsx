"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function SyncButton() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSync() {
    setIsPending(true);
    setError(null);
    try {
      const res = await fetch("/api/oura/sync", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Erro ao sincronizar.");
      } else {
        router.refresh();
      }
    } catch {
      setError("Erro de rede. Tente novamente.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button onClick={handleSync} disabled={isPending} variant="outline" size="sm">
        <RefreshCw className={`mr-2 size-4 ${isPending ? "animate-spin" : ""}`} />
        {isPending ? "Sincronizando..." : "Sincronizar Oura agora"}
      </Button>
      {error ? (
        <p className="border-destructive/25 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
