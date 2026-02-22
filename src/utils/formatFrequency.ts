import { t } from '@/src/i18n';
import type { RoutineTemplate } from '@/src/data/templates';

type TemplateRule = RoutineTemplate['routines'][0]['rule'];

/**
 * Formata a frequência de uma regra para exibição.
 * - daily → t("frequency.daily")
 * - weekly + byweekday → t("frequency.weeklyDays", { count })
 */
export function formatFrequency(rule: TemplateRule): string {
  if (rule.freq === 'daily') {
    return t('frequency.daily');
  }
  if (rule.freq === 'weekly' && rule.byweekday?.length) {
    return t('frequency.weeklyDays', { count: String(rule.byweekday.length) });
  }
  return t('templates.freqWeekly');
}
