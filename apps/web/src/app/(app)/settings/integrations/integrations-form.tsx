"use client";

import { useActionState } from "react";
import { saveOuraTokenAction, type IntegrationsState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = { isConnected: boolean; lastSync: string | null; isSetup?: boolean };

const initialState: IntegrationsState = {};

export function OuraIntegrationForm({ isConnected, lastSync, isSetup = false }: Props) {
  const [state, formAction, isPending] = useActionState(saveOuraTokenAction, initialState);

  return (
    <div className="biometric-panel rounded-lg p-5 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">Oura Ring</h2>
          <p className="text-muted-foreground text-sm">Personal Access Token</p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
            isConnected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
          }`}
        >
          <span className={`size-1.5 rounded-full ${isConnected ? "bg-primary" : "bg-muted-foreground"}`} />
          {isConnected ? "Conectado" : "Não conectado"}
        </span>
      </div>

      {lastSync ? (
        <p className="text-muted-foreground text-xs">
          Último sync: {new Date(lastSync).toLocaleString("pt-BR")}
        </p>
      ) : null}

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="setup" value={isSetup ? "1" : "0"} />
        <div className="space-y-2">
          <Label htmlFor="oura_token">{isConnected ? "Substituir token" : "Token de acesso"}</Label>
          <Input
            id="oura_token"
            name="oura_token"
            type="password"
            placeholder="Cole seu Personal Access Token aqui"
            autoComplete="off"
          />
        </div>

        {state.error ? (
          <p className="border-destructive/25 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm">
            {state.error}
          </p>
        ) : null}

        {state.success ? (
          <p className="border-primary/25 bg-primary/10 text-primary rounded-md border px-3 py-2 text-sm">
            {state.success}
          </p>
        ) : null}

        <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
          {isPending ? "Salvando..." : "Salvar token"}
        </Button>
      </form>
    </div>
  );
}
