"use client";

import { useActionState, useRef, useState } from "react";
import { saveInputsAction, type InputsState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Loader2 } from "lucide-react";

type Props = {
  existing: {
    pressao_sistolica: number | null;
    pressao_diastolica: number | null;
    medicamentos: string | null;
    sintomas: string | null;
    sentimento: number | null;
  } | null;
};

const SENTIMENTO_OPTIONS = [
  { value: 1, label: "Péssimo" },
  { value: 2, label: "Ruim" },
  { value: 3, label: "Ok" },
  { value: 4, label: "Bem" },
  { value: 5, label: "Ótimo" },
];

const initialState: InputsState = {};

export function InputsForm({ existing }: Props) {
  const [state, formAction, isPending] = useActionState(saveInputsAction, initialState);
  const [medText, setMedText] = useState(existing?.medicamentos ?? "");
  const [identifying, setIdentifying] = useState(false);
  const [identifyError, setIdentifyError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIdentifying(true);
    setIdentifyError("");

    try {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch("/api/identify-medication", { method: "POST", body: form });
      const json = await res.json();
      if (json.medication) {
        setMedText((prev) => prev ? `${prev}\n${json.medication}` : json.medication);
      } else {
        setIdentifyError(json.error ?? "Não consegui identificar.");
      }
    } catch {
      setIdentifyError("Erro ao enviar imagem.");
    } finally {
      setIdentifying(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <form action={formAction} className="space-y-6">
      {/* Pressão arterial */}
      <div className="biometric-panel rounded-lg p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold">Pressão arterial</h2>
          <p className="text-muted-foreground text-sm">Medida de hoje</p>
        </div>
        <div className="flex items-end gap-3">
          <div className="space-y-2 flex-1">
            <Label htmlFor="pressao_sistolica">Sistólica (número de cima)</Label>
            <Input
              id="pressao_sistolica"
              name="pressao_sistolica"
              type="number"
              placeholder="120"
              defaultValue={existing?.pressao_sistolica ?? ""}
            />
          </div>
          <span className="text-muted-foreground pb-2 text-lg font-bold">/</span>
          <div className="space-y-2 flex-1">
            <Label htmlFor="pressao_diastolica">Diastólica (número de baixo)</Label>
            <Input
              id="pressao_diastolica"
              name="pressao_diastolica"
              type="number"
              placeholder="80"
              defaultValue={existing?.pressao_diastolica ?? ""}
            />
          </div>
        </div>
      </div>

      {/* Como está se sentindo */}
      <div className="biometric-panel rounded-lg p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold">Como você está se sentindo?</h2>
          <p className="text-muted-foreground text-sm">Sensação geral agora</p>
        </div>
        <div className="flex gap-2">
          {SENTIMENTO_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex-1 cursor-pointer">
              <input
                type="radio"
                name="sentimento"
                value={opt.value}
                defaultChecked={existing?.sentimento === opt.value}
                className="sr-only peer"
              />
              <div className="peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary border-border rounded-lg border p-2 text-center text-xs transition hover:border-primary/50">
                <span className="block text-lg">{["😩","😕","😐","🙂","😄"][opt.value - 1]}</span>
                <span className="text-muted-foreground peer-checked:text-primary">{opt.label}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Sintomas */}
      <div className="biometric-panel rounded-lg p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold">Sintomas</h2>
          <p className="text-muted-foreground text-sm">O que está sentindo hoje? (opcional)</p>
        </div>
        <textarea
          name="sintomas"
          rows={3}
          placeholder="ex: dor de cabeça, cansaço, tontura, palpitações..."
          defaultValue={existing?.sintomas ?? ""}
          className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 resize-none"
        />
      </div>

      {/* Medicamentos */}
      <div className="biometric-panel rounded-lg p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold">Medicamentos</h2>
            <p className="text-muted-foreground text-sm">Tomou hoje? Escreva ou tire uma foto</p>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handlePhotoChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={identifying}
              onClick={() => fileInputRef.current?.click()}
              className="gap-2 shrink-0"
            >
              {identifying ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Camera className="size-4" />
              )}
              {identifying ? "Identificando..." : "Foto"}
            </Button>
          </div>
        </div>

        {identifyError && (
          <p className="text-destructive text-xs">{identifyError}</p>
        )}

        <textarea
          name="medicamentos"
          rows={2}
          value={medText}
          onChange={(e) => setMedText(e.target.value)}
          placeholder="ex: Benicar HCT 20mg tomado às 8h..."
          className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 resize-none"
        />
      </div>

      {state.error && (
        <p className="border-destructive/25 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="border-primary/25 bg-primary/10 text-primary rounded-md border px-3 py-2 text-sm">
          {state.success}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
