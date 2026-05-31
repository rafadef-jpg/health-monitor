"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { AUTH_ACCESS_COOKIE } from "@/lib/auth/cookies";
import { getUserFromAccessToken } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type InputsState = {
  success?: string;
  error?: string;
};

export async function saveInputsAction(
  _prev: InputsState,
  formData: FormData
): Promise<InputsState> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_ACCESS_COOKIE)?.value;
  const user = await getUserFromAccessToken(accessToken);

  if (!user) return { error: "Não autorizado." };

  const raw = {
    pressao_sistolica: formData.get("pressao_sistolica"),
    pressao_diastolica: formData.get("pressao_diastolica"),
    medicamentos: formData.get("medicamentos"),
    sintomas: formData.get("sintomas"),
    sentimento: formData.get("sentimento"),
  };

  const payload: Record<string, unknown> = {
    user_id: user.id,
    input_date: new Date().toISOString().slice(0, 10),
    updated_at: new Date().toISOString(),
  };

  if (raw.pressao_sistolica) payload.pressao_sistolica = parseInt(raw.pressao_sistolica as string);
  if (raw.pressao_diastolica) payload.pressao_diastolica = parseInt(raw.pressao_diastolica as string);
  if (raw.medicamentos) payload.medicamentos = raw.medicamentos;
  if (raw.sintomas) payload.sintomas = raw.sintomas;
  if (raw.sentimento) payload.sentimento = parseInt(raw.sentimento as string);

  const supabase = createSupabaseServerClient(accessToken);
  const { error } = await supabase
    .from("daily_inputs")
    .upsert(payload, { onConflict: "user_id,input_date" });

  if (error) return { error: error.message };

  revalidatePath("/registrar");
  return { success: "Dados salvos." };
}

export type WorkoutState = { success?: string; error?: string };

export async function saveWorkoutAction(
  _prev: WorkoutState,
  formData: FormData
): Promise<WorkoutState> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_ACCESS_COOKIE)?.value;
  const user = await getUserFromAccessToken(accessToken);
  if (!user) return { error: "Nao autorizado." };

  const exercisesRaw = formData.get("exercises") as string;
  const notes = formData.get("notes") as string;
  const duration = formData.get("duration_minutes");

  let exercises: unknown[] = [];
  try { exercises = JSON.parse(exercisesRaw || "[]"); } catch { /* ignore */ }

  const supabase = createSupabaseServerClient(accessToken);
  const { error } = await supabase.from("workout_sessions").upsert({
    user_id: user.id,
    session_date: new Date().toISOString().slice(0, 10),
    exercises,
    notes: notes || null,
    duration_minutes: duration ? parseInt(duration as string) : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,session_date" });

  if (error) return { error: error.message };
  revalidatePath("/registrar");
  return { success: "Treino salvo!" };
}
