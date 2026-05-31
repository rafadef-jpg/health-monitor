import { SupabaseClient } from "@supabase/supabase-js";
import { ACHIEVEMENTS as _A } from "./definitions";
void _A;

export async function checkAndUnlockAchievements(userId: string, supabase: SupabaseClient) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const { data: snapshots } = await supabase
    .from("daily_physiology_snapshot")
    .select("snapshot_date, recovery_score, hrv_avg, sleep_dim_score, stress_score")
    .eq("user_id", userId)
    .gte("snapshot_date", thirtyDaysAgo)
    .order("snapshot_date", { ascending: false });

  if (!snapshots?.length) return [];

  type Snap = {
    snapshot_date: string;
    recovery_score: number | null;
    hrv_avg: number | null;
    sleep_dim_score: number | null;
    stress_score: number | null;
  };
  const snaps = snapshots as Snap[];
  const totalDays = snaps.length;

  const { data: existing } = await supabase
    .from("user_achievements")
    .select("achievement_id")
    .eq("user_id", userId);

  const unlockedIds = new Set((existing ?? []).map((a: { achievement_id: string }) => a.achievement_id));

  const toUnlock: string[] = [];

  const sem = (s: Snap) => {
    const r = s.recovery_score;
    if (r == null) return null;
    if (r >= 80) return "green";
    if (r >= 65) return "yellow";
    if (r >= 50) return "orange";
    return "red";
  };

  // Quantos consecutivos (do mais recente) satisfazem fn
  const consecutive = (fn: (s: Snap) => boolean) => {
    let c = 0;
    for (const s of snaps) { if (fn(s)) c++; else break; }
    return c;
  };

  // Quantos no total satisfazem fn
  const count = (fn: (s: Snap) => boolean) => snaps.filter(fn).length;

  // Verifica oscilacao entre verde e vermelho
  const oscillations = () => {
    let osc = 0;
    let last: string | null = null;
    for (const s of snaps) {
      const c = sem(s);
      if (c && last && c !== last && (c === "green" || c === "red") && (last === "green" || last === "red")) osc++;
      if (c) last = c;
    }
    return osc;
  };

  const check = (id: string, cond: boolean) => {
    if (!unlockedIds.has(id) && cond) toUnlock.push(id);
  };

  // ── originais ──────────────────────────────────────────────────────
  check("sobrevivente",      totalDays >= 7);
  check("ironman",           totalDays >= 30);
  check("primeiro_verde",    snaps.some(s => sem(s) === "green"));
  check("maquina_humana",    consecutive(s => sem(s) === "green") >= 5);
  check("morto_vivo",        consecutive(s => sem(s) === "red") >= 3);
  check("zumbi_funcional",   consecutive(s => (s.recovery_score ?? 100) < 50) >= 3);
  check("rei_travesseiro",   consecutive(s => (s.sleep_dim_score ?? 100) < 55) >= 5);
  check("campeao_sofa",      consecutive(s => (s.stress_score ?? 1) === 0) >= 3);
  check("viciado_cafe",      consecutive(s => (s.stress_score ?? 0) > 60) >= 3);
  check("ressaca_eterna",    consecutive(s => (s.hrv_avg ?? 100) < 48) >= 7);
  check("atleta_mentira",    totalDays >= 10 && !snaps.some(s => sem(s) === "green"));
  check("fantasma_academia", totalDays >= 7 && !snaps.slice(0, 7).some(s => sem(s) === "green"));

  // ── imagem 1 ───────────────────────────────────────────────────────
  check("rei_depois_eu_faco",       totalDays >= 3 && snaps.slice(0, 3).every(s => s.recovery_score == null));
  check("doutor_procrastinacao",    totalDays >= 7 && !snaps.slice(0, 7).some(s => sem(s) === "green"));
  check("cafe_nao_julga",           consecutive(s => (s.stress_score ?? 0) > 30) >= 7);
  check("especialista_desculpas",   consecutive(s => ["orange","red"].includes(sem(s) ?? "")) >= 5);
  check("bateria_social_esgotada",  consecutive(s => (s.recovery_score ?? 100) < 30) >= 2);
  check("derreteu_picole",          (() => {
    for (let i = 0; i < snaps.length - 1; i++) {
      const a = snaps[i].recovery_score;
      const b = snaps[i + 1].recovery_score;
      if (a != null && b != null && b - a >= 20) return true;
    }
    return false;
  })());
  check("modo_invisivel",           totalDays === 0 || (() => {
    // 5+ dias sem dado recente
    const latest = new Date(snaps[0].snapshot_date + "T12:00:00");
    const diff = Math.round((Date.now() - latest.getTime()) / 86400000);
    return diff >= 5;
  })());
  check("nutricionista_caos",       count(s => (s.stress_score ?? 0) > 30) >= 5);
  check("atleta_sono",              snaps.some(s => (s.sleep_dim_score ?? 0) >= 85 && (s.recovery_score ?? 100) < 50));
  check("maratonista_series",       consecutive(s => (s.sleep_dim_score ?? 0) >= 85) >= 10);
  check("artista_caos",             (() => {
    const week = snaps.slice(0, 7);
    const colors = new Set(week.map(s => sem(s)).filter(Boolean));
    return colors.size >= 4;
  })());
  check("ignorou_tudo",             (() => {
    const latest = snaps[0] ? new Date(snaps[0].snapshot_date + "T12:00:00") : null;
    if (!latest) return false;
    return Math.round((Date.now() - latest.getTime()) / 86400000) >= 7;
  })());
  check("mestre_banho",             consecutive(s => (s.stress_score ?? 1) === 0) >= 5);
  check("genio_amanha",             totalDays >= 7 && !snaps.slice(0, 7).some(s => sem(s) === "green"));
  check("sobrevivente_reunioes",    consecutive(s => (s.hrv_avg ?? 0) >= 70) >= 5);
  check("viciado_tela",             totalDays >= 1); // always unlock after first day (proxy)
  check("ferias_mentais",           count(s => s.recovery_score == null) >= 4);
  check("guerreiro_soneca",         consecutive(s => (s.sleep_dim_score ?? 100) < 55) >= 3);
  check("cabos_emocionais",         consecutive(s => (s.stress_score ?? 0) > 30 && (s.hrv_avg ?? 100) < 55) >= 3);
  check("rei_drama",                oscillations() >= 2);
  check("colecionador_roupa_suja",  totalDays >= 15);
  check("nao_perturbe_sempre",      consecutive(s => (s.stress_score ?? 1) === 0) >= 7);
  check("especialista_coracoes",    consecutive(s => (s.hrv_avg ?? 100) < 40) >= 5);
  check("campeao_desculpas",        totalDays >= 20 && !snaps.some(s => sem(s) === "green"));
  check("fiesta_cancelamento",      count(s => s.recovery_score == null) >= 3);

  // ── imagem 2 ───────────────────────────────────────────────────────
  check("nuvem_desculpas",          consecutive(s => (s.recovery_score ?? 100) < 50) >= 10);
  check("colecionador_talvezes",    totalDays >= 25);
  check("zero_novo_heroi",          count(s => (s.stress_score ?? 1) === 0) >= 28);
  check("rolador_compulsivo",       consecutive(s => (s.sleep_dim_score ?? 100) < 55 && (s.stress_score ?? 0) > 30) >= 5);
  check("decorador_cadeira",        consecutive(s => (s.stress_score ?? 0) > 60) >= 7);
  check("sobrevivendo_1_porcento",  consecutive(s => (s.recovery_score ?? 100) >= 1 && (s.recovery_score ?? 100) <= 20) >= 3);
  check("gourmet_microondas",       totalDays >= 14 && !snaps.slice(0, 14).some(s => (s.sleep_dim_score ?? 0) >= 85));
  check("snooze_supremo",           consecutive(s => (s.sleep_dim_score ?? 100) < 55) >= 7);
  check("estilista_preguica",       consecutive(s => sem(s) === "yellow") >= 10);
  check("planejador_nao_fazer",     totalDays >= 14 && !snaps.slice(0, 14).some(s => sem(s) === "green"));
  check("inteligencia_sofa",        consecutive(s => (s.hrv_avg ?? 0) >= 55 && (s.hrv_avg ?? 0) < 70 && (s.recovery_score ?? 100) < 50) >= 5);
  check("vice_campeao_tudo",        totalDays >= 14 && snaps.slice(0,14).some(s => sem(s) === "yellow") && !snaps.slice(0,14).some(s => sem(s) === "green"));
  check("arquiteto_sonhos",         totalDays >= 30 && consecutive(s => sem(s) === "green") < 5);
  check("night_owl",                consecutive(s => (s.hrv_avg ?? 100) < 55 && (s.stress_score ?? 1) === 0) >= 5);
  check("pro_player_vida_real",     consecutive(s => (s.recovery_score ?? 0) >= 80) >= 5);
  check("empurrador_profissional",  totalDays >= 14 && !snaps.slice(0, 14).some(s => sem(s) === "green"));
  check("terapeuta_sorvete",        snaps.some(s => (s.stress_score ?? 0) > 30 && (s.sleep_dim_score ?? 0) >= 70));
  check("quebrador_metas",          (() => {
    for (let i = 0; i < snaps.length - 1; i++) {
      if (sem(snaps[i]) === "red" && sem(snaps[i + 1]) === "green") return true;
    }
    return false;
  })());
  check("rei_voltas",               oscillations() >= 3);
  check("supervisor_caixas",        totalDays >= 14);
  check("monge_moderno",            consecutive(s => (s.stress_score ?? 1) === 0) >= 10);
  check("alpinista_amanha",         totalDays >= 21 && !snaps.slice(0, 21).some(s => sem(s) === "green") && snaps.slice(0, 21).some(s => sem(s) === "yellow"));
  check("minimizador_tudo",         totalDays >= 21 && !snaps.slice(0, 21).some(s => (s.recovery_score ?? 0) >= 65));
  check("lendario_desculpas",       totalDays >= 30 && !snaps.some(s => sem(s) === "green"));

  if (toUnlock.length > 0) {
    await supabase.from("user_achievements").upsert(
      toUnlock.map(id => ({ user_id: userId, achievement_id: id })),
      { onConflict: "user_id,achievement_id" }
    );
  }

  return toUnlock;
}
