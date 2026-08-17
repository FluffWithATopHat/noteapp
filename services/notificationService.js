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

export const REMINDER_PRESET_OPTIONS = [
  { value: 'none', label: 'No reminder' },
  { value: 'oneHour', label: 'In 1 hour' },
  { value: 'laterToday', label: 'Later today' },
  { value: 'tomorrowMorning', label: 'Tomorrow morning' },
  { value: 'custom', label: 'Custom date & time' },
];

export const DUE_DATE_PRESET_OPTIONS = [
  { value: 'none', label: 'No due date' },
  { value: 'laterToday', label: 'Later today' },
  { value: 'tomorrowMorning', label: 'Tomorrow morning' },
  { value: 'nextWeek', label: 'Next week' },
  { value: 'custom', label: 'Custom date & time' },
];

function setTime(date, hours, minutes = 0) {
  const next = new Date(date);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

export function getPresetDate(preset) {
  const now = new Date();

  switch (preset) {
    case 'oneHour':
      return new Date(now.getTime() + 60 * 60 * 1000);
    case 'laterToday': {
      const evening = setTime(now, 18, 0);
      return evening > now ? evening : null;
    }
    case 'tomorrowMorning': {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return setTime(tomorrow, 9, 0);
    }
    case 'nextWeek': {
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      return setTime(nextWeek, 9, 0);
    }
    default:
      return null;
  }
}

export function formatReminderDate(dateString) {
  if (!dateString) {
    return null;
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleString();
}

export function getReminderLabel(reminder) {
  if (!reminder?.remindAt) {
    return 'No reminder';
  }

  return formatReminderDate(reminder.remindAt) || 'No reminder';
}

export async function initializeNotifications() {
  const { status } = await Notifications.requestPermissionsAsync();

  if (status !== 'granted') {
    return false;
  }

  await Notifications.setNotificationChannelAsync('note-reminders', {
    name: 'Note reminders',
    importance: AndroidImportance.HIGH,
  });

  return true;
}

async function scheduleReminderNotification(note) {
  const reminderAt = new Date(note?.reminder?.remindAt);
  if (Number.isNaN(reminderAt.getTime()) || reminderAt <= new Date()) {
    return null;
  }

  const seconds = Math.max(1, Math.round((reminderAt.getTime() - Date.now()) / 1000));

  return Notifications.scheduleNotificationAsync({
    content: {
      title: note.isTask ? '⏰ Task Reminder' : '📝 Note Reminder',
      body: note.isTask
        ? `Reminder: ${note.title || 'Your task'} is coming up.`
        : `Reminder: ${note.title || 'Your note'} is ready for you.`,
      data: {
        type: note.isTask ? 'task-reminder' : 'note-reminder',
        noteId: note.id,
      },
    },
    trigger: {
      channelId: 'note-reminders',
      seconds,
    },
  });
}

export async function cancelNotification(notificationId) {
  if (notificationId) {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }
}

export async function cancelNoteNotifications(note) {
  await Promise.all([
    cancelNotification(note?.notificationId),
    cancelNotification(note?.reminderId),
    cancelNotification(note?.followUpId),
  ]);
}

export async function syncNoteNotification(note, settings) {
  await cancelNoteNotifications(note);

  if (!settings?.notificationsEnabled) {
    return null;
  }

  if (!note || note.archived || note.completed || !note.reminder?.remindAt) {
    return null;
  }

  return scheduleReminderNotification(note);
}
