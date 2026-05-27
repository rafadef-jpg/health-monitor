import type { LucideIcon } from "lucide-react";

type EmptyMetricCardProps = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export function EmptyMetricCard({ title, description, icon: Icon }: EmptyMetricCardProps) {
  return (
    <article className="biometric-panel rounded-lg p-4">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-md">
          <Icon className="size-5" />
        </div>
        <span className="bg-primary h-2 w-2 rounded-full shadow-[0_0_18px_hsl(var(--primary))]" />
      </div>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="text-muted-foreground mt-2 text-sm leading-6">{description}</p>
    </article>
  );
}
