import { describe, expect, it } from 'vitest';
import { buildDeck, createGame, DEFAULT_CONFIG, getPlayerView, pozoTop } from '../src';
import type { Card } from '../src';
import { allCards, checkInvariants } from './helpers';

describe('preparación', () => {
  it('arma 108 cartas únicas con 4 comodines y 8 Ases', () => {
    const deck = buildDeck(DEFAULT_CONFIG);
    expect(deck).toHaveLength(108);
    expect(new Set(deck.map((c) => c.id)).size).toBe(108);
    expect(deck.filter((c) => c.kind === 'joker')).toHaveLength(4);
    expect(deck.filter((c) => c.kind === 'standard' && c.rank === 1)).toHaveLength(8);
  });

  it('reparte 11 de pozo y 5 de mano a cada jugador y deja 76 en el mazo', () => {
    const state = createGame(42);
    for (const p of state.players) {
      expect(p.pozo).toHaveLength(11);
      expect(p.hand).toHaveLength(5);
      expect(p.discards).toEqual([[], [], []]);
    }
    expect(state.stock).toHaveLength(76);
    expect(state.ladders).toEqual([]);
    checkInvariants(state, 108);
  });

  it('la misma semilla produce la misma partida y otra semilla una distinta', () => {
    expect(createGame(7)).toEqual(createGame(7));
    expect(createGame(7).stock).not.toEqual(createGame(8).stock);
  });

  it('empieza quien tiene la carta visible del pozo más alta (comodín = la más alta)', () => {
    const value = (card: Card | undefined) => (!card ? 0 : card.kind === 'joker' ? 14 : card.rank);
    let checked = 0;
    for (let seed = 0; seed < 200; seed++) {
      const state = createGame(seed);
      const a = value(pozoTop(state.players[0]));
      const b = value(pozoTop(state.players[1]));
      if (a === b) continue;
      expect(state.currentPlayer).toBe(a > b ? 0 : 1);
      checked++;
    }
    expect(checked).toBeGreaterThan(100);
  });

  it('rechaza configuraciones sin cartas suficientes', () => {
    expect(() => createGame(1, { pozoSize: 60 })).toThrow();
  });
});

describe('vista del jugador', () => {
  it('no expone la mano rival, las cartas ocultas de los pozos ni el mazo', () => {
    const state = createGame(3);
    const view = getPlayerView(state, 0);
    const serialized = JSON.stringify(view);

    const hidden = [
      ...state.players[1].hand,
      ...state.players[0].pozo.slice(0, -1),
      ...state.players[1].pozo.slice(0, -1),
      ...state.stock,
    ];
    for (const card of hidden) expect(serialized).not.toContain(`"${card.id}"`);

    expect(view.hand).toEqual(state.players[0].hand);
    expect(view.me.pozoTop).toEqual(pozoTop(state.players[0]));
    expect(view.opponent.pozoTop).toEqual(pozoTop(state.players[1]));
    expect(view.opponent.pozoCount).toBe(11);
    expect(view.opponent.handCount).toBe(5);
    expect(view.stockCount).toBe(76);
    expect(serialized).not.toContain('rngState');
    expect(allCards(state)).toHaveLength(108);
  });
});
