import { getDatabase } from '@/src/db/database';
import { getSetting, setSetting } from '@/src/services/appSettings';

export interface NotificationApplyTo {
  events: boolean;
  tasks: boolean;
  routines: boolean;
}

const DEFAULT_APPLY_TO: NotificationApplyTo = {
  events: true,
  tasks: true,
  routines: true,
};

/** Migração: chaves antigas -> novas */
const OLD_KEYS = {
  enabled: 'notification_enabled',
  offsetMinutes: 'notification_offset_minutes',
  applyTo: 'notification_apply_to',
  intelligenceLevel: 'notification_intelligence_level',
} as const;

const KEYS = {
  enabled: 'notifications.enabled',
  offsetMinutes: 'notifications.offsetMinutes',
  applyTo: 'notifications.applyTo',
  quietEnabled: 'notifications.quiet.enabled',
  quietStart: 'notifications.quiet.start',
  quietEnd: 'notifications.quiet.end',
  smartBasic: 'notifications.smart.basic',
  smartPremium: 'notifications.smart.premium',
} as const;

export async function getNotificationEnabled(): Promise<boolean> {
  const db = await getDatabase();
  const [newRow, oldRow] = await Promise.all([
    db.getFirstAsync<{ value: string }>('SELECT value FROM ui_settings WHERE key = ?', KEYS.enabled),
    db.getFirstAsync<{ value: string }>('SELECT value FROM ui_settings WHERE key = ?', OLD_KEYS.enabled),
  ]);
  if (newRow?.value !== undefined && newRow.value !== '') {
    return newRow.value !== '0' && newRow.value !== 'false';
  }
  if (oldRow?.value !== undefined) {
    const val = oldRow.value !== '0' && oldRow.value !== 'false';
    await setSetting(KEYS.enabled, val);
    return val;
  }
  return true;
}

export async function setNotificationEnabled(value: boolean): Promise<void> {
  await setSetting(KEYS.enabled, value);
}

export async function getNotificationOffsetMinutes(): Promise<number> {
  const db = await getDatabase();
  const [newRow, oldRow] = await Promise.all([
    db.getFirstAsync<{ value: string }>('SELECT value FROM ui_settings WHERE key = ?', KEYS.offsetMinutes),
    db.getFirstAsync<{ value: string }>('SELECT value FROM ui_settings WHERE key = ?', OLD_KEYS.offsetMinutes),
  ]);
  const fromRow = (r: { value: string } | null) =>
    r?.value != null ? parseInt(r.value, 10) : NaN;
  const n = fromRow(newRow);
  if (Number.isFinite(n)) return n;
  const oldVal = fromRow(oldRow);
  const migrated = Number.isFinite(oldVal) ? oldVal! : 30;
  await setSetting(KEYS.offsetMinutes, migrated);
  return migrated;
}

export async function setNotificationOffsetMinutes(value: number): Promise<void> {
  await setSetting(KEYS.offsetMinutes, value);
}

export async function getNotificationApplyTo(): Promise<NotificationApplyTo> {
  const db = await getDatabase();
  const [newRow, oldRow] = await Promise.all([
    db.getFirstAsync<{ value: string }>('SELECT value FROM ui_settings WHERE key = ?', KEYS.applyTo),
    db.getFirstAsync<{ value: string }>('SELECT value FROM ui_settings WHERE key = ?', OLD_KEYS.applyTo),
  ]);
  const parse = (raw: string | null | undefined) => {
    if (!raw) return null;
    try {
      const p = JSON.parse(raw) as Partial<NotificationApplyTo>;
      return {
        events: p.events ?? DEFAULT_APPLY_TO.events,
        tasks: p.tasks ?? DEFAULT_APPLY_TO.tasks,
        routines: p.routines ?? DEFAULT_APPLY_TO.routines,
      };
    } catch {
      return null;
    }
  };
  const fromNew = parse(newRow?.value ?? null);
  if (fromNew) return fromNew;
  const fromOld = parse(oldRow?.value ?? null);
  if (fromOld) {
    await setSetting(KEYS.applyTo, fromOld);
    return fromOld;
  }
  return DEFAULT_APPLY_TO;
}

export async function setNotificationApplyTo(value: NotificationApplyTo): Promise<void> {
  await setSetting(KEYS.applyTo, value);
}

// Quiet hours
export async function getQuietHoursEnabled(): Promise<boolean> {
  return getSetting(KEYS.quietEnabled, false);
}

export async function setQuietHoursEnabled(value: boolean): Promise<void> {
  await setSetting(KEYS.quietEnabled, value);
}

export async function getQuietHoursStart(): Promise<string> {
  return getSetting(KEYS.quietStart, '22:00');
}

export async function setQuietHoursStart(value: string): Promise<void> {
  await setSetting(KEYS.quietStart, value);
}

export async function getQuietHoursEnd(): Promise<string> {
  return getSetting(KEYS.quietEnd, '08:00');
}

export async function setQuietHoursEnd(value: string): Promise<void> {
  await setSetting(KEYS.quietEnd, value);
}

// Smart notifications
export async function getSmartBasicEnabled(): Promise<boolean> {
  return getSetting(KEYS.smartBasic, true);
}

export async function setSmartBasicEnabled(value: boolean): Promise<void> {
  await setSetting(KEYS.smartBasic, value);
}

export type SmartFrequency = 'never' | 'once_per_day' | 'only_near_goal';

const KEYS_FREQ = 'notifications.smart.frequency' as const;
const KEYS_SMART_HOUR = 'notifications.smart.defaultHour' as const;

export async function getSmartFrequency(): Promise<SmartFrequency> {
  const v = await getSetting(KEYS_FREQ, 'once_per_day');
  if (v === 'never' || v === 'once_per_day' || v === 'only_near_goal') return v;
  return 'once_per_day';
}

export async function setSmartFrequency(value: SmartFrequency): Promise<void> {
  await setSetting(KEYS_FREQ, value);
}

export async function getSmartDefaultHour(): Promise<string> {
  return getSetting(KEYS_SMART_HOUR, '19:30');
}

export async function setSmartDefaultHour(value: string): Promise<void> {
  await setSetting(KEYS_SMART_HOUR, value);
}

export async function getSmartPremiumEnabled(): Promise<boolean> {
  const db = await getDatabase();
  const [newRow, oldRow] = await Promise.all([
    db.getFirstAsync<{ value: string }>('SELECT value FROM ui_settings WHERE key = ?', KEYS.smartPremium),
    db.getFirstAsync<{ value: string }>('SELECT value FROM ui_settings WHERE key = ?', OLD_KEYS.intelligenceLevel),
  ]);
  if (newRow?.value !== undefined && newRow.value !== '') {
    return newRow.value === '1' || newRow.value === 'true' || newRow.value === 'premium';
  }
  if (oldRow?.value === 'premium') {
    await setSetting(KEYS.smartPremium, true);
    return true;
  }
  return false;
}

export async function setSmartPremiumEnabled(value: boolean): Promise<void> {
  await setSetting(KEYS.smartPremium, value);
}

// Intelligence level (legacy / alias para smart premium)
export type NotificationIntelligenceLevel = 'basic' | 'premium';

export async function getNotificationIntelligenceLevel(): Promise<NotificationIntelligenceLevel> {
  const v = await getSmartPremiumEnabled();
  return v ? 'premium' : 'basic';
}

export async function setNotificationIntelligenceLevel(
  value: NotificationIntelligenceLevel
): Promise<void> {
  await setSmartPremiumEnabled(value === 'premium');
}
