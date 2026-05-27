"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { loginSchema, signupSchema } from "@repo/shared";
import { AUTH_ACCESS_COOKIE } from "@/lib/auth/cookies";
import { getFriendlyAuthError } from "@/lib/auth/errors";
import { getSafeRedirectPath } from "@/lib/auth/redirects";
import { clearSessionCookies, persistSessionCookies } from "@/lib/auth/session-cookies";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LoginState = {
  error?: string;
};

export type SignupState = {
  error?: string;
};

export async function loginAction(_state: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Confira email e senha.",
    };
  }

  const redirectPath = getSafeRedirectPath(formData.get("next"));

  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

    if (error || !data.session) {
      return {
        error: getFriendlyAuthError(error),
      };
    }

    await persistSessionCookies(data.session);
  } catch (error) {
    return {
      error: getFriendlyAuthError(error instanceof Error ? error : undefined),
    };
  }

  redirect(redirectPath);
}

export async function signupAction(_state: SignupState, formData: FormData): Promise<SignupState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Confira os dados do cadastro.",
    };
  }

  let redirectPath = getSafeRedirectPath(formData.get("next"));

  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: {
          full_name: parsed.data.name,
        },
      },
    });

    if (error) {
      return {
        error: getFriendlyAuthError(error),
      };
    }

    if (data.session) {
      await persistSessionCookies(data.session);
    } else {
      redirectPath = `/login?${new URLSearchParams({
        message: "Conta criada. Confira seu email para confirmar o acesso.",
      }).toString()}`;
    }
  } catch (error) {
    return {
      error: getFriendlyAuthError(error instanceof Error ? error : undefined),
    };
  }

  redirect(redirectPath);
}

export async function logoutAction() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_ACCESS_COOKIE)?.value;

  try {
    if (accessToken) {
      const supabase = createSupabaseServerClient(accessToken);
      await supabase.auth.signOut();
    }
  } finally {
    await clearSessionCookies();
  }

  redirect("/login");
}
