import type { Session } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import {
  AUTH_ACCESS_COOKIE,
  AUTH_REFRESH_COOKIE,
  accessCookieMaxAge,
  authCookieOptions,
  expiredAuthCookieOptions,
  refreshCookieMaxAge,
} from "./cookies";

export async function persistSessionCookies(session: Session) {
  const cookieStore = await cookies();

  cookieStore.set(AUTH_ACCESS_COOKIE, session.access_token, {
    ...authCookieOptions,
    maxAge: accessCookieMaxAge(session.expires_in),
  });
  cookieStore.set(AUTH_REFRESH_COOKIE, session.refresh_token, {
    ...authCookieOptions,
    maxAge: refreshCookieMaxAge(),
  });
}

export async function clearSessionCookies() {
  const cookieStore = await cookies();

  cookieStore.set(AUTH_ACCESS_COOKIE, "", expiredAuthCookieOptions);
  cookieStore.set(AUTH_REFRESH_COOKIE, "", expiredAuthCookieOptions);
}
