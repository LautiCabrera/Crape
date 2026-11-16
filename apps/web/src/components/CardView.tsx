import type { Card } from '@crape/engine';
import type { CSSProperties, KeyboardEvent } from 'react';
import { useT } from '../i18n';
import { cardName, RANK_LABEL, SUIT_SYMBOL } from '../labels';

/** Props para volver interactivo un elemento que no es un botón nativo. */
export function clickable(onClick: (() => void) | undefined, label?: string) {
  if (!onClick) return {};
  return {
    role: 'button' as const,
    tabIndex: 0,
    'aria-label': label,
    onClick,
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onClick();
      }
    },
  };
}

interface CardViewProps {
  card: Card;
  selected?: boolean;
  /** Marca la carta como jugable (solo con la ayuda completa). */
  playable?: boolean;
  /** Anima la carta como recién dada vuelta. */
  reveal?: boolean;
  /** Valor que representa un comodín ya colocado en una escalera. */
  standsFor?: number;
  onClick?: () => void;
  style?: CSSProperties;
}

export function CardView({ card, selected, playable, reveal, standsFor, onClick, style }: CardViewProps) {
  const t = useT();
  const isRed = card.kind === 'standard' && (card.suit === 'hearts' || card.suit === 'diamonds');
  const className = [
    'card',
    card.kind === 'joker' ? 'joker' : isRed ? 'red' : 'black',
    selected && 'selected',
    playable && 'playable',
    reveal && 'reveal',
    onClick && 'interactive',
  ]
    .filter(Boolean)
    .join(' ');

  // El nombre único permite que el navegador anime la carta de una zona a otra.
  const fullStyle = { ...style, viewTransitionName: `c-${card.id}` } as CSSProperties;
  const label = cardName(card, t) + (standsFor ? ` (${t.cards.standsFor(RANK_LABEL[standsFor]!)})` : '');

  return (
    <div
      className={className}
      style={fullStyle}
      {...(onClick ? clickable(onClick, label) : { role: 'img', 'aria-label': label })}
      aria-pressed={onClick ? Boolean(selected) : undefined}
    >
      {card.kind === 'joker' ? (
        <>
          <span className="corner">★</span>
          <span className="center joker-word">JOKER</span>
          {standsFor ? <span className="stands-for">= {RANK_LABEL[standsFor]}</span> : null}
        </>
      ) : (
        <>
          <span className="corner">
            {RANK_LABEL[card.rank]}
            <i>{SUIT_SYMBOL[card.suit]}</i>
          </span>
          <span className="center">{SUIT_SYMBOL[card.suit]}</span>
        </>
      )}
    </div>
  );
}

export function CardBack({ style }: { style?: CSSProperties }) {
  return <div className="card back" style={style} aria-hidden="true" />;
}

export function EmptySlot({ label }: { label?: string }) {
  return <div className="card slot">{label ? <span>{label}</span> : null}</div>;
}
