import { ACHIEVEMENTS } from "@/lib/achievements/definitions";

type Props = {
  unlocked: { achievement_id: string; unlocked_at: string }[];
};

export function AchievementsRow({ unlocked }: Props) {
  if (!unlocked.length) return null;

  const unlockedMap = new Map(unlocked.map(a => [a.achievement_id, a.unlocked_at]));

  const items = ACHIEVEMENTS.filter(a => unlockedMap.has(a.id));

  return (
    <section className="space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
        Conquistas desbloqueadas
      </p>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
        {items.map((a) => (
          <div
            key={a.id}
            className="biometric-panel rounded-2xl p-3 flex-shrink-0 w-44 space-y-1.5"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-2xl">{a.emoji}</span>
              <span className="text-[9px] font-semibold text-slate-300 uppercase tracking-wider pt-1">
                {new Date(unlockedMap.get(a.id)!).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
              </span>
            </div>
            <p className="text-slate-800 text-xs font-bold leading-tight">{a.name}</p>
            <p className="text-slate-400 text-[11px] leading-snug italic">&ldquo;{a.sarcasm}&rdquo;</p>
          </div>
        ))}
      </div>
    </section>
  );
}
