"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { LogOut, LayoutDashboard, ClipboardList, BarChart2, Share2 } from "lucide-react";
import { logoutAction } from "@/app/(auth)/login/actions";
import { Button } from "@/components/ui/button";

const NAV = [
  { title: "Hoje", href: "/dashboard", icon: LayoutDashboard },
  { title: "Registrar", href: "/registrar", icon: ClipboardList },
  { title: "Histórico", href: "/historico", icon: BarChart2 },
  { title: "Semana", href: "/compartilhar", icon: Share2 },
];

function PulseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 512 512" fill="none">
      <polyline
        points="80,256 160,256 196,160 232,340 268,200 300,300 336,256 432,256"
        fill="none" stroke="white" strokeWidth="52"
        strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* Header */}
      <header className="bg-white/80 sticky top-0 z-20 backdrop-blur-xl border-b border-slate-100/60">
        <div className="container flex h-14 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="bg-sky-500 flex size-9 shrink-0 items-center justify-center rounded-xl shadow-sm shadow-sky-200">
              <PulseIcon />
            </div>
            <p className="truncate text-sm font-bold text-slate-900 tracking-tight">Health Monitor</p>
          </div>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 sm:flex">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition ${
                    active ? "bg-sky-50 text-sky-600" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  <item.icon className="size-3.5" />
                  {item.title}
                </Link>
              );
            })}
          </nav>

          <form action={logoutAction}>
            <Button variant="ghost" size="icon" aria-label="Sair" type="submit" className="text-slate-400 hover:text-slate-600">
              <LogOut className="size-4" />
            </Button>
          </form>
        </div>
      </header>

      <div className="container py-5 pb-32 sm:py-8 sm:pb-8">{children}</div>

      {/* Floating pill tab bar — estilo Oura */}
      <div className="fixed bottom-5 inset-x-0 flex justify-center z-30 sm:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <nav className="bg-white/95 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-white/80 rounded-[28px] px-2 py-2 flex items-center gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-[20px] transition ${
                  active ? "bg-sky-500 text-white shadow-sm shadow-sky-200" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <item.icon className="size-5" />
                <span className={`text-[10px] font-semibold tracking-tight ${active ? "text-white" : ""}`}>{item.title}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
