import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import NoteForm from '../components/NoteForm';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { syncNoteNotification } from '../services/notificationService';
import { addNote, updateNote } from '../services/storageService';

export default function AddNoteScreen({ navigation }) {
  const { theme } = useTheme();
  const { settings } = useSettings();
  const [loading, setLoading] = useState(false);

  const handleSave = async (noteInput) => {
    setLoading(true);
    try {
      const created = await addNote({ ...noteInput, notificationId: null });
      const notificationId = await syncNoteNotification(created, settings).catch(() => null);

      if (notificationId) {
        await updateNote(created.id, { ...created, notificationId });
      }

      Alert.alert('Saved', 'Your note has been created.', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (err) {
      Alert.alert('Error', err.message || 'Unable to save note.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 96 : 0}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <NoteForm
          submitLabel="Save Note"
          loading={loading}
          onSubmit={handleSave}
          initialReminder={{ preset: settings.defaultReminderPreset, remindAt: null }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
});
