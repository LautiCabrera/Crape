/** Enfrenta al bot rival (cpuBot) contra el bot simple (greedyBot). Uso: npx tsx scripts/duel.ts [partidas] */
import { applyAction, cpuBot, createGame, greedyBot } from '../src';

const games = Number(process.argv[2] ?? 2000);
let cpuWins = 0;
let greedyWins = 0;
let other = 0;
for (let seed = 1; seed <= games; seed++) {
  let state = createGame(seed);
  const cpuSeat = seed % 2; // alterna el asiento para no favorecer a nadie
  let steps = 0;
  while (state.status.kind === 'playing' && steps++ < 50_000) {
    const player = state.currentPlayer;
    const bot = player === cpuSeat ? cpuBot : greedyBot;
    const result = applyAction(state, player, bot(state, player, Math.random));
    if (!result.ok) throw new Error(`Semilla ${seed}: ${result.error}`);
    state = result.state;
  }
  if (state.status.kind !== 'won') other++;
  else if (state.status.winner === cpuSeat) cpuWins++;
  else greedyWins++;
}
console.log(`cpuBot ${cpuWins} · greedyBot ${greedyWins} · sin ganador ${other} (de ${games})`);
