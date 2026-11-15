import { getLegalActions } from './legal';
import { isJoker, nextRank } from './rules';
import type { Action, Card, GameState, PlayerId } from './types';

type PlayAction = Extract<Action, { type: 'play' }>;

const SOURCE_PRIORITY = { pozo: 0, hand: 1, discard: 2 } as const;

/**
 * Bot simple para simulaciones y pruebas: juega todo lo que puede (primero el pozo) y,
 * cuando no puede más, descarta intentando armar pilas descendentes.
 * No pretende jugar bien; sirve para recorrer partidas completas.
 */
export function greedyBot(state: GameState, player: PlayerId, random: () => number): Action {
  const legal = getLegalActions(state, player);
  const plays = legal.filter((a): a is PlayAction => a.type === 'play');
  if (plays.length > 0) {
    plays.sort((a, b) => SOURCE_PRIORITY[a.source.from] - SOURCE_PRIORITY[b.source.from]);
    return plays[0]!;
  }
  if (legal.some((a) => a.type === 'pass')) return { type: 'pass' };

  const me = state.players[player];
  // Conserva los comodines si tiene otra cosa para descartar.
  const candidates = me.hand.some((c) => !isJoker(c)) ? me.hand.filter((c) => !isJoker(c)) : me.hand;
  // Descarta la carta más lejana de lo que piden las escaleras.
  const wanted = new Set(state.ladders.map(nextRank));
  const distance = (card: Card): number => {
    if (card.kind === 'joker') return 0;
    let best = 13;
    for (const w of wanted) if (card.rank >= w) best = Math.min(best, card.rank - w);
    return best;
  };
  const card = [...candidates].sort((a, b) => distance(b) - distance(a))[0]!;

  const rankOf = (c: Card | undefined) => (c && c.kind === 'standard' ? c.rank : 0);
  let pile = me.discards.findIndex((p) => p.length > 0 && rankOf(p[p.length - 1]) === rankOf(card) + 1);
  if (pile < 0) pile = me.discards.findIndex((p) => p.length === 0);
  if (pile < 0) pile = Math.floor(random() * me.discards.length);
  return { type: 'endTurn', cardId: card.id, pile };
}

const rankOf = (card: Card | undefined): number => (card && card.kind === 'standard' ? card.rank : 0);

/**
 * Busca una cadena de jugadas (mano y topes de descarte) que termine permitiendo jugar la carta
 * visible del pozo, y devuelve su primer paso. Elige la cadena más corta.
 */
function firstStepTowardsPozo(state: GameState, player: PlayerId): PlayAction | null {
  const me = state.players[player];
  const goal = rankOf(me.pozo[me.pozo.length - 1]);
  if (goal === 0) return null;

  let best: { first: PlayAction; length: number } | null = null;
  for (const ladder of state.ladders) {
    const start = nextRank(ladder);
    if (start >= goal) continue;

    const hand = [...me.hand];
    const piles = me.discards.map((pile) => [...pile]);
    let first: PlayAction | null = null;
    let reachable = true;

    for (let rank = start; rank < goal && reachable; rank++) {
      const wants = (card: Card | undefined, joker: boolean) =>
        card !== undefined && (joker ? card.kind === 'joker' : rankOf(card) === rank);
      let source: PlayAction['source'] | null = null;
      // Primero la carta exacta; los comodines solo si no hay otra forma.
      for (const joker of [false, true]) {
        const inHand = hand.findIndex((card) => wants(card, joker));
        if (inHand >= 0) {
          source = { from: 'hand', cardId: hand[inHand]!.id };
          hand.splice(inHand, 1);
          break;
        }
        const pile = piles.findIndex((p) => wants(p[p.length - 1], joker));
        if (pile >= 0) {
          source = { from: 'discard', pile };
          piles[pile]!.pop();
          break;
        }
      }
      if (!source) reachable = false;
      else first ??= { type: 'play', source, target: { to: 'ladder', ladderId: ladder.id } };
    }

    const length = goal - start;
    if (reachable && first && (!best || length < best.length)) best = { first, length };
  }
  return best?.first ?? null;
}

/**
 * Rival para el modo de un jugador contra un bot. Solo usa información que un jugador real tendría:
 * su mano, sus pilas, y lo que está a la vista sobre la mesa.
 *
 * Prioridades: vaciar el pozo, armar cadenas que lleguen a la carta del pozo, jugar cartas que
 * no le dejen servida la jugada al rival, y descartar ordenando las pilas de mayor a menor.
 */
export function cpuBot(state: GameState, player: PlayerId, random: () => number): Action {
  const legal = getLegalActions(state, player);
  const plays = legal.filter((a): a is PlayAction => a.type === 'play');
  const me = state.players[player];
  const opponent = state.players[player === 0 ? 1 : 0];

  const fromPozo = plays.find((a) => a.source.from === 'pozo');
  if (fromPozo) return fromPozo;

  const ace = plays.find((a) => a.target.to === 'newLadder');
  if (ace) return ace;

  const towardsPozo = firstStepTowardsPozo(state, player);
  if (towardsPozo) return towardsPozo;

  // Jugadas "seguras": sin gastar comodines y sin dejar la escalera lista para el pozo rival.
  const opponentNeeds = rankOf(opponent.pozo[opponent.pozo.length - 1]);
  const cardOf = (a: PlayAction): Card | undefined => {
    if (a.source.from === 'hand') {
      const id = a.source.cardId;
      return me.hand.find((c) => c.id === id);
    }
    if (a.source.from === 'discard') {
      const pile = me.discards[a.source.pile]!;
      return pile[pile.length - 1];
    }
    return undefined;
  };
  const safe = plays.filter((a) => {
    if (a.target.to !== 'ladder' || isJoker(cardOf(a))) return false;
    const targetId = a.target.ladderId;
    const ladder = state.ladders.find((l) => l.id === targetId)!;
    return nextRank(ladder) + 1 !== opponentNeeds;
  });
  if (safe.length > 0) {
    // Primero libera las pilas de descarte, después la mano.
    return safe.find((a) => a.source.from === 'discard') ?? safe[0]!;
  }

  if (legal.some((a) => a.type === 'pass')) return { type: 'pass' };

  // Descarte: conserva comodines y prefiere armar pilas descendentes o de valores repetidos.
  const candidates = me.hand.some((c) => !isJoker(c)) ? me.hand.filter((c) => !isJoker(c)) : me.hand;
  const wanted = state.ladders.map(nextRank);
  let bestChoice = { cardId: candidates[0]!.id, pile: 0, score: -Infinity };
  for (const card of candidates) {
    const rank = rankOf(card);
    // Cuanto más lejos esté la carta de poder jugarse, menos duele descartarla.
    const distance = Math.min(13, ...wanted.filter((w) => rank >= w).map((w) => rank - w));
    me.discards.forEach((pile, index) => {
      const top = rankOf(pile[pile.length - 1]);
      let fit: number;
      if (pile.length === 0) fit = 20;
      else if (top === rank + 1) fit = 30;
      else if (top === rank) fit = 25;
      else if (top > rank) fit = 10;
      else fit = 0;
      const score = fit + distance + random();
      if (score > bestChoice.score) bestChoice = { cardId: card.id, pile: index, score };
    });
  }
  return { type: 'endTurn', cardId: bestChoice.cardId, pile: bestChoice.pile };
}
