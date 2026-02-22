import { useState, useEffect, useCallback } from 'react';
import { getLocale, setLocale, t, subscribeLocale, type Locale } from './index';

/**
 * Hook que retorna t e locale. Re-renderiza quando o idioma muda.
 */
export function useLocale() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    return subscribeLocale(() => forceUpdate((n) => n + 1));
  }, []);

  return {
    t,
    locale: getLocale(),
    setLocale,
  };
}
