import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import NoteCard from '../components/NoteCard';
import { useTheme } from '../context/ThemeContext';
import { deleteNote, getNotes, markNoteComplete, updateNote } from '../services/storageService';
import { exportAllNotes, exportSingleNote } from '../services/fileService';
import { cancelNoteNotifications } from '../services/notificationService';

export default function HomeScreen({ navigation }) {
  const { theme } = useTheme();
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

  const handleDelete = (note) => {
    Alert.alert('Delete note?', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelNoteNotifications(note);
            await deleteNote(note.id);
            await loadNotes();
          } catch (err) {
            Alert.alert('Error', err.message || 'Unable to delete note.');
          }
        },
      },
    ]);
  };

  const handleToggleComplete = async (note, completed) => {
    try {
      await markNoteComplete(note.id, completed);
      if (completed) {
        // Cancel pending notifications when marked done
        await cancelNoteNotifications(note);
        await updateNote(note.id, { ...note, completed, reminderId: null, followUpId: null });
      }
      await loadNotes();
    } catch (err) {
      Alert.alert('Error', err.message || 'Unable to update note.');
    }
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

  const s = makeStyles(theme);

  return (
    <View style={s.screen}>
      <View style={s.row}>
        <TouchableOpacity style={s.primaryButton} onPress={() => navigation.navigate('AddNote')}>
          <Text style={s.primaryButtonText}>+ Add Note</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.secondaryButton} onPress={handleExportAll} disabled={busy}>
          <Text style={s.secondaryButtonText}>{busy ? 'Working...' : 'Export All'}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} style={s.loader} />
      ) : error ? (
        <Text style={s.error}>{error}</Text>
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NoteCard
              note={item}
              onPress={() => navigation.navigate('EditNote', { note: item })}
              onDelete={() => handleDelete(item)}
              onToggleComplete={(done) => handleToggleComplete(item, done)}
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
          ListEmptyComponent={<Text style={s.empty}>No notes yet. Tap "+ Add Note" to start.</Text>}
          contentContainerStyle={notes.length === 0 ? s.emptyContainer : undefined}
        />
      )}

      <View style={s.footer}>
        <Text style={s.footerText}>by TopHat</Text>
      </View>
    </View>
  );
}

function makeStyles(theme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.background,
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
      backgroundColor: theme.primary,
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
      borderColor: theme.primary,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      backgroundColor: theme.surface,
    },
    secondaryButtonText: {
      color: theme.primary,
      fontWeight: '700',
    },
    loader: {
      marginTop: 30,
    },
    error: {
      color: theme.danger,
      fontWeight: '600',
      marginTop: 12,
    },
    emptyContainer: {
      flexGrow: 1,
      justifyContent: 'center',
    },
    empty: {
      textAlign: 'center',
      color: theme.secondaryText,
    },
    footer: {
      paddingVertical: 10,
      alignItems: 'center',
    },
    footerText: {
      color: theme.secondaryText,
      fontSize: 12,
      letterSpacing: 1,
    },
  });
}
