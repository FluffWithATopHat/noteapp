import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTES_KEY = '@noteapp:notes';

function sortNewestFirst(notes) {
  return [...notes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function getNotes() {
  try {
    const rawValue = await AsyncStorage.getItem(NOTES_KEY);
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? sortNewestFirst(parsed) : [];
  } catch (error) {
    throw new Error('Unable to load notes.');
  }
}

async function saveNotes(notes) {
  try {
    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  } catch (error) {
    throw new Error('Unable to save notes.');
  }
}

export async function addNote(noteInput) {
  const notes = await getNotes();
  const now = new Date().toISOString();
  const note = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: noteInput.title,
    content: noteInput.content,
    createdAt: now,
    updatedAt: now,
  };

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

    updatedNote = { ...note, title: noteInput.title, content: noteInput.content, updatedAt: new Date().toISOString() };
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
