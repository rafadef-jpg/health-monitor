import { cookies } from "next/headers";
import { ClipboardList } from "lucide-react";
import { AUTH_ACCESS_COOKIE } from "@/lib/auth/cookies";
import { getUserFromAccessToken } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { InputsForm } from "./inputs-form";
import { WorkoutForm } from "./workout-form";

export default async function RegistrarPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_ACCESS_COOKIE)?.value;
  const user = await getUserFromAccessToken(accessToken);

  let existing = null;
  let existingWorkout = null;

  if (user) {
    const supabase = createSupabaseServerClient(accessToken);
    const today = new Date().toISOString().slice(0, 10);
    const [inputsResult, workoutResult] = await Promise.all([
      supabase
        .from("daily_inputs")
        .select("pressao_sistolica, pressao_diastolica, medicamentos, sintomas, sentimento")
        .eq("user_id", user.id)
        .eq("input_date", today)
        .maybeSingle(),
      supabase
        .from("workout_sessions")
        .select("exercises, notes, duration_minutes")
        .eq("user_id", user.id)
        .eq("session_date", today)
        .maybeSingle(),
    ]);
    existing = inputsResult.data ?? null;
    existingWorkout = workoutResult.data ?? null;
  }

  return (
    <main className="space-y-6">
      <section className="flex items-start gap-4">
        <div className="space-y-2">
          <p className="text-primary text-sm font-medium uppercase tracking-[0.18em]">Registrar</p>
          <h1 className="text-foreground text-2xl font-semibold sm:text-3xl">Como esta hoje</h1>
          <p className="text-muted-foreground max-w-2xl text-sm leading-6 sm:text-base">
            Esses dados entram no relatorio da IA e deixam a analise mais precisa.
          </p>
        </div>
      </section>

      {existing && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/10 px-4 py-2">
          <ClipboardList className="size-4 text-primary shrink-0" />
          <p className="text-primary text-sm">Voce ja registrou dados hoje. Edite abaixo se precisar atualizar.</p>
        </div>
      )}

      <InputsForm existing={existing} />

      <WorkoutForm existing={existingWorkout} />
    </main>
  );
}
