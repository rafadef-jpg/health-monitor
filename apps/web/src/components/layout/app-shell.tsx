import { Fingerprint, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { logoutAction } from "@/app/(auth)/login/actions";
import { mainNavigation } from "@/lib/navigation";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="min-h-screen">
      <header className="bg-white/90 sticky top-0 z-20 border-b border-slate-100 backdrop-blur-xl">
        <div className="container flex h-14 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
              <Fingerprint className="size-4" />
            </div>
            <p className="truncate text-sm font-semibold text-slate-800">Health Monitor</p>
          </div>

          <nav className="hidden items-center gap-1 sm:flex">
            {mainNavigation.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-muted-foreground hover:bg-secondary hover:text-foreground rounded-md px-3 py-2 text-sm transition"
              >
                {item.title}
              </a>
            ))}
          </nav>

          <form action={logoutAction}>
            <Button variant="ghost" size="icon" aria-label="Sair" type="submit">
              <LogOut className="size-4" />
            </Button>
          </form>
        </div>
      </header>

      <div className="container py-5 sm:py-8">{children}</div>

      <nav className="bg-white/95 fixed inset-x-0 bottom-0 z-30 border-t border-slate-100 backdrop-blur-xl sm:hidden">
        <div className="grid grid-cols-3">
          {mainNavigation.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-slate-400 hover:text-primary flex h-14 items-center justify-center text-xs font-medium transition"
            >
              {item.title}
            </a>
          ))}
        </div>
      </nav>
    </div>
  );
}
