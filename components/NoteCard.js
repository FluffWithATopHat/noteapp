import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { DEFAULT_CONTENT_FONT_SIZE } from '../constants/editor';
import FormattedText from './FormattedText';

function formatDate(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleString();
}

function isOverdue(dueAt) {
  if (!dueAt) return false;
  return new Date(dueAt) < new Date();
}

export default function NoteCard({ note, onPress, onDelete, onExport, onToggleComplete }) {
  const { theme } = useTheme();

  const overdue = note.isTask && !note.completed && isOverdue(note.dueAt);

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: note.completed ? theme.taskDoneBg : theme.surface,
        borderColor: overdue ? theme.danger : theme.border,
      },
    ]}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <View style={styles.titleRow}>
          {note.isTask && (
            <Text style={[styles.taskBadge, { backgroundColor: theme.primary + '22', color: theme.primary }]}>
              ✅ Task
            </Text>
          )}
          {overdue && (
            <Text style={[styles.taskBadge, { backgroundColor: theme.badgeBg, color: theme.badgeText }]}>
              ⚠️ Overdue
            </Text>
          )}
          {note.completed && (
            <Text style={[styles.taskBadge, { backgroundColor: theme.taskDoneBg, color: theme.taskDoneText }]}>
              ✔ Done
            </Text>
          )}
        </View>
        <Text style={[styles.title, { color: note.completed ? theme.secondaryText : theme.primaryText }, note.completed && styles.strikethrough]}>
          {note.title}
        </Text>
        <FormattedText
          content={note.content}
          fontSize={note.contentFontSize || DEFAULT_CONTENT_FONT_SIZE}
          numberOfLines={3}
          style={[styles.content, { color: theme.secondaryText }]}
        />
        <Text style={[styles.date, { color: theme.secondaryText }]}>Created: {formatDate(note.createdAt)}</Text>
        {note.dueAt && (
          <Text style={[styles.date, { color: overdue ? theme.danger : theme.secondaryText }]}>
            Due: {formatDate(note.dueAt)}
          </Text>
        )}
      </TouchableOpacity>
      <View style={styles.actions}>
        {note.isTask && (
          <TouchableOpacity onPress={() => onToggleComplete && onToggleComplete(!note.completed)}>
            <Text style={[styles.actionText, { color: note.completed ? theme.secondaryText : theme.taskDoneText }]}>
              {note.completed ? 'Undo' : 'Done'}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onExport}>
          <Text style={[styles.actionText, { color: theme.primary }]}>Export</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete}>
          <Text style={[styles.actionText, { color: theme.danger }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  taskBadge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
    overflow: 'hidden',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  strikethrough: {
    textDecorationLine: 'line-through',
  },
  content: {
    marginTop: 6,
  },
  date: {
    marginTop: 8,
    fontSize: 12,
  },
  actions: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
  },
  actionText: {
    fontWeight: '700',
  },
});
