import { useState } from 'react';
import type { FormEvent } from 'react';
import { Table } from './components/Table';
import { useLocalGame } from './useLocalGame';
import type { GameMode } from './useLocalGame';

const CPU_NAME = 'Bot';

export function App() {
  const game = useLocalGame();
  const { view, names, mode } = game;

  if (!view) return <StartScreen onStart={game.start} />;

  const isFirstTurn = view.turnNumber === 1;
  const status = view.status;
  return (
    <>
      <Table
        view={view}
        legal={game.legal}
        names={names}
        message={game.message}
        onAction={game.act}
        onQuit={game.quit}
      />

      {game.handoff && status.kind === 'playing' ? (
        <div className="overlay opaque" role="dialog" aria-modal="true">
          <div className="panel">
            <p className="eyebrow">{isFirstTurn ? 'Empieza la partida' : 'Cambio de turno'}</p>
            <h2>Turno de {names[view.currentPlayer]}</h2>
            <p>
              {isFirstTurn
                ? 'Empieza quien tiene la carta visible del pozo más alta; si empatan, se sortea.'
                : 'Pasale el dispositivo. Su mano se muestra recién al continuar.'}
            </p>
            <button type="button" className="btn primary" autoFocus onClick={game.ready}>
              Soy {names[view.currentPlayer]}, continuar
            </button>
          </div>
        </div>
      ) : null}

      {status.kind !== 'playing' ? (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="panel">
            <p className="eyebrow">Partida terminada</p>
            {status.kind === 'won' ? (
              <>
                <h2>
                  {mode === 'cpu' && status.winner === view.viewer ? '¡Ganaste!' : `¡Ganó ${names[status.winner]}!`}
                </h2>
                <p>El pozo quedó vacío en {view.turnNumber} turnos.</p>
              </>
            ) : (
              <>
                <h2>Partida bloqueada</h2>
                <p>Se agotó el mazo y ningún jugador puede seguir. No hay ganador.</p>
              </>
            )}
            <div className="panel-actions">
              <button type="button" className="btn primary" autoFocus onClick={() => game.start(mode, names)}>
                Jugar otra
              </button>
              <button type="button" className="btn" onClick={game.quit}>
                Volver al inicio
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function StartScreen({ onStart }: { onStart: (mode: GameMode, names: [string, string]) => void }) {
  const [mode, setMode] = useState<GameMode>('cpu');
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');

  function submit(event: FormEvent) {
    event.preventDefault();
    if (mode === 'cpu') onStart('cpu', [first.trim() || 'Vos', CPU_NAME]);
    else onStart('hotseat', [first.trim() || 'Jugador 1', second.trim() || 'Jugador 2']);
  }

  return (
    <main className="start">
      <form className="panel" onSubmit={submit}>
        <h1>Crape</h1>
        <p>Gana quien vacía primero su pozo de 11 cartas.</p>

        <div className="mode-switch" role="radiogroup" aria-label="Modo de juego">
          <button type="button" role="radio" aria-checked={mode === 'cpu'} onClick={() => setMode('cpu')}>
            Contra un bot
          </button>
          <button type="button" role="radio" aria-checked={mode === 'hotseat'} onClick={() => setMode('hotseat')}>
            Dos jugadores
          </button>
        </div>

        <label>
          {mode === 'cpu' ? 'Tu nombre' : 'Jugador 1'}
          <input
            value={first}
            maxLength={20}
            placeholder={mode === 'cpu' ? 'Vos' : 'Jugador 1'}
            onChange={(e) => setFirst(e.target.value)}
          />
        </label>
        {mode === 'hotseat' ? (
          <label>
            Jugador 2
            <input value={second} maxLength={20} placeholder="Jugador 2" onChange={(e) => setSecond(e.target.value)} />
          </label>
        ) : null}
        <button type="submit" className="btn primary">
          Nueva partida
        </button>
      </form>
    </main>
  );
}
