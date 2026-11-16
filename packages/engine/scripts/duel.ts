/**
 * Enfrenta dos bots entre sí, alternando asientos.
 * Uso: npx tsx scripts/duel.ts <botA> <botB> [partidas]   (bots: easy, normal, hard, greedy)
 */
import { applyAction, BOTS, createGame, greedyBot } from '../src';
import type { Bot } from '../src';

const all: Record<string, Bot> = { ...BOTS, greedy: greedyBot };
const [nameA = 'hard', nameB = 'normal'] = process.argv.slice(2);
const games = Number(process.argv[4] ?? 2000);
const a = all[nameA];
const b = all[nameB];
if (!a || !b) throw new Error(`Bots disponibles: ${Object.keys(all).join(', ')}`);

let winsA = 0;
let winsB = 0;
let other = 0;
for (let seed = 1; seed <= games; seed++) {
  let state = createGame(seed);
  const seatA = seed % 2;
  let steps = 0;
  while (state.status.kind === 'playing' && steps++ < 50_000) {
    const player = state.currentPlayer;
    const result = applyAction(state, player, (player === seatA ? a : b)(state, player, Math.random));
    if (!result.ok) throw new Error(`Semilla ${seed}: ${result.error}`);
    state = result.state;
  }
  if (state.status.kind !== 'won') other++;
  else if (state.status.winner === seatA) winsA++;
  else winsB++;
}
console.log(`${nameA} ${winsA} · ${nameB} ${winsB} · sin ganador ${other} (de ${games})`);
