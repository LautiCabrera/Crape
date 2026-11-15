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
