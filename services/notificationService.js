import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function initializeNotifications() {
  const { status } = await Notifications.requestPermissionsAsync();

  if (status !== 'granted') {
    return false;
  }

  await Notifications.setNotificationChannelAsync('note-reminders', {
    name: 'Note reminders',
    importance: AndroidImportance.DEFAULT,
  });

  await Notifications.setNotificationChannelAsync('note-followup', {
    name: 'Note follow-up',
    importance: AndroidImportance.HIGH,
  });

  return true;
}

/**
 * Schedule a 1-hour reminder for an incomplete note.
 * Returns the notification identifier.
 */
export async function scheduleReminder(noteTitle, secondsFromNow = 3600) {
  return Notifications.scheduleNotificationAsync({
    content: {
      title: '⏰ Note Reminder',
      body: `"${noteTitle || 'A note'}" has been sitting for over an hour — don't forget it!`,
      data: { type: 'reminder' },
    },
    trigger: {
      channelId: 'note-reminders',
      seconds: Math.max(1, secondsFromNow),
    },
  });
}

/**
 * Schedule a next-day follow-up notification for an incomplete note.
 * Fires at 9 AM the following day.
 */
export async function scheduleNextDayFollowUp(noteTitle) {
  const tomorrow9am = new Date();
  tomorrow9am.setDate(tomorrow9am.getDate() + 1);
  tomorrow9am.setHours(9, 0, 0, 0);
  const secondsUntilTomorrow = Math.max(1, Math.round((tomorrow9am - Date.now()) / 1000));

  return Notifications.scheduleNotificationAsync({
    content: {
      title: '📌 Unfinished Note',
      body: `"${noteTitle || 'A note'}" from yesterday is still incomplete. Time to tackle it!`,
      data: { type: 'followup' },
    },
    trigger: {
      channelId: 'note-followup',
      seconds: secondsUntilTomorrow,
    },
  });
}

/**
 * Cancel a previously scheduled notification.
 */
export async function cancelNotification(notificationId) {
  if (notificationId) {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }
}

/**
 * Schedule both the 1-hour reminder and next-day follow-up for a note.
 * Returns { reminderId, followUpId }.
 */
export async function scheduleNoteNotifications(noteTitle) {
  const [reminderId, followUpId] = await Promise.all([
    scheduleReminder(noteTitle, 3600),
    scheduleNextDayFollowUp(noteTitle),
  ]);
  return { reminderId, followUpId };
}

/**
 * Cancel all notifications for a note.
 */
export async function cancelNoteNotifications(note) {
  await Promise.all([
    cancelNotification(note?.reminderId),
    cancelNotification(note?.followUpId),
  ]);
}

