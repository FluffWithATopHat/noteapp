import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { DEFAULT_CONTENT_FONT_SIZE, MAX_CONTENT_FONT_SIZE, MIN_CONTENT_FONT_SIZE } from '../constants/editor';
import FormattedText from './FormattedText';
import { DUE_DATE_PRESET_OPTIONS, REMINDER_PRESET_OPTIONS, getPresetDate } from '../services/notificationService';

function countPrefixedLines(value) {
  return (value.match(/\n/g) || []).length + 1;
}

function formatValueLabel(value, options) {
  return options.find((option) => option.value === value)?.label || 'Select an option';
}

function createDayOptions() {
  const today = new Date();
  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    const value = date.toISOString().slice(0, 10);
    const label = date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    return { value, label: index === 0 ? `Today (${label})` : index === 1 ? `Tomorrow (${label})` : label };
  });
}

function createTimeOptions() {
  return Array.from({ length: 24 }, (_, hour) => {
    const labelDate = new Date();
    labelDate.setHours(hour, 0, 0, 0);
    return {
      value: `${String(hour).padStart(2, '0')}:00`,
      label: labelDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    };
  });
}

function buildCustomDate(dayValue, timeValue) {
  if (!dayValue || !timeValue) {
    return null;
  }

  const [year, month, day] = dayValue.split('-').map(Number);
  const [hours, minutes] = timeValue.split(':').map(Number);
  const date = new Date(year, month - 1, day, hours, minutes, 0, 0);

  return Number.isNaN(date.getTime()) ? null : date;
}

function getDefaultCustomParts(dayOptions, timeOptions) {
  return {
    day: dayOptions[0]?.value || '',
    time: timeOptions[9]?.value || timeOptions[0]?.value || '',
  };
}

function toLocalDayValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function deriveCustomParts(dateString, dayOptions, timeOptions) {
  if (!dateString) {
    return getDefaultCustomParts(dayOptions, timeOptions);
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return getDefaultCustomParts(dayOptions, timeOptions);
  }

  return {
    day: toLocalDayValue(date),
    time: `${String(date.getHours()).padStart(2, '0')}:00`,
  };
}

function resolveReminderPreset(initialReminder) {
  return initialReminder?.preset || 'none';
}

function getPresetErrorMessage(preset) {
  if (preset === 'laterToday') {
    return '"Later today" is no longer available. Choose another option.';
  }

  return 'Select a future date and time.';
}

function resolveDateValue({ preset, customDay, customTime, isRequiredFuture = true }) {
  if (preset === 'none') {
    return null;
  }

  const resolved = preset === 'custom' ? buildCustomDate(customDay, customTime) : getPresetDate(preset);
  if (!resolved) {
    return { error: getPresetErrorMessage(preset) };
  }

  if (isRequiredFuture && resolved <= new Date()) {
    return { error: 'Choose a date and time in the future.' };
  }

  return { value: resolved.toISOString() };
}

function PickerField({ label, value, options, onPress, theme }) {
  const styles = makeStyles(theme);

  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.selectField} onPress={onPress}>
        <Text style={[styles.selectFieldText, !value && { color: theme.secondaryText }]}>
          {value || 'Select an option'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function OptionPickerModal({ visible, title, options, value, onSelect, onClose, theme }) {
  const styles = makeStyles(theme);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.modalTitle, { color: theme.primaryText }]}>{title}</Text>
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.modalOption,
                value === option.value && { backgroundColor: theme.primary + '18' },
              ]}
              onPress={() => {
                onSelect(option.value);
                onClose();
              }}
            >
              <Text style={[styles.modalOptionText, { color: theme.primaryText }]}>{option.label}</Text>
              {value === option.value ? <Text style={{ color: theme.primary }}>✓</Text> : null}
            </TouchableOpacity>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function NoteForm({
  initialTitle = '',
  initialContent = '',
  initialContentFontSize = DEFAULT_CONTENT_FONT_SIZE,
  initialIsTask = false,
  initialDueAt = '',
  initialReminder = { preset: 'none', remindAt: null },
  submitLabel,
  loading,
  onSubmit,
  isEditMode = false,
}) {
  const { theme } = useTheme();
  const dayOptions = useMemo(() => createDayOptions(), []);
  const timeOptions = useMemo(() => createTimeOptions(), []);
  const initialDueCustomParts = useMemo(() => deriveCustomParts(initialDueAt, dayOptions, timeOptions), [initialDueAt, dayOptions, timeOptions]);
  const initialReminderCustomParts = useMemo(
    () => deriveCustomParts(initialReminder?.remindAt, dayOptions, timeOptions),
    [initialReminder, dayOptions, timeOptions],
  );

  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [contentFontSize, setContentFontSize] = useState(initialContentFontSize);
  const [isTask, setIsTask] = useState(initialIsTask);
  const [selection, setSelection] = useState({ start: initialContent.length, end: initialContent.length });
  const [forcedSelection, setForcedSelection] = useState(null);
  const [duePreset, setDuePreset] = useState(initialDueAt ? 'custom' : 'none');
  const [dueCustomDay, setDueCustomDay] = useState(initialDueCustomParts.day);
  const [dueCustomTime, setDueCustomTime] = useState(initialDueCustomParts.time);
  const [reminderPreset, setReminderPreset] = useState(resolveReminderPreset(initialReminder));
  const [reminderCustomDay, setReminderCustomDay] = useState(initialReminderCustomParts.day);
  const [reminderCustomTime, setReminderCustomTime] = useState(initialReminderCustomParts.time);
  const [error, setError] = useState('');
  const [pickerState, setPickerState] = useState(null);

  const hasChanges = useMemo(
    () =>
      title.trim() !== initialTitle.trim() ||
      content.trim() !== initialContent.trim() ||
      contentFontSize !== initialContentFontSize ||
      isTask !== initialIsTask ||
      duePreset !== (initialDueAt ? 'custom' : 'none') ||
      dueCustomDay !== initialDueCustomParts.day ||
      dueCustomTime !== initialDueCustomParts.time ||
      reminderPreset !== resolveReminderPreset(initialReminder) ||
      reminderCustomDay !== initialReminderCustomParts.day ||
      reminderCustomTime !== initialReminderCustomParts.time,
    [
      content,
      initialContent,
      contentFontSize,
      initialContentFontSize,
      initialTitle,
      title,
      isTask,
      initialIsTask,
      duePreset,
      initialDueAt,
      dueCustomDay,
      dueCustomTime,
      initialDueCustomParts,
      reminderPreset,
      initialReminder,
      reminderCustomDay,
      reminderCustomTime,
      initialReminderCustomParts,
    ],
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
    const startShift = prefix.length * countPrefixedLines(segment.slice(0, Math.max(0, start - lineStart)));
    const endShift = prefix.length * countPrefixedLines(segment.slice(0, Math.max(0, end - lineStart)));
    const nextStart = start + startShift;
    const nextEnd = end + endShift;

    setContent(nextContent);
    setSelection({ start: nextStart, end: nextEnd });
    setForcedSelection({ start: nextStart, end: nextEnd });
  };

  const changeFontSize = (delta) => {
    setContentFontSize((current) => Math.min(MAX_CONTENT_FONT_SIZE, Math.max(MIN_CONTENT_FONT_SIZE, current + delta)));
  };

  const handleSelectionChange = ({ nativeEvent }) => {
    const nextSelection = nativeEvent.selection;
    setSelection(nextSelection);
    if (forcedSelection && forcedSelection.start === nextSelection.start && forcedSelection.end === nextSelection.end) {
      setForcedSelection(null);
    }
  };

  const openPicker = (config) => setPickerState(config);
  const closePicker = () => setPickerState(null);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!content.trim()) {
      setError('Content is required.');
      return;
    }

    const dueResult = isTask
      ? resolveDateValue({ preset: duePreset, customDay: dueCustomDay, customTime: dueCustomTime })
      : { value: null };
    const reminderResult = resolveDateValue({
      preset: reminderPreset,
      customDay: reminderCustomDay,
      customTime: reminderCustomTime,
    });

    if (dueResult?.error) {
      setError(`Due date: ${dueResult.error}`);
      return;
    }

    if (reminderResult?.error) {
      setError(`Reminder: ${reminderResult.error}`);
      return;
    }

    if (isTask && dueResult?.value && reminderResult?.value && new Date(reminderResult.value) > new Date(dueResult.value)) {
      setError('Reminder should be at or before the due date.');
      return;
    }

    setError('');
    await onSubmit({
      title: title.trim(),
      content: content.trim(),
      contentFontSize,
      isTask,
      dueAt: isTask ? dueResult.value : null,
      reminder: {
        preset: reminderPreset,
        remindAt: reminderResult?.value || null,
      },
    });
  };

  const styles = makeStyles(theme);

  return (
    <View style={styles.container}>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.label}>Title</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        style={styles.input}
        placeholder="Enter title"
        placeholderTextColor={theme.secondaryText}
        maxLength={100}
      />

      <Text style={styles.label}>Content</Text>
      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.toolbarButton} onPress={() => applyWrappedFormatting('**')}>
          <Text style={styles.toolbarButtonText}>Bold</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolbarButton} onPress={() => applyWrappedFormatting('*')}>
          <Text style={styles.toolbarButtonText}>Italic</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolbarButton} onPress={() => applyLinePrefix('# ')}>
          <Text style={styles.toolbarButtonText}>H1</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolbarButton} onPress={() => applyLinePrefix('- ')}>
          <Text style={styles.toolbarButtonText}>List</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolbarButton} onPress={() => changeFontSize(-2)}>
          <Text style={styles.toolbarButtonText}>A-</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolbarButton} onPress={() => changeFontSize(2)}>
          <Text style={styles.toolbarButtonText}>A+</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        value={content}
        onChangeText={setContent}
        onSelectionChange={handleSelectionChange}
        selection={forcedSelection || undefined}
        style={[styles.input, styles.contentInput, { fontSize: contentFontSize, lineHeight: Math.round(contentFontSize * 1.45) }]}
        placeholder="Write your note"
        placeholderTextColor={theme.secondaryText}
        multiline
        textAlignVertical="top"
        maxLength={5000}
      />
      <Text style={styles.hint}>Use the toolbar or type markdown like **bold**, *italic*, # Heading, - list, ~~strikethrough~~, or `code`.</Text>

      <Text style={styles.label}>Preview</Text>
      <View style={styles.preview}>
        <FormattedText
          content={content || 'Start typing to preview your formatted note.'}
          fontSize={contentFontSize}
          style={!content ? { color: theme.secondaryText } : null}
        />
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Mark as Task</Text>
        <Switch
          value={isTask}
          onValueChange={setIsTask}
          trackColor={{ false: theme.border, true: theme.primary }}
          thumbColor={isTask ? theme.primary : theme.secondaryText}
        />
      </View>

      {isTask ? (
        <>
          <PickerField
            label="Due Date"
            value={formatValueLabel(duePreset, DUE_DATE_PRESET_OPTIONS)}
            options={DUE_DATE_PRESET_OPTIONS}
            onPress={() => openPicker({
              title: 'Choose due date',
              options: DUE_DATE_PRESET_OPTIONS,
              value: duePreset,
              onSelect: setDuePreset,
            })}
            theme={theme}
          />
          {duePreset === 'custom' ? (
            <View style={styles.customRow}>
              <View style={styles.customColumn}>
                <PickerField
                  label="Due day"
                  value={formatValueLabel(dueCustomDay, dayOptions)}
                  options={dayOptions}
                  onPress={() => openPicker({
                    title: 'Choose day',
                    options: dayOptions,
                    value: dueCustomDay,
                    onSelect: setDueCustomDay,
                  })}
                  theme={theme}
                />
              </View>
              <View style={styles.customColumn}>
                <PickerField
                  label="Due time"
                  value={formatValueLabel(dueCustomTime, timeOptions)}
                  options={timeOptions}
                  onPress={() => openPicker({
                    title: 'Choose time',
                    options: timeOptions,
                    value: dueCustomTime,
                    onSelect: setDueCustomTime,
                  })}
                  theme={theme}
                />
              </View>
            </View>
          ) : null}
        </>
      ) : null}

      <PickerField
        label="Reminder"
        value={formatValueLabel(reminderPreset, REMINDER_PRESET_OPTIONS)}
        options={REMINDER_PRESET_OPTIONS}
        onPress={() => openPicker({
          title: 'Choose reminder',
          options: REMINDER_PRESET_OPTIONS,
          value: reminderPreset,
          onSelect: setReminderPreset,
        })}
        theme={theme}
      />
      <Text style={styles.hint}>Notes and tasks only notify you when you choose a reminder.</Text>
      {reminderPreset === 'custom' ? (
        <View style={styles.customRow}>
          <View style={styles.customColumn}>
            <PickerField
              label="Reminder day"
              value={formatValueLabel(reminderCustomDay, dayOptions)}
              options={dayOptions}
              onPress={() => openPicker({
                title: 'Choose reminder day',
                options: dayOptions,
                value: reminderCustomDay,
                onSelect: setReminderCustomDay,
              })}
              theme={theme}
            />
          </View>
          <View style={styles.customColumn}>
            <PickerField
              label="Reminder time"
              value={formatValueLabel(reminderCustomTime, timeOptions)}
              options={timeOptions}
              onPress={() => openPicker({
                title: 'Choose reminder time',
                options: timeOptions,
                value: reminderCustomTime,
                onSelect: setReminderCustomTime,
              })}
              theme={theme}
            />
          </View>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.button, loading || (isEditMode && !hasChanges) ? styles.buttonDisabled : null]}
        onPress={handleSubmit}
        disabled={loading || (isEditMode && !hasChanges)}
      >
        <Text style={styles.buttonText}>{loading ? 'Saving...' : submitLabel}</Text>
      </TouchableOpacity>

      <OptionPickerModal
        visible={!!pickerState}
        title={pickerState?.title}
        options={pickerState?.options || []}
        value={pickerState?.value}
        onSelect={(selectedValue) => pickerState?.onSelect?.(selectedValue)}
        onClose={closePicker}
        theme={theme}
      />
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
    fieldBlock: {
      marginBottom: 14,
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
    selectField: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 12,
      backgroundColor: theme.inputBg,
    },
    selectFieldText: {
      color: theme.primaryText,
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
    customRow: {
      flexDirection: 'row',
      gap: 12,
    },
    customColumn: {
      flex: 1,
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
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.35)',
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    modalCard: {
      borderWidth: 1,
      borderRadius: 16,
      maxHeight: '70%',
      overflow: 'hidden',
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '700',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
    },
    modalOption: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.border,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    modalOptionText: {
      fontSize: 15,
    },
  });
}
