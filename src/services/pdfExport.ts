import * as Print from 'expo-print';

import { generateDayItems } from '@/src/features/today/generateDayItems';
import { getWeekRangeISO } from '@/src/utils/weekRange';
import { formatDateBR } from '@/src/utils/date';
import { isoToDate } from '@/src/utils/date';
import type { DayItemWithDetails } from '@/src/types';

const DAY_NAMES = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function addDays(iso: string, days: number): string {
  const d = isoToDate(iso);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildDaySection(
  dateStr: string,
  weekday: string,
  items: DayItemWithDetails[]
): string {
  const events = items.filter((i) => i.source_type === 'event');
  const routines = items.filter((i) => i.source_type === 'routine');
  const tasks = items.filter((i) => i.source_type === 'task');

  const renderItem = (item: DayItemWithDetails, extra?: string) => {
    const done = item.status === 'done' ? ' ✓' : '';
    const extraPart = extra ? ` <span class="meta">${esc(extra)}</span>` : '';
    return `<li class="item done-${item.status}">${esc(item.title)}${done}${extraPart}</li>`;
  };

  let html = `<div class="day-section">
    <h2 class="day-title">${weekday} — ${formatDateBR(dateStr)}</h2>`;

  if (events.length > 0) {
    html += `<h3 class="subsection">Compromissos</h3><ul class="list">`;
    for (const e of events) {
      const parts: string[] = [];
      if (e.start_at) parts.push(e.start_at.slice(0, 5));
      if (e.end_at && e.end_at !== e.start_at) parts.push(`- ${e.end_at.slice(0, 5)}`);
      if (e.category_name) parts.push(`• ${e.category_name}`);
      if (e.location?.trim()) parts.push(`📍 ${e.location.trim()}`);
      html += renderItem(e, parts.join(' '));
    }
    html += `</ul>`;
  }

  if (routines.length > 0) {
    html += `<h3 class="subsection">Rotinas</h3><ul class="list">`;
    for (const r of routines) {
      html += renderItem(r, r.category_name ? `• ${r.category_name}` : undefined);
    }
    html += `</ul>`;
  }

  if (tasks.length > 0) {
    html += `<h3 class="subsection">Tarefas</h3><ul class="list">`;
    for (const t of tasks) {
      html += renderItem(t, t.category_name ? `• ${t.category_name}` : undefined);
    }
    html += `</ul>`;
  }

  if (events.length === 0 && routines.length === 0 && tasks.length === 0) {
    html += `<p class="empty">Nenhum item</p>`;
  }

  html += `</div>`;
  return html;
}

/**
 * Exporta a semana (Seg–Dom) como PDF.
 * Retorna o URI do arquivo gerado.
 */
export async function exportWeeklyPdf(weekStartIso: string): Promise<string> {
  const startDate = isoToDate(weekStartIso);
  const { start, end } = getWeekRangeISO(startDate);

  const daysHtml: string[] = [];
  for (let i = 0; i < 7; i++) {
    const dateStr = addDays(start, i);
    const d = isoToDate(dateStr);
    const dayName = DAY_NAMES[d.getDay() === 0 ? 6 : d.getDay() - 1];
    const items = await generateDayItems(dateStr);
    daysHtml.push(buildDaySection(dateStr, dayName, items));
  }

  const startBr = formatDateBR(start);
  const endBr = formatDateBR(end);

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12pt; line-height: 1.4; color: #212121; padding: 16px; }
    h1 { font-size: 18pt; margin-bottom: 20px; color: #333; }
    .day-section { margin-bottom: 24px; page-break-inside: avoid; }
    .day-title { font-size: 14pt; margin: 0 0 12px 0; padding-bottom: 6px; border-bottom: 1px solid #e0e0e0; color: #333; }
    .subsection { font-size: 11pt; margin: 10px 0 6px 0; color: #666; }
    .list { margin: 0; padding-left: 20px; }
    .item { margin: 4px 0; }
    .item.done-done { color: #757575; }
    .meta { font-size: 10pt; color: #757575; }
    .empty { color: #9e9e9e; font-style: italic; margin: 8px 0; }
  </style>
</head>
<body>
  <h1>Ritmo — Semana ${startBr} a ${endBr}</h1>
  ${daysHtml.join('\n')}
</body>
</html>`;

  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  return uri;
}
