import { Activity, Database, Fingerprint, LineChart } from "lucide-react";
import { EmptyMetricCard } from "@/components/dashboard/empty-metric-card";

const metrics = [
  {
    title: "Sinais vitais",
    description: "Aguardando primeira fonte de dados.",
    icon: Activity,
  },
  {
    title: "Banco",
    description: "Prisma configurado para evoluir o schema.",
    icon: Database,
  },
  {
    title: "Biometria",
    description: "Espaco reservado para indicadores pessoais.",
    icon: Fingerprint,
  },
  {
    title: "Graficos",
    description: "Recharts instalado para dashboards futuros.",
    icon: LineChart,
  },
];

export default function DashboardPage() {
  return (
    <main className="space-y-6">
      <section className="space-y-2">
        <p className="text-primary text-sm font-medium uppercase tracking-[0.18em]">Dashboard</p>
        <h1 className="text-foreground text-2xl font-semibold sm:text-3xl">
          Fundacao pronta para receber dados
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm leading-6 sm:text-base">
          Estrutura inicial criada com foco mobile-first, tema dark biometrico e areas reservadas
          para metricas, graficos e integracoes.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <EmptyMetricCard key={metric.title} {...metric} />
        ))}
      </section>

      <section className="biometric-panel rounded-lg p-5">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Leitura principal</h2>
            <p className="text-muted-foreground text-sm">Area preparada para Recharts.</p>
          </div>
          <div className="bg-primary/20 h-2 w-20 rounded-full">
            <div className="bg-primary animate-pulse-line h-full rounded-full" />
          </div>
        </div>
        <div className="border-primary/20 bg-background/45 text-muted-foreground flex h-64 items-center justify-center rounded-md border border-dashed text-sm">
          Dashboard vazio
        </div>
      </section>
    </main>
  );
}
