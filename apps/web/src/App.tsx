import { useState } from 'react';
import type { FormEvent } from 'react';
import { Table } from './components/Table';
import { useLocalGame } from './useLocalGame';

export function App() {
  const game = useLocalGame();
  const { view, names } = game;

  if (!view) return <StartScreen initialNames={names} onStart={game.start} />;

  const isFirstTurn = view.turnNumber === 1;
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

      {game.handoff && view.status.kind === 'playing' ? (
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

      {view.status.kind !== 'playing' ? (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="panel">
            {view.status.kind === 'won' ? (
              <>
                <p className="eyebrow">Partida terminada</p>
                <h2>¡Ganó {names[view.status.winner]}!</h2>
                <p>Vació su pozo en {view.turnNumber} turnos.</p>
              </>
            ) : (
              <>
                <p className="eyebrow">Partida terminada</p>
                <h2>Partida bloqueada</h2>
                <p>Se agotó el mazo y ningún jugador puede seguir. No hay ganador.</p>
              </>
            )}
            <div className="panel-actions">
              <button type="button" className="btn primary" autoFocus onClick={() => game.start(names)}>
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

interface StartScreenProps {
  initialNames: [string, string];
  onStart: (names: [string, string]) => void;
}

function StartScreen({ initialNames, onStart }: StartScreenProps) {
  const [first, setFirst] = useState(initialNames[0]);
  const [second, setSecond] = useState(initialNames[1]);

  function submit(event: FormEvent) {
    event.preventDefault();
    onStart([first.trim() || 'Jugador 1', second.trim() || 'Jugador 2']);
  }

  return (
    <main className="start">
      <form className="panel" onSubmit={submit}>
        <h1>Crape</h1>
        <p>Dos jugadores, un dispositivo. Gana quien vacía primero su pozo de 11 cartas.</p>
        <label>
          Jugador 1
          <input value={first} maxLength={20} onChange={(e) => setFirst(e.target.value)} />
        </label>
        <label>
          Jugador 2
          <input value={second} maxLength={20} onChange={(e) => setSecond(e.target.value)} />
        </label>
        <button type="submit" className="btn primary">
          Nueva partida
        </button>
      </form>
    </main>
  );
}
