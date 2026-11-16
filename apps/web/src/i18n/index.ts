import { createContext, useContext } from 'react';
import { en } from './en';
import { es } from './es';
import type { Dictionary } from './es';
import { pt } from './pt';

export type { Dictionary };

/** Para sumar un idioma: crear su archivo con el tipo `Dictionary` y agregarlo acá. */
export const DICTIONARIES = { es, en, pt } satisfies Record<string, Dictionary>;

export type Language = keyof typeof DICTIONARIES;

/** Nombre de cada idioma en su propio idioma; no se traduce. */
export const LANGUAGE_NAMES: Record<Language, string> = {
  es: 'Español',
  en: 'English',
  pt: 'Português',
};

export const LANGUAGES = Object.keys(DICTIONARIES) as Language[];

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && value in DICTIONARIES;
}

/** Idioma del navegador si está disponible; si no, español. */
export function detectLanguage(): Language {
  for (const tag of navigator.languages ?? [navigator.language]) {
    const base = tag.toLowerCase().split('-')[0];
    if (isLanguage(base)) return base;
  }
  return 'es';
}

export const I18nContext = createContext<Dictionary>(es);

/** Textos de la interfaz en el idioma elegido. */
export function useT(): Dictionary {
  return useContext(I18nContext);
}
