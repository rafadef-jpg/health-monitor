import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { isCronAuthorized } from "@/lib/auth/cron-secret";

webpush.setVapidDetails(
  process.env.VAPID_CONTACT_EMAIL ?? "mailto:admin@healthmonitor.app",
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Não configurado." }, { status: 500 });
  }
  if (!isCronAuthorized(authHeader)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const body_raw = await request.json();
  const user_id = typeof body_raw.user_id === "string" ? body_raw.user_id : null;
  const title = typeof body_raw.title === "string" ? body_raw.title.slice(0, 100) : "Health Monitor";
  const body = typeof body_raw.body === "string" ? body_raw.body.slice(0, 200) : "Relatório pronto.";
  const url = typeof body_raw.url === "string" ? body_raw.url.slice(0, 200) : "/dashboard";

  if (!user_id) return NextResponse.json({ error: "user_id inválido." }, { status: 400 });

  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: subs } = await service
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", user_id);

  if (!subs?.length) return NextResponse.json({ sent: 0 });

  const payload = JSON.stringify({ title, body, url: url ?? "/dashboard" });

  const results = await Promise.allSettled(
    subs.map((s: { endpoint: string; p256dh: string; auth: string }) =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload
      )
    )
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  return NextResponse.json({ sent, total: subs.length });
}
