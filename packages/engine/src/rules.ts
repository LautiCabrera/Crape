import type { Card, GameConfig, GameState, Ladder, PlayerId, PlayerState, Rank } from './types';

export const DEFAULT_CONFIG: GameConfig = {
  deckCount: 2,
  jokersPerDeck: 2,
  pozoSize: 11,
  handSize: 5,
  discardPileCount: 3,
  starterRule: 'highestPozo',
  mandatoryAces: true,
};

export const KING: Rank = 13;

export function isAce(card: Card | undefined): boolean {
  return card?.kind === 'standard' && card.rank === 1;
}

export function isJoker(card: Card | undefined): boolean {
  return card?.kind === 'joker';
}

export function otherPlayer(player: PlayerId): PlayerId {
  return player === 0 ? 1 : 0;
}

export function pozoTop(player: PlayerState): Card | undefined {
  return player.pozo[player.pozo.length - 1];
}

/** Valor que la escalera acepta a continuación. */
export function nextRank(ladder: Ladder): number {
  return ladder.cards.length + 1;
}

/**
 * ¿La carta puede continuar esta escalera?
 * El comodín vale cualquier carta menos As, y una escalera existente nunca pide un As.
 */
export function fitsLadder(card: Card, ladder: Ladder): boolean {
  if (card.kind === 'joker') return true;
  return card.rank === nextRank(ladder);
}

/** R13: hay un As disponible en la mano o como carta visible del pozo. */
export function mustPlayAce(state: GameState, player: PlayerId): boolean {
  if (!state.config.mandatoryAces) return false;
  const me = state.players[player];
  return me.hand.some(isAce) || isAce(pozoTop(me));
}
