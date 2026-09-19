export const AUTH_ACCESS_COOKIE = "hm-access-token";
export const AUTH_REFRESH_COOKIE = "hm-refresh-token";

const isProduction = process.env.NODE_ENV === "production";

export const authCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  path: "/",
} as const;

export const expiredAuthCookieOptions = {
  ...authCookieOptions,
  maxAge: 0,
} as const;

export function accessCookieMaxAge(expiresIn?: number) {
  return expiresIn && expiresIn > 0 ? expiresIn : 60 * 60;
}

export function refreshCookieMaxAge() {
  return 60 * 60 * 24 * 30;
}
