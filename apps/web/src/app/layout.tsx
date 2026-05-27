import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Defendi Dashboard",
    template: "%s | Defendi Dashboard",
  },
  description: "Fundacao profissional para dashboard biometrico.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#16f2b3",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR" className="dark">
      <body>{children}</body>
    </html>
  );
}
