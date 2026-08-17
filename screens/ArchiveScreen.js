import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import NoteCard from '../components/NoteCard';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { deleteNote, getNotes, updateNote } from '../services/storageService';
import { exportSingleNote } from '../services/fileService';
import { syncNoteNotification } from '../services/notificationService';

export default function ArchiveScreen({ navigation }) {
  const { theme } = useTheme();
  const { settings } = useSettings();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadNotes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setNotes(await getNotes());
    } catch (err) {
      setError(err.message || 'Failed to load archived notes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotes();
    }, [loadNotes]),
  );

  const archivedNotes = useMemo(() => notes.filter((note) => note.archived), [notes]);
  const styles = makeStyles(theme);

  const handleRestore = async (note) => {
    try {
      const updated = await updateNote(note.id, {
        ...note,
        archived: false,
        archivedAt: null,
        notificationId: null,
      });
      const notificationId = await syncNoteNotification(updated, settings).catch(() => null);
      if (notificationId || updated.notificationId) {
        await updateNote(note.id, { ...updated, notificationId });
      }
      await loadNotes();
    } catch (err) {
      Alert.alert('Error', err.message || 'Unable to restore note.');
    }
  };

  const handleDelete = (note) => {
    Alert.alert('Delete archived note?', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await syncNoteNotification({ ...note, reminder: { preset: 'none', remindAt: null } }, { notificationsEnabled: false });
            await deleteNote(note.id);
            await loadNotes();
          } catch (err) {
            Alert.alert('Error', err.message || 'Unable to delete note.');
          }
        },
      },
    ]);
  };

  if (loading) {
    return <ActivityIndicator size="large" color={theme.primary} style={styles.loader} />;
  }

  if (error) {
    return <Text style={styles.error}>{error}</Text>;
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={archivedNotes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NoteCard
            note={item}
            archivedView
            onPress={() => navigation.navigate('EditNote', { note: item })}
            onDelete={() => handleDelete(item)}
            onArchiveToggle={() => handleRestore(item)}
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
        ListEmptyComponent={<Text style={styles.empty}>No archived notes yet.</Text>}
        contentContainerStyle={archivedNotes.length ? styles.listContent : styles.emptyContainer}
      />
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
    loader: {
      flex: 1,
      backgroundColor: theme.background,
    },
    error: {
      color: theme.danger,
      fontWeight: '600',
      padding: 16,
    },
    listContent: {
      paddingBottom: 16,
    },
    emptyContainer: {
      flexGrow: 1,
      justifyContent: 'center',
    },
    empty: {
      textAlign: 'center',
      color: theme.secondaryText,
    },
  });
}
