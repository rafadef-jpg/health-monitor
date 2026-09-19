import { timingSafeEqual } from "crypto";

const BEARER_PREFIX = "Bearer ";

/**
 * F-07 — Cron authentication via CRON_SECRET with constant-time comparison.
 *
 * Rules:
 * - Missing server secret or missing header => unauthorized (500 vs 401 is
 *   decided by the caller; this function only answers "authorized or not").
 * - Different lengths => unauthorized WITHOUT timing leak and without error:
 *   lengths are checked before `timingSafeEqual` (which throws on mismatch),
 *   and we always run one dummy constant-time comparison so the early return
 *   does not leak the secret length via response timing.
 * - Correct value => authorized.
 * - The secret is NEVER logged anywhere.
 */
export function isCronAuthorized(authHeader: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || typeof authHeader !== "string" || !authHeader.startsWith(BEARER_PREFIX)) {
    return false;
  }

  const expected = Buffer.from(secret, "utf8");
  const presented = Buffer.from(authHeader.slice(BEARER_PREFIX.length), "utf8");

  // Compare against `expected` regardless of length so the timing signature
  // is identical whether or not the lengths match.
  const candidate = presented.length === expected.length ? presented : expected;
  const equal = timingSafeEqual(candidate, expected);

  return presented.length === expected.length && equal;
}
