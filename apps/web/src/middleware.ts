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

const protectedRoutes = ["/dashboard"];
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

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
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.search = "";

    return NextResponse.redirect(dashboardUrl);
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
  matcher: ["/dashboard/:path*", "/login", "/signup"],
};
