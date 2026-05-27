"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signupAction, type SignupState } from "../login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: SignupState = {};

export function SignupForm() {
  const searchParams = useSearchParams();
  const [state, formAction, isPending] = useActionState(signupAction, initialState);
  const next = searchParams.get("next") ?? "/dashboard";

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          name="name"
          type="text"
          placeholder="Rafael Defendi"
          autoComplete="name"
          required
        />
      </div>
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
          autoComplete="new-password"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmar senha</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          placeholder="********"
          autoComplete="new-password"
          required
        />
      </div>

      {state.error ? (
        <p className="border-destructive/25 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm">
          {state.error}
        </p>
      ) : null}

      <Button className="w-full" type="submit" disabled={isPending}>
        {isPending ? "Criando conta..." : "Criar conta"}
      </Button>

      <Button className="w-full" type="button" variant="outline" asChild>
        <Link href={`/login?next=${encodeURIComponent(next)}`}>Ja tenho conta</Link>
      </Button>
    </form>
  );
}
