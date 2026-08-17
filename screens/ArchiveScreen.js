import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import NoteCard from '../components/NoteCard';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { deleteNote, getNotes, updateNote } from '../services/storageService';
import { exportSingleNote } from '../services/fileService';
import { syncNoteNotification } from '../services/notificationService';
import { useToggleChecklistItem } from '../hooks/useToggleChecklistItem';

export default function ArchiveScreen({ navigation }) {
  const { theme } = useTheme();
  const { settings } = useSettings();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

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

  const filteredNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return archivedNotes;
    return archivedNotes.filter(
      (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q),
    );
  }, [archivedNotes, query]);

  const sections = useMemo(() => {
    const folderMap = {};
    for (const note of filteredNotes) {
      const key = note.folder && note.folder.trim() ? note.folder.trim() : 'Uncategorised';
      if (!folderMap[key]) folderMap[key] = [];
      folderMap[key].push(note);
    }
    return Object.entries(folderMap)
      .sort(([a], [b]) => {
        if (a === 'Uncategorised') return 1;
        if (b === 'Uncategorised') return -1;
        return a.localeCompare(b);
      })
      .map(([title, data]) => ({ title, data }));
  }, [filteredNotes]);

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

  const handleToggleChecklistItem = useToggleChecklistItem(loadNotes);

  if (loading) {
    return <ActivityIndicator size="large" color={theme.primary} style={styles.loader} />;
  }

  if (error) {
    return <Text style={styles.error}>{error}</Text>;
  }

  return (
    <View style={styles.screen}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search archived notes…"
        placeholderTextColor={theme.secondaryText}
        value={query}
        onChangeText={setQuery}
        returnKeyType="search"
      />
      {sections.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.empty}>
            {query.trim() ? `No archived notes match "${query}".` : 'No archived notes yet.'}
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionTitle}>{section.title}</Text>
          )}
          renderItem={({ item }) => (
            <NoteCard
              note={item}
              archivedView
              onPress={() => navigation.navigate('EditNote', { note: item })}
              onDelete={() => handleDelete(item)}
              onArchiveToggle={() => handleRestore(item)}
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
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.listContent}
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
    loader: {
      flex: 1,
      backgroundColor: theme.background,
    },
    error: {
      color: theme.danger,
      fontWeight: '600',
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
    sectionTitle: {
      color: theme.primaryText,
      fontWeight: '800',
      fontSize: 15,
      marginTop: 8,
      marginBottom: 6,
    },
    listContent: {
      paddingBottom: 16,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
    },
    empty: {
      textAlign: 'center',
      color: theme.secondaryText,
    },
  });
}
