import { fitsLadder, isAce, mustPlayAce, pozoTop } from './rules';
import type { Action, Card, GameState, PlayerId, Source } from './types';

/** Todas las acciones válidas para el jugador. Vacío si no es su turno o la partida terminó. */
export function getLegalActions(state: GameState, player: PlayerId): Action[] {
  if (state.status.kind !== 'playing' || player !== state.currentPlayer) return [];
  const me = state.players[player];
  const actions: Action[] = [];

  const sources: Array<{ card: Card; source: Source }> = me.hand.map((card) => ({
    card,
    source: { from: 'hand', cardId: card.id },
  }));
  const top = pozoTop(me);
  if (top) sources.push({ card: top, source: { from: 'pozo' } });
  me.discards.forEach((pile, index) => {
    const card = pile[pile.length - 1];
    if (card) sources.push({ card, source: { from: 'discard', pile: index } });
  });

  for (const { card, source } of sources) {
    if (isAce(card)) {
      actions.push({ type: 'play', source, target: { to: 'newLadder' } });
      continue;
    }
    for (const ladder of state.ladders) {
      if (fitsLadder(card, ladder)) {
        actions.push({ type: 'play', source, target: { to: 'ladder', ladderId: ladder.id } });
      }
    }
  }

  if (!mustPlayAce(state, player)) {
    if (me.hand.length === 0) {
      actions.push({ type: 'pass' });
    } else {
      for (const card of me.hand) {
        for (let pile = 0; pile < me.discards.length; pile++) {
          actions.push({ type: 'endTurn', cardId: card.id, pile });
        }
      }
    }
  }
  return actions;
}
