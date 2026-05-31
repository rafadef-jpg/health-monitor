"use client";

import { useActionState, useRef, useState } from "react";
import { saveWorkoutAction, type WorkoutState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, Loader2, Plus, Trash2, Dumbbell } from "lucide-react";

type Exercise = {
  name: string;
  sets: number;
  reps: number;
  weight_kg: number;
  notes: string;
};

type Props = {
  existing: {
    exercises: Exercise[];
    notes: string | null;
    duration_minutes: number | null;
  } | null;
};

const initialState: WorkoutState = {};

const EMPTY_EXERCISE: Exercise = { name: "", sets: 3, reps: 10, weight_kg: 0, notes: "" };

export function WorkoutForm({ existing }: Props) {
  const [state, formAction, isPending] = useActionState(saveWorkoutAction, initialState);
  const [exercises, setExercises] = useState<Exercise[]>(existing?.exercises ?? []);
  const [loading, setLoading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [mode, setMode] = useState<"idle" | "manual" | "photo">("idle");
  const fileRef = useRef<HTMLInputElement>(null);

  function addExercise() {
    setExercises(prev => [...prev, { ...EMPTY_EXERCISE }]);
    setMode("manual");
  }

  function removeExercise(i: number) {
    setExercises(prev => prev.filter((_, idx) => idx !== i));
  }

  function updateExercise(i: number, field: keyof Exercise, value: string | number) {
    setExercises(prev => prev.map((ex, idx) => idx === i ? { ...ex, [field]: value } : ex));
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setPhotoError("");
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch("/api/identify-workout", { method: "POST", body: form });
      const json = await res.json();
      if (json.exercises?.length > 0) {
        setExercises(prev => [...prev, ...json.exercises]);
        setMode("manual");
      } else {
        setPhotoError("Nao consegui identificar exercicios. Adicione manualmente.");
        setMode("manual");
      }
    } catch {
      setPhotoError("Erro ao processar a foto.");
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="biometric-panel rounded-lg p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Dumbbell className="size-4 text-sky-500" />
            Treino de hoje
          </h2>
          <p className="text-muted-foreground text-sm">Foto da ficha ou adicione exercicio por exercicio</p>
        </div>
      </div>

      {/* Botoes de entrada */}
      {mode === "idle" && exercises.length === 0 && (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => { setMode("manual"); addExercise(); }}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 hover:border-sky-300 hover:text-sky-500 transition"
          >
            <Plus className="size-6" />
            <span className="text-xs font-semibold">Um por um</span>
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={loading}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 hover:border-sky-300 hover:text-sky-500 transition disabled:opacity-50"
          >
            {loading ? <Loader2 className="size-6 animate-spin" /> : <Camera className="size-6" />}
            <span className="text-xs font-semibold">{loading ? "Identificando..." : "Foto da ficha"}</span>
          </button>
        </div>
      )}

      {/* Quando ja tem modo ativo */}
      {(mode !== "idle" || exercises.length > 0) && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-sky-500 border border-slate-200 rounded-lg px-3 py-1.5 transition disabled:opacity-50"
          >
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
            {loading ? "Identificando..." : "Foto"}
          </button>
          <button
            type="button"
            onClick={addExercise}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-sky-500 border border-slate-200 rounded-lg px-3 py-1.5 transition"
          >
            <Plus className="size-3.5" />
            Exercicio
          </button>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={handlePhoto} />

      {photoError && <p className="text-amber-500 text-xs">{photoError}</p>}

      {/* Lista de exercicios */}
      {exercises.length > 0 && (
        <div className="space-y-3">
          {exercises.map((ex, i) => (
            <div key={i} className="bg-slate-50 rounded-xl p-3 space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Nome do exercicio"
                  value={ex.name}
                  onChange={(e) => updateExercise(i, "name", e.target.value)}
                  className="flex-1 text-sm font-medium"
                />
                <button type="button" onClick={() => removeExercise(i)} className="text-slate-300 hover:text-red-400 transition shrink-0">
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Series</p>
                  <Input
                    type="number"
                    min="1"
                    value={ex.sets || ""}
                    onChange={(e) => updateExercise(i, "sets", parseInt(e.target.value) || 0)}
                    className="text-sm text-center"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Reps</p>
                  <Input
                    type="number"
                    min="1"
                    value={ex.reps || ""}
                    onChange={(e) => updateExercise(i, "reps", parseInt(e.target.value) || 0)}
                    className="text-sm text-center"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Carga (kg)</p>
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    value={ex.weight_kg || ""}
                    onChange={(e) => updateExercise(i, "weight_kg", parseFloat(e.target.value) || 0)}
                    className="text-sm text-center"
                  />
                </div>
              </div>
              <Input
                placeholder="Observacao (opcional)"
                value={ex.notes}
                onChange={(e) => updateExercise(i, "notes", e.target.value)}
                className="text-xs text-slate-500"
              />
            </div>
          ))}
        </div>
      )}

      {/* Form hidden + save */}
      {exercises.length > 0 && (
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="exercises" value={JSON.stringify(exercises)} />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500">Duracao (min)</p>
              <Input
                name="duration_minutes"
                type="number"
                min="1"
                placeholder="60"
                defaultValue={existing?.duration_minutes ?? ""}
                className="text-sm"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500">Observacoes</p>
              <Input
                name="notes"
                placeholder="ex: treino pesado..."
                defaultValue={existing?.notes ?? ""}
                className="text-sm"
              />
            </div>
          </div>
          {state.error && <p className="text-red-500 text-xs">{state.error}</p>}
          {state.success && <p className="text-green-600 text-xs">{state.success}</p>}
          <Button type="submit" disabled={isPending} className="w-full" size="sm">
            {isPending ? "Salvando..." : "Salvar treino"}
          </Button>
        </form>
      )}
    </div>
  );
}
