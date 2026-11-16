import type { Action, PlayerView, PublicPlayerView, Source } from '@crape/engine';
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useT } from '../i18n';
import { RANK_LABEL } from '../labels';
import type { TableMessage } from '../labels';
import type { HelpLevel } from '../settings';
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
  message: TableMessage | null;
  help: HelpLevel;
  confirmDiscard: boolean;
  onAction: (action: Action) => void;
  onOpenSettings: () => void;
  onQuit: () => void;
}

export function Table({
  view,
  legal,
  names,
  message,
  help,
  confirmDiscard,
  onAction,
  onOpenSettings,
  onQuit,
}: TableProps) {
  const t = useT();
  const [selected, setSelected] = useState<Source | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** Pila elegida para descartar que todavía espera el segundo toque. */
  const [pendingPile, setPendingPile] = useState<number | null>(null);

  // Cualquier cambio en la mesa invalida la selección anterior.
  useEffect(() => {
    setSelected(null);
    setNotice(null);
    setPendingPile(null);
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

  /** Con la ayuda completa se marcan las cartas jugables; sin ayuda tampoco se resaltan destinos. */
  const marksPlayable = help === 'full';
  const marksTargets = help !== 'none';

  const myTurn = view.status.kind === 'playing' && view.viewer === view.currentPlayer;
  const canPass = legal.some((a) => a.type === 'pass');
  const aceForced = myTurn && legal.length > 0 && legal.every((a) => a.type === 'play');

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
    setPendingPile(null);
    if (selectedKey === sourceKey(source)) {
      setSelected(null);
      return;
    }
    // Sin ayuda cualquier carta se puede seleccionar: avisar que no tiene jugadas sería una pista.
    if (marksTargets && !hasMoves(source)) {
      setSelected(null);
      setNotice(aceForced ? t.status.aceFirst : t.status.noMoves);
      return;
    }
    setNotice(null);
    setSelected(source);
  }

  function playOn(target: PlayAction['target'], isLegal: boolean) {
    if (!selected) return;
    if (!isLegal) {
      setNotice(t.status.invalid);
      return;
    }
    onAction({ type: 'play', source: selected, target });
  }

  function clickMyPile(pile: number, hasCards: boolean) {
    if (selected?.from === 'hand') {
      if (discardTargets.includes(pile)) {
        if (confirmDiscard && pendingPile !== pile) {
          setNotice(null);
          setPendingPile(pile);
        } else {
          onAction({ type: 'endTurn', cardId: selected.cardId, pile });
        }
        return;
      }
      if (!marksTargets) {
        setNotice(aceForced ? t.status.aceForced : t.status.invalid);
        return;
      }
    }
    if (hasCards) pick({ from: 'discard', pile });
  }

  /** Un destino se puede tocar si está resaltado o, sin ayuda, siempre que haya una carta elegida. */
  const targetClick = (isLegal: boolean, target: PlayAction['target']) =>
    myTurn && selected && (isLegal || !marksTargets) ? () => playOn(target, isLegal) : undefined;

  const opponentId = view.viewer === 0 ? 1 : 0;
  let status: string;
  if (!myTurn) status = view.status.kind === 'playing' ? t.status.turnOf(names[view.currentPlayer]) : '';
  else if (notice) status = notice;
  else if (pendingPile !== null) status = t.status.confirmDiscard;
  else if (selected && !marksTargets) status = t.status.chooseDestination;
  else if (selected && selectedPlays.length > 0 && discardTargets.length > 0) status = t.status.playOrDiscard;
  else if (selected && selectedPlays.length > 0) status = t.status.chooseLadder;
  else if (selected) status = t.status.choosePile;
  else if (message) status = message === 'invalid' ? t.status.invalid : t.events[message];
  else if (aceForced) status = t.status.aceForced;
  else if (canPass) status = t.status.canPass;
  else status = t.status.start;

  return (
    <main className="table">
      <Seat
        className="seat-opponent"
        name={names[opponentId]}
        active={view.status.kind === 'playing' && view.currentPlayer === opponentId}
        player={view.opponent}
      >
        <div className="opp-hand" aria-label={t.table.cardsInHand(view.opponent.handCount)}>
          <div className="backs">
            {Array.from({ length: view.opponent.handCount }, (_, i) => (
              <CardBack key={i} />
            ))}
          </div>
          <span className="zone-label">{t.table.hand(view.opponent.handCount)}</span>
        </div>
      </Seat>

      <section className="center" aria-label={t.table.center}>
        <div className="stock">
          {view.stockCount > 0 ? <CardBack /> : <EmptySlot />}
          <span className="zone-label">{t.table.stock(view.stockCount)}</span>
          <span className="zone-sub">{t.table.setAside(view.recycleCount)}</span>
        </div>

        <div className="ladders">
          {view.ladders.map((ladder) => {
            const top = ladder.cards[ladder.cards.length - 1]!;
            const count = ladder.cards.length;
            const isLegal = ladderTargets.has(ladder.id);
            const next = RANK_LABEL[count + 1]!;
            return (
              <div
                key={ladder.id}
                className={`ladder${marksTargets && isLegal ? ' target' : ''}`}
                {...clickable(
                  targetClick(isLegal, { to: 'ladder', ladderId: ladder.id }),
                  t.table.playOnLadder(next),
                )}
              >
                <CardView card={top} standsFor={top.kind === 'joker' ? count : undefined} />
                <span className="zone-label">{t.table.next(next)}</span>
                <span className="progress" aria-hidden="true">
                  <span style={{ width: `${(count / 13) * 100}%` }} />
                </span>
              </div>
            );
          })}
          <div
            className={`ladder new-ladder${marksTargets && newLadderTarget ? ' target' : ''}`}
            {...clickable(targetClick(newLadderTarget, { to: 'newLadder' }), t.table.startLadder)}
          >
            <EmptySlot label="A" />
            <span className="zone-label">{t.table.newLadder}</span>
          </div>
        </div>
      </section>

      <div className={`status${myTurn ? ' my-turn' : ''}`} role="status">
        <span className="status-text">{status}</span>
        {canPass ? (
          <button type="button" className="btn" onClick={() => onAction({ type: 'pass' })}>
            {t.table.pass}
          </button>
        ) : null}
        <button type="button" className="btn ghost icon" aria-label={t.settings.title} onClick={onOpenSettings}>
          ⚙
        </button>
        <button type="button" className="btn ghost" onClick={onQuit}>
          {t.table.quit}
        </button>
      </div>

      <Seat
        className="seat-me"
        name={names[view.viewer]}
        active={myTurn}
        player={view.me}
        pozoSelected={selectedKey === 'pozo'}
        pozoPlayable={marksPlayable && myTurn && playsBySource.has('pozo')}
        onPozoClick={myTurn ? () => pick({ from: 'pozo' }) : undefined}
        selectedPile={selected?.from === 'discard' ? selected.pile : null}
        pendingPile={pendingPile}
        targetPiles={marksTargets ? discardTargets : []}
        playablePiles={
          marksPlayable ? view.me.discards.flatMap((_, i) => (playsBySource.has(`discard:${i}`) ? [i] : [])) : []
        }
        // Sin ayuda, con una carta de la mano elegida, también las pilas vacías aceptan el toque.
        allPilesClickable={!marksTargets && selected?.from === 'hand'}
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
                  playable={marksPlayable && myTurn && playsBySource.has(sourceKey(source))}
                  onClick={myTurn ? () => pick(source) : undefined}
                />
              );
            })}
            {view.hand.length === 0 ? <EmptySlot /> : null}
          </div>
          <span className="zone-label">{t.table.yourHand(view.hand.length)}</span>
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
  pendingPile?: number | null;
  targetPiles?: number[];
  playablePiles?: number[];
  allPilesClickable?: boolean;
  onPileClick?: (pile: number, hasCards: boolean) => void;
  children: ReactNode;
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
  pendingPile = null,
  targetPiles = [],
  playablePiles = [],
  allPilesClickable = false,
  onPileClick,
  children,
}: SeatProps) {
  const t = useT();
  return (
    <section className={`seat ${className}${active ? ' active' : ''}`} aria-label={t.table.zoneOf(name)}>
      <header className="seat-title">
        <span className="name">{name}</span>
        {active ? <span className="turn-badge">{t.table.inTurn}</span> : null}
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
            <span className="count-badge" aria-label={t.table.cardsInPozo(player.pozoCount)}>
              {player.pozoCount}
            </span>
          </div>
          <span className="zone-label">{t.table.pozo}</span>
        </div>

        <div className="piles">
          <div className="piles-row">
            {player.discards.map((pile, index) => {
              const isTarget = targetPiles.includes(index);
              const hasCards = pile.length > 0;
              const interactive = onPileClick && (isTarget || hasCards || allPilesClickable);
              const state = pendingPile === index ? ' pending' : isTarget ? ' target' : '';
              return (
                <div
                  key={index}
                  className={`pile${state}`}
                  style={{ '--n': pile.length } as CSSProperties}
                  {...clickable(
                    interactive ? () => onPileClick(index, hasCards) : undefined,
                    isTarget ? t.table.discardOnPile(index + 1) : t.table.pile(index + 1),
                  )}
                >
                  {hasCards ? null : <EmptySlot />}
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
          <span className="zone-label">{t.table.discards}</span>
        </div>

        {children}
      </div>
    </section>
  );
}
