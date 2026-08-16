import React, { useState } from 'react';
import { View, Alert, Text, StyleSheet } from 'react-native';
import NoteForm from '../components/NoteForm';
import { useTheme } from '../context/ThemeContext';
import { updateNote } from '../services/storageService';
import { cancelNoteNotifications, scheduleNoteNotifications } from '../services/notificationService';

export default function EditNoteScreen({ route, navigation }) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const note = route.params?.note;

  const handleSave = async (noteInput) => {
    if (!note) {
      return;
    }

    setLoading(true);
    try {
      // If the note becomes a task or title changed, reschedule notifications
      let reminderId = note.reminderId;
      let followUpId = note.followUpId;

      if (!note.completed) {
        try {
          await cancelNoteNotifications(note);
          const ids = await scheduleNoteNotifications(noteInput.title);
          reminderId = ids.reminderId;
          followUpId = ids.followUpId;
        } catch {
          // Notifications optional
        }
      }

      await updateNote(note.id, { ...noteInput, reminderId, followUpId });
      Alert.alert('Updated', 'Your note has been updated.', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (err) {
      Alert.alert('Error', err.message || 'Unable to update note.');
    } finally {
      setLoading(false);
    }
  };

  if (!note) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        <Text style={[styles.error, { color: theme.danger }]}>Note not found.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <NoteForm
        initialTitle={note.title}
        initialContent={note.content}
        initialContentFontSize={note.contentFontSize || 16}
        initialIsTask={note.isTask || false}
        initialDueAt={note.dueAt || ''}
        submitLabel="Save Changes"
        loading={loading}
        onSubmit={handleSave}
        isEditMode
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 16,
  },
  error: {
    fontWeight: '600',
  },
});
