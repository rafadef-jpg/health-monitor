import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_ACCESS_COOKIE, AUTH_REFRESH_COOKIE } from "@/lib/auth/cookies";
import { getSessionFromTokens } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/app-shell";

export default async function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_ACCESS_COOKIE)?.value;
  const refreshToken = cookieStore.get(AUTH_REFRESH_COOKIE)?.value;
  const sessionResult = await getSessionFromTokens(accessToken, refreshToken);

  if (!sessionResult.ok) {
    redirect("/login?next=/dashboard");
  }

  return <AppShell>{children}</AppShell>;
}
