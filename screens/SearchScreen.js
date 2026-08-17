import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import NoteCard from '../components/NoteCard';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { deleteNote, getNotes, updateNote } from '../services/storageService';
import { exportSingleNote } from '../services/fileService';
import { syncNoteNotification } from '../services/notificationService';

export default function SearchScreen({ navigation }) {
  const { theme } = useTheme();
  const { settings } = useSettings();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const all = await getNotes();
      setNotes(all.filter((n) => !n.archived));
    } catch {
      // silently ignore load errors on search screen
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotes();
    }, [loadNotes]),
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q),
    );
  }, [notes, query]);

  const styles = makeStyles(theme);

  const handleDelete = (note) => {
    Alert.alert('Delete note?', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await syncNoteNotification(
              { ...note, reminder: { preset: 'none', remindAt: null } },
              { notificationsEnabled: false },
            );
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
      const updated = await updateNote(note.id, { ...note, completed, notificationId: null });
      const notificationId = await syncNoteNotification(updated, settings).catch(() => null);
      if (notificationId || updated.notificationId) {
        await updateNote(note.id, { ...updated, notificationId });
      }
      await loadNotes();
    } catch (err) {
      Alert.alert('Error', err.message || 'Unable to update note.');
    }
  };

  const handleArchiveToggle = async (note) => {
    try {
      const updated = await updateNote(note.id, {
        ...note,
        archived: true,
        archivedAt: new Date().toISOString(),
        notificationId: null,
      });
      const notificationId = await syncNoteNotification(updated, settings).catch(() => null);
      if (notificationId || updated.notificationId) {
        await updateNote(note.id, { ...updated, notificationId });
      }
      await loadNotes();
    } catch (err) {
      Alert.alert('Error', err.message || 'Unable to archive note.');
    }
  };

  const handleToggleChecklistItem = async (note, itemId) => {
    const updatedItems = note.checklistItems.map((item) =>
      item.id === itemId ? { ...item, checked: !item.checked } : item,
    );
    const allChecked = updatedItems.length > 0 && updatedItems.every((item) => item.checked);
    try {
      await updateNote(note.id, {
        ...note,
        checklistItems: updatedItems,
        completed: allChecked ? true : note.completed,
      });
      await loadNotes();
    } catch (err) {
      Alert.alert('Error', err.message || 'Unable to update checklist.');
    }
  };

  return (
    <View style={styles.screen}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search by title or content…"
        placeholderTextColor={theme.secondaryText}
        value={query}
        onChangeText={setQuery}
        autoFocus
        returnKeyType="search"
      />

      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} style={styles.loader} />
      ) : !query.trim() ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Type something above to search your notes.</Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No notes match "{query}".</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NoteCard
              note={item}
              onPress={() => navigation.navigate('EditNote', { note: item })}
              onDelete={() => handleDelete(item)}
              onToggleComplete={(done) => handleToggleComplete(item, done)}
              onArchiveToggle={() => handleArchiveToggle(item)}
              onToggleChecklistItem={(itemId) => handleToggleChecklistItem(item, itemId)}
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
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
        />
      )}
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
    searchInput: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: theme.surface,
      color: theme.primaryText,
      fontSize: 15,
      marginBottom: 12,
    },
    loader: {
      marginTop: 30,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
    },
    emptyText: {
      textAlign: 'center',
      color: theme.secondaryText,
    },
    list: {
      paddingBottom: 16,
    },
  });
}
