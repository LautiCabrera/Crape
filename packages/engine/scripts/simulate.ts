/**
 * Simula partidas completas entre dos bots y mide con qué frecuencia se agota el mazo.
 * Uso: npm run simulate -- [partidas] [mazos]
 */
import { applyAction, createGame, greedyBot } from '../src';
import { nextRandom } from '../src/rng';

const games = Number(process.argv[2] ?? 5000);
const deckCount = Number(process.argv[3] ?? 2);
const MAX_ACTIONS = 50_000;

let won = 0;
let blocked = 0;
let unfinished = 0;
let gamesWithReshuffle = 0;
let gamesWithShortDraw = 0;
let gamesWithPass = 0;
let totalTurns = 0;
let maxTurns = 0;
let minStock = Infinity;

for (let seed = 1; seed <= games; seed++) {
  let state = createGame(seed, { deckCount });
  let rng = seed ^ 0x9e3779b9;
  const random = () => {
    const r = nextRandom(rng);
    rng = r.state;
    return r.value;
  };

  let reshuffled = false;
  let shortDraw = false;
  let passed = false;
  let steps = 0;
  while (state.status.kind === 'playing' && steps++ < MAX_ACTIONS) {
    const player = state.currentPlayer;
    const result = applyAction(state, player, greedyBot(state, player, random));
    if (!result.ok) throw new Error(`Semilla ${seed}: ${result.error}`);
    state = result.state;
    minStock = Math.min(minStock, state.stock.length);
    for (const event of result.events) {
      if (event.type === 'stockReshuffled') reshuffled = true;
      if (event.type === 'turnPassed') passed = true;
    }
    // Robo incompleto: empieza un turno con menos de 5 cartas porque no quedaba qué robar.
    if (result.events.some((e) => e.type === 'turnStarted')) {
      if (state.players[state.currentPlayer].hand.length < state.config.handSize) shortDraw = true;
    }
  }

  if (state.status.kind === 'won') won++;
  else if (state.status.kind === 'blocked') blocked++;
  else unfinished++;
  if (reshuffled) gamesWithReshuffle++;
  if (shortDraw) gamesWithShortDraw++;
  if (passed) gamesWithPass++;
  totalTurns += state.turnNumber;
  maxTurns = Math.max(maxTurns, state.turnNumber);
}

const pct = (n: number) => `${((100 * n) / games).toFixed(2)}%`;
console.log(`Partidas: ${games} · mazos: ${deckCount}`);
console.log(`Con ganador:                    ${won} (${pct(won)})`);
console.log(`Bloqueadas (R19):               ${blocked} (${pct(blocked)})`);
console.log(`Sin terminar (límite técnico):  ${unfinished} (${pct(unfinished)})`);
console.log(`Mezclaron el reciclaje:         ${gamesWithReshuffle} (${pct(gamesWithReshuffle)})`);
console.log(`Con algún robo incompleto:      ${gamesWithShortDraw} (${pct(gamesWithShortDraw)})`);
console.log(`Con algún turno pasado:         ${gamesWithPass} (${pct(gamesWithPass)})`);
console.log(`Turnos por partida: promedio ${(totalTurns / games).toFixed(1)}, máximo ${maxTurns}`);
console.log(`Mínimo de cartas en el mazo:    ${minStock}`);
