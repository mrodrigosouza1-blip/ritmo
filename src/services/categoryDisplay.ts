import { t } from '@/src/i18n';
import type { Category } from '@/src/types';

/**
 * Retorna o nome de exibição da categoria.
 * Categorias do sistema (is_system=1 com slug) usam tradução i18n.
 * Categorias do usuário usam name do banco.
 */
export function getCategoryDisplayName(cat: Category | null | undefined): string {
  if (!cat) return '';
  if (cat.is_system === 1 && cat.slug) {
    const key = `category.${cat.slug}`;
    const translated = t(key);
    return translated !== key ? translated : cat.name;
  }
  return cat.name;
}
