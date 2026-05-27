import type { Session, User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SessionResult =
  | {
      ok: true;
      user: User;
      session?: Session;
      refreshed: boolean;
    }
  | {
      ok: false;
      refreshed: false;
    };

export async function getUserFromAccessToken(accessToken?: string): Promise<User | null> {
  if (!accessToken) {
    return null;
  }

  try {
    const supabase = createSupabaseServerClient(accessToken);
    const { data, error } = await supabase.auth.getUser(accessToken);

    if (error || !data.user) {
      return null;
    }

    return data.user;
  } catch {
    return null;
  }
}

export async function getSessionFromTokens(
  accessToken?: string,
  refreshToken?: string,
): Promise<SessionResult> {
  const user = await getUserFromAccessToken(accessToken);

  if (user) {
    return {
      ok: true,
      user,
      refreshed: false,
    };
  }

  if (!refreshToken) {
    return {
      ok: false,
      refreshed: false,
    };
  }

  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session || !data.user) {
      return {
        ok: false,
        refreshed: false,
      };
    }

    return {
      ok: true,
      user: data.user,
      session: data.session,
      refreshed: true,
    };
  } catch {
    return {
      ok: false,
      refreshed: false,
    };
  }
}
