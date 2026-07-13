import React, { useState, useEffect, useCallback } from 'react';
import { useModalBehavior } from '../hooks/useModalBehavior';
import ModalCloseButton from './ModalCloseButton';
import '../styles/ModalCommon.css';

const pad2 = (n) => String(n).padStart(2, '0');
const toDateInput = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const toTimeInput = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

// Add/edit a manual time entry. Pure form: collects the fields and hands a
// normalized entry to onSave; the caller persists and adjusts timeTracked.
const TimeEntryModal = ({ isOpen, onClose, projects, initial, defaultProjectId, onSave }) => {
  const [projectId, setProjectId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [hours, setHours] = useState('0');
  const [minutes, setMinutes] = useState('25');
  const [description, setDescription] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const { trapRef } = useModalBehavior(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setSaving(false);
    if (initial) {
      const start = new Date(initial.timestamp);
      setProjectId(initial.projectId || '');
      setDate(toDateInput(start));
      setTime(toTimeInput(start));
      setHours(String(Math.floor((initial.duration || 0) / 60)));
      setMinutes(String((initial.duration || 0) % 60));
      setDescription(initial.description || '');
      setTagsText((initial.tags || []).join(', '));
    } else {
      const now = new Date();
      setProjectId(defaultProjectId || '');
      setDate(toDateInput(now));
      setTime(toTimeInput(now));
      setHours('0');
      setMinutes('25');
      setDescription('');
      setTagsText('');
    }
  }, [isOpen, initial, defaultProjectId]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    const duration = (parseInt(hours, 10) || 0) * 60 + (parseInt(minutes, 10) || 0);
    if (duration < 1) {
      setError('Duration must be at least 1 minute.');
      return;
    }
    if (!date || !time) {
      setError('Date and start time are required.');
      return;
    }
    const startedAt = new Date(`${date}T${time}`);
    if (Number.isNaN(startedAt.getTime())) {
      setError('Invalid date or time.');
      return;
    }
    const tags = tagsText
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 5);

    setSaving(true);
    const result = await onSave({
      projectId: projectId || null,
      startedAt: startedAt.toISOString(),
      duration,
      description: description.trim(),
      tags
    });
    setSaving(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    onClose();
  }, [hours, minutes, date, time, tagsText, projectId, description, onSave, onClose]);

  if (!isOpen) return null;

  return (
    <div className='pompay-modal' onClick={onClose}>
      <div
        className='pompay-modal-card'
        onClick={(e) => e.stopPropagation()}
        role='dialog'
        aria-modal='true'
        aria-labelledby='time-entry-modal-title'
        ref={trapRef}
      >
        <div className='pompay-modal-head'>
          <h3 id='time-entry-modal-title'>{initial ? 'Edit Time Entry' : 'Add Time'}</h3>
          <ModalCloseButton onClick={onClose} />
        </div>
        <form onSubmit={handleSubmit} className='pompay-modal-body'>
          <div className='pompay-field'>
            <label htmlFor='te-project'>Project</label>
            <select
              id='te-project'
              className='pompay-input'
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value=''>No Project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className='pompay-field-row'>
            <div className='pompay-field'>
              <label htmlFor='te-date'>Date *</label>
              <input
                id='te-date'
                type='date'
                className='pompay-input'
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className='pompay-field'>
              <label htmlFor='te-time'>Start time *</label>
              <input
                id='te-time'
                type='time'
                className='pompay-input'
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className='pompay-field-row'>
            <div className='pompay-field'>
              <label htmlFor='te-hours'>Hours</label>
              <input
                id='te-hours'
                type='number'
                className='pompay-input'
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                min='0'
                max='24'
                step='1'
              />
            </div>
            <div className='pompay-field'>
              <label htmlFor='te-minutes'>Minutes</label>
              <input
                id='te-minutes'
                type='number'
                className='pompay-input'
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                min='0'
                max='59'
                step='1'
              />
            </div>
          </div>

          <div className='pompay-field'>
            <label htmlFor='te-description'>Description</label>
            <input
              id='te-description'
              type='text'
              className='pompay-input'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='What did you work on?'
              maxLength={100}
            />
          </div>

          <div className='pompay-field'>
            <label htmlFor='te-tags'>Tags (comma-separated)</label>
            <input
              id='te-tags'
              type='text'
              className='pompay-input'
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder='client, design'
            />
          </div>

          {error && <p className='pompay-form-error' role='alert'>{error}</p>}

          <div className='pompay-modal-actions'>
            <button type='button' className='pompay-btn-cancel' onClick={onClose}>
              Cancel
            </button>
            <button type='submit' className='pompay-btn-confirm' disabled={saving}>
              {saving ? 'Saving…' : initial ? 'Save Changes' : 'Add Time'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TimeEntryModal;
