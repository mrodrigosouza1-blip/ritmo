/**
 * Snapshot de dados para o Widget.
 * Persistido em storage e pronto para integrar com widget nativo depois.
 * Campos progressPercent, streak e weekly são opcionais (retrocompatíveis).
 */
export type WidgetSnapshot = {
  generatedAt: string;
  locale: 'pt' | 'en' | 'it';
  today: {
    date: string;
    totalItems: number;
    doneItems: number;
    /** Percentual 0–100 de itens concluídos no dia. Opcional. */
    progressPercent?: number;
    nextItem?: {
      type: 'event' | 'routine' | 'task';
      title: string;
      time?: string;
      date: string;
      categoryColor?: string;
    };
  };
  /** Sequência de dias ativos. Opcional. */
  streak?: {
    current: number;
  };
  /** Meta semanal mais relevante (se existir). Opcional. */
  weekly?: {
    activeDays: number;
    target: number;
    remaining: number;
  };
};
