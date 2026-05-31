import Link from "next/link";
import { cookies } from "next/headers";
import { Activity, Bell, Circle } from "lucide-react";
import { AUTH_ACCESS_COOKIE } from "@/lib/auth/cookies";
import { getUserFromAccessToken } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function BemVindoPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_ACCESS_COOKIE)?.value;
  const user = await getUserFromAccessToken(accessToken);

  if (user) {
    const supabase = createSupabaseServerClient(accessToken);
    const { data } = await supabase
      .from("user_integrations")
      .select("access_token")
      .eq("user_id", user.id)
      .eq("provider", "oura")
      .maybeSingle();
    // Se já tem token, vai direto pro dashboard
    if (data?.access_token) redirect("/dashboard");
  }

  const steps = [
    {
      icon: Activity,
      title: "Conecte seu Oura Ring",
      description: "O app lê seus dados de sono, frequência cardíaca e recuperação direto do Oura.",
      action: { label: "Conectar Oura", href: "/settings/integrations" },
    },
    {
      icon: Circle,
      title: "Entenda os semáforos",
      description: "Verde = pode treinar forte. Amarelo = treina, mas com cuidado. Laranja = leve. Vermelho = descansa.",
      action: null,
    },
    {
      icon: Bell,
      title: "Ative as notificações",
      description: "Às 07h você recebe no iPhone: seu relatório do dia, antes de sair da cama.",
      action: { label: "Ir para o app", href: "/dashboard" },
    },
  ];

  return (
    <main className="max-w-md mx-auto space-y-8 pt-4">
      <section className="space-y-2">
        <p className="text-sky-500 text-sm font-semibold uppercase tracking-wider">Bem-vindo</p>
        <h1 className="text-slate-800 text-3xl font-bold leading-tight">
          Seu corpo fala.<br />Aprenda a ouvir.
        </h1>
        <p className="text-slate-500 text-base leading-relaxed">
          Três passos para o app funcionar de verdade.
        </p>
      </section>

      <section className="space-y-4">
        {steps.map((step, i) => (
          <div key={i} className="biometric-panel rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="bg-sky-50 text-sky-500 flex size-10 items-center justify-center rounded-xl shrink-0">
                <step.icon className="size-5" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-300 text-sm font-bold">{i + 1}</span>
                <h2 className="text-slate-800 text-base font-semibold">{step.title}</h2>
              </div>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed">{step.description}</p>
            {step.action && (
              <Link
                href={step.action.href}
                className="inline-flex items-center gap-1.5 bg-sky-500 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-sky-600 transition"
              >
                {step.action.label}
              </Link>
            )}
          </div>
        ))}
      </section>

      <div className="text-center">
        <Link href="/dashboard" className="text-slate-400 text-sm hover:text-slate-600 transition">
          Pular por agora →
        </Link>
      </div>
    </main>
  );
}
