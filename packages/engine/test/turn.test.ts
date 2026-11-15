import { describe, expect, it } from 'vitest';
import { getLegalActions, redactEvent } from '../src';
import { act, c, cards, discard, errorOf, fromHand, fromPozo, ladderUpTo, makeState } from './helpers';

describe('fin del turno', () => {
  it('descartar una carta de la mano pasa el turno al rival', () => {
    const [five, eight] = cards(5, 8);
    const state = makeState({ p0: { hand: [five!, eight!] }, p1: { hand: cards(2, 2, 2, 2, 2) } });
    const result = act(state, 0, discard(eight!, 1));
    expect(result.state.players[0].discards[1]).toEqual([eight]);
    expect(result.state.players[0].hand).toEqual([five]);
    expect(result.state.currentPlayer).toBe(1);
    expect(result.state.turnNumber).toBe(2);
  });

  it('las cartas se apilan y no existe una cuarta pila', () => {
    const [five, eight] = cards(5, 8);
    const old = c(3);
    const state = makeState({ p0: { hand: [five!, eight!], discards: [[old], [], []] } });
    expect(errorOf(state, 0, discard(five!, 3))).toBe('INVALID_PILE');
    expect(errorOf(state, 0, discard(five!, -1))).toBe('INVALID_PILE');
    expect(act(state, 0, discard(five!, 0)).state.players[0].discards[0]).toEqual([old, five]);
  });

  it('solo se descarta desde la mano', () => {
    const state = makeState({ p0: { hand: [c(5)], pozo: cards(4, 6) } });
    const pozoCard = state.players[0].pozo[1]!;
    expect(errorOf(state, 0, discard(pozoCard, 0))).toBe('CARD_NOT_AVAILABLE');
  });

  it('no se puede pasar teniendo cartas en la mano', () => {
    const state = makeState({ p0: { hand: [c(5)] } });
    expect(errorOf(state, 0, { type: 'pass' })).toBe('PASS_NOT_ALLOWED');
  });
});

describe('robo al iniciar el turno', () => {
  it.each([
    [0, 5],
    [1, 4],
    [3, 2],
    [5, 0],
  ])('con %i cartas en la mano roba %i', (inHand, expectedDraw) => {
    const eight = c(8);
    const state = makeState({
      p0: { hand: [eight, c(7)] },
      p1: { hand: Array.from({ length: inHand }, () => c(2)) },
    });
    const next = act(state, 0, discard(eight)).state;
    expect(next.players[1].hand).toHaveLength(5);
    expect(next.stock).toHaveLength(10 - expectedDraw);
  });

  it('quien vacía la mano descartando no roba hasta su próximo turno', () => {
    const eight = c(8);
    const state = makeState({ p0: { hand: [eight] }, p1: { hand: cards(2, 2, 2, 2, 2) } });
    const next = act(state, 0, discard(eight)).state;
    expect(next.players[0].hand).toHaveLength(0);
    const p1Card = next.players[1].hand[0]!;
    expect(act(next, 1, discard(p1Card)).state.players[0].hand).toHaveLength(5);
  });

  it('el rival no ve qué cartas se robaron', () => {
    const eight = c(8);
    const state = makeState({ p0: { hand: [eight] } });
    const drawn = act(state, 0, discard(eight)).events.find((e) => e.type === 'cardsDrawn')!;
    expect(redactEvent(drawn, 1)).toEqual(drawn);
    expect(redactEvent(drawn, 0)).toEqual({ type: 'cardsDrawn', player: 1, count: 5, cards: null });
  });
});

describe('Ases obligatorios', () => {
  it('no se puede terminar el turno con un As en la mano', () => {
    const [ace, eight] = cards(1, 8);
    const state = makeState({ p0: { hand: [ace!, eight!] } });
    expect(errorOf(state, 0, discard(eight!))).toBe('ACE_MUST_BE_PLAYED');
    expect(errorOf(state, 0, discard(ace!))).toBe('ACE_MUST_BE_PLAYED');
    expect(getLegalActions(state, 0).every((a) => a.type === 'play')).toBe(true);

    const afterAce = act(state, 0, fromHand(ace!)).state;
    expect(errorOf(afterAce, 0, discard(eight!))).toBeNull();
  });

  it('tampoco con un As como carta visible del pozo', () => {
    const eight = c(8);
    const state = makeState({ p0: { hand: [eight, c(7)], pozo: cards(9, 1) } });
    expect(errorOf(state, 0, discard(eight))).toBe('ACE_MUST_BE_PLAYED');
    const afterAce = act(state, 0, fromPozo()).state;
    expect(errorOf(afterAce, 0, discard(eight))).toBeNull();
  });

  it('la regla se puede desactivar por configuración', () => {
    const [ace, eight] = cards(1, 8);
    const state = makeState({ p0: { hand: [ace!, eight!] }, config: { mandatoryAces: false } });
    expect(errorOf(state, 0, discard(eight!))).toBeNull();
  });
});

describe('reciclaje del mazo', () => {
  it('las escaleras completas no vuelven al mazo hasta que se agota', () => {
    const eight = c(8);
    const recycle = ladderUpTo(13).cards;
    const state = makeState({ p0: { hand: [eight, c(7)] }, stock: cards(9, 9, 9, 9, 9, 9), recycle });
    const result = act(state, 0, discard(eight));
    expect(result.state.recycle).toHaveLength(13);
    expect(result.state.stock).toHaveLength(1);
    expect(result.events.some((e) => e.type === 'stockReshuffled')).toBe(false);
  });

  it('cuando el mazo se agota se mezcla el reciclaje y se sigue robando', () => {
    const eight = c(8);
    const recycle = ladderUpTo(13).cards;
    const state = makeState({ p0: { hand: [eight, c(7)] }, stock: cards(9, 9), recycle });
    const result = act(state, 0, discard(eight));
    expect(result.events).toContainEqual({ type: 'stockReshuffled', count: 13 });
    expect(result.state.players[1].hand).toHaveLength(5);
    expect(result.state.stock).toHaveLength(10);
    expect(result.state.recycle).toHaveLength(0);
  });

  it('una escalera recién completada ya está disponible para el robo de la misma jugada', () => {
    const king = c(13);
    const state = makeState({ p0: { hand: [king] }, stock: [], ladders: [ladderUpTo(12)] });
    const next = act(state, 0, fromHand(king, 'X1')).state;
    expect(next.players[0].hand).toHaveLength(5);
    expect(next.stock).toHaveLength(8);
    expect(next.currentPlayer).toBe(0);
  });
});

describe('agotamiento total (R19, provisional)', () => {
  it('se roba lo que haya', () => {
    const eight = c(8);
    const state = makeState({ p0: { hand: [eight, c(7)] }, stock: cards(9, 9) });
    const next = act(state, 0, discard(eight)).state;
    expect(next.players[1].hand).toHaveLength(2);
    expect(next.stock).toHaveLength(0);
  });

  it('sin cartas en la mano se puede pasar, y dos pases sin jugar bloquean la partida', () => {
    let state = makeState({ stock: [] });
    expect(getLegalActions(state, 0)).toEqual([{ type: 'pass' }]);
    state = act(state, 0, { type: 'pass' }).state;
    expect(state.status.kind).toBe('playing');
    expect(state.currentPlayer).toBe(1);
    const result = act(state, 1, { type: 'pass' });
    expect(result.state.status).toEqual({ kind: 'blocked' });
    expect(result.events).toContainEqual({ type: 'gameBlocked' });
  });

  it('un pase después de haber jugado cartas no cuenta para el bloqueo', () => {
    let state = makeState({ p1: { pozo: cards(9, 5) }, stock: [], ladders: [ladderUpTo(4)] });
    state = act(state, 0, { type: 'pass' }).state;
    state = act(state, 1, fromPozo('X1')).state;
    state = act(state, 1, { type: 'pass' }).state;
    expect(state.status.kind).toBe('playing');
    expect(state.idlePasses).toBe(0);
  });

  it('un As en el pozo debe jugarse antes de pasar', () => {
    const state = makeState({ p0: { pozo: cards(9, 1) }, stock: [] });
    expect(errorOf(state, 0, { type: 'pass' })).toBe('ACE_MUST_BE_PLAYED');
  });
});
