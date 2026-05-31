import { SupabaseClient } from "@supabase/supabase-js";
import { ACHIEVEMENTS as _A } from "./definitions";
void _A;

export async function checkAndUnlockAchievements(userId: string, supabase: SupabaseClient) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  // Busca dados recentes
  const { data: snapshots } = await supabase
    .from("daily_physiology_snapshot")
    .select("snapshot_date, recovery_score, hrv_avg, sleep_dim_score, stress_score")
    .eq("user_id", userId)
    .gte("snapshot_date", thirtyDaysAgo)
    .order("snapshot_date", { ascending: false });

  if (!snapshots?.length) return [];

  type Snap = { snapshot_date: string; recovery_score: number | null; hrv_avg: number | null; sleep_dim_score: number | null; stress_score: number | null };
  const snaps = snapshots as Snap[];

  // Conquistas já desbloqueadas
  const { data: existing } = await supabase
    .from("user_achievements")
    .select("achievement_id")
    .eq("user_id", userId);

  const unlockedIds = new Set((existing ?? []).map((a: { achievement_id: string }) => a.achievement_id));

  const toUnlock: string[] = [];
  const totalDays = snapshots.length;

  // helpers
  const consecutiveWhere = (fn: (s: Snap) => boolean) => {
    let count = 0;
    for (const s of snaps) {
      if (fn(s)) count++; else break;
    }
    return count;
  };
  const sem = (s: Snap) => {
    const r = s.recovery_score;
    if (r == null) return null;
    if (r >= 80) return "green";
    if (r >= 65) return "yellow";
    if (r >= 50) return "orange";
    return "red";
  };

  const check = (id: string, condition: boolean) => {
    if (!unlockedIds.has(id) && condition) toUnlock.push(id);
  };

  check("sobrevivente", totalDays >= 7);
  check("ironman", totalDays >= 30);
  check("primeiro_verde", snaps.some(s => sem(s) === "green"));
  check("maquina_humana", consecutiveWhere(s => sem(s) === "green") >= 5);
  check("morto_vivo", consecutiveWhere(s => sem(s) === "red") >= 3);
  check("zumbi_funcional", consecutiveWhere(s => (s.recovery_score ?? 100) < 50) >= 3);
  check("rei_travesseiro", consecutiveWhere(s => (s.sleep_dim_score ?? 100) < 55) >= 5);
  check("campeao_sofa", consecutiveWhere(s => (s.stress_score ?? 1) === 0) >= 3);
  check("viciado_cafe", consecutiveWhere(s => (s.stress_score ?? 0) > 60) >= 3);
  check("ressaca_eterna", consecutiveWhere(s => (s.hrv_avg ?? 100) < 48) >= 7);
  check("atleta_mentira", totalDays >= 10 && !snaps.some(s => sem(s) === "green"));
  check("fantasma_academia", totalDays >= 7 && !snaps.slice(0, 7).some(s => sem(s) === "green"));

  if (toUnlock.length > 0) {
    await supabase.from("user_achievements").upsert(
      toUnlock.map(id => ({ user_id: userId, achievement_id: id })),
      { onConflict: "user_id,achievement_id" }
    );
  }

  return toUnlock;
}
