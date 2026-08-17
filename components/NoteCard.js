import React, { useState, useEffect, useRef } from 'react';
import { Image, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';
import { useTheme } from '../context/ThemeContext';
import { DEFAULT_CONTENT_FONT_SIZE } from '../constants/editor';
import FormattedText from './FormattedText';
import { formatReminderDate } from '../services/notificationService';

function formatDate(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleString();
}

function isOverdue(dueAt) {
  if (!dueAt) return false;
  return new Date(dueAt) < new Date();
}

function formatDuration(ms) {
  if (!ms) return '0:00';
  const secs = Math.floor(ms / 1000);
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
}

export default function NoteCard({
  note,
  onPress,
  onDelete,
  onExport,
  onToggleComplete,
  onArchiveToggle,
  onToggleChecklistItem,
  archivedView = false,
}) {
  const { theme } = useTheme();
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const [soundObj, setSoundObj] = useState(null);
  const soundRef = useRef(null);

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const overdue = note.isTask && !note.completed && isOverdue(note.dueAt);
  const reminderText = formatReminderDate(note.reminder?.remindAt);

  const checklistTotal = note.isChecklist ? (note.checklistItems?.length || 0) : 0;
  const checklistDone = note.isChecklist ? (note.checklistItems?.filter((i) => i.checked).length || 0) : 0;

  const audioAttachments = (note.attachments || []).filter((a) => a.type === 'audio');
  const imageAttachments = (note.attachments || []).filter((a) => a.type === 'image');
  const fileAttachments = (note.attachments || []).filter((a) => a.type === 'file');
  const linkAttachments = (note.attachments || []).filter((a) => a.type === 'link');

  const playAudio = async (att) => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
        setSoundObj(null);
        setPlayingAudioId(null);
        if (playingAudioId === att.id) return;
      }
      const { sound } = await Audio.Sound.createAsync({ uri: att.uri });
      soundRef.current = sound;
      setSoundObj(sound);
      setPlayingAudioId(att.id);
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          sound.unloadAsync();
          soundRef.current = null;
          setSoundObj(null);
          setPlayingAudioId(null);
        }
      });
    } catch {
      setPlayingAudioId(null);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: note.completed ? theme.taskDoneBg : theme.surface,
          borderColor: overdue ? theme.danger : theme.border,
          opacity: note.archived ? 0.9 : 1,
        },
      ]}
    >
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {/* Badges */}
        <View style={styles.titleRow}>
          {note.isTask && (
            <Text style={[styles.taskBadge, { backgroundColor: theme.primary + '22', color: theme.primary }]}>Task</Text>
          )}
          {note.isChecklist && (
            <Text style={[styles.taskBadge, { backgroundColor: theme.primary + '22', color: theme.primary }]}>Checklist</Text>
          )}
          {!note.isTask && reminderText && (
            <Text style={[styles.taskBadge, { backgroundColor: theme.primary + '22', color: theme.primary }]}>Reminder</Text>
          )}
          {overdue && (
            <Text style={[styles.taskBadge, { backgroundColor: theme.badgeBg, color: theme.badgeText }]}>Overdue</Text>
          )}
          {note.completed && (
            <Text style={[styles.taskBadge, { backgroundColor: theme.taskDoneBg, color: theme.taskDoneText }]}>Done</Text>
          )}
          {archivedView && (
            <Text style={[styles.taskBadge, { backgroundColor: theme.border, color: theme.secondaryText }]}>Archived</Text>
          )}
        </View>

        {/* Coloured tags */}
        {note.tags && note.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {note.tags.map((tag) => (
              <View key={tag.id} style={[styles.tagChip, { backgroundColor: tag.color + '28', borderColor: tag.color }]}>
                <View style={[styles.tagDot, { backgroundColor: tag.color }]} />
                <Text style={[styles.tagLabel, { color: tag.color }]}>{tag.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Title */}
        <Text
          style={[
            styles.title,
            { color: note.completed ? theme.secondaryText : theme.primaryText },
            note.completed && styles.strikethrough,
          ]}
        >
          {note.title}
        </Text>

        {/* Checklist items preview */}
        {note.isChecklist && checklistTotal > 0 ? (
          <View style={styles.checklistPreview}>
            <Text style={[styles.checklistProgress, { color: theme.secondaryText }]}>
              {checklistDone}/{checklistTotal} done
            </Text>
            {note.checklistItems.slice(0, 4).map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.checklistItemRow}
                onPress={() => onToggleChecklistItem && onToggleChecklistItem(item.id)}
              >
                <Text style={[styles.checklistIcon, item.checked && { color: theme.primary }]}>
                  {item.checked ? '☑' : '☐'}
                </Text>
                <Text
                  style={[
                    styles.checklistItemText,
                    { color: item.checked ? theme.secondaryText : theme.primaryText },
                    item.checked && styles.strikethrough,
                  ]}
                  numberOfLines={1}
                >
                  {item.text}
                </Text>
              </TouchableOpacity>
            ))}
            {checklistTotal > 4 && (
              <Text style={[styles.checklistMore, { color: theme.secondaryText }]}>+{checklistTotal - 4} more…</Text>
            )}
          </View>
        ) : (
          <FormattedText
            content={note.content}
            fontSize={note.contentFontSize || DEFAULT_CONTENT_FONT_SIZE}
            numberOfLines={3}
            style={[styles.content, { color: theme.secondaryText }]}
          />
        )}

        {/* Image thumbnails */}
        {imageAttachments.length > 0 && (
          <View style={styles.thumbRow}>
            {imageAttachments.slice(0, 3).map((a) => (
              <Image key={a.id} source={{ uri: a.uri }} style={styles.thumb} />
            ))}
            {imageAttachments.length > 3 && (
              <View style={[styles.thumb, styles.thumbMore, { backgroundColor: theme.border }]}>
                <Text style={{ color: theme.secondaryText, fontSize: 11 }}>+{imageAttachments.length - 3}</Text>
              </View>
            )}
          </View>
        )}

        {/* File / link / audio attachment badges */}
        {(fileAttachments.length > 0 || linkAttachments.length > 0) && (
          <View style={styles.attBadges}>
            {fileAttachments.length > 0 && (
              <Text style={[styles.attBadge, { color: theme.secondaryText }]}>📄 {fileAttachments.length} file{fileAttachments.length > 1 ? 's' : ''}</Text>
            )}
            {linkAttachments.length > 0 && (
              <Text style={[styles.attBadge, { color: theme.secondaryText }]}>🔗 {linkAttachments.length} link{linkAttachments.length > 1 ? 's' : ''}</Text>
            )}
          </View>
        )}

        <Text style={[styles.date, { color: theme.secondaryText }]}>Created: {formatDate(note.createdAt)}</Text>
        {note.dueAt && (
          <Text style={[styles.date, { color: overdue ? theme.danger : theme.secondaryText }]}>Due: {formatDate(note.dueAt)}</Text>
        )}
        {reminderText && (
          <Text style={[styles.date, { color: theme.primary }]}>Reminder: {reminderText}</Text>
        )}
      </TouchableOpacity>

      {/* Audio play buttons */}
      {audioAttachments.length > 0 && (
        <View style={styles.audioRow}>
          {audioAttachments.map((att) => (
            <TouchableOpacity key={att.id} style={[styles.audioBtn, { borderColor: theme.primary }]} onPress={() => playAudio(att)}>
              <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 13 }}>
                {playingAudioId === att.id ? '⏹ Stop' : '▶ Play'}
              </Text>
              {att.duration ? (
                <Text style={{ color: theme.secondaryText, fontSize: 11, marginLeft: 4 }}>
                  {formatDuration(att.duration)}
                </Text>
              ) : null}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.actions}>
        {note.isTask && !archivedView && (
          <TouchableOpacity onPress={() => onToggleComplete && onToggleComplete(!note.completed)}>
            <Text style={[styles.actionText, { color: note.completed ? theme.secondaryText : theme.taskDoneText }]}>
              {note.completed ? 'Undo' : 'Done'}
            </Text>
          </TouchableOpacity>
        )}
        {note.isChecklist && !archivedView && (
          <TouchableOpacity onPress={() => onToggleComplete && onToggleComplete(!note.completed)}>
            <Text style={[styles.actionText, { color: note.completed ? theme.secondaryText : theme.taskDoneText }]}>
              {note.completed ? 'Undo Done' : 'Mark Done'}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onExport}>
          <Text style={[styles.actionText, { color: theme.primary }]}>Export</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onArchiveToggle}>
          <Text style={[styles.actionText, { color: theme.primary }]}>{archivedView ? 'Restore' : 'Archive'}</Text>
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
    borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 12,
  },
  titleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  taskBadge: {
    fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 20, overflow: 'hidden',
  },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  tagChip: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1,
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2,
  },
  tagDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  tagLabel: { fontSize: 11, fontWeight: '600' },
  title: { fontSize: 16, fontWeight: '700' },
  strikethrough: { textDecorationLine: 'line-through' },
  content: { marginTop: 6 },
  checklistPreview: { marginTop: 6, marginBottom: 4 },
  checklistProgress: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  checklistItemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  checklistIcon: { fontSize: 16, marginRight: 6 },
  checklistItemText: { flex: 1, fontSize: 14 },
  checklistMore: { fontSize: 12, marginTop: 2 },
  thumbRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  thumb: { width: 56, height: 56, borderRadius: 6 },
  thumbMore: { justifyContent: 'center', alignItems: 'center' },
  attBadges: { flexDirection: 'row', gap: 10, marginTop: 6 },
  attBadge: { fontSize: 12 },
  date: { marginTop: 8, fontSize: 12 },
  audioRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  audioBtn: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  actions: {
    marginTop: 10, flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 16,
  },
  actionText: { fontWeight: '700' },
});
