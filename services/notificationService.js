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

  return true;
}

export async function scheduleReminder(noteTitle, secondsFromNow = 3600) {
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Note reminder',
      body: noteTitle || 'You have pending notes to review.',
    },
    trigger: {
      channelId: 'note-reminders',
      seconds: Math.max(1, secondsFromNow),
    },
  });
}
