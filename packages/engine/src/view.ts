import { otherPlayer, pozoTop } from './rules';
import type { Card, GameConfig, GameEvent, GameState, GameStatus, Ladder, PlayerId } from './types';

/** Lo que cualquiera puede ver de un jugador sentado a la mesa. */
export interface PublicPlayerView {
  pozoTop: Card | null;
  pozoCount: number;
  handCount: number;
  discards: Card[][];
}

/**
 * Estado tal como lo ve un jugador. Es lo único que debe salir del servidor en el modo online:
 * no incluye la mano del rival, las cartas ocultas de ningún pozo ni el orden del mazo.
 */
export interface PlayerView {
  viewer: PlayerId;
  config: GameConfig;
  status: GameStatus;
  currentPlayer: PlayerId;
  turnNumber: number;
  stockCount: number;
  recycleCount: number;
  ladders: Ladder[];
  hand: Card[];
  me: PublicPlayerView;
  opponent: PublicPlayerView;
}

function publicView(state: GameState, player: PlayerId): PublicPlayerView {
  const p = state.players[player];
  return {
    pozoTop: pozoTop(p) ?? null,
    pozoCount: p.pozo.length,
    handCount: p.hand.length,
    discards: p.discards,
  };
}

export function getPlayerView(state: GameState, viewer: PlayerId): PlayerView {
  return structuredClone({
    viewer,
    config: state.config,
    status: state.status,
    currentPlayer: state.currentPlayer,
    turnNumber: state.turnNumber,
    stockCount: state.stock.length,
    recycleCount: state.recycle.length,
    ladders: state.ladders,
    hand: state.players[viewer].hand,
    me: publicView(state, viewer),
    opponent: publicView(state, otherPlayer(viewer)),
  });
}

/** Oculta las cartas robadas por el rival antes de enviarle un evento a un jugador. */
export function redactEvent(event: GameEvent, viewer: PlayerId): GameEvent {
  if (event.type === 'cardsDrawn' && event.player !== viewer) {
    return { ...event, cards: null };
  }
  return event;
}
