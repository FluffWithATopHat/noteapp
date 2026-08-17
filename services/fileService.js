import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { formatReminderDate } from './notificationService';

function serializeNote(note) {
  return [
    `Title: ${note.title}`,
    `Created: ${new Date(note.createdAt).toLocaleString()}`,
    `Updated: ${new Date(note.updatedAt).toLocaleString()}`,
    `Type: ${note.isTask ? 'Task' : 'Note'}`,
    `Archived: ${note.archived ? 'Yes' : 'No'}`,
    `Due: ${note.dueAt ? new Date(note.dueAt).toLocaleString() : 'None'}`,
    `Reminder: ${formatReminderDate(note.reminder?.remindAt) || 'None'}`,
    '',
    note.content,
  ].join('\n');
}

export async function exportSingleNote(note) {
  if (!note) {
    throw new Error('No note provided for export.');
  }

  const fileName = `note-${note.id}.txt`;
  const path = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(path, serializeNote(note), { encoding: FileSystem.EncodingType.UTF8 });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, { mimeType: 'text/plain', dialogTitle: 'Export note' });
  }

  return path;
}

export async function exportAllNotes(notes) {
  if (!Array.isArray(notes) || notes.length === 0) {
    throw new Error('No notes available to export.');
  }

  const output = notes.map((note, index) => `# Note ${index + 1}\n${serializeNote(note)}`).join('\n\n-----\n\n');
  const path = `${FileSystem.cacheDirectory}all-notes-${Date.now()}.txt`;
  await FileSystem.writeAsStringAsync(path, output, { encoding: FileSystem.EncodingType.UTF8 });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, { mimeType: 'text/plain', dialogTitle: 'Export notes' });
  }

  return path;
}
