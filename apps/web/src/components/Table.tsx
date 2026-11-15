import type { Action, Card, PlayerView, PublicPlayerView, Source } from '@crape/engine';
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { RANK_LABEL } from '../labels';
import { CardBack, CardView, clickable, EmptySlot } from './CardView';

type PlayAction = Extract<Action, { type: 'play' }>;

function sourceKey(source: Source): string {
  if (source.from === 'hand') return `hand:${source.cardId}`;
  if (source.from === 'discard') return `discard:${source.pile}`;
  return 'pozo';
}

interface TableProps {
  view: PlayerView;
  /** Acciones válidas para quien mira la mesa; vacío si no es su turno. */
  legal: Action[];
  names: [string, string];
  message: string | null;
  onAction: (action: Action) => void;
  onQuit: () => void;
}

export function Table({ view, legal, names, message, onAction, onQuit }: TableProps) {
  const [selected, setSelected] = useState<Source | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Cualquier cambio en la mesa invalida la selección anterior.
  useEffect(() => {
    setSelected(null);
    setNotice(null);
  }, [view]);

  const { playsBySource, pilesByCard } = useMemo(() => {
    const plays = new Map<string, PlayAction[]>();
    const piles = new Map<string, number[]>();
    for (const action of legal) {
      if (action.type === 'play') {
        const key = sourceKey(action.source);
        plays.set(key, [...(plays.get(key) ?? []), action]);
      } else if (action.type === 'endTurn') {
        piles.set(action.cardId, [...(piles.get(action.cardId) ?? []), action.pile]);
      }
    }
    return { playsBySource: plays, pilesByCard: piles };
  }, [legal]);

  const myTurn = view.status.kind === 'playing' && view.viewer === view.currentPlayer;
  const canPass = legal.some((a) => a.type === 'pass');
  const aceForced = myTurn && legal.length > 0 && legal.every((a) => a.type === 'play') && !canPass;

  const selectedKey = selected ? sourceKey(selected) : null;
  const selectedPlays = selectedKey ? (playsBySource.get(selectedKey) ?? []) : [];
  const ladderTargets = new Set(
    selectedPlays.flatMap((a) => (a.target.to === 'ladder' ? [a.target.ladderId] : [])),
  );
  const newLadderTarget = selectedPlays.some((a) => a.target.to === 'newLadder');
  const discardTargets = selected?.from === 'hand' ? (pilesByCard.get(selected.cardId) ?? []) : [];

  const hasMoves = (source: Source) =>
    playsBySource.has(sourceKey(source)) || (source.from === 'hand' && pilesByCard.has(source.cardId));

  function pick(source: Source) {
    if (!myTurn) return;
    if (selectedKey === sourceKey(source)) {
      setSelected(null);
      return;
    }
    if (!hasMoves(source)) {
      setSelected(null);
      setNotice(
        aceForced
          ? 'Tenés un As disponible: hay que jugarlo antes de hacer otra cosa con esa carta.'
          : 'Esa carta no tiene movimientos disponibles ahora.',
      );
      return;
    }
    setNotice(null);
    setSelected(source);
  }

  function playOn(target: PlayAction['target']) {
    if (!selected) return;
    onAction({ type: 'play', source: selected, target });
  }

  function clickMyPile(pile: number, top: Card | undefined) {
    if (selected?.from === 'hand' && discardTargets.includes(pile)) {
      onAction({ type: 'endTurn', cardId: selected.cardId, pile });
    } else if (top) {
      pick({ from: 'discard', pile });
    }
  }

  const opponentId = view.viewer === 0 ? 1 : 0;
  let status: string;
  if (!myTurn) status = view.status.kind === 'playing' ? `Turno de ${names[view.currentPlayer]}` : '';
  else if (notice) status = notice;
  else if (selected && selectedPlays.length > 0 && discardTargets.length > 0)
    status = 'Jugala en una escalera resaltada, o descartala en una de tus pilas para terminar el turno.';
  else if (selected && selectedPlays.length > 0) status = 'Elegí la escalera resaltada donde querés jugarla.';
  else if (selected) status = 'Elegí una de tus pilas de descarte: al descartar termina tu turno.';
  else if (message) status = message;
  else if (aceForced) status = 'Tenés un As disponible: es obligatorio jugarlo.';
  else if (canPass) status = 'No tenés cartas en la mano ni mazo para robar: jugá lo que puedas o pasá el turno.';
  else status = 'Seleccioná una carta y después su destino.';

  return (
    <main className="table">
      <Seat
        className="seat-opponent"
        name={names[opponentId]}
        active={view.status.kind === 'playing' && view.currentPlayer === opponentId}
        player={view.opponent}
      >
        <div className="opp-hand" aria-label={`${view.opponent.handCount} cartas en la mano`}>
          <div className="backs">
            {Array.from({ length: view.opponent.handCount }, (_, i) => (
              <CardBack key={i} />
            ))}
          </div>
          <span className="zone-label">Mano · {view.opponent.handCount}</span>
        </div>
      </Seat>

      <section className="center" aria-label="Centro de la mesa">
        <div className="stock">
          {view.stockCount > 0 ? <CardBack /> : <EmptySlot />}
          <span className="zone-label">Mazo · {view.stockCount}</span>
          <span className="zone-sub">Apartadas · {view.recycleCount}</span>
        </div>

        <div className="ladders">
          {view.ladders.map((ladder) => {
            const top = ladder.cards[ladder.cards.length - 1]!;
            const count = ladder.cards.length;
            const isTarget = ladderTargets.has(ladder.id);
            return (
              <div
                key={ladder.id}
                className={`ladder${isTarget ? ' target' : ''}`}
                {...clickable(
                  isTarget ? () => playOn({ to: 'ladder', ladderId: ladder.id }) : undefined,
                  `Jugar en la escalera que sigue con ${RANK_LABEL[count + 1]}`,
                )}
              >
                <CardView card={top} standsFor={top.kind === 'joker' ? count : undefined} />
                <span className="zone-label">Sigue {RANK_LABEL[count + 1]}</span>
                <span className="progress" aria-hidden="true">
                  <span style={{ width: `${(count / 13) * 100}%` }} />
                </span>
              </div>
            );
          })}
          <div
            className={`ladder new-ladder${newLadderTarget ? ' target' : ''}`}
            {...clickable(newLadderTarget ? () => playOn({ to: 'newLadder' }) : undefined, 'Iniciar una escalera nueva')}
          >
            <EmptySlot label="A" />
            <span className="zone-label">Nueva escalera</span>
          </div>
        </div>
      </section>

      <div className={`status${myTurn ? ' my-turn' : ''}`} role="status">
        <span className="status-text">{status}</span>
        {canPass ? (
          <button type="button" className="btn" onClick={() => onAction({ type: 'pass' })}>
            Pasar turno
          </button>
        ) : null}
        <button type="button" className="btn ghost" onClick={onQuit}>
          Salir
        </button>
      </div>

      <Seat
        className="seat-me"
        name={names[view.viewer]}
        active={myTurn}
        player={view.me}
        pozoSelected={selectedKey === 'pozo'}
        pozoPlayable={myTurn && playsBySource.has('pozo')}
        onPozoClick={myTurn ? () => pick({ from: 'pozo' }) : undefined}
        selectedPile={selected?.from === 'discard' ? selected.pile : null}
        targetPiles={discardTargets}
        playablePiles={view.me.discards.flatMap((_, i) => (playsBySource.has(`discard:${i}`) ? [i] : []))}
        onPileClick={myTurn ? clickMyPile : undefined}
      >
        <div className="hand">
          <div className="hand-cards">
            {view.hand.map((card) => {
              const source: Source = { from: 'hand', cardId: card.id };
              return (
                <CardView
                  key={card.id}
                  card={card}
                  selected={selectedKey === sourceKey(source)}
                  playable={myTurn && playsBySource.has(sourceKey(source))}
                  onClick={myTurn ? () => pick(source) : undefined}
                />
              );
            })}
            {view.hand.length === 0 ? <EmptySlot /> : null}
          </div>
          <span className="zone-label">Tu mano · {view.hand.length}</span>
        </div>
      </Seat>
    </main>
  );
}

interface SeatProps {
  className: string;
  name: string;
  active: boolean;
  player: PublicPlayerView;
  pozoSelected?: boolean;
  pozoPlayable?: boolean;
  onPozoClick?: () => void;
  selectedPile?: number | null;
  targetPiles?: number[];
  playablePiles?: number[];
  onPileClick?: (pile: number, top: Card | undefined) => void;
  children: React.ReactNode;
}

/** Zona de un jugador: pozo, tres pilas de descarte y (como children) su mano. */
function Seat({
  className,
  name,
  active,
  player,
  pozoSelected,
  pozoPlayable,
  onPozoClick,
  selectedPile = null,
  targetPiles = [],
  playablePiles = [],
  onPileClick,
  children,
}: SeatProps) {
  return (
    <section className={`seat ${className}${active ? ' active' : ''}`} aria-label={`Zona de ${name}`}>
      <header className="seat-title">
        <span className="name">{name}</span>
        {active ? <span className="turn-badge">En turno</span> : null}
      </header>
      <div className="seat-row">
        <div className="pozo">
          <div className={`pozo-stack depth-${Math.min(player.pozoCount, 4)}`}>
            {player.pozoTop ? (
              <CardView
                key={player.pozoTop.id}
                card={player.pozoTop}
                reveal
                selected={pozoSelected}
                playable={pozoPlayable}
                onClick={onPozoClick}
              />
            ) : (
              <EmptySlot />
            )}
            <span className="count-badge" aria-label={`${player.pozoCount} cartas en el pozo`}>
              {player.pozoCount}
            </span>
          </div>
          <span className="zone-label">Pozo</span>
        </div>

        <div className="piles">
          <div className="piles-row">
            {player.discards.map((pile, index) => {
              const top = pile[pile.length - 1];
              const isTarget = targetPiles.includes(index);
              const interactive = onPileClick && (isTarget || top);
              return (
                <div
                  key={index}
                  className={`pile${isTarget ? ' target' : ''}`}
                  style={{ '--n': pile.length } as CSSProperties}
                  {...clickable(
                    interactive ? () => onPileClick(index, top) : undefined,
                    isTarget ? `Descartar en la pila ${index + 1}` : `Pila de descarte ${index + 1}`,
                  )}
                >
                  {pile.length === 0 ? <EmptySlot /> : null}
                  {pile.map((card, i) => (
                    <CardView
                      key={card.id}
                      card={card}
                      selected={selectedPile === index && i === pile.length - 1}
                      playable={playablePiles.includes(index) && i === pile.length - 1}
                      style={{ '--i': i } as CSSProperties}
                    />
                  ))}
                </div>
              );
            })}
          </div>
          <span className="zone-label">Descartes</span>
        </div>

        {children}
      </div>
    </section>
  );
}
