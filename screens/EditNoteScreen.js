import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import NoteForm from '../components/NoteForm';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { DEFAULT_CONTENT_FONT_SIZE } from '../constants/editor';
import { syncNoteNotification } from '../services/notificationService';
import { updateNote } from '../services/storageService';

export default function EditNoteScreen({ route, navigation }) {
  const { theme } = useTheme();
  const { settings } = useSettings();
  const [loading, setLoading] = useState(false);
  const note = route.params?.note;

  const handleSave = async (noteInput) => {
    if (!note) {
      return;
    }

    setLoading(true);
    try {
      const updatedBase = await updateNote(note.id, {
        ...note,
        ...noteInput,
        notificationId: null,
      });
      const notificationId = await syncNoteNotification(updatedBase, settings).catch(() => null);

      if (notificationId || updatedBase.notificationId) {
        await updateNote(note.id, { ...updatedBase, notificationId });
      }

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
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 96 : 0}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <NoteForm
          initialTitle={note.title}
          initialContent={note.content}
          initialContentFontSize={note.contentFontSize || DEFAULT_CONTENT_FONT_SIZE}
          initialIsTask={note.isTask || false}
          initialIsChecklist={note.isChecklist || false}
          initialChecklistItems={note.checklistItems || []}
          initialDueAt={note.dueAt || ''}
          initialReminder={note.reminder || { preset: 'none', remindAt: null }}
          initialTags={note.tags || []}
          initialFolder={note.folder || ''}
          initialAttachments={note.attachments || []}
          submitLabel="Save Changes"
          loading={loading}
          onSubmit={handleSave}
          isEditMode
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
  error: {
    fontWeight: '600',
  },
});
