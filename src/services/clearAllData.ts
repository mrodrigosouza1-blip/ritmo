import { getDatabase } from '@/src/db/database';
import { ensureDefaultCategories } from '@/src/services/categories';

const TABLES = [
  'day_items',
  'routine_exceptions',
  'routine_rules',
  'routines',
  'events',
  'tasks',
  'goals_weekly',
  'categories',
  'ui_settings',
] as const;

/**
 * Apaga todos os dados do banco.
 * Mantém a estrutura das tabelas; recria categorias padrão ao final.
 */
export async function clearAllData(): Promise<void> {
  const db = await getDatabase();

  for (const table of TABLES) {
    await db.runAsync(`DELETE FROM ${table}`);
  }

  await ensureDefaultCategories();
}
