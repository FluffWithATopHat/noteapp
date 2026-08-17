import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import NoteCard from '../components/NoteCard';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { deleteNote, getNotes, updateNote } from '../services/storageService';
import { exportAllNotes, exportSingleNote } from '../services/fileService';
import { syncNoteNotification } from '../services/notificationService';

export default function HomeScreen({ navigation }) {
  const { theme } = useTheme();
  const { settings } = useSettings();
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

  const activeNotes = useMemo(() => notes.filter((note) => !note.archived), [notes]);
  const visibleNotes = useMemo(
    () => activeNotes.filter((note) => settings.showCompletedTasks || !note.completed),
    [activeNotes, settings.showCompletedTasks],
  );
  const tasksAndReminders = useMemo(
    () => visibleNotes.filter((note) => note.isTask || note.reminder?.remindAt),
    [visibleNotes],
  );
  const regularNotes = useMemo(
    () => visibleNotes.filter((note) => !note.isTask && !note.reminder?.remindAt),
    [visibleNotes],
  );
  const sections = useMemo(
    () => [
      { title: 'Tasks & Reminders', data: tasksAndReminders },
      { title: 'Notes', data: regularNotes },
    ].filter((section) => section.data.length > 0),
    [tasksAndReminders, regularNotes],
  );

  const handleDelete = (note) => {
    Alert.alert('Delete note?', 'This action cannot be undone.', [
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

  const handleToggleComplete = async (note, completed) => {
    try {
      const updated = await updateNote(note.id, {
        ...note,
        completed,
        notificationId: null,
      });
      const notificationId = await syncNoteNotification(updated, settings).catch(() => null);
      if (notificationId || updated.notificationId) {
        await updateNote(note.id, { ...updated, notificationId });
      }
      await loadNotes();
    } catch (err) {
      Alert.alert('Error', err.message || 'Unable to update note.');
    }
  };

  const handleArchiveToggle = async (note, archived) => {
    try {
      const updated = await updateNote(note.id, {
        ...note,
        archived,
        archivedAt: archived ? new Date().toISOString() : null,
        notificationId: null,
      });
      const notificationId = archived ? null : await syncNoteNotification(updated, settings).catch(() => null);
      if (notificationId || updated.notificationId) {
        await updateNote(note.id, { ...updated, notificationId });
      }
      await loadNotes();
    } catch (err) {
      Alert.alert('Error', err.message || 'Unable to update note.');
    }
  };

  const handleExportAll = async () => {
    if (!visibleNotes.length) {
      Alert.alert('No notes', 'Create a note before exporting.');
      return;
    }

    setBusy(true);
    try {
      await exportAllNotes(visibleNotes);
      Alert.alert('Success', 'Notes exported successfully.');
    } catch (err) {
      Alert.alert('Export failed', err.message || 'Unable to export notes.');
    } finally {
      setBusy(false);
    }
  };

  const styles = makeStyles(theme);

  return (
    <View style={styles.screen}>
      <View style={styles.row}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('AddNote')}>
          <Text style={styles.primaryButtonText}>+ Add Note</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Archive')}>
          <Text style={styles.secondaryButtonText}>Archive</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.row}>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.secondaryButtonText}>Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleExportAll} disabled={busy}>
          <Text style={styles.secondaryButtonText}>{busy ? 'Working...' : 'Export All'}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} style={styles.loader} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : sections.length ? (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section }) => <Text style={styles.sectionTitle}>{section.title}</Text>}
          renderItem={({ item }) => (
            <NoteCard
              note={item}
              onPress={() => navigation.navigate('EditNote', { note: item })}
              onDelete={() => handleDelete(item)}
              onToggleComplete={(done) => handleToggleComplete(item, done)}
              onArchiveToggle={() => handleArchiveToggle(item, true)}
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
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.empty}>No active notes yet. Tap "+ Add Note" to start.</Text>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>by TopHat</Text>
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
      marginBottom: 10,
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
    listContent: {
      paddingTop: 4,
      paddingBottom: 12,
    },
    sectionTitle: {
      color: theme.primaryText,
      fontWeight: '800',
      fontSize: 16,
      marginTop: 8,
      marginBottom: 8,
    },
    emptyContainer: {
      flex: 1,
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
