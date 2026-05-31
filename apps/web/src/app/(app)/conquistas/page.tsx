import { cookies } from "next/headers";
import { AUTH_ACCESS_COOKIE } from "@/lib/auth/cookies";
import { getUserFromAccessToken } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ACHIEVEMENTS } from "@/lib/achievements/definitions";

export default async function ConquistasPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_ACCESS_COOKIE)?.value;
  const user = await getUserFromAccessToken(accessToken);

  let unlocked: { achievement_id: string; unlocked_at: string }[] = [];

  if (user) {
    const supabase = createSupabaseServerClient(accessToken);
    const { data } = await supabase
      .from("user_achievements")
      .select("achievement_id, unlocked_at")
      .eq("user_id", user.id);
    unlocked = data ?? [];
  }

  const unlockedMap = new Map(unlocked.map((a) => [a.achievement_id, a.unlocked_at]));
  const unlockedCount = unlockedMap.size;
  const total = ACHIEVEMENTS.length;

  return (
    <main className="pb-24">
      {/* Header escuro */}
      <div className="achievements-hero rounded-3xl px-6 py-8 mb-6 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-300 mb-2">Hall da Glória</p>
        <h1 className="text-3xl font-black text-white mb-1">Conquistas</h1>
        <p className="text-slate-400 text-sm mb-4">
          {unlockedCount === 0
            ? "Você não desbloqueou nada ainda. Sério."
            : `${unlockedCount} de ${total} desbloqueadas`}
        </p>
        {/* Barra de progresso */}
        <div className="w-full max-w-xs mx-auto bg-white/10 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all"
            style={{ width: `${(unlockedCount / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Grid conquistas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {ACHIEVEMENTS.map((achievement) => {
          const isUnlocked = unlockedMap.has(achievement.id);
          const unlockedAt = unlockedMap.get(achievement.id);
          return (
            <div
              key={achievement.id}
              className={`achievement-card rounded-2xl p-4 flex flex-col items-center text-center gap-2 transition-all ${
                isUnlocked ? "achievement-unlocked" : "achievement-locked"
              }`}
            >
              {/* Ícone */}
              <div className={`achievement-icon-wrap size-16 rounded-2xl flex items-center justify-center text-3xl mb-1 ${
                isUnlocked ? "achievement-icon-active" : "achievement-icon-inactive"
              }`}>
                <span style={isUnlocked ? {} : { filter: "grayscale(1)", opacity: 0.3 }}>
                  {achievement.emoji}
                </span>
              </div>

              {/* Nome */}
              <p className={`text-[11px] font-black uppercase tracking-widest leading-tight ${
                isUnlocked ? "achievement-name-active" : "text-slate-500"
              }`}>
                {achievement.name}
              </p>

              {/* Descrição ou sarcasmo */}
              {isUnlocked ? (
                <>
                  <p className="text-slate-300 text-[11px] leading-snug italic">
                    &ldquo;{achievement.sarcasm}&rdquo;
                  </p>
                  {unlockedAt && (
                    <p className="text-[10px] text-purple-400 font-semibold mt-auto">
                      {new Date(unlockedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-slate-600 text-[11px] leading-snug">
                  {achievement.description}
                </p>
              )}
            </div>
          );
        })}
      </div>

    </main>
  );
}
