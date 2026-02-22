import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const NOTIFY_MINUTES_BEFORE = 30;
const CHANNEL_ID = 'ritmo-reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function setupNotifications(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Lembretes Ritmo',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
  }
}

export async function requestPermissions(): Promise<boolean> {
  await setupNotifications();
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;

  const { status: newStatus } = await Notifications.requestPermissionsAsync();
  return newStatus === 'granted';
}

export async function scheduleNotification(
  id: string,
  title: string,
  body: string,
  triggerDate: Date
): Promise<string | null> {
  const hasPermission = await requestPermissions();
  if (!hasPermission) return null;

  const notificationId = await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      title,
      body,
      data: { id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      channelId: Platform.OS === 'android' ? CHANNEL_ID : undefined,
    },
  });

  return notificationId;
}

export function minutesBefore(date: Date, minutes: number): Date {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() - minutes);
  return result;
}

export async function scheduleItemNotification(
  itemId: string,
  title: string,
  notifyAt: Date
): Promise<string | null> {
  const triggerDate = minutesBefore(notifyAt, NOTIFY_MINUTES_BEFORE);
  if (triggerDate <= new Date()) return null;

  return scheduleNotification(
    itemId,
    title,
    `Em 30 minutos: ${title}`,
    triggerDate
  );
}

export async function cancelNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/** Identificador fixo da notificação diária das 18h */
export const DAILY_CHECK_ID = 'ritmo-daily-check';
