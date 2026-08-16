import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { DEFAULT_CONTENT_FONT_SIZE, MAX_CONTENT_FONT_SIZE, MIN_CONTENT_FONT_SIZE } from '../constants/editor';
import FormattedText from './FormattedText';

export default function NoteForm({
  initialTitle = '',
  initialContent = '',
  initialContentFontSize = DEFAULT_CONTENT_FONT_SIZE,
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
  const [contentFontSize, setContentFontSize] = useState(initialContentFontSize);
  const [isTask, setIsTask] = useState(initialIsTask);
  const [selection, setSelection] = useState({ start: initialContent.length, end: initialContent.length });
  const [forcedSelection, setForcedSelection] = useState(null);
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
      contentFontSize !== initialContentFontSize ||
      isTask !== initialIsTask ||
      dueAt !== (initialDueAt || ''),
    [content, initialContent, contentFontSize, initialContentFontSize, initialTitle, title, isTask, initialIsTask, dueAt, initialDueAt],
  );

  const applyWrappedFormatting = (prefix, suffix = prefix) => {
    const start = selection.start ?? content.length;
    const end = selection.end ?? content.length;
    const selectedText = content.slice(start, end);
    const replacement = `${prefix}${selectedText}${suffix}`;
    const nextContent = `${content.slice(0, start)}${replacement}${content.slice(end)}`;
    const cursorPosition = selectedText ? start + replacement.length : start + prefix.length;

    setContent(nextContent);
    setSelection({ start: cursorPosition, end: cursorPosition });
    setForcedSelection({ start: cursorPosition, end: cursorPosition });
  };

  const applyLinePrefix = (prefix) => {
    const start = selection.start ?? content.length;
    const end = selection.end ?? content.length;
    const lineStart = content.lastIndexOf('\n', start - 1) + 1;
    const rawLineEnd = content.indexOf('\n', end);
    const safeLineEnd = rawLineEnd === -1 ? content.length : rawLineEnd;
    const segment = content.slice(lineStart, safeLineEnd);
    const updatedSegment = segment
      .split('\n')
      .map((line) => `${prefix}${line}`)
      .join('\n');

    const nextContent = `${content.slice(0, lineStart)}${updatedSegment}${content.slice(safeLineEnd)}`;
    const startShift = prefix.length * (segment.slice(0, Math.max(0, start - lineStart)).split('\n').length);
    const endShift = prefix.length * (segment.slice(0, Math.max(0, end - lineStart)).split('\n').length);
    const nextStart = start + startShift;
    const nextEnd = end + endShift;

    setContent(nextContent);
    setSelection({ start: nextStart, end: nextEnd });
    setForcedSelection({ start: nextStart, end: nextEnd });
  };

  const changeFontSize = (delta) => {
    setContentFontSize((current) => Math.min(MAX_CONTENT_FONT_SIZE, Math.max(MIN_CONTENT_FONT_SIZE, current + delta)));
  };

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

  const handleSelectionChange = ({ nativeEvent }) => {
    const nextSelection = nativeEvent.selection;
    setSelection(nextSelection);
    if (
      forcedSelection &&
      forcedSelection.start === nextSelection.start &&
      forcedSelection.end === nextSelection.end
    ) {
      setForcedSelection(null);
    }
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
    await onSubmit({
      title: title.trim(),
      content: content.trim(),
      contentFontSize,
      isTask,
      dueAt: parseDueAt(),
    });
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
      <View style={s.toolbar}>
        <TouchableOpacity style={s.toolbarButton} onPress={() => applyWrappedFormatting('**')}>
          <Text style={s.toolbarButtonText}>Bold</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.toolbarButton} onPress={() => applyWrappedFormatting('*')}>
          <Text style={s.toolbarButtonText}>Italic</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.toolbarButton} onPress={() => applyLinePrefix('# ')}>
          <Text style={s.toolbarButtonText}>H1</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.toolbarButton} onPress={() => applyLinePrefix('- ')}>
          <Text style={s.toolbarButtonText}>List</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.toolbarButton} onPress={() => changeFontSize(-2)}>
          <Text style={s.toolbarButtonText}>A-</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.toolbarButton} onPress={() => changeFontSize(2)}>
          <Text style={s.toolbarButtonText}>A+</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        value={content}
        onChangeText={setContent}
        onSelectionChange={handleSelectionChange}
        selection={forcedSelection || undefined}
        style={[s.input, s.contentInput, { fontSize: contentFontSize, lineHeight: Math.round(contentFontSize * 1.45) }]}
        placeholder="Write your note"
        placeholderTextColor={theme.secondaryText}
        multiline
        textAlignVertical="top"
        maxLength={5000}
      />
      <Text style={s.hint}>
        Use the toolbar or type markdown like **bold**, *italic*, # Heading, - list, ~~strike~~, or `code`.
      </Text>

      <Text style={s.label}>Preview</Text>
      <View style={s.preview}>
        <FormattedText
          content={content || 'Start typing to preview your formatted note.'}
          fontSize={contentFontSize}
          style={!content ? { color: theme.secondaryText } : null}
        />
      </View>

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
    toolbar: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 10,
    },
    toolbarButton: {
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.inputBg,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    toolbarButtonText: {
      color: theme.primaryText,
      fontWeight: '600',
      fontSize: 12,
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
    preview: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      backgroundColor: theme.inputBg,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 14,
      minHeight: 90,
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
