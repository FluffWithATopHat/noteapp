import React, { useState } from 'react';
import { View, Alert, StyleSheet } from 'react-native';
import NoteForm from '../components/NoteForm';
import { addNote } from '../services/storageService';
import colors from '../constants/colors';

export default function AddNoteScreen({ navigation }) {
  const [loading, setLoading] = useState(false);

  const handleSave = async (noteInput) => {
    setLoading(true);
    try {
      await addNote(noteInput);
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
    <View style={styles.screen}>
      <NoteForm submitLabel="Save Note" loading={loading} onSubmit={handleSave} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.background,
  },
});
