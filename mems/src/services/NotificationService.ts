/**
 * NotificationService
 *
 * Schedules a daily local notification at 20:00 (8 PM) reminding the user
 * to take their photo for the day. Uses @notifee/react-native which works
 * with React Native CLI without any extra native linking on RN 0.60+.
 */

import notifee, {
  AndroidImportance,
  AuthorizationStatus,
  RepeatFrequency,
  TriggerType,
  type TimestampTrigger,
} from '@notifee/react-native';

const CHANNEL_ID = 'daily-photo-reminder';
const NOTIFICATION_ID = 'daily-reminder';
const REMINDER_HOUR = 20; // 8 PM local time
const REMINDER_MINUTE = 0;

/** Requests permission (iOS) then immediately schedules the daily reminder. */
export async function requestPermissionAndSchedule(): Promise<void> {
  const settings = await notifee.requestPermission();
  if (settings.authorizationStatus < AuthorizationStatus.AUTHORIZED) return;
  await scheduleDailyReminder();
}

/**
 * Cancels any existing reminder and creates a new repeating daily trigger
 * at REMINDER_HOUR:REMINDER_MINUTE local time.
 */
export async function scheduleDailyReminder(
  hour: number = REMINDER_HOUR,
  minute: number = REMINDER_MINUTE,
): Promise<void> {
  // Ensure the Android notification channel exists (no-op on iOS)
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Daily Photo Reminder',
    importance: AndroidImportance.HIGH,
  });

  // Cancel any previously scheduled reminder before re-creating it
  await notifee.cancelNotification(NOTIFICATION_ID);

  // Calculate the next fire time
  const now = new Date();
  const fireDate = new Date();
  fireDate.setHours(hour, minute, 0, 0);

  // If the time today has already passed, start from tomorrow
  if (fireDate <= now) {
    fireDate.setDate(fireDate.getDate() + 1);
  }

  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: fireDate.getTime(),
    repeatFrequency: RepeatFrequency.DAILY,
  };

  await notifee.createTriggerNotification(
    {
      id: NOTIFICATION_ID,
      title: 'Mems 📸',
      body: "Don't forget to take today's photo!",
      android: { channelId: CHANNEL_ID, pressAction: { id: 'default' } },
      ios: { sound: 'default' },
    },
    trigger,
  );
}

/** Cancels the daily reminder entirely. */
export async function cancelDailyReminder(): Promise<void> {
  await notifee.cancelNotification(NOTIFICATION_ID);
}
