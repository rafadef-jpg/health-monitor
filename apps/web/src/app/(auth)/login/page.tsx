import { Fingerprint } from "lucide-react";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Login",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="biometric-panel w-full max-w-md rounded-lg p-6">
        <div className="mb-8 flex items-center gap-3">
          <div className="border-primary/25 bg-primary/10 text-primary flex size-11 items-center justify-center rounded-md border">
            <Fingerprint className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Acessar painel</h1>
            <p className="text-muted-foreground text-sm">Entre para continuar.</p>
          </div>
        </div>

        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </section>
    </main>
  );
}
