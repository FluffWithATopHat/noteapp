import React, { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { DEFAULT_CONTENT_FONT_SIZE, MAX_CONTENT_FONT_SIZE, MIN_CONTENT_FONT_SIZE } from '../constants/editor';
import FormattedText from './FormattedText';
import { DUE_DATE_PRESET_OPTIONS, REMINDER_PRESET_OPTIONS, getPresetDate } from '../services/notificationService';

// ─── Tag colour presets ───────────────────────────────────────────────────────
const TAG_COLORS = [
  { label: 'Red',    value: '#E53935' },
  { label: 'Orange', value: '#FB8C00' },
  { label: 'Yellow', value: '#F9A825' },
  { label: 'Green',  value: '#43A047' },
  { label: 'Teal',   value: '#00897B' },
  { label: 'Blue',   value: '#1E88E5' },
  { label: 'Purple', value: '#8E24AA' },
  { label: 'Pink',   value: '#D81B60' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
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
  if (!dayValue || !timeValue) return null;
  const [year, month, day] = dayValue.split('-').map(Number);
  const [hours, minutes] = timeValue.split(':').map(Number);
  const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getDefaultCustomParts(dayOptions, timeOptions) {
  const defaultTime = timeOptions.find((o) => o.value === '09:00')?.value || timeOptions[0]?.value || '';
  return { day: dayOptions[0]?.value || '', time: defaultTime };
}

function toLocalDayValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function deriveCustomParts(dateString, dayOptions, timeOptions) {
  if (!dateString) return getDefaultCustomParts(dayOptions, timeOptions);
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return getDefaultCustomParts(dayOptions, timeOptions);
  return { day: toLocalDayValue(date), time: `${String(date.getHours()).padStart(2, '0')}:00` };
}

function resolveReminderPreset(initialReminder) {
  return initialReminder?.preset || 'none';
}

function getPresetErrorMessage(preset) {
  if (preset === 'laterToday') return '"Later today" is no longer available. Choose another option.';
  return 'Select a future date and time.';
}

function resolveDateValue({ preset, customDay, customTime, isRequiredFuture = true }) {
  if (preset === 'none') return null;
  const resolved = preset === 'custom' ? buildCustomDate(customDay, customTime) : getPresetDate(preset);
  if (!resolved) return { error: getPresetErrorMessage(preset) };
  if (isRequiredFuture && resolved <= new Date()) return { error: 'Choose a date and time in the future.' };
  return { value: resolved.toISOString() };
}

function newChecklistItem(text = '') {
  return { id: `ci-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, text, checked: false };
}

function newTag(label, color) {
  return { id: `tag-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, label, color };
}

function formatDuration(ms) {
  if (!ms) return '0:00';
  const secs = Math.floor(ms / 1000);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function PickerField({ label, value, onPress, theme }) {
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
          <ScrollView>
            {options.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[styles.modalOption, value === option.value && { backgroundColor: theme.primary + '18' }]}
                onPress={() => { onSelect(option.value); onClose(); }}
              >
                <Text style={[styles.modalOptionText, { color: theme.primaryText }]}>{option.label}</Text>
                {value === option.value ? <Text style={{ color: theme.primary }}>✓</Text> : null}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────
export default function NoteForm({
  initialTitle = '',
  initialContent = '',
  initialContentFontSize = DEFAULT_CONTENT_FONT_SIZE,
  initialIsTask = false,
  initialIsChecklist = false,
  initialChecklistItems = [],
  initialDueAt = '',
  initialReminder = { preset: 'none', remindAt: null },
  initialTags = [],
  initialFolder = '',
  initialAttachments = [],
  submitLabel,
  loading,
  onSubmit,
  isEditMode = false,
}) {
  const { theme } = useTheme();
  const { settings } = useSettings();
  const dayOptions = useMemo(() => createDayOptions(), []);
  const timeOptions = useMemo(() => createTimeOptions(), []);
  const initialDueCustomParts = useMemo(() => deriveCustomParts(initialDueAt, dayOptions, timeOptions), [initialDueAt, dayOptions, timeOptions]);
  const initialReminderCustomParts = useMemo(
    () => deriveCustomParts(initialReminder?.remindAt, dayOptions, timeOptions),
    [initialReminder, dayOptions, timeOptions],
  );

  // Core fields
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [contentFontSize, setContentFontSize] = useState(initialContentFontSize);
  const [isTask, setIsTask] = useState(initialIsTask);
  const [selection, setSelection] = useState({ start: initialContent.length, end: initialContent.length });
  const [forcedSelection, setForcedSelection] = useState(null);

  // Due / reminder
  const [duePreset, setDuePreset] = useState(initialDueAt ? 'custom' : 'none');
  const [dueCustomDay, setDueCustomDay] = useState(initialDueCustomParts.day);
  const [dueCustomTime, setDueCustomTime] = useState(initialDueCustomParts.time);
  const [reminderPreset, setReminderPreset] = useState(resolveReminderPreset(initialReminder));
  const [reminderCustomDay, setReminderCustomDay] = useState(initialReminderCustomParts.day);
  const [reminderCustomTime, setReminderCustomTime] = useState(initialReminderCustomParts.time);

  // Checklist
  const [isChecklist, setIsChecklist] = useState(initialIsChecklist);
  const [checklistItems, setChecklistItems] = useState(
    initialChecklistItems.length > 0 ? initialChecklistItems : [newChecklistItem()],
  );

  // Tags
  const [tags, setTags] = useState(initialTags);
  const [tagModalVisible, setTagModalVisible] = useState(false);
  const [tagLabelInput, setTagLabelInput] = useState('');
  const [tagColorPick, setTagColorPick] = useState(TAG_COLORS[5].value);

  // Folder
  const [folder, setFolder] = useState(initialFolder);

  // Attachments
  const [attachments, setAttachments] = useState(initialAttachments);
  const [linkInput, setLinkInput] = useState('');
  const [linkModalVisible, setLinkModalVisible] = useState(false);

  // Audio
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingRef = useRef(null);
  const durationTimerRef = useRef(null);

  // Picker modal
  const [pickerState, setPickerState] = useState(null);
  const [error, setError] = useState('');

  const hasChanges = useMemo(
    () =>
      title.trim() !== initialTitle.trim() ||
      content.trim() !== initialContent.trim() ||
      contentFontSize !== initialContentFontSize ||
      isTask !== initialIsTask ||
      isChecklist !== initialIsChecklist ||
      JSON.stringify(checklistItems) !== JSON.stringify(initialChecklistItems.length > 0 ? initialChecklistItems : [newChecklistItem()]) ||
      duePreset !== (initialDueAt ? 'custom' : 'none') ||
      dueCustomDay !== initialDueCustomParts.day ||
      dueCustomTime !== initialDueCustomParts.time ||
      reminderPreset !== resolveReminderPreset(initialReminder) ||
      reminderCustomDay !== initialReminderCustomParts.day ||
      reminderCustomTime !== initialReminderCustomParts.time ||
      JSON.stringify(tags) !== JSON.stringify(initialTags) ||
      folder !== initialFolder ||
      JSON.stringify(attachments) !== JSON.stringify(initialAttachments),
    [
      title, initialTitle, content, initialContent, contentFontSize, initialContentFontSize,
      isTask, initialIsTask, isChecklist, initialIsChecklist, checklistItems, initialChecklistItems,
      duePreset, initialDueAt, dueCustomDay, dueCustomTime, initialDueCustomParts,
      reminderPreset, initialReminder, reminderCustomDay, reminderCustomTime, initialReminderCustomParts,
      tags, initialTags, folder, initialFolder, attachments, initialAttachments,
    ],
  );

  // ── Text formatting ──────────────────────────────────────────────────────────
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
    const updatedSegment = segment.split('\n').map((line) => `${prefix}${line}`).join('\n');
    const nextContent = `${content.slice(0, lineStart)}${updatedSegment}${content.slice(safeLineEnd)}`;
    const startShift = prefix.length * countPrefixedLines(segment.slice(0, Math.max(0, start - lineStart)));
    const endShift = prefix.length * countPrefixedLines(segment.slice(0, Math.max(0, end - lineStart)));
    setContent(nextContent);
    setSelection({ start: start + startShift, end: end + endShift });
    setForcedSelection({ start: start + startShift, end: end + endShift });
  };

  const changeFontSize = (delta) => {
    setContentFontSize((c) => Math.min(MAX_CONTENT_FONT_SIZE, Math.max(MIN_CONTENT_FONT_SIZE, c + delta)));
  };

  const handleSelectionChange = ({ nativeEvent }) => {
    const next = nativeEvent.selection;
    setSelection(next);
    if (forcedSelection && forcedSelection.start === next.start && forcedSelection.end === next.end) {
      setForcedSelection(null);
    }
  };

  // ── Checklist helpers ────────────────────────────────────────────────────────
  const addChecklistItem = () => setChecklistItems((prev) => [...prev, newChecklistItem()]);
  const removeChecklistItem = (id) => setChecklistItems((prev) => prev.filter((i) => i.id !== id));
  const updateChecklistItemText = (id, text) =>
    setChecklistItems((prev) => prev.map((i) => (i.id === id ? { ...i, text } : i)));
  const toggleChecklistItem = (id) =>
    setChecklistItems((prev) => prev.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)));

  // ── Tag helpers ──────────────────────────────────────────────────────────────
  const addTag = () => {
    const label = tagLabelInput.trim();
    if (!label) return;
    setTags((prev) => [...prev, newTag(label, tagColorPick)]);
    setTagLabelInput('');
    setTagModalVisible(false);
  };
  const removeTag = (id) => setTags((prev) => prev.filter((t) => t.id !== id));

  // ── Attachment helpers ───────────────────────────────────────────────────────
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        const name = asset.fileName || asset.uri.split('/').pop() || 'photo.jpg';
        setAttachments((prev) => [
          ...prev,
          { id: `att-${Date.now()}`, type: 'image', uri: asset.uri, name },
        ]);
      }
    } catch {
      Alert.alert('Error', 'Could not pick image.');
    }
  };

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        setAttachments((prev) => [
          ...prev,
          { id: `att-${Date.now()}`, type: 'file', uri: asset.uri, name: asset.name || 'file' },
        ]);
      }
    } catch {
      Alert.alert('Error', 'Could not pick file.');
    }
  };

  const addLink = () => {
    const uri = linkInput.trim();
    if (!uri) return;
    setAttachments((prev) => [
      ...prev,
      { id: `att-${Date.now()}`, type: 'link', uri, name: uri },
    ]);
    setLinkInput('');
    setLinkModalVisible(false);
  };

  const removeAttachment = (id) => setAttachments((prev) => prev.filter((a) => a.id !== id));

  // ── Audio helpers ────────────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Microphone access is required to record audio.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setRecordingDuration(0);
      setIsRecording(true);
      durationTimerRef.current = setInterval(() => setRecordingDuration((d) => d + 1000), 1000);
    } catch {
      Alert.alert('Error', 'Could not start recording.');
    }
  };

  const stopRecording = async () => {
    try {
      clearInterval(durationTimerRef.current);
      setIsRecording(false);
      const recording = recordingRef.current;
      if (!recording) return;
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI();
      recordingRef.current = null;
      if (uri) {
        setAttachments((prev) => [
          ...prev,
          {
            id: `att-${Date.now()}`,
            type: 'audio',
            uri,
            name: `Voice memo ${new Date().toLocaleTimeString()}`,
            duration: recordingDuration,
          },
        ]);
      }
    } catch {
      Alert.alert('Error', 'Could not stop recording.');
    }
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const openPicker = (config) => setPickerState(config);
  const closePicker = () => setPickerState(null);

  const handleSubmit = async () => {
    if (!title.trim()) { setError('Title is required.'); return; }
    if (!isChecklist && !content.trim()) { setError('Content is required.'); return; }

    const dueResult = isTask
      ? resolveDateValue({ preset: duePreset, customDay: dueCustomDay, customTime: dueCustomTime })
      : { value: null };
    const reminderResult = resolveDateValue({
      preset: reminderPreset, customDay: reminderCustomDay, customTime: reminderCustomTime,
    });

    if (dueResult?.error) { setError(`Due date: ${dueResult.error}`); return; }
    if (reminderResult?.error) { setError(`Reminder: ${reminderResult.error}`); return; }
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
      isChecklist,
      checklistItems: isChecklist ? checklistItems.filter((i) => i.text.trim()) : [],
      dueAt: isTask ? dueResult.value : null,
      reminder: { preset: reminderPreset, remindAt: reminderResult?.value || null },
      tags,
      folder: folder.trim(),
      attachments,
    });
  };

  const styles = makeStyles(theme);

  return (
    <View style={styles.container}>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Title */}
      <Text style={styles.label}>Title</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        style={styles.input}
        placeholder="Enter title"
        placeholderTextColor={theme.secondaryText}
        maxLength={100}
      />

      {/* Checklist toggle */}
      <View style={styles.row}>
        <Text style={styles.label}>Checklist</Text>
        <Switch
          value={isChecklist}
          onValueChange={setIsChecklist}
          trackColor={{ false: theme.border, true: theme.primary }}
          thumbColor={isChecklist ? theme.primary : theme.secondaryText}
        />
      </View>

      {isChecklist ? (
        /* Checklist items */
        <View style={styles.fieldBlock}>
          {checklistItems.map((item) => (
            <View key={item.id} style={styles.checklistRow}>
              <TouchableOpacity onPress={() => toggleChecklistItem(item.id)} style={styles.checkbox}>
                <Text style={[styles.checkboxIcon, item.checked && { color: theme.primary }]}>
                  {item.checked ? '☑' : '☐'}
                </Text>
              </TouchableOpacity>
              <TextInput
                value={item.text}
                onChangeText={(t) => updateChecklistItemText(item.id, t)}
                style={[styles.checklistInput, item.checked && { textDecorationLine: 'line-through', color: theme.secondaryText }]}
                placeholder="Item…"
                placeholderTextColor={theme.secondaryText}
              />
              <TouchableOpacity onPress={() => removeChecklistItem(item.id)} style={styles.checklistRemove}>
                <Text style={{ color: theme.danger, fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.addItemButton} onPress={addChecklistItem}>
            <Text style={[styles.addItemText, { color: theme.primary }]}>+ Add item</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Content text editor */
        <>
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
        </>
      )}

      {/* Tags */}
      <Text style={styles.label}>Tags</Text>
      <View style={styles.tagsRow}>
        {tags.map((tag) => (
          <TouchableOpacity
            key={tag.id}
            style={[styles.tagChip, { backgroundColor: tag.color + '28', borderColor: tag.color }]}
            onPress={() => removeTag(tag.id)}
          >
            <View style={[styles.tagDot, { backgroundColor: tag.color }]} />
            <Text style={[styles.tagLabel, { color: tag.color }]}>{tag.label}</Text>
            <Text style={[styles.tagRemove, { color: tag.color }]}>✕</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={[styles.addTagButton, { borderColor: theme.primary }]} onPress={() => setTagModalVisible(true)}>
          <Text style={{ color: theme.primary, fontWeight: '700' }}>+ Tag</Text>
        </TouchableOpacity>
      </View>

      {/* Folder */}
      <Text style={styles.label}>Folder (for Archive)</Text>
      <TextInput
        value={folder}
        onChangeText={setFolder}
        style={styles.input}
        placeholder="e.g. Work, Personal…"
        placeholderTextColor={theme.secondaryText}
        maxLength={50}
      />

      {/* Attachments */}
      <Text style={styles.label}>Attachments</Text>
      {attachments.map((att) => (
        <View key={att.id} style={styles.attachmentRow}>
          {att.type === 'image' ? (
            <Image source={{ uri: att.uri }} style={styles.attachmentThumb} />
          ) : (
            <Text style={styles.attachmentIcon}>
              {att.type === 'audio' ? '🎙' : att.type === 'link' ? '🔗' : '📄'}
            </Text>
          )}
          <Text style={[styles.attachmentName, { color: theme.primaryText }]} numberOfLines={1}>
            {att.name}
            {att.type === 'audio' && att.duration ? `  (${formatDuration(att.duration)})` : ''}
          </Text>
          <TouchableOpacity onPress={() => removeAttachment(att.id)}>
            <Text style={{ color: theme.danger, fontWeight: '700', marginLeft: 8 }}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}
      <View style={styles.attachmentButtons}>
        <TouchableOpacity style={styles.attachBtn} onPress={pickImage}>
          <Text style={[styles.attachBtnText, { color: theme.primary }]}>📷 Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.attachBtn} onPress={pickFile}>
          <Text style={[styles.attachBtnText, { color: theme.primary }]}>📄 File</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.attachBtn} onPress={() => setLinkModalVisible(true)}>
          <Text style={[styles.attachBtnText, { color: theme.primary }]}>🔗 Link</Text>
        </TouchableOpacity>
        {settings.audioNotesEnabled && (
          <TouchableOpacity
            style={[styles.attachBtn, isRecording && { borderColor: theme.danger }]}
            onPress={isRecording ? stopRecording : startRecording}
          >
            <Text style={[styles.attachBtnText, { color: isRecording ? theme.danger : theme.primary }]}>
              {isRecording ? `⏹ ${formatDuration(recordingDuration)}` : '🎙 Record'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Task toggle */}
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
            onPress={() => openPicker({ title: 'Choose due date', options: DUE_DATE_PRESET_OPTIONS, value: duePreset, onSelect: setDuePreset })}
            theme={theme}
          />
          {duePreset === 'custom' ? (
            <View style={styles.customRow}>
              <View style={styles.customColumn}>
                <PickerField
                  label="Due day"
                  value={formatValueLabel(dueCustomDay, dayOptions)}
                  onPress={() => openPicker({ title: 'Choose day', options: dayOptions, value: dueCustomDay, onSelect: setDueCustomDay })}
                  theme={theme}
                />
              </View>
              <View style={styles.customColumn}>
                <PickerField
                  label="Due time"
                  value={formatValueLabel(dueCustomTime, timeOptions)}
                  onPress={() => openPicker({ title: 'Choose time', options: timeOptions, value: dueCustomTime, onSelect: setDueCustomTime })}
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
        onPress={() => openPicker({ title: 'Choose reminder', options: REMINDER_PRESET_OPTIONS, value: reminderPreset, onSelect: setReminderPreset })}
        theme={theme}
      />
      <Text style={styles.hint}>Notes and tasks only notify you when you choose a reminder.</Text>
      {reminderPreset === 'custom' ? (
        <View style={styles.customRow}>
          <View style={styles.customColumn}>
            <PickerField
              label="Reminder day"
              value={formatValueLabel(reminderCustomDay, dayOptions)}
              onPress={() => openPicker({ title: 'Choose reminder day', options: dayOptions, value: reminderCustomDay, onSelect: setReminderCustomDay })}
              theme={theme}
            />
          </View>
          <View style={styles.customColumn}>
            <PickerField
              label="Reminder time"
              value={formatValueLabel(reminderCustomTime, timeOptions)}
              onPress={() => openPicker({ title: 'Choose reminder time', options: timeOptions, value: reminderCustomTime, onSelect: setReminderCustomTime })}
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

      {/* Option picker modal */}
      <OptionPickerModal
        visible={!!pickerState}
        title={pickerState?.title}
        options={pickerState?.options || []}
        value={pickerState?.value}
        onSelect={(v) => pickerState?.onSelect?.(v)}
        onClose={closePicker}
        theme={theme}
      />

      {/* Tag add modal */}
      <Modal transparent visible={tagModalVisible} animationType="fade" onRequestClose={() => setTagModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setTagModalVisible(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border, padding: 16 }]}>
            <Text style={[styles.modalTitle, { color: theme.primaryText }]}>Add Tag</Text>
            <TextInput
              value={tagLabelInput}
              onChangeText={setTagLabelInput}
              style={[styles.input, { marginBottom: 12 }]}
              placeholder="Tag name"
              placeholderTextColor={theme.secondaryText}
              maxLength={30}
            />
            <Text style={[styles.label, { marginBottom: 8 }]}>Colour</Text>
            <View style={styles.colorRow}>
              {TAG_COLORS.map((c) => (
                <TouchableOpacity
                  key={c.value}
                  style={[styles.colorSwatch, { backgroundColor: c.value }, tagColorPick === c.value && styles.colorSwatchSelected]}
                  onPress={() => setTagColorPick(c.value)}
                />
              ))}
            </View>
            <TouchableOpacity style={[styles.button, { marginTop: 16 }]} onPress={addTag}>
              <Text style={styles.buttonText}>Add</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Link add modal */}
      <Modal transparent visible={linkModalVisible} animationType="fade" onRequestClose={() => setLinkModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setLinkModalVisible(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border, padding: 16 }]}>
            <Text style={[styles.modalTitle, { color: theme.primaryText }]}>Add Web Link</Text>
            <TextInput
              value={linkInput}
              onChangeText={setLinkInput}
              style={[styles.input, { marginBottom: 12 }]}
              placeholder="https://…"
              placeholderTextColor={theme.secondaryText}
              autoCapitalize="none"
              keyboardType="url"
            />
            <TouchableOpacity style={styles.button} onPress={addLink}>
              <Text style={styles.buttonText}>Add Link</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
    fieldBlock: { marginBottom: 14 },
    error: { color: theme.danger, marginBottom: 10, fontWeight: '600' },
    label: { color: theme.primaryText, fontWeight: '600', marginBottom: 6 },
    hint: { color: theme.secondaryText, fontSize: 11, marginBottom: 12, marginTop: -8 },
    toolbar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
    toolbarButton: {
      borderWidth: 1, borderColor: theme.border, backgroundColor: theme.inputBg,
      borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8,
    },
    toolbarButtonText: { color: theme.primaryText, fontWeight: '600', fontSize: 12 },
    input: {
      borderWidth: 1, borderColor: theme.border, borderRadius: 8,
      paddingHorizontal: 12, paddingVertical: 10, marginBottom: 14,
      backgroundColor: theme.inputBg, color: theme.primaryText,
    },
    contentInput: { minHeight: 140 },
    selectField: {
      borderWidth: 1, borderColor: theme.border, borderRadius: 8,
      paddingHorizontal: 12, paddingVertical: 12, backgroundColor: theme.inputBg,
    },
    selectFieldText: { color: theme.primaryText },
    preview: {
      borderWidth: 1, borderColor: theme.border, borderRadius: 8,
      backgroundColor: theme.inputBg, paddingHorizontal: 12, paddingVertical: 10,
      marginBottom: 14, minHeight: 90,
    },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    customRow: { flexDirection: 'row', gap: 12 },
    customColumn: { flex: 1 },
    button: { backgroundColor: theme.primary, borderRadius: 10, alignItems: 'center', paddingVertical: 12 },
    buttonDisabled: { opacity: 0.5 },
    buttonText: { color: '#FFF', fontWeight: '700' },
    // Checklist
    checklistRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    checkbox: { marginRight: 8 },
    checkboxIcon: { fontSize: 20, color: theme.secondaryText },
    checklistInput: {
      flex: 1, borderWidth: 1, borderColor: theme.border, borderRadius: 8,
      paddingHorizontal: 10, paddingVertical: 8, backgroundColor: theme.inputBg, color: theme.primaryText,
    },
    checklistRemove: { marginLeft: 8, padding: 4 },
    addItemButton: { marginTop: 4, alignSelf: 'flex-start' },
    addItemText: { fontWeight: '700' },
    // Tags
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    tagChip: {
      flexDirection: 'row', alignItems: 'center', borderWidth: 1,
      borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    },
    tagDot: { width: 8, height: 8, borderRadius: 4, marginRight: 5 },
    tagLabel: { fontWeight: '600', fontSize: 12 },
    tagRemove: { marginLeft: 5, fontSize: 11 },
    addTagButton: {
      borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    },
    // Attachments
    attachmentRow: {
      flexDirection: 'row', alignItems: 'center', marginBottom: 8,
      padding: 8, borderWidth: 1, borderColor: theme.border, borderRadius: 8,
      backgroundColor: theme.inputBg,
    },
    attachmentThumb: { width: 36, height: 36, borderRadius: 4, marginRight: 8 },
    attachmentIcon: { fontSize: 20, marginRight: 8 },
    attachmentName: { flex: 1, fontSize: 13 },
    attachmentButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    attachBtn: {
      borderWidth: 1, borderColor: theme.border, borderRadius: 8,
      paddingHorizontal: 12, paddingVertical: 8, backgroundColor: theme.inputBg,
    },
    attachBtnText: { fontWeight: '600', fontSize: 13 },
    // Modals
    modalOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.35)',
      justifyContent: 'center', paddingHorizontal: 20,
    },
    modalCard: {
      borderWidth: 1, borderRadius: 16, maxHeight: '70%', overflow: 'hidden',
    },
    modalTitle: { fontSize: 16, fontWeight: '700', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
    modalOption: {
      paddingHorizontal: 16, paddingVertical: 14,
      borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border,
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    },
    modalOptionText: { fontSize: 15 },
    // Color swatches
    colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    colorSwatch: { width: 30, height: 30, borderRadius: 15 },
    colorSwatchSelected: { borderWidth: 3, borderColor: '#fff' },
  });
}
