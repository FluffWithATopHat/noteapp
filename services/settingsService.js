import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = '@noteapp:settings';

export const DEFAULT_SETTINGS = {
  notificationsEnabled: true,
  defaultReminderPreset: 'none',
  showCompletedTasks: true,
  audioNotesEnabled: false,
};

export async function getSettings() {
  try {
    const rawValue = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!rawValue) {
      return DEFAULT_SETTINGS;
    }

    const parsed = JSON.parse(rawValue);
    return {
      ...DEFAULT_SETTINGS,
      ...(parsed && typeof parsed === 'object' ? parsed : {}),
    };
  } catch (error) {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(nextSettings) {
  const merged = {
    ...DEFAULT_SETTINGS,
    ...(nextSettings && typeof nextSettings === 'object' ? nextSettings : {}),
  };

  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
    return merged;
  } catch (error) {
    throw new Error('Unable to save settings.');
  }
}
