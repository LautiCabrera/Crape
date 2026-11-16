import { useState } from 'react';
import type { FormEvent } from 'react';
import { Segmented } from './components/Segmented';
import { SettingsPanel } from './components/SettingsPanel';
import { Table } from './components/Table';
import { useT } from './i18n';
import { useSettings } from './settings';
import { useLocalGame } from './useLocalGame';
import type { GameMode } from './useLocalGame';

export function App() {
  const t = useT();
  const { settings } = useSettings();
  const game = useLocalGame(settings.botSpeed);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { view, names, mode } = game;

  const settingsPanel = settingsOpen ? <SettingsPanel onClose={() => setSettingsOpen(false)} /> : null;

  if (!view) {
    return (
      <>
        <StartScreen
          onOpenSettings={() => setSettingsOpen(true)}
          onStart={(gameMode, playerNames) => {
            game.start(gameMode, playerNames, settings.difficulty);
          }}
        />
        {settingsPanel}
      </>
    );
  }

  const isFirstTurn = view.turnNumber === 1;
  const status = view.status;
  return (
    <>
      <Table
        view={view}
        legal={game.legal}
        names={names}
        message={game.message}
        help={settings.help}
        confirmDiscard={settings.confirmDiscard}
        onAction={game.act}
        onOpenSettings={() => setSettingsOpen(true)}
        onQuit={game.quit}
      />

      {game.handoff && status.kind === 'playing' ? (
        <div className="overlay opaque" role="dialog" aria-modal="true">
          <div className="panel">
            <p className="eyebrow">{isFirstTurn ? t.handoff.gameStarts : t.handoff.turnChange}</p>
            <h2>{t.status.turnOf(names[view.currentPlayer])}</h2>
            <p>{isFirstTurn ? t.handoff.starterRule : t.handoff.passDevice}</p>
            <button type="button" className="btn primary" autoFocus onClick={game.ready}>
              {t.handoff.iAm(names[view.currentPlayer])}
            </button>
          </div>
        </div>
      ) : null}

      {status.kind !== 'playing' ? (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="panel">
            <p className="eyebrow">{t.end.over}</p>
            {status.kind === 'won' ? (
              <>
                <h2>
                  {mode === 'bot' && status.winner === view.viewer ? t.end.youWon : t.end.won(names[status.winner])}
                </h2>
                <p>{t.end.emptiedIn(view.turnNumber)}</p>
              </>
            ) : (
              <>
                <h2>{t.end.blocked}</h2>
                <p>{t.end.blockedText}</p>
              </>
            )}
            <div className="panel-actions">
              <button
                type="button"
                className="btn primary"
                autoFocus
                onClick={() => game.start(mode, names, game.level)}
              >
                {t.end.again}
              </button>
              <button type="button" className="btn" onClick={game.quit}>
                {t.end.home}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {settingsPanel}
    </>
  );
}

interface StartScreenProps {
  onStart: (mode: GameMode, names: [string, string]) => void;
  onOpenSettings: () => void;
}

function StartScreen({ onStart, onOpenSettings }: StartScreenProps) {
  const t = useT();
  const { settings, update } = useSettings();
  const [mode, setMode] = useState<GameMode>('bot');
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');

  function submit(event: FormEvent) {
    event.preventDefault();
    if (mode === 'bot') onStart('bot', [first.trim() || t.you, t.botName]);
    else onStart('hotseat', [first.trim() || t.player1, second.trim() || t.player2]);
  }

  return (
    <main className="start">
      <form className="panel" onSubmit={submit}>
        <button type="button" className="btn ghost icon corner-button" aria-label={t.settings.title} onClick={onOpenSettings}>
          ⚙
        </button>
        <h1>Crape</h1>
        <p>{t.tagline}</p>

        <Segmented
          label={t.mode.label}
          value={mode}
          options={[
            { value: 'bot', label: t.mode.bot },
            { value: 'hotseat', label: t.mode.hotseat },
          ]}
          onChange={setMode}
        />

        {mode === 'bot' ? (
          <>
            <span className="field-label">{t.difficulty.label}</span>
            <Segmented
              label={t.difficulty.label}
              value={settings.difficulty}
              options={[
                { value: 'easy', label: t.difficulty.easy },
                { value: 'normal', label: t.difficulty.normal },
                { value: 'hard', label: t.difficulty.hard },
              ]}
              onChange={(difficulty) => update({ difficulty })}
            />
          </>
        ) : null}

        <label>
          {mode === 'bot' ? t.yourName : t.player1}
          <input
            value={first}
            maxLength={20}
            placeholder={mode === 'bot' ? t.you : t.player1}
            onChange={(e) => setFirst(e.target.value)}
          />
        </label>
        {mode === 'hotseat' ? (
          <label>
            {t.player2}
            <input value={second} maxLength={20} placeholder={t.player2} onChange={(e) => setSecond(e.target.value)} />
          </label>
        ) : null}
        <button type="submit" className="btn primary">
          {t.newGame}
        </button>
      </form>
    </main>
  );
}
