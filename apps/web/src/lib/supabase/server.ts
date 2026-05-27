import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "./config";

export function createSupabaseServerClient(accessToken?: string) {
  const { url, publishableKey } = getSupabaseConfig();

  return createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  });
}
