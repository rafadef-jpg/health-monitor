import type { AuthError } from "@supabase/supabase-js";

export function getFriendlyAuthError(error: AuthError | Error | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  const status = "status" in (error ?? {}) ? (error as AuthError).status : undefined;

  if (status === 400 && message.includes("invalid login credentials")) {
    return "Email ou senha invalidos.";
  }

  if (message.includes("email not confirmed")) {
    return "Confirme seu email antes de entrar.";
  }

  if (message.includes("user already registered") || message.includes("already registered")) {
    return "Este email ja tem uma conta. Entre com sua senha ou recupere o acesso.";
  }

  if (message.includes("password")) {
    return "A senha precisa ter pelo menos 8 caracteres.";
  }

  if (message.includes("fetch failed") || message.includes("network")) {
    return "Nao foi possivel conectar ao Supabase agora. Tente novamente em instantes.";
  }

  return "Nao foi possivel concluir a acao. Confira os dados e tente novamente.";
}
