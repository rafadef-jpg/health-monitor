"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { loginAction, type LoginState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: LoginState = {};

export function LoginForm() {
  const searchParams = useSearchParams();
  const [state, formAction, isPending] = useActionState(loginAction, initialState);
  const next = searchParams.get("next") ?? "/dashboard";
  const message = searchParams.get("message");

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="rafa@exemplo.com"
          autoComplete="email"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="********"
          autoComplete="current-password"
          required
        />
      </div>

      {message ? (
        <p className="border-primary/25 bg-primary/10 text-primary rounded-md border px-3 py-2 text-sm">
          {message}
        </p>
      ) : null}

      {state.error ? (
        <p className="border-destructive/25 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm">
          {state.error}
        </p>
      ) : null}

      <Button className="w-full" type="submit" disabled={isPending}>
        {isPending ? "Entrando..." : "Entrar"}
      </Button>

      <Button className="w-full" type="button" variant="outline" asChild>
        <Link href={`/signup?next=${encodeURIComponent(next)}`}>Criar conta</Link>
      </Button>
    </form>
  );
}
