import { shuffle } from './rng';
import { fitsLadder, isAce, KING, mustPlayAce, otherPlayer } from './rules';
import type {
  Action,
  ActionError,
  ActionResult,
  Card,
  GameEvent,
  GameState,
  Ladder,
  PlayerId,
  Rank,
  Source,
  Target,
} from './types';

/**
 * Única puerta de entrada para modificar una partida.
 * No muta el estado recibido: devuelve uno nuevo junto con los eventos ocurridos.
 */
export function applyAction(state: GameState, player: PlayerId, action: Action): ActionResult {
  if (state.status.kind !== 'playing') return { ok: false, error: 'GAME_FINISHED' };
  if (player !== state.currentPlayer) return { ok: false, error: 'NOT_YOUR_TURN' };

  const draft = structuredClone(state);
  const events: GameEvent[] = [];
  const error = dispatch(draft, action, events);
  if (error) return { ok: false, error };
  return { ok: true, state: draft, events };
}

function dispatch(draft: GameState, action: Action, events: GameEvent[]): ActionError | null {
  switch (action.type) {
    case 'play':
      return play(draft, action.source, action.target, events);
    case 'endTurn':
      return endTurn(draft, action.cardId, action.pile, events);
    case 'pass':
      return pass(draft, events);
  }
}

function play(draft: GameState, source: Source, target: Target, events: GameEvent[]): ActionError | null {
  const player = draft.currentPlayer;
  const me = draft.players[player];

  // 1. Ubicar la carta sin moverla todavía.
  let origin: Card[];
  let index: number;
  switch (source.from) {
    case 'hand':
      origin = me.hand;
      index = me.hand.findIndex((c) => c.id === source.cardId);
      break;
    case 'pozo':
      origin = me.pozo;
      index = me.pozo.length - 1;
      break;
    case 'discard': {
      const pile = me.discards[source.pile];
      if (!pile) return 'INVALID_PILE';
      origin = pile;
      index = pile.length - 1;
      break;
    }
  }
  const card = origin[index];
  if (!card) return 'CARD_NOT_AVAILABLE';

  // 2. Validar el destino.
  let ladder: Ladder;
  if (target.to === 'newLadder') {
    if (card.kind === 'joker') return 'JOKER_CANNOT_BE_ACE';
    if (!isAce(card)) return 'NEW_LADDER_REQUIRES_ACE';
    ladder = { id: `L${draft.nextLadderId++}`, cards: [] };
    draft.ladders.push(ladder);
    events.push({ type: 'ladderStarted', ladderId: ladder.id });
  } else {
    const found = draft.ladders.find((l) => l.id === target.ladderId);
    if (!found) return 'LADDER_NOT_FOUND';
    if (!fitsLadder(card, found)) return 'WRONG_RANK';
    ladder = found;
  }

  // 3. Mover la carta.
  origin.splice(index, 1);
  ladder.cards.push(card);
  draft.playsThisTurn++;
  events.push({
    type: 'cardPlayed',
    player,
    card,
    source,
    ladderId: ladder.id,
    rank: ladder.cards.length as Rank,
  });

  // 4. Escalera completa: se aparta para reciclar (antes de robar, así ya cuenta como reciclable).
  if (ladder.cards.length === KING) {
    draft.recycle.push(...ladder.cards);
    draft.ladders = draft.ladders.filter((l) => l.id !== ladder.id);
    events.push({ type: 'ladderCompleted', ladderId: ladder.id });
  }

  // 5. Pozo: victoria inmediata o revelar la siguiente.
  if (source.from === 'pozo') {
    const revealed = me.pozo[me.pozo.length - 1];
    if (!revealed) {
      draft.status = { kind: 'won', winner: player };
      events.push({ type: 'gameWon', winner: player });
      return null;
    }
    events.push({ type: 'pozoRevealed', player, card: revealed });
  }

  // 6. Mano vacía: roba una mano nueva y sigue jugando.
  if (me.hand.length === 0) drawCards(draft, player, draft.config.handSize, events);
  return null;
}

function endTurn(draft: GameState, cardId: string, pileIndex: number, events: GameEvent[]): ActionError | null {
  const player = draft.currentPlayer;
  const me = draft.players[player];
  const index = me.hand.findIndex((c) => c.id === cardId);
  if (index < 0) return 'CARD_NOT_AVAILABLE';
  const pile = me.discards[pileIndex];
  if (!pile) return 'INVALID_PILE';
  if (mustPlayAce(draft, player)) return 'ACE_MUST_BE_PLAYED';

  const [card] = me.hand.splice(index, 1);
  pile.push(card!);
  draft.idlePasses = 0;
  events.push({ type: 'cardDiscarded', player, card: card!, pile: pileIndex });
  startNextTurn(draft, events);
  return null;
}

/** R19 (provisional): sin cartas en la mano no se puede descartar, así que el turno pasa. */
function pass(draft: GameState, events: GameEvent[]): ActionError | null {
  const player = draft.currentPlayer;
  if (draft.players[player].hand.length > 0) return 'PASS_NOT_ALLOWED';
  if (mustPlayAce(draft, player)) return 'ACE_MUST_BE_PLAYED';

  draft.idlePasses = draft.playsThisTurn === 0 ? draft.idlePasses + 1 : 0;
  events.push({ type: 'turnPassed', player });
  if (draft.idlePasses >= 2) {
    draft.status = { kind: 'blocked' };
    events.push({ type: 'gameBlocked' });
    return null;
  }
  startNextTurn(draft, events);
  return null;
}

function startNextTurn(draft: GameState, events: GameEvent[]): void {
  const next = otherPlayer(draft.currentPlayer);
  draft.currentPlayer = next;
  draft.turnNumber++;
  draft.playsThisTurn = 0;
  events.push({ type: 'turnStarted', player: next, turnNumber: draft.turnNumber });
  const missing = draft.config.handSize - draft.players[next].hand.length;
  if (missing > 0) drawCards(draft, next, missing, events);
}

/** Roba hasta `count` cartas. Si el mazo se agota mezcla el reciclaje; si tampoco hay, roba lo que haya. */
function drawCards(draft: GameState, player: PlayerId, count: number, events: GameEvent[]): void {
  const drawn: Card[] = [];
  while (drawn.length < count) {
    if (draft.stock.length === 0) {
      if (draft.recycle.length === 0) break;
      const shuffled = shuffle(draft.recycle, draft.rngState);
      draft.stock = shuffled.items;
      draft.rngState = shuffled.state;
      draft.recycle = [];
      events.push({ type: 'stockReshuffled', count: draft.stock.length });
    }
    drawn.push(draft.stock.pop()!);
  }
  if (drawn.length === 0) return;
  draft.players[player].hand.push(...drawn);
  events.push({ type: 'cardsDrawn', player, count: drawn.length, cards: drawn });
}
