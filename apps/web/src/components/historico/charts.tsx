"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from "recharts";

type DataPoint = {
  date: string;
  recovery_score: number | null;
  hrv_avg: number | null;
  rhr_bpm: number | null;
  sleep_dim_score: number | null;
  stress_score: number | null;
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function semaphoreColor(score: number | null): string {
  if (score == null) return "#6b7280";
  if (score >= 80) return "#22c55e";
  if (score >= 65) return "#facc15";
  if (score >= 50) return "#fb923c";
  return "#ef4444";
}

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  color: "hsl(var(--foreground))",
  fontSize: "12px",
};

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="biometric-panel rounded-lg p-5 space-y-4">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">{title}</h2>
      {children}
    </div>
  );
}

export function RecoveryChart({ data }: { data: DataPoint[] }) {
  return (
    <ChartCard title="Recovery Score">
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
          <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v: number) => [`${v}`, "Score"]}
            labelFormatter={formatDate}
          />
          <ReferenceLine y={80} stroke="#22c55e" strokeDasharray="4 4" opacity={0.5} />
          <ReferenceLine y={65} stroke="#facc15" strokeDasharray="4 4" opacity={0.5} />
          <ReferenceLine y={50} stroke="#fb923c" strokeDasharray="4 4" opacity={0.5} />
          <Line
            type="monotone"
            dataKey="recovery_score"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={(props) => {
              const { cx, cy, payload } = props;
              return (
                <circle
                  key={payload.date}
                  cx={cx}
                  cy={cy}
                  r={4}
                  fill={semaphoreColor(payload.recovery_score)}
                  stroke="transparent"
                />
              );
            }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function HrvChart({ data }: { data: DataPoint[] }) {
  const values = data.map((d) => d.hrv_avg).filter((v): v is number => v != null);
  const avg = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;

  return (
    <ChartCard title={`HRV${avg ? ` — média ${avg} ms` : ""}`}>
      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
          <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v: number) => [`${v} ms`, "HRV"]}
            labelFormatter={formatDate}
          />
          {avg && <ReferenceLine y={avg} stroke="hsl(var(--primary))" strokeDasharray="4 4" opacity={0.5} />}
          <Line type="monotone" dataKey="hrv_avg" stroke="#818cf8" strokeWidth={2} dot={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function RhrChart({ data }: { data: DataPoint[] }) {
  const values = data.map((d) => d.rhr_bpm).filter((v): v is number => v != null);
  const avg = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;

  return (
    <ChartCard title={`FC em repouso${avg ? ` — média ${avg} bpm` : ""}`}>
      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
          <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v: number) => [`${v} bpm`, "FC repouso"]}
            labelFormatter={formatDate}
          />
          {avg && <ReferenceLine y={avg} stroke="hsl(var(--primary))" strokeDasharray="4 4" opacity={0.5} />}
          <Line type="monotone" dataKey="rhr_bpm" stroke="#f472b6" strokeWidth={2} dot={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function SleepChart({ data }: { data: DataPoint[] }) {
  return (
    <ChartCard title="Score de sono">
      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
          <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v: number) => [`${v}`, "Sono"]}
            labelFormatter={formatDate}
          />
          <Line type="monotone" dataKey="sleep_dim_score" stroke="#34d399" strokeWidth={2} dot={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
