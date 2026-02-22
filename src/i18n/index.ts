import type { Locale } from '@/src/services/uiState';
import { getLocale as getLocaleFromStorage, setLocale as setLocaleStorage } from '@/src/services/uiState';

import * as pt from './locales/pt';
import * as en from './locales/en';
import * as it from './locales/it';

export type { Locale };

const locales: Record<Locale, Record<string, string>> = {
  pt: pt.pt as Record<string, string>,
  en: en.en as Record<string, string>,
  it: it.it as Record<string, string>,
};

let _currentLocale: Locale = 'pt';
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

/**
 * Retorna o locale atual em memória (inicializado no app startup).
 */
export function getLocale(): Locale {
  return _currentLocale;
}

/**
 * Define o locale e persiste. Notifica listeners para re-render.
 */
export async function setLocale(locale: Locale): Promise<void> {
  await setLocaleStorage(locale);
  _currentLocale = locale;
  notifyListeners();
}

/**
 * Inicializa o locale a partir do storage. Chamar no app startup (_layout).
 * Notifica listeners para atualizar a UI.
 */
export async function initLocale(): Promise<Locale> {
  _currentLocale = await getLocaleFromStorage();
  notifyListeners();
  return _currentLocale;
}

/**
 * Traduz uma chave com fallback para PT.
 * Interpolação: {{param}} → params.param
 * Em dev: emite warning se a chave não existir no locale atual.
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const dict = locales[_currentLocale] ?? locales.pt;
  let text = dict[key] ?? locales.pt[key] ?? key;

  if (__DEV__ && !(key in locales.pt)) {
    console.warn(`[i18n] Missing key: "${key}"`);
  }

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), String(v));
    }
  }
  return text;
}

/**
 * Assina mudanças de locale. Retorna função para desinscrever.
 */
export function subscribeLocale(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
