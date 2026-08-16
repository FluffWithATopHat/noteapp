import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../constants/colors';

function formatDate(dateString) {
  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleString();
}

export default function NoteCard({ note, onPress, onDelete, onExport }) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <Text style={styles.title}>{note.title}</Text>
      <Text style={styles.content} numberOfLines={3}>
        {note.content}
      </Text>
      <Text style={styles.date}>Created: {formatDate(note.createdAt)}</Text>
      <View style={styles.actions}>
        <TouchableOpacity onPress={onExport}>
          <Text style={styles.actionText}>Export</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete}>
          <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  title: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    color: colors.secondaryText,
    marginTop: 6,
  },
  date: {
    color: colors.secondaryText,
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
    color: colors.primary,
    fontWeight: '700',
  },
  deleteText: {
    color: colors.danger,
  },
});
