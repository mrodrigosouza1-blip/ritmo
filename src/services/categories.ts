import { getDatabase } from '@/src/db/database';
import type { Category } from '@/src/types';

/**
 * Categorias default. name é fallback; display vem de i18n via slug (category.work, etc.)
 */
const DEFAULT_CATEGORIES: Array<Omit<Category, 'id'> & { slug: string }> = [
  { name: 'Trabalho', color_hex: '#5C6BC0', icon: 'briefcase', slug: 'work' },
  { name: 'Saúde', color_hex: '#66BB6A', icon: 'heart', slug: 'fitness' },
  { name: 'Casa', color_hex: '#FF7043', icon: 'user', slug: 'home' },
  { name: 'Estudos', color_hex: '#26A69A', icon: 'book', slug: 'study' },
];

/** Migração: nomes antigos -> slug estável para i18n. */
const NAME_TO_SLUG: Record<string, string> = {
  Trabalho: 'work',
  Saúde: 'fitness',
  Fitness: 'fitness',
  Pessoal: 'personal',
  Casa: 'home',
  Estudos: 'study',
  Home: 'home',
  Work: 'work',
  Study: 'study',
};

export async function ensureDefaultCategories(): Promise<void> {
  const db = await getDatabase();

  const hasSlug = await db.getFirstAsync<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM pragma_table_info('categories') WHERE name='slug'"
  );
  const hasNewCols = (hasSlug?.cnt ?? 0) > 0;

  for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
    const cat = DEFAULT_CATEGORIES[i];
    const id = `cat-${i + 1}`;
    const existing = await db.getFirstAsync<{ id: string }>('SELECT id FROM categories WHERE id = ?', id);

    if (existing) {
      if (hasNewCols) {
        await db.runAsync(
          'UPDATE categories SET slug = ?, is_system = 1 WHERE id = ?',
          cat.slug,
          id
        );
      }
    } else {
      if (hasNewCols) {
        await db.runAsync(
          'INSERT INTO categories (id, name, color_hex, icon, slug, is_system) VALUES (?, ?, ?, ?, ?, 1)',
          id,
          cat.name,
          cat.color_hex,
          cat.icon ?? null,
          cat.slug
        );
      } else {
        await db.runAsync(
          'INSERT INTO categories (id, name, color_hex, icon) VALUES (?, ?, ?, ?)',
          id,
          cat.name,
          cat.color_hex,
          cat.icon ?? null
        );
      }
    }
  }

  if (!hasNewCols) return;

  for (const [name, slug] of Object.entries(NAME_TO_SLUG)) {
    await db.runAsync(
      "UPDATE categories SET slug = ?, is_system = 1 WHERE name = ? AND (slug IS NULL OR slug = '')",
      slug,
      name
    );
  }
}

export async function getAllCategories(): Promise<Category[]> {
  const db = await getDatabase();
  return db.getAllAsync<Category>('SELECT * FROM categories ORDER BY name');
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Category>('SELECT * FROM categories WHERE id = ?', id);
  return row ?? null;
}

export async function getCategoryByName(name: string): Promise<Category | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Category>('SELECT * FROM categories WHERE name = ?', name);
  return row ?? null;
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const db = await getDatabase();
  const hasSlug = await db.getFirstAsync<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM pragma_table_info('categories') WHERE name='slug'"
  );
  if ((hasSlug?.cnt ?? 0) === 0) return null;
  const row = await db.getFirstAsync<Category>('SELECT * FROM categories WHERE slug = ?', slug);
  return row ?? null;
}

export async function createCategory(category: Category): Promise<void> {
  const db = await getDatabase();
  const hasSlug = await db.getFirstAsync<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM pragma_table_info('categories') WHERE name='slug'"
  );
  if ((hasSlug?.cnt ?? 0) > 0) {
    await db.runAsync(
      `INSERT INTO categories (id, name, color_hex, icon, slug, is_system)
       VALUES (?, ?, ?, ?, ?, 0)`,
      category.id,
      category.name,
      category.color_hex,
      category.icon ?? null,
      null
    );
  } else {
    await db.runAsync(
      'INSERT INTO categories (id, name, color_hex, icon) VALUES (?, ?, ?, ?)',
      category.id,
      category.name,
      category.color_hex,
      category.icon ?? null
    );
  }
}
