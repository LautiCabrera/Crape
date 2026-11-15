/**
 * Generador pseudoaleatorio con estado explícito (mulberry32).
 * El estado vive dentro de GameState, así una partida es reproducible a partir de su semilla.
 */
export function nextRandom(state: number): { value: number; state: number } {
  const next = (state + 0x6d2b79f5) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, state: next };
}

/** Fisher-Yates. No modifica el array recibido. */
export function shuffle<T>(items: readonly T[], rngState: number): { items: T[]; state: number } {
  const result = [...items];
  let state = rngState;
  for (let i = result.length - 1; i > 0; i--) {
    const r = nextRandom(state);
    state = r.state;
    const j = Math.floor(r.value * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return { items: result, state };
}
