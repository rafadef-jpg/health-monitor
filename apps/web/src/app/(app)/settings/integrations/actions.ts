"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AUTH_ACCESS_COOKIE } from "@/lib/auth/cookies";
import { getUserFromAccessToken } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type IntegrationsState = {
  error?: string;
  success?: string;
  setup?: boolean;
};

export async function saveOuraTokenAction(
  _state: IntegrationsState,
  formData: FormData,
): Promise<IntegrationsState> {
  const token = (formData.get("oura_token") as string | null)?.trim();
  const isSetup = formData.get("setup") === "1";

  if (!token) {
    return { error: "Informe o token." };
  }

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_ACCESS_COOKIE)?.value;
  const user = await getUserFromAccessToken(accessToken);

  if (!user) {
    return { error: "Sessão expirada. Faça login novamente." };
  }

  const supabase = createSupabaseServerClient(accessToken);
  const { error } = await supabase
    .from("user_integrations")
    .upsert(
      { user_id: user.id, provider: "oura", access_token: token, updated_at: new Date().toISOString() },
      { onConflict: "user_id,provider" },
    );

  if (error) {
    console.error("[saveOuraTokenAction]", error.code, error.message);
    return { error: "Erro ao salvar token. Tente novamente." };
  }

  if (isSetup) {
    redirect("/dashboard");
  }

  revalidatePath("/settings/integrations");
  return { success: "Token salvo com sucesso." };
}
