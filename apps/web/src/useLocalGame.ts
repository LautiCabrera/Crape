import { applyAction, BOTS, createGame, getLegalActions, getPlayerView } from '@crape/engine';
import type { Action, BotLevel, GameState, PlayerId } from '@crape/engine';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { summarizeEvents } from './labels';
import type { TableMessage } from './labels';
import type { BotSpeed } from './settings';

/** `bot`: una persona contra un bot. `hotseat`: dos personas en el mismo dispositivo. */
export type GameMode = 'bot' | 'hotseat';

const HUMAN: PlayerId = 0;
const BOT: PlayerId = 1;

/** Tiempo para ver caer el descarte antes de tapar la mesa. */
const HANDOFF_DELAY_MS = 750;

/** Pausa antes de la primera jugada del bot en su turno, y entre las siguientes. */
const BOT_DELAYS_MS: Record<BotSpeed, { first: number; next: number }> = {
  slow: { first: 1400, next: 1100 },
  normal: { first: 900, next: 650 },
  fast: { first: 450, next: 280 },
};

/**
 * Aplica un cambio de estado animando el movimiento de las cartas con la View Transitions API.
 * Donde no está disponible (o el usuario pidió menos movimiento) el cambio es inmediato.
 */
function withTransition(update: () => void): void {
  type Transition = { ready: Promise<void>; finished: Promise<void> };
  const doc = document as Document & { startViewTransition?: (callback: () => void) => Transition };
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (doc.startViewTransition && !reduced) {
    const transition = doc.startViewTransition(() => flushSync(update));
    // Si el jugador mueve otra carta antes de que termine, la animación anterior se cancela: no es un error.
    transition.ready.catch(() => {});
    transition.finished.catch(() => {});
  } else {
    update();
  }
}

/**
 * Partida local. La mesa solo recibe la vista de quien está mirando (`viewer`),
 * igual que en el futuro modo online.
 */
export function useLocalGame(botSpeed: BotSpeed) {
  const [game, setGame] = useState<GameState | null>(null);
  const [mode, setMode] = useState<GameMode>('bot');
  const [level, setLevel] = useState<BotLevel>('normal');
  const [names, setNames] = useState<[string, string]>(['', '']);
  const [viewer, setViewer] = useState<PlayerId>(0);
  const [handoff, setHandoff] = useState(false);
  const [message, setMessage] = useState<TableMessage | null>(null);
  const timer = useRef<number>();

  useEffect(() => () => window.clearTimeout(timer.current), []);

  /** La dificultad se fija acá y no cambia durante la partida. */
  const start = useCallback((gameMode: GameMode, playerNames: [string, string], botLevel: BotLevel) => {
    const seed = crypto.getRandomValues(new Uint32Array(1))[0]!;
    const fresh = createGame(seed);
    window.clearTimeout(timer.current);
    setMode(gameMode);
    setLevel(botLevel);
    setNames(playerNames);
    setGame(fresh);
    setMessage(null);
    if (gameMode === 'bot') {
      setViewer(HUMAN);
      setHandoff(false);
    } else {
      setViewer(fresh.currentPlayer);
      setHandoff(true);
    }
  }, []);

  const quit = useCallback(() => {
    window.clearTimeout(timer.current);
    setGame(null);
    setHandoff(false);
  }, []);

  const act = useCallback(
    (action: Action) => {
      if (!game) return;
      const result = applyAction(game, viewer, action);
      if (!result.ok) {
        setMessage('invalid');
        return;
      }
      withTransition(() => {
        setGame(result.state);
        setMessage(summarizeEvents(result.events));
      });
      const turnChanged = result.state.status.kind === 'playing' && result.state.currentPlayer !== viewer;
      if (mode === 'hotseat' && turnChanged) {
        timer.current = window.setTimeout(() => setHandoff(true), HANDOFF_DELAY_MS);
      }
    },
    [game, viewer, mode],
  );

  // Turno del bot: una jugada por vez, con una pausa entre cada una.
  useEffect(() => {
    if (!game || mode !== 'bot' || game.status.kind !== 'playing' || game.currentPlayer !== BOT) return;
    const delays = BOT_DELAYS_MS[botSpeed];
    const id = window.setTimeout(
      () => {
        const result = applyAction(game, BOT, BOTS[level](game, BOT, Math.random));
        if (!result.ok) return;
        withTransition(() => {
          setGame(result.state);
          setMessage(summarizeEvents(result.events));
        });
      },
      game.playsThisTurn === 0 ? delays.first : delays.next,
    );
    return () => window.clearTimeout(id);
  }, [game, mode, level, botSpeed]);

  /** En modo de dos jugadores, el entrante confirma que ya tiene el dispositivo. */
  const ready = useCallback(() => {
    if (!game) return;
    setViewer(game.currentPlayer);
    setMessage(null);
    setHandoff(false);
  }, [game]);

  const view = useMemo(() => (game ? getPlayerView(game, viewer) : null), [game, viewer]);
  const legal = useMemo(() => (game ? getLegalActions(game, viewer) : []), [game, viewer]);

  return { view, legal, mode, level, names, handoff, message, start, quit, act, ready };
}
