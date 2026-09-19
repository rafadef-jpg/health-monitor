import { NextResponse } from "next/server";

/**
 * F-08 — Centralized server-side error handling for API routes.
 *
 * Guarantees:
 * - Raw third-party SDK errors (Anthropic, Supabase, etc.) are NEVER
 *   forwarded to the client — the client always receives a generic message.
 * - Server logs never contain API keys, tokens or full health payloads:
 *   only the error class name and message are recorded.
 * - Stack traces are only logged outside production.
 */

const isProduction = process.env.NODE_ENV === "production";

export function logServerError(tag: string, err: unknown): void {
  if (err instanceof Error) {
    if (isProduction) {
      console.error(`[${tag}] ${err.name}: ${err.message}`);
    } else {
      console.error(`[${tag}] ${err.name}: ${err.message}`);
      if (err.stack) console.error(err.stack);
    }
  } else {
    console.error(`[${tag}] non-Error thrown (${typeof err})`);
  }
}

export function serverErrorResponse(
  message = "Erro interno. Tente novamente em instantes.",
  status = 500
): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
