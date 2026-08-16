import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import NoteCard from '../components/NoteCard';
import colors from '../constants/colors';
import { deleteNote, getNotes } from '../services/storageService';
import { exportAllNotes, exportSingleNote } from '../services/fileService';

export default function HomeScreen({ navigation }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const loadNotes = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const loaded = await getNotes();
      setNotes(loaded);
    } catch (err) {
      setError(err.message || 'Failed to load notes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotes();
    }, [loadNotes]),
  );

  const handleDelete = (noteId) => {
    Alert.alert('Delete note?', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteNote(noteId);
            await loadNotes();
          } catch (err) {
            Alert.alert('Error', err.message || 'Unable to delete note.');
          }
        },
      },
    ]);
  };

  const handleExportAll = async () => {
    if (!notes.length) {
      Alert.alert('No notes', 'Create a note before exporting.');
      return;
    }

    setBusy(true);
    try {
      await exportAllNotes(notes);
      Alert.alert('Success', 'Notes exported successfully.');
    } catch (err) {
      Alert.alert('Export failed', err.message || 'Unable to export notes.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.row}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('AddNote')}>
          <Text style={styles.primaryButtonText}>Add Note</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={handleExportAll} disabled={busy}>
          <Text style={styles.secondaryButtonText}>{busy ? 'Working...' : 'Export All'}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NoteCard
              note={item}
              onPress={() => navigation.navigate('EditNote', { note: item })}
              onDelete={() => handleDelete(item.id)}
              onExport={async () => {
                try {
                  await exportSingleNote(item);
                  Alert.alert('Success', 'Note exported successfully.');
                } catch (err) {
                  Alert.alert('Export failed', err.message || 'Unable to export note.');
                }
              }}
            />
          )}
          ListEmptyComponent={<Text style={styles.empty}>No notes yet. Tap “Add Note” to start.</Text>}
          contentContainerStyle={notes.length === 0 ? styles.emptyContainer : undefined}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 8,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFF',
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontWeight: '700',
  },
  loader: {
    marginTop: 30,
  },
  error: {
    color: colors.danger,
    fontWeight: '600',
    marginTop: 12,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  empty: {
    textAlign: 'center',
    color: colors.secondaryText,
  },
});
