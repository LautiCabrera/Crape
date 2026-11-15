import { describe, expect, it } from 'vitest';
import { getLegalActions } from '../src';
import {
  act,
  c,
  cards,
  discard,
  errorOf,
  fromDiscard,
  fromHand,
  fromPozo,
  joker,
  ladderUpTo,
  makeState,
} from './helpers';

describe('partida de ejemplo del documento', () => {
  it('reproduce los dos primeros turnos y el robo siguiente', () => {
    const [a, two, three, four, six] = cards(1, 2, 3, 4, 6);
    const [five, six2, seven, ten, queen] = cards(5, 6, 7, 10, 12);
    let state = makeState({
      p0: { hand: [two!, three!, four!, six!, a!] },
      p1: { hand: [five!, six2!, seven!, ten!, queen!], pozo: cards(11, 8) },
    });

    // Primer jugador: As, 2, 3, 4; el 6 no entra y lo descarta.
    state = act(state, 0, fromHand(a!)).state;
    const ladderId = state.ladders[0]!.id;
    for (const card of [two!, three!, four!]) state = act(state, 0, fromHand(card, ladderId)).state;
    expect(errorOf(state, 0, fromHand(six!, ladderId))).toBe('WRONG_RANK');
    state = act(state, 0, discard(six!, 0)).state;

    expect(state.currentPlayer).toBe(1);
    expect(state.players[0].hand).toHaveLength(0);
    expect(state.players[1].hand).toHaveLength(5);

    // Segundo jugador: 5, 6, 7 de la mano y el 8 del pozo, que revela una J.
    for (const card of [five!, six2!, seven!]) state = act(state, 1, fromHand(card, ladderId)).state;
    const pozoPlay = act(state, 1, fromPozo(ladderId));
    state = pozoPlay.state;
    expect(pozoPlay.events).toContainEqual(
      expect.objectContaining({ type: 'pozoRevealed', player: 1, card: expect.objectContaining({ rank: 11 }) }),
    );
    expect(state.ladders[0]!.cards).toHaveLength(8);
    expect(errorOf(state, 1, fromPozo(ladderId))).toBe('WRONG_RANK');
    state = act(state, 1, discard(ten!, 0)).state;

    // El primero terminó sin cartas: roba 5. El segundo roba solo las que le faltan.
    expect(state.currentPlayer).toBe(0);
    expect(state.players[0].hand).toHaveLength(5);
    expect(state.players[1].hand).toHaveLength(1);
    state = act(state, 0, discard(state.players[0].hand[0]!, 1)).state;
    expect(state.players[1].hand).toHaveLength(5);
  });
});

describe('escaleras', () => {
  it('solo un As inicia una escalera', () => {
    const [ace, two] = cards(1, 2);
    const j = joker();
    const state = makeState({ p0: { hand: [ace!, two!, j] } });
    expect(errorOf(state, 0, fromHand(two!))).toBe('NEW_LADDER_REQUIRES_ACE');
    expect(errorOf(state, 0, fromHand(j))).toBe('JOKER_CANNOT_BE_ACE');
    expect(act(state, 0, fromHand(ace!)).state.ladders).toHaveLength(1);
  });

  it('permite iniciar varias escaleras en un mismo turno', () => {
    const [a1, a2, x] = cards(1, 1, 5);
    let state = makeState({ p0: { hand: [a1!, a2!, x!] } });
    state = act(state, 0, fromHand(a1!)).state;
    state = act(state, 0, fromHand(a2!)).state;
    expect(state.ladders).toHaveLength(2);
    expect(state.currentPlayer).toBe(0);
  });

  it('solo acepta el valor siguiente, sin importar el palo', () => {
    const [four, five, six] = cards(4, 5, 6);
    const state = makeState({ p0: { hand: [four!, five!, six!] }, ladders: [ladderUpTo(4)] });
    expect(errorOf(state, 0, fromHand(four!, 'X1'))).toBe('WRONG_RANK');
    expect(errorOf(state, 0, fromHand(six!, 'X1'))).toBe('WRONG_RANK');
    expect(errorOf(state, 0, fromHand(five!, 'X1'))).toBeNull();
    expect(errorOf(state, 0, fromHand(five!, 'no-existe'))).toBe('LADDER_NOT_FOUND');
  });

  it('el comodín vale cualquier carta de una escalera iniciada', () => {
    for (let top = 1; top <= 11; top++) {
      const j = joker();
      const state = makeState({ p0: { hand: [j, c(9)] }, ladders: [ladderUpTo(top)] });
      const next = act(state, 0, fromHand(j, 'X1')).state;
      expect(next.ladders[0]!.cards).toHaveLength(top + 1);
    }
  });

  it('el valor del comodín queda fijado por su posición', () => {
    const j = joker();
    const [six, seven] = cards(6, 7);
    let state = makeState({ p0: { hand: [j, six!, seven!, c(9)] }, ladders: [ladderUpTo(4)] });
    state = act(state, 0, fromHand(j, 'X1')).state; // el comodín hace de 5
    expect(errorOf(state, 0, fromHand(seven!, 'X1'))).toBe('WRONG_RANK');
    expect(errorOf(state, 0, fromHand(six!, 'X1'))).toBeNull();
  });

  it('al llegar al Rey la escalera se retira y sus cartas se apartan', () => {
    const king = c(13);
    const state = makeState({ p0: { hand: [king, c(9)] }, ladders: [ladderUpTo(12), ladderUpTo(3, 'X2')] });
    const result = act(state, 0, fromHand(king, 'X1'));
    expect(result.state.ladders.map((l) => l.id)).toEqual(['X2']);
    expect(result.state.recycle).toHaveLength(13);
    expect(result.state.stock).toHaveLength(10);
    expect(result.events).toContainEqual({ type: 'ladderCompleted', ladderId: 'X1' });
  });

  it('un comodín puede hacer de Rey y completar la escalera', () => {
    const j = joker();
    const state = makeState({ p0: { hand: [j, c(9)] }, ladders: [ladderUpTo(12)] });
    const next = act(state, 0, fromHand(j, 'X1')).state;
    expect(next.ladders).toHaveLength(0);
    expect(next.recycle).toHaveLength(13);
  });
});

describe('pozo', () => {
  it('jugar la carta visible revela la siguiente y permite encadenar', () => {
    let state = makeState({ p0: { hand: [c(2)], pozo: cards(4, 10, 9, 8) }, ladders: [ladderUpTo(7)] });
    state = act(state, 0, fromPozo('X1')).state; // 8
    state = act(state, 0, fromPozo('X1')).state; // 9
    state = act(state, 0, fromPozo('X1')).state; // 10
    expect(state.players[0].pozo).toHaveLength(1);
    expect(errorOf(state, 0, fromPozo('X1'))).toBe('WRONG_RANK');
  });

  it('jugar la última carta del pozo gana la partida en el acto', () => {
    const state = makeState({ p0: { hand: cards(2, 3), pozo: cards(5) }, ladders: [ladderUpTo(4)] });
    const result = act(state, 0, fromPozo('X1'));
    expect(result.state.status).toEqual({ kind: 'won', winner: 0 });
    expect(result.events).toContainEqual({ type: 'gameWon', winner: 0 });
    expect(result.state.players[0].hand).toHaveLength(2);

    expect(getLegalActions(result.state, 0)).toEqual([]);
    expect(errorOf(result.state, 0, discard(result.state.players[0].hand[0]!))).toBe('GAME_FINISHED');
    expect(errorOf(result.state, 1, { type: 'pass' })).toBe('GAME_FINISHED');
  });
});

describe('pilas de descarte como fuente', () => {
  it('solo se puede jugar la carta superior de cada pila', () => {
    const state = makeState({
      p0: { hand: [c(2)], discards: [cards(5, 7), [], cards(5)] },
      ladders: [ladderUpTo(4)],
    });
    expect(errorOf(state, 0, fromDiscard(0, 'X1'))).toBe('WRONG_RANK'); // el tope es 7, el 5 está tapado
    expect(errorOf(state, 0, fromDiscard(1, 'X1'))).toBe('CARD_NOT_AVAILABLE');
    expect(errorOf(state, 0, fromDiscard(3, 'X1'))).toBe('INVALID_PILE');
    const next = act(state, 0, fromDiscard(2, 'X1')).state;
    expect(next.players[0].discards[2]).toHaveLength(0);
    expect(next.ladders[0]!.cards).toHaveLength(5);
  });
});

describe('mano', () => {
  it('si la mano se vacía jugando, roba 5 y el turno continúa', () => {
    const five = c(5);
    const state = makeState({ p0: { hand: [five] }, ladders: [ladderUpTo(4)] });
    const result = act(state, 0, fromHand(five, 'X1'));
    expect(result.state.players[0].hand).toHaveLength(5);
    expect(result.state.stock).toHaveLength(5);
    expect(result.state.currentPlayer).toBe(0);
    expect(result.events).toContainEqual(expect.objectContaining({ type: 'cardsDrawn', player: 0, count: 5 }));
  });

  it('una carta que no está en la mano no se puede jugar', () => {
    const state = makeState({ p0: { hand: [c(5)] }, ladders: [ladderUpTo(4)] });
    expect(errorOf(state, 0, fromHand(c(5), 'X1'))).toBe('CARD_NOT_AVAILABLE');
    // La mano del rival tampoco es accesible.
    const theirs = c(5);
    const other = makeState({ p0: { hand: [c(2)] }, p1: { hand: [theirs] }, ladders: [ladderUpTo(4)] });
    expect(errorOf(other, 0, fromHand(theirs, 'X1'))).toBe('CARD_NOT_AVAILABLE');
  });
});

describe('garantías generales', () => {
  it('rechaza acciones fuera de turno', () => {
    const five = c(5);
    const state = makeState({ p1: { hand: [five] }, ladders: [ladderUpTo(4)] });
    expect(errorOf(state, 1, fromHand(five, 'X1'))).toBe('NOT_YOUR_TURN');
    expect(getLegalActions(state, 1)).toEqual([]);
  });

  it('no modifica el estado recibido, ni al aceptar ni al rechazar', () => {
    const [five, eight] = cards(5, 8);
    const state = makeState({ p0: { hand: [five!, eight!] }, ladders: [ladderUpTo(4)] });
    const snapshot = structuredClone(state);
    act(state, 0, fromHand(five!, 'X1'));
    act(state, 0, discard(eight!, 2));
    errorOf(state, 0, fromHand(eight!, 'X1'));
    expect(state).toEqual(snapshot);
  });
});
