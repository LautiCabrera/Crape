/** 1 = As, 11 = J, 12 = Q, 13 = K. */
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

export interface StandardCard {
  id: string;
  kind: 'standard';
  rank: Rank;
  suit: Suit;
}

export interface JokerCard {
  id: string;
  kind: 'joker';
}

export type Card = StandardCard | JokerCard;
export type PlayerId = 0 | 1;

/** Escalera central. El valor que acepta a continuación es `cards.length + 1`. */
export interface Ladder {
  id: string;
  cards: Card[];
}

export interface PlayerState {
  /** El último elemento es la carta visible. */
  pozo: Card[];
  hand: Card[];
  /** Pilas de descarte; el último elemento de cada una es el tope jugable. */
  discards: Card[][];
}

export type StarterRule = 'highestPozo' | 'random';

export interface GameConfig {
  deckCount: number;
  jokersPerDeck: number;
  pozoSize: number;
  handSize: number;
  discardPileCount: number;
  /** R5 (provisional): cómo se decide quién empieza. */
  starterRule: StarterRule;
  /** R13 (provisional): no se puede terminar el turno con un As en mano o en el pozo. */
  mandatoryAces: boolean;
}

export type GameStatus =
  | { kind: 'playing' }
  | { kind: 'won'; winner: PlayerId }
  /** Solo por R19: mazo agotado y ningún jugador puede avanzar. */
  | { kind: 'blocked' };

export interface GameState {
  config: GameConfig;
  players: [PlayerState, PlayerState];
  /** Mazo de robo; se roba desde el final. */
  stock: Card[];
  /** Escaleras completas apartadas; se mezclan cuando el mazo se agota. */
  recycle: Card[];
  ladders: Ladder[];
  currentPlayer: PlayerId;
  turnNumber: number;
  /** Cartas jugadas en escaleras durante el turno actual. */
  playsThisTurn: number;
  /** Turnos consecutivos pasados sin jugar ninguna carta (R19). */
  idlePasses: number;
  status: GameStatus;
  rngState: number;
  nextLadderId: number;
}

export type Source =
  | { from: 'hand'; cardId: string }
  | { from: 'pozo' }
  | { from: 'discard'; pile: number };

export type Target = { to: 'ladder'; ladderId: string } | { to: 'newLadder' };

export type Action =
  | { type: 'play'; source: Source; target: Target }
  | { type: 'endTurn'; cardId: string; pile: number }
  /** Solo válido sin cartas en la mano (R19). */
  | { type: 'pass' };

export type ActionError =
  | 'GAME_FINISHED'
  | 'NOT_YOUR_TURN'
  | 'CARD_NOT_AVAILABLE'
  | 'INVALID_PILE'
  | 'LADDER_NOT_FOUND'
  | 'NEW_LADDER_REQUIRES_ACE'
  | 'JOKER_CANNOT_BE_ACE'
  | 'WRONG_RANK'
  | 'ACE_MUST_BE_PLAYED'
  | 'PASS_NOT_ALLOWED';

export type GameEvent =
  | { type: 'ladderStarted'; ladderId: string }
  | { type: 'cardPlayed'; player: PlayerId; card: Card; source: Source; ladderId: string; rank: Rank }
  | { type: 'pozoRevealed'; player: PlayerId; card: Card }
  | { type: 'ladderCompleted'; ladderId: string }
  | { type: 'stockReshuffled'; count: number }
  /** `cards` es null cuando el evento fue redactado para el rival. */
  | { type: 'cardsDrawn'; player: PlayerId; count: number; cards: Card[] | null }
  | { type: 'cardDiscarded'; player: PlayerId; card: Card; pile: number }
  | { type: 'turnPassed'; player: PlayerId }
  | { type: 'turnStarted'; player: PlayerId; turnNumber: number }
  | { type: 'gameWon'; winner: PlayerId }
  | { type: 'gameBlocked' };

export type ActionResult =
  | { ok: true; state: GameState; events: GameEvent[] }
  | { ok: false; error: ActionError };
