import { useState, useCallback } from 'react';
import { useProjects } from './useProjects';
import { usePomodoroSessions } from './usePomodoroSessions';
import { useDialog } from '../contexts/DialogContext';

// Shared add/edit/delete behavior for manual time entries (TimeEntryModal
// hosts). Owns the modal state and keeps project timeTracked in step with
// every mutation, mirroring how Timer call sites apply deltas.
export const useTimeEntryActions = () => {
  const { projects, updateProject } = useProjects();
  const { saveSession, updateSession, deleteSession } = usePomodoroSessions();
  const { confirm, showToast } = useDialog();

  const [showTimeModal, setShowTimeModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  const openAddTime = useCallback(() => {
    setEditingEntry(null);
    setShowTimeModal(true);
  }, []);

  const openEditTime = useCallback((entry) => {
    setEditingEntry(entry);
    setShowTimeModal(true);
  }, []);

  const closeTimeModal = useCallback(() => {
    setShowTimeModal(false);
    setEditingEntry(null);
  }, []);

  const adjustTimeTracked = async (projectId, deltaMinutes) => {
    if (!projectId || !deltaMinutes) return;
    const target = projects.find((p) => String(p.id) === String(projectId));
    if (!target) return;
    await updateProject(target.id, {
      timeTracked: Math.max(0, (target.timeTracked || 0) + deltaMinutes)
    });
  };

  const saveTimeEntry = async (entry) => {
    if (editingEntry) {
      const result = await updateSession(
        editingEntry.id,
        editingEntry.date,
        editingEntry.timestamp,
        entry
      );
      if (result.error) return result;

      const oldPid = editingEntry.projectId ? String(editingEntry.projectId) : null;
      const newPid = entry.projectId ? String(entry.projectId) : null;
      if (oldPid === newPid) {
        await adjustTimeTracked(newPid, entry.duration - editingEntry.duration);
      } else {
        await adjustTimeTracked(oldPid, -editingEntry.duration);
        await adjustTimeTracked(newPid, entry.duration);
      }
      showToast('Time entry updated', { type: 'success' });
      return { error: null };
    }

    const result = await saveSession({
      mode: 'focus',
      duration: entry.duration,
      projectId: entry.projectId,
      description: entry.description,
      wasSuccessful: true,
      startedAt: entry.startedAt,
      endedAt: new Date(new Date(entry.startedAt).getTime() + entry.duration * 60000).toISOString(),
      tags: entry.tags
    });
    if (result.error) return result;
    if (!result.queued) {
      await adjustTimeTracked(entry.projectId, entry.duration);
    }
    showToast('Time added', { type: 'success' });
    return { error: null };
  };

  const deleteTimeEntry = async (entry) => {
    const ok = await confirm('Delete this session?', {
      title: 'Delete Session',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel'
    });
    if (!ok) return false;
    await deleteSession(entry.id, entry.date, entry.timestamp);
    await adjustTimeTracked(entry.projectId, -entry.duration);
    showToast('Session deleted', { type: 'success' });
    return true;
  };

  return {
    showTimeModal,
    editingEntry,
    openAddTime,
    openEditTime,
    closeTimeModal,
    saveTimeEntry,
    deleteTimeEntry
  };
};
