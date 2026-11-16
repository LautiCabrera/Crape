import type { Card, GameEvent, Suit } from '@crape/engine';
import type { Dictionary } from './i18n';

export const RANK_LABEL = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const SUIT_SYMBOL: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

export function cardName(card: Card, t: Dictionary): string {
  if (card.kind === 'joker') return t.cards.joker;
  return t.cards.name(RANK_LABEL[card.rank]!, t.cards[card.suit]);
}

/** Aviso que la mesa muestra después de una jugada; el texto sale del diccionario. */
export type TableMessage = keyof Dictionary['events'] | 'invalid';

/** Lo más relevante que pasó en una jugada, si hay algo que valga la pena avisar. */
export function summarizeEvents(events: GameEvent[]): TableMessage | null {
  const has = (type: GameEvent['type']) => events.some((e) => e.type === type);
  if (has('ladderCompleted')) return 'ladderCompleted';
  if (has('stockReshuffled')) return 'stockReshuffled';
  if (has('pozoRevealed')) return 'pozoRevealed';
  if (has('cardsDrawn') && !has('turnStarted')) return 'handRefilled';
  return null;
}
