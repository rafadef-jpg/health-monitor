import { Fingerprint, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { logoutAction } from "@/app/(auth)/login/actions";
import { mainNavigation } from "@/lib/navigation";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="min-h-screen">
      <header className="border-border/70 bg-background/82 sticky top-0 z-20 border-b backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="border-primary/25 bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-md border">
              <Fingerprint className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Defendi Dashboard</p>
              <p className="text-muted-foreground truncate text-xs">Biometric workspace</p>
            </div>
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

      <nav className="border-border/70 bg-background/92 fixed inset-x-0 bottom-0 z-30 border-t backdrop-blur-xl sm:hidden">
        <div className="grid grid-cols-1">
          {mainNavigation.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-primary flex h-14 items-center justify-center text-sm font-medium"
            >
              {item.title}
            </a>
          ))}
        </div>
      </nav>
    </div>
  );
}
