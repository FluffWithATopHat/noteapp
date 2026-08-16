import React, { useState } from 'react';
import { View, Alert, Text, StyleSheet } from 'react-native';
import NoteForm from '../components/NoteForm';
import colors from '../constants/colors';
import { updateNote } from '../services/storageService';

export default function EditNoteScreen({ route, navigation }) {
  const [loading, setLoading] = useState(false);
  const note = route.params?.note;

  const handleSave = async (noteInput) => {
    if (!note) {
      return;
    }

    setLoading(true);
    try {
      await updateNote(note.id, noteInput);
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
      <View style={styles.screen}>
        <Text style={styles.error}>Note not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <NoteForm
        initialTitle={note.title}
        initialContent={note.content}
        submitLabel="Save Changes"
        loading={loading}
        onSubmit={handleSave}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.background,
  },
  error: {
    color: colors.danger,
    fontWeight: '600',
  },
});
