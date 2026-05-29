import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_ACCESS_COOKIE,
  AUTH_REFRESH_COOKIE,
  accessCookieMaxAge,
  authCookieOptions,
  expiredAuthCookieOptions,
  refreshCookieMaxAge,
} from "@/lib/auth/cookies";
import { getSessionFromTokens } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const protectedRoutes = ["/dashboard", "/settings"];
const authRoutes = ["/login", "/signup"];

function redirectToLogin(request: NextRequest) {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", request.nextUrl.pathname);

  const response = NextResponse.redirect(loginUrl);
  response.cookies.set(AUTH_ACCESS_COOKIE, "", expiredAuthCookieOptions);
  response.cookies.set(AUTH_REFRESH_COOKIE, "", expiredAuthCookieOptions);

  return response;
}

async function hasOuraToken(accessToken: string, userId: string): Promise<boolean> {
  try {
    const supabase = createSupabaseServerClient(accessToken);
    const { data } = await supabase
      .from("user_integrations")
      .select("access_token")
      .eq("user_id", userId)
      .eq("provider", "oura")
      .maybeSingle();
    return !!data?.access_token;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtectedRoute = protectedRoutes.some((r) => pathname.startsWith(r));
  const isAuthRoute = authRoutes.some((r) => pathname.startsWith(r));

  if (!isProtectedRoute && !isAuthRoute) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get(AUTH_ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(AUTH_REFRESH_COOKIE)?.value;
  const sessionResult = await getSessionFromTokens(accessToken, refreshToken);

  if (!sessionResult.ok) {
    return isProtectedRoute ? redirectToLogin(request) : NextResponse.next();
  }

  if (isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (pathname === "/dashboard") {
    const effectiveToken =
      sessionResult.refreshed && sessionResult.session
        ? sessionResult.session.access_token
        : accessToken;

    if (effectiveToken) {
      const tokenExists = await hasOuraToken(effectiveToken, sessionResult.user.id);
      if (!tokenExists) {
        const setupUrl = request.nextUrl.clone();
        setupUrl.pathname = "/settings/integrations";
        setupUrl.search = "";
        setupUrl.searchParams.set("setup", "1");
        return NextResponse.redirect(setupUrl);
      }
    }
  }

  const response = NextResponse.next();

  if (sessionResult.refreshed && sessionResult.session) {
    response.cookies.set(AUTH_ACCESS_COOKIE, sessionResult.session.access_token, {
      ...authCookieOptions,
      maxAge: accessCookieMaxAge(sessionResult.session.expires_in),
    });
    response.cookies.set(AUTH_REFRESH_COOKIE, sessionResult.session.refresh_token, {
      ...authCookieOptions,
      maxAge: refreshCookieMaxAge(),
    });
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*", "/login", "/signup"],
};
