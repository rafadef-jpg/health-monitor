/**
 * F-09 — Server-side validation of Web Push subscription payloads BEFORE
 * persisting them. Rules:
 * - endpoint: string, parseable URL, HTTPS protocol ONLY, length-capped;
 * - keys.p256dh / keys.auth: present, base64url charset, length-capped.
 *
 * The endpoint is only parsed — never contacted during validation.
 */

const MAX_ENDPOINT_LENGTH = 512;
const MAX_P256DH_LENGTH = 128; // 65-byte key => 88 base64url chars; headroom included
const MAX_AUTH_LENGTH = 64; // 16-byte secret => 24 base64url chars; headroom included
const BASE64URL_RE = /^[A-Za-z0-9\-_]+={0,2}$/;

export type PushSubscriptionValidation =
  | { ok: true; endpoint: string; p256dh: string; auth: string }
  | { ok: false; error: string };

export function validatePushSubscription(body: unknown): PushSubscriptionValidation {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Dados de assinatura ausentes." };
  }

  const { endpoint, keys } = body as {
    endpoint?: unknown;
    keys?: { p256dh?: unknown; auth?: unknown };
  };

  if (typeof endpoint !== "string" || endpoint.length === 0) {
    return { ok: false, error: "Endpoint de push ausente." };
  }
  if (endpoint.length > MAX_ENDPOINT_LENGTH) {
    return { ok: false, error: "Endpoint de push excede o tamanho permitido." };
  }

  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return { ok: false, error: "Endpoint de push inválido." };
  }
  if (url.protocol !== "https:") {
    return { ok: false, error: "Endpoint de push deve usar HTTPS." };
  }

  const p256dh = keys?.p256dh;
  const auth = keys?.auth;

  if (typeof p256dh !== "string" || typeof auth !== "string") {
    return { ok: false, error: "Chaves de criptografia ausentes." };
  }
  if (p256dh.length === 0 || p256dh.length > MAX_P256DH_LENGTH || !BASE64URL_RE.test(p256dh)) {
    return { ok: false, error: "Chave p256dh inválida." };
  }
  if (auth.length === 0 || auth.length > MAX_AUTH_LENGTH || !BASE64URL_RE.test(auth)) {
    return { ok: false, error: "Chave auth inválida." };
  }

  return { ok: true, endpoint, p256dh, auth };
}
