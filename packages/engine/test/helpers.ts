import { applyAction, DEFAULT_CONFIG } from '../src';
import type { Action, Card, GameConfig, GameState, Ladder, PlayerId, PlayerState, Rank, Target } from '../src';

let counter = 0;

export const c = (rank: number): Card => ({
  id: `t${counter++}`,
  kind: 'standard',
  rank: rank as Rank,
  suit: 'spades',
});
export const joker = (): Card => ({ id: `t${counter++}`, kind: 'joker' });
export const cards = (...ranks: number[]): Card[] => ranks.map(c);

/** Escalera ya armada desde el As hasta `upTo`. */
export const ladderUpTo = (upTo: number, id = 'X1'): Ladder => ({
  id,
  cards: Array.from({ length: upTo }, (_, i) => c(i + 1)),
});

interface StateOptions {
  p0?: Partial<PlayerState>;
  p1?: Partial<PlayerState>;
  stock?: Card[];
  recycle?: Card[];
  ladders?: Ladder[];
  currentPlayer?: PlayerId;
  config?: Partial<GameConfig>;
}

/** Arma una partida a mano. Por defecto no hay Ases en ningún lado y el mazo tiene diez 9. */
export function makeState(options: StateOptions = {}): GameState {
  const player = (partial: Partial<PlayerState> = {}): PlayerState => ({
    pozo: cards(9, 9),
    hand: [],
    discards: [[], [], []],
    ...partial,
  });
  return {
    config: { ...DEFAULT_CONFIG, ...options.config },
    players: [player(options.p0), player(options.p1)],
    stock: options.stock ?? cards(9, 9, 9, 9, 9, 9, 9, 9, 9, 9),
    recycle: options.recycle ?? [],
    ladders: options.ladders ?? [],
    currentPlayer: options.currentPlayer ?? 0,
    turnNumber: 1,
    playsThisTurn: 0,
    idlePasses: 0,
    status: { kind: 'playing' },
    rngState: 1,
    nextLadderId: 1,
  };
}

const target = (ladderId?: string): Target => (ladderId ? { to: 'ladder', ladderId } : { to: 'newLadder' });

/** Sin `ladderId` la jugada intenta iniciar una escalera nueva. */
export const fromHand = (card: Card, ladderId?: string): Action => ({
  type: 'play',
  source: { from: 'hand', cardId: card.id },
  target: target(ladderId),
});
export const fromPozo = (ladderId?: string): Action => ({
  type: 'play',
  source: { from: 'pozo' },
  target: target(ladderId),
});
export const fromDiscard = (pile: number, ladderId?: string): Action => ({
  type: 'play',
  source: { from: 'discard', pile },
  target: target(ladderId),
});
export const discard = (card: Card, pile = 0): Action => ({ type: 'endTurn', cardId: card.id, pile });

/** Aplica una acción que debe ser válida. */
export function act(state: GameState, player: PlayerId, action: Action) {
  const result = applyAction(state, player, action);
  if (!result.ok) throw new Error(`Acción rechazada: ${result.error}`);
  return result;
}

/** Devuelve el código de error, o null si la acción fue aceptada. */
export function errorOf(state: GameState, player: PlayerId, action: Action) {
  const result = applyAction(state, player, action);
  return result.ok ? null : result.error;
}

export function allCards(state: GameState): Card[] {
  return [
    ...state.stock,
    ...state.recycle,
    ...state.ladders.flatMap((l) => l.cards),
    ...state.players.flatMap((p) => [...p.pozo, ...p.hand, ...p.discards.flat()]),
  ];
}

/** Lanza un error si el estado viola algún invariante del juego. */
export function checkInvariants(state: GameState, totalCards: number): void {
  const all = allCards(state);
  if (all.length !== totalCards) throw new Error(`Hay ${all.length} cartas, se esperaban ${totalCards}`);
  if (new Set(all.map((x) => x.id)).size !== all.length) throw new Error('Hay cartas duplicadas');

  for (const p of state.players) {
    if (p.hand.length > state.config.handSize) throw new Error('Mano con más cartas de las permitidas');
    if (p.discards.length !== state.config.discardPileCount) throw new Error('Cantidad de pilas incorrecta');
    if (state.config.mandatoryAces && p.discards.flat().some((x) => x.kind === 'standard' && x.rank === 1)) {
      throw new Error('Hay un As en una pila de descarte');
    }
    if (state.status.kind === 'playing' && p.pozo.length === 0) throw new Error('Pozo vacío sin ganador');
  }
  for (const ladder of state.ladders) {
    if (ladder.cards.length === 0 || ladder.cards.length >= 13) throw new Error('Escalera de largo inválido');
    ladder.cards.forEach((card, i) => {
      if (card.kind === 'joker' ? i === 0 : card.rank !== i + 1) throw new Error('Escalera fuera de secuencia');
    });
  }
}
