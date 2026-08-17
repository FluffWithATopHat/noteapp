import React from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { themes } from '../constants/colors';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { REMINDER_PRESET_OPTIONS } from '../services/notificationService';

export default function SettingsScreen() {
  const { theme, themeId, setThemeId } = useTheme();
  const { settings, updateSettings } = useSettings();
  const styles = makeStyles(theme);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Theme</Text>
        {Object.values(themes).map((themeOption) => (
          <TouchableOpacity
            key={themeOption.id}
            style={[styles.optionRow, themeId === themeOption.id && { borderColor: theme.primary }]}
            onPress={() => setThemeId(themeOption.id)}
          >
            <Text style={styles.optionText}>{themeOption.label}</Text>
            {themeId === themeOption.id ? <Text style={styles.selected}>Selected</Text> : null}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.switchRow}>
          <View style={styles.switchTextWrap}>
            <Text style={styles.optionText}>Enable reminders</Text>
            <Text style={styles.helper}>Turn note and task notifications on or off.</Text>
          </View>
          <Switch
            value={settings.notificationsEnabled}
            onValueChange={(value) => updateSettings({ notificationsEnabled: value })}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={settings.notificationsEnabled ? theme.primary : theme.secondaryText}
          />
        </View>

        <Text style={styles.subHeading}>Default reminder</Text>
        {REMINDER_PRESET_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionRow,
              settings.defaultReminderPreset === option.value && { borderColor: theme.primary },
            ]}
            onPress={() => updateSettings({ defaultReminderPreset: option.value })}
          >
            <Text style={styles.optionText}>{option.label}</Text>
            {settings.defaultReminderPreset === option.value ? <Text style={styles.selected}>Default</Text> : null}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Additional</Text>
        <View style={styles.switchRow}>
          <View style={styles.switchTextWrap}>
            <Text style={styles.optionText}>Show completed tasks</Text>
            <Text style={styles.helper}>Keep finished tasks visible on the home screen.</Text>
          </View>
          <Switch
            value={settings.showCompletedTasks}
            onValueChange={(value) => updateSettings({ showCompletedTasks: value })}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={settings.showCompletedTasks ? theme.primary : theme.secondaryText}
          />
        </View>
      </View>
    </ScrollView>
  );
}

function makeStyles(theme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      padding: 16,
      gap: 16,
    },
    card: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
    },
    sectionTitle: {
      color: theme.primaryText,
      fontWeight: '800',
      fontSize: 16,
      marginBottom: 12,
    },
    subHeading: {
      color: theme.primaryText,
      fontWeight: '700',
      marginTop: 6,
      marginBottom: 10,
    },
    optionRow: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 12,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    optionText: {
      color: theme.primaryText,
      fontWeight: '600',
    },
    selected: {
      color: theme.primary,
      fontWeight: '700',
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 14,
    },
    switchTextWrap: {
      flex: 1,
    },
    helper: {
      color: theme.secondaryText,
      fontSize: 12,
      marginTop: 4,
    },
  });
}
