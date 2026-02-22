import { getDatabase } from '@/src/db/database';

export type SubscriptionSource = 'local' | 'appstore';

export interface SubscriptionStatus {
  isPremium: boolean;
  source: SubscriptionSource;
}

const KEY_PREMIUM = 'subscription.premium';
const KEY_SOURCE = 'subscription.source';

/**
 * Estado local da assinatura.
 * Por padrão: isPremium = false.
 * Preparado para futura integração com App Store / Stripe.
 */
export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM ui_settings WHERE key = ?',
    KEY_PREMIUM
  );
  const sourceRow = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM ui_settings WHERE key = ?',
    KEY_SOURCE
  );

  const isPremium = row?.value === '1';
  const source = (sourceRow?.value as SubscriptionSource) ?? 'local';

  return { isPremium, source };
}

/**
 * Define estado Premium localmente (para testes / debug).
 * Em produção, usar fluxo de pagamento (App Store / Stripe).
 */
export async function setPremiumLocal(value: boolean): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO ui_settings (key, value) VALUES (?, ?)',
    KEY_PREMIUM,
    value ? '1' : '0'
  );
  await db.runAsync(
    'INSERT OR REPLACE INTO ui_settings (key, value) VALUES (?, ?)',
    KEY_SOURCE,
    'local'
  );
}
