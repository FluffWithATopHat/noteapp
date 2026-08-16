import React, { useState } from 'react';
import { View, Alert, StyleSheet } from 'react-native';
import NoteForm from '../components/NoteForm';
import { addNote } from '../services/storageService';
import { scheduleNoteNotifications } from '../services/notificationService';
import { useTheme } from '../context/ThemeContext';

export default function AddNoteScreen({ navigation }) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);

  const handleSave = async (noteInput) => {
    setLoading(true);
    try {
      // Schedule 1-hour reminder + next-day follow-up
      let reminderId = null;
      let followUpId = null;
      try {
        const ids = await scheduleNoteNotifications(noteInput.title);
        reminderId = ids.reminderId;
        followUpId = ids.followUpId;
      } catch {
        // Notifications optional — proceed without them
      }

      await addNote({ ...noteInput, reminderId, followUpId });
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
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <NoteForm submitLabel="Save Note" loading={loading} onSubmit={handleSave} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 16,
  },
});
