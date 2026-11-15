import { applyAction, createGame, getLegalActions, getPlayerView } from '@crape/engine';
import type { Action, GameState, PlayerId } from '@crape/engine';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { describeEvents } from './labels';

/** Tiempo para ver caer el descarte antes de tapar la mesa. */
const HANDOFF_DELAY_MS = 750;

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
 * Partida local de dos jugadores en un mismo dispositivo.
 * La mesa solo recibe la vista de quien está mirando (`viewer`), igual que en el futuro modo online.
 */
export function useLocalGame() {
  const [game, setGame] = useState<GameState | null>(null);
  const [names, setNames] = useState<[string, string]>(['Jugador 1', 'Jugador 2']);
  const [viewer, setViewer] = useState<PlayerId>(0);
  const [handoff, setHandoff] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<number>();

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const start = useCallback((playerNames: [string, string]) => {
    const seed = crypto.getRandomValues(new Uint32Array(1))[0]!;
    const fresh = createGame(seed);
    window.clearTimeout(timer.current);
    setNames(playerNames);
    setGame(fresh);
    setViewer(fresh.currentPlayer);
    setMessage(null);
    setHandoff(true);
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
        setMessage('Ese movimiento no es válido.');
        return;
      }
      withTransition(() => {
        setGame(result.state);
        setMessage(describeEvents(result.events));
      });
      if (result.state.status.kind === 'playing' && result.state.currentPlayer !== viewer) {
        timer.current = window.setTimeout(() => setHandoff(true), HANDOFF_DELAY_MS);
      }
    },
    [game, viewer],
  );

  /** El jugador entrante confirma que ya tiene el dispositivo. */
  const ready = useCallback(() => {
    if (!game) return;
    setViewer(game.currentPlayer);
    setMessage(null);
    setHandoff(false);
  }, [game]);

  const view = useMemo(() => (game ? getPlayerView(game, viewer) : null), [game, viewer]);
  const legal = useMemo(() => (game ? getLegalActions(game, viewer) : []), [game, viewer]);

  return { view, legal, names, handoff, message, start, quit, act, ready };
}
