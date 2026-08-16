import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Switch, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function NoteForm({
  initialTitle = '',
  initialContent = '',
  initialIsTask = false,
  initialDueAt = '',
  submitLabel,
  loading,
  onSubmit,
  isEditMode = false,
}) {
  const { theme } = useTheme();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [isTask, setIsTask] = useState(initialIsTask);
  // Store dueAt as raw ISO string internally; display formatted to user
  const [dueAt, setDueAt] = useState(initialDueAt || '');
  const [dueAtDisplay, setDueAtDisplay] = useState(
    initialDueAt ? new Date(initialDueAt).toLocaleString() : '',
  );
  const [error, setError] = useState('');

  const hasChanges = useMemo(
    () =>
      title.trim() !== initialTitle.trim() ||
      content.trim() !== initialContent.trim() ||
      isTask !== initialIsTask ||
      dueAt !== (initialDueAt || ''),
    [content, initialContent, initialTitle, title, isTask, initialIsTask, dueAt, initialDueAt],
  );

  const parseDueAt = () => {
    // dueAt is stored as ISO or raw user input
    if (!dueAtDisplay.trim()) return null;
    // If the stored dueAt is already a valid ISO, return it directly (no round-trip loss)
    if (dueAt && !Number.isNaN(new Date(dueAt).getTime())) return dueAt;
    const d = new Date(dueAtDisplay.trim());
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  };

  const handleDueAtChange = (text) => {
    setDueAtDisplay(text);
    // Try to parse and store as ISO; fall back to raw text to allow further editing
    const d = new Date(text.trim());
    setDueAt(!Number.isNaN(d.getTime()) && text.trim() ? d.toISOString() : text.trim());
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!content.trim()) {
      setError('Content is required.');
      return;
    }
    if (isTask && dueAtDisplay.trim()) {
      const d = new Date(dueAtDisplay.trim());
      if (Number.isNaN(d.getTime())) {
        setError('Due date is not valid. Try "MM/DD/YYYY HH:MM" format.');
        return;
      }
    }
    setError('');
    await onSubmit({ title: title.trim(), content: content.trim(), isTask, dueAt: parseDueAt() });
  };

  const s = makeStyles(theme);

  return (
    <View style={s.container}>
      {error ? <Text style={s.error}>{error}</Text> : null}

      <Text style={s.label}>Title</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        style={s.input}
        placeholder="Enter title"
        placeholderTextColor={theme.secondaryText}
        maxLength={100}
      />

      <Text style={s.label}>Content</Text>
      <TextInput
        value={content}
        onChangeText={setContent}
        style={[s.input, s.contentInput]}
        placeholder="Write your note"
        placeholderTextColor={theme.secondaryText}
        multiline
        textAlignVertical="top"
        maxLength={5000}
      />

      <View style={s.row}>
        <Text style={s.label}>Mark as Task / Reminder</Text>
        <Switch
          value={isTask}
          onValueChange={setIsTask}
          trackColor={{ false: theme.border, true: theme.primary }}
          thumbColor={isTask ? theme.primary : theme.secondaryText}
        />
      </View>

      {isTask && (
        <>
          <Text style={s.label}>Due Date (optional)</Text>
          <TextInput
            value={dueAtDisplay}
            onChangeText={handleDueAtChange}
            style={s.input}
            placeholder="e.g. 08/20/2026 14:00"
            placeholderTextColor={theme.secondaryText}
          />
          <Text style={s.hint}>Enter date in any standard format. Leave blank for no due date.</Text>
        </>
      )}

      <TouchableOpacity
        style={[s.button, loading || (isEditMode && !hasChanges) ? s.buttonDisabled : null]}
        onPress={handleSubmit}
        disabled={loading || (isEditMode && !hasChanges)}
      >
        <Text style={s.buttonText}>{loading ? 'Saving...' : submitLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(theme) {
  return StyleSheet.create({
    container: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.border,
    },
    error: {
      color: theme.danger,
      marginBottom: 10,
      fontWeight: '600',
    },
    label: {
      color: theme.primaryText,
      fontWeight: '600',
      marginBottom: 6,
    },
    hint: {
      color: theme.secondaryText,
      fontSize: 11,
      marginBottom: 12,
      marginTop: -8,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 14,
      backgroundColor: theme.inputBg,
      color: theme.primaryText,
    },
    contentInput: {
      minHeight: 140,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    button: {
      backgroundColor: theme.primary,
      borderRadius: 10,
      alignItems: 'center',
      paddingVertical: 12,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonText: {
      color: '#FFF',
      fontWeight: '700',
    },
  });
}

