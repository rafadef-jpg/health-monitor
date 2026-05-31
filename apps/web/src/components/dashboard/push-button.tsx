"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff } from "lucide-react";

export function PushButton({ vapidPublicKey }: { vapidPublicKey: string }) {
  const [status, setStatus] = useState<"idle" | "subscribed" | "loading" | "unsupported">("idle");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        if (sub) setStatus("subscribed");
      });
    });
  }, []);

  async function handleSubscribe() {
    setStatus("loading");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
      });
      const json = sub.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      setStatus("subscribed");
    } catch {
      setStatus("idle");
    }
  }

  if (status === "unsupported") {
    return (
      <p className="text-xs text-muted-foreground">
        Notificações não suportadas neste dispositivo
      </p>
    );
  }
  if (status === "subscribed") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-primary">
        <Bell className="size-3.5" />
        Notificações ativas
      </div>
    );
  }

  return (
    <button
      onClick={handleSubscribe}
      disabled={status === "loading"}
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition disabled:opacity-50"
    >
      <BellOff className="size-3.5" />
      {status === "loading" ? "Ativando..." : "Ativar notificações"}
    </button>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}
