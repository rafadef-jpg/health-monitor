import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_ACCESS_COOKIE } from "@/lib/auth/cookies";
import { getUserFromAccessToken } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { logServerError, serverErrorResponse } from "@/lib/api/error-handler";
import { validatePushSubscription } from "@/lib/push/validate-subscription";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_ACCESS_COOKIE)?.value;
  const user = await getUserFromAccessToken(accessToken);
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const rl = rateLimit(`push-subscribe:${user.id}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Muitas requisições. Tente novamente em instantes." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    );
  }

  const body = await request.json().catch(() => null);
  const validation = validatePushSubscription(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const supabase = createSupabaseServerClient(accessToken);
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: validation.endpoint,
      p256dh: validation.p256dh,
      auth: validation.auth,
    },
    { onConflict: "user_id,endpoint" }
  );

  if (error) {
    logServerError("push/subscribe", error);
    return serverErrorResponse("Erro ao salvar assinatura. Tente novamente.");
  }
  return NextResponse.json({ ok: true });
}
