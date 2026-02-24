/**
 * Snapshot de dados para o Widget (v2).
 * Campos weeklyBars, focusCategory são opcionais (retrocompatíveis).
 */
export interface WeeklyBar {
  date: string;
  percent: number;
}

export interface FocusCategoryBar {
  date: string;
  doneCount: number;
  targetCount: number;
  hit: boolean;
}

export type WidgetSnapshot = {
  generatedAt: string;
  locale: 'pt' | 'en' | 'it';
  today: {
    date: string;
    totalItems: number;
    doneItems: number;
    progressPercent?: number;
    nextItem?: {
      type: 'event' | 'routine' | 'task';
      title: string;
      time?: string;
      date: string;
      categoryColor?: string;
    };
  };
  streak?: {
    current: number;
  };
  weekly?: {
    activeDays: number;
    target: number;
    remaining: number;
  };
  /** Barras diárias da semana (Seg–Dom). Opcional, retrocompatível. */
  weeklyBars?: WeeklyBar[];
  /** Melhor sequência da semana. Opcional. */
  weeklyBestStreak?: number;
  /** Categoria em foco no widget. Opcional. */
  focusCategory?: {
    id: string;
    name: string;
    color_hex: string;
  };
  /** Barras da categoria em foco (por dia). Opcional. */
  focusCategoryBars?: FocusCategoryBar[];
};
