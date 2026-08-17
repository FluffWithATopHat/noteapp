import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_CONTENT_FONT_SIZE } from '../constants/editor';

const NOTES_KEY = '@noteapp:notes';

function sortNewestFirst(notes) {
  return [...notes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function normalizeReminder(note) {
  if (note?.reminder && typeof note.reminder === 'object') {
    return {
      preset: note.reminder.preset || 'none',
      remindAt: note.reminder.remindAt || null,
    };
  }

  return {
    preset: 'none',
    remindAt: null,
  };
}

function normalizeNote(note) {
  return {
    id: note.id,
    title: note.title || '',
    content: note.content || '',
    contentFontSize: note.contentFontSize || DEFAULT_CONTENT_FONT_SIZE,
    isTask: !!note.isTask,
    dueAt: note.dueAt || null,
    completed: !!note.completed,
    archived: !!note.archived,
    archivedAt: note.archivedAt || null,
    reminder: normalizeReminder(note),
    notificationId: note.notificationId || note.reminderId || null,
    reminderId: note.reminderId || null,
    followUpId: note.followUpId || null,
    createdAt: note.createdAt || new Date().toISOString(),
    updatedAt: note.updatedAt || note.createdAt || new Date().toISOString(),
  };
}

export async function getNotes() {
  try {
    const rawValue = await AsyncStorage.getItem(NOTES_KEY);
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? sortNewestFirst(parsed.map(normalizeNote)) : [];
  } catch (error) {
    throw new Error('Unable to load notes.');
  }
}

async function saveNotes(notes) {
  try {
    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes.map(normalizeNote)));
  } catch (error) {
    throw new Error('Unable to save notes.');
  }
}

export async function addNote(noteInput) {
  const notes = await getNotes();
  const now = new Date().toISOString();
  const note = normalizeNote({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: noteInput.title,
    content: noteInput.content,
    contentFontSize: noteInput.contentFontSize || DEFAULT_CONTENT_FONT_SIZE,
    isTask: noteInput.isTask || false,
    dueAt: noteInput.dueAt || null,
    completed: false,
    archived: noteInput.archived || false,
    archivedAt: noteInput.archivedAt || null,
    reminder: noteInput.reminder,
    notificationId: noteInput.notificationId || null,
    createdAt: now,
    updatedAt: now,
  });

  const updated = sortNewestFirst([note, ...notes]);
  await saveNotes(updated);
  return note;
}

export async function updateNote(noteId, noteInput) {
  const notes = await getNotes();
  let updatedNote = null;
  const updated = notes.map((note) => {
    if (note.id !== noteId) {
      return note;
    }

    updatedNote = normalizeNote({
      ...note,
      ...noteInput,
      contentFontSize: noteInput.contentFontSize !== undefined ? noteInput.contentFontSize : note.contentFontSize,
      isTask: noteInput.isTask !== undefined ? noteInput.isTask : note.isTask,
      dueAt: noteInput.isTask === false ? null : noteInput.dueAt !== undefined ? noteInput.dueAt : note.dueAt,
      completed: noteInput.completed !== undefined ? noteInput.completed : note.completed,
      archived: noteInput.archived !== undefined ? noteInput.archived : note.archived,
      archivedAt: noteInput.archived !== undefined
        ? (noteInput.archived ? noteInput.archivedAt || new Date().toISOString() : null)
        : note.archivedAt,
      reminder: noteInput.reminder !== undefined ? noteInput.reminder : note.reminder,
      notificationId: noteInput.notificationId !== undefined ? noteInput.notificationId : note.notificationId,
      updatedAt: new Date().toISOString(),
    });
    return updatedNote;
  });

  if (!updatedNote) {
    throw new Error('Note not found.');
  }

  await saveNotes(updated);
  return updatedNote;
}

export async function deleteNote(noteId) {
  const notes = await getNotes();
  const updated = notes.filter((note) => note.id !== noteId);

  if (updated.length === notes.length) {
    throw new Error('Note not found.');
  }

  await saveNotes(updated);
}
