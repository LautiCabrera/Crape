import type { BotLevel } from '@crape/engine';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { detectLanguage, DICTIONARIES, I18nContext, isLanguage } from './i18n';
import type { Language } from './i18n';

/** `full`: marca cartas jugables y destinos. `targets`: solo destinos. `none`: nada. */
export type HelpLevel = 'full' | 'targets' | 'none';
export type BotSpeed = 'slow' | 'normal' | 'fast';

export interface Settings {
  language: Language;
  help: HelpLevel;
  botSpeed: BotSpeed;
  confirmDiscard: boolean;
  /** Última dificultad elegida; se fija al iniciar cada partida. */
  difficulty: BotLevel;
}

const STORAGE_KEY = 'crape.settings';

function defaults(): Settings {
  return {
    language: detectLanguage(),
    help: 'full',
    botSpeed: 'normal',
    // En pantallas táctiles un toque equivocado termina el turno, así que arranca activado.
    confirmDiscard: window.matchMedia('(pointer: coarse)').matches,
    difficulty: 'normal',
  };
}

const oneOf = <T extends string>(value: unknown, options: readonly T[]): value is T =>
  typeof value === 'string' && (options as readonly string[]).includes(value);

/** Lee los ajustes guardados y descarta cualquier valor que ya no sea válido. */
function load(): Settings {
  const base = defaults();
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (!saved || typeof saved !== 'object') return base;
    const s = saved as Record<string, unknown>;
    return {
      language: isLanguage(s.language) ? s.language : base.language,
      help: oneOf(s.help, ['full', 'targets', 'none']) ? s.help : base.help,
      botSpeed: oneOf(s.botSpeed, ['slow', 'normal', 'fast']) ? s.botSpeed : base.botSpeed,
      confirmDiscard: typeof s.confirmDiscard === 'boolean' ? s.confirmDiscard : base.confirmDiscard,
      difficulty: oneOf(s.difficulty, ['easy', 'normal', 'hard']) ? s.difficulty : base.difficulty,
    };
  } catch {
    return base;
  }
}

interface SettingsContextValue {
  settings: Settings;
  update: (changes: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(load);

  const update = useCallback((changes: Partial<Settings>) => {
    setSettings((current) => ({ ...current, ...changes }));
  }, []);

  useEffect(() => {
    document.documentElement.lang = settings.language;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Sin almacenamiento (modo privado, por ejemplo) los ajustes duran lo que dura la pestaña.
    }
  }, [settings]);

  const value = useMemo(() => ({ settings, update }), [settings, update]);
  return (
    <SettingsContext.Provider value={value}>
      <I18nContext.Provider value={DICTIONARIES[settings.language]}>{children}</I18nContext.Provider>
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('useSettings debe usarse dentro de SettingsProvider');
  return value;
}
