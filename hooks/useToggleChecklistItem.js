import { useCallback } from 'react';
import { Alert } from 'react-native';
import { updateNote } from '../services/storageService';

/**
 * Returns a stable `toggleChecklistItem(note, itemId)` handler that flips
 * one checklist item's checked state, auto-marks the note complete when all
 * items are ticked, then calls `onRefresh()` to reload the note list.
 */
export function useToggleChecklistItem(onRefresh) {
  return useCallback(
    async (note, itemId) => {
      const updatedItems = note.checklistItems.map((item) =>
        item.id === itemId ? { ...item, checked: !item.checked } : item,
      );
      const allChecked =
        updatedItems.length > 0 && updatedItems.every((item) => item.checked);
      try {
        await updateNote(note.id, {
          ...note,
          checklistItems: updatedItems,
          completed: allChecked ? true : note.completed,
        });
        await onRefresh();
      } catch (err) {
        Alert.alert('Error', err.message || 'Unable to update checklist.');
      }
    },
    [onRefresh],
  );
}
