import type { Card, GameEvent, Suit } from '@crape/engine';

export const RANK_LABEL = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const SUIT_SYMBOL: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const SUIT_NAME: Record<Suit, string> = {
  hearts: 'corazones',
  diamonds: 'diamantes',
  clubs: 'tréboles',
  spades: 'picas',
};

export function cardName(card: Card): string {
  if (card.kind === 'joker') return 'Comodín';
  return `${RANK_LABEL[card.rank]} de ${SUIT_NAME[card.suit]}`;
}

/** Resume en una frase lo más relevante que pasó en una jugada. */
export function describeEvents(events: GameEvent[]): string | null {
  const has = (type: GameEvent['type']) => events.some((e) => e.type === type);
  if (has('ladderCompleted')) return '¡Escalera completa! Sus cartas quedan apartadas hasta que se agote el mazo.';
  if (has('stockReshuffled')) return 'El mazo se agotó: se mezclaron las escaleras completas para seguir robando.';
  if (has('pozoRevealed')) return 'Se reveló una nueva carta del pozo.';
  if (has('cardsDrawn') && !has('turnStarted')) return 'Mano vacía: se roban cartas nuevas y el turno continúa.';
  return null;
}
