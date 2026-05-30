export type Semaphore = "green" | "yellow" | "orange" | "red";

export interface RecoveryInput {
  hrv_ms: number | null;
  rhr_bpm: number | null;
  sleep_score: number | null; // Oura 0-100
}

export interface RecoveryBaseline {
  hrv_ms: number;
  rhr_bpm: number;
  sleep_score: number; // Oura score equivalente a 7.5h ≈ 85
}

export const DEFAULT_BASELINE: RecoveryBaseline = {
  hrv_ms: 63,
  rhr_bpm: 62,
  sleep_score: 85,
};

export interface RecoveryResult {
  score: number;       // 0–100
  semaphore: Semaphore;
  components: {
    hrv: number | null;
    rhr: number | null;
    sleep: number | null;
  };
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, v));
}

function toSemaphore(score: number): Semaphore {
  if (score >= 75) return "green";
  if (score >= 50) return "yellow";
  if (score >= 25) return "orange";
  return "red";
}

export function calcRecovery(
  input: RecoveryInput,
  baseline: RecoveryBaseline = DEFAULT_BASELINE
): RecoveryResult {
  // HRV: maior que baseline → melhor. Linear, capped em 100.
  const hrv =
    input.hrv_ms != null ? clamp((input.hrv_ms / baseline.hrv_ms) * 100) : null;

  // RHR: menor que baseline → melhor. baseline/actual * 100, capped em 100.
  const rhr =
    input.rhr_bpm != null
      ? clamp((baseline.rhr_bpm / input.rhr_bpm) * 100)
      : null;

  // Sono: score Oura vs ideal (85 ≈ 7.5h). Capped em 100.
  const sleep =
    input.sleep_score != null
      ? clamp((input.sleep_score / baseline.sleep_score) * 100)
      : null;

  const weights = [
    { value: hrv, w: 0.45 },
    { value: rhr, w: 0.35 },
    { value: sleep, w: 0.20 },
  ];

  const available = weights.filter(
    (x): x is { value: number; w: number } => x.value != null
  );

  if (available.length === 0) {
    return { score: 0, semaphore: "red", components: { hrv, rhr, sleep } };
  }

  // redistribui pesos proporcionalmente se algum input estiver null
  const totalWeight = available.reduce((s, x) => s + x.w, 0);
  const score = Math.round(
    available.reduce((s, x) => s + (x.value * x.w) / totalWeight, 0)
  );

  return {
    score: clamp(score),
    semaphore: toSemaphore(score),
    components: { hrv, rhr, sleep },
  };
}
