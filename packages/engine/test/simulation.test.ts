import { describe, expect, it } from 'vitest';
import { applyAction, cpuBot, createGame, getLegalActions, greedyBot } from '../src';
import { nextRandom } from '../src/rng';
import { checkInvariants } from './helpers';

const MAX_ACTIONS = 20_000;

describe('partidas completas con bots', () => {
  it('200 partidas terminan y respetan los invariantes en cada paso', () => {
    for (let seed = 1; seed <= 200; seed++) {
      let state = createGame(seed);
      let rng = seed;
      const random = () => {
        const r = nextRandom(rng);
        rng = r.state;
        return r.value;
      };

      let steps = 0;
      while (state.status.kind === 'playing') {
        expect(getLegalActions(state, state.currentPlayer).length).toBeGreaterThan(0);
        const result = applyAction(state, state.currentPlayer, greedyBot(state, state.currentPlayer, random));
        if (!result.ok) throw new Error(`Semilla ${seed}: el bot eligió una acción inválida (${result.error})`);
        state = result.state;
        checkInvariants(state, 108);
        if (++steps > MAX_ACTIONS) throw new Error(`Semilla ${seed}: la partida no termina`);
      }
    }
  });

  it('el bot rival solo elige acciones válidas y sus partidas terminan', () => {
    for (let seed = 1; seed <= 100; seed++) {
      let state = createGame(seed);
      let rng = seed;
      const random = () => {
        const r = nextRandom(rng);
        rng = r.state;
        return r.value;
      };
      let steps = 0;
      while (state.status.kind === 'playing') {
        const result = applyAction(state, state.currentPlayer, cpuBot(state, state.currentPlayer, random));
        if (!result.ok) throw new Error(`Semilla ${seed}: el bot eligió una acción inválida (${result.error})`);
        state = result.state;
        checkInvariants(state, 108);
        if (++steps > MAX_ACTIONS) throw new Error(`Semilla ${seed}: la partida no termina`);
      }
    }
  });

  it('toda acción listada como válida es aceptada por el motor', () => {
    for (let seed = 1; seed <= 15; seed++) {
      let state = createGame(seed);
      const random = () => 0.5;
      while (state.status.kind === 'playing') {
        for (const action of getLegalActions(state, state.currentPlayer)) {
          const result = applyAction(state, state.currentPlayer, action);
          if (!result.ok) throw new Error(`Semilla ${seed}: ${JSON.stringify(action)} → ${result.error}`);
        }
        const next = applyAction(state, state.currentPlayer, greedyBot(state, state.currentPlayer, random));
        if (!next.ok) throw new Error(next.error);
        state = next.state;
      }
    }
  });
});
