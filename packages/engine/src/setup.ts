import { nextRandom, shuffle } from './rng';
import { DEFAULT_CONFIG, pozoTop } from './rules';
import type { Card, GameConfig, GameState, PlayerId, PlayerState, Rank, Suit } from './types';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

/** Genera todas las cartas, sin mezclar. Cada carta tiene un id único. */
export function buildDeck(config: GameConfig): Card[] {
  const cards: Card[] = [];
  for (let deck = 0; deck < config.deckCount; deck++) {
    for (const suit of SUITS) {
      for (let rank = 1; rank <= 13; rank++) {
        cards.push({ id: `d${deck}-${suit}-${rank}`, kind: 'standard', rank: rank as Rank, suit });
      }
    }
    for (let j = 0; j < config.jokersPerDeck; j++) {
      cards.push({ id: `d${deck}-joker-${j}`, kind: 'joker' });
    }
  }
  return cards;
}

/** Valor de una carta para decidir quién empieza. Provisional (R5): el comodín es la más alta. */
function starterValue(card: Card | undefined): number {
  if (!card) return 0;
  return card.kind === 'joker' ? 14 : card.rank;
}

export function createGame(seed: number, overrides: Partial<GameConfig> = {}): GameState {
  const config: GameConfig = { ...DEFAULT_CONFIG, ...overrides };
  const deck = buildDeck(config);
  const needed = 2 * (config.pozoSize + config.handSize);
  if (deck.length < needed) {
    throw new Error(`La configuración necesita al menos ${needed} cartas y el mazo tiene ${deck.length}.`);
  }

  const shuffled = shuffle(deck, seed >>> 0);
  const stock = shuffled.items;
  let rngState = shuffled.state;

  const deal = (count: number): Card[] => stock.splice(stock.length - count, count);
  const makePlayer = (): PlayerState => ({
    pozo: deal(config.pozoSize),
    hand: [],
    discards: Array.from({ length: config.discardPileCount }, () => []),
  });
  const players: [PlayerState, PlayerState] = [makePlayer(), makePlayer()];
  for (const player of players) player.hand = deal(config.handSize);

  let starter: PlayerId;
  const a = starterValue(pozoTop(players[0]));
  const b = starterValue(pozoTop(players[1]));
  if (config.starterRule === 'highestPozo' && a !== b) {
    starter = a > b ? 0 : 1;
  } else {
    const r = nextRandom(rngState);
    rngState = r.state;
    starter = r.value < 0.5 ? 0 : 1;
  }

  return {
    config,
    players,
    stock,
    recycle: [],
    ladders: [],
    currentPlayer: starter,
    turnNumber: 1,
    playsThisTurn: 0,
    idlePasses: 0,
    status: { kind: 'playing' },
    rngState,
    nextLadderId: 1,
  };
}
