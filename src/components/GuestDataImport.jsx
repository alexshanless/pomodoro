import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDialog } from '../contexts/DialogContext';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { countGuestData, migrateGuestData } from '../utils/guestMigration';

const declinedKey = (userId) => `guestImportDeclined-${userId}`;

// After sign-in, offers a one-time import of any guest data left on this
// device (localStorage projects/sessions/transactions/goals) into the account.
const GuestDataImport = () => {
  const { user } = useAuth();
  const { confirm, showToast } = useDialog();
  const promptedRef = useRef(false);

  useEffect(() => {
    if (!user || !isSupabaseConfigured || !supabase) {
      promptedRef.current = false;
      return;
    }
    if (promptedRef.current) return;
    if (localStorage.getItem(declinedKey(user.id)) === 'true') return;

    const counts = countGuestData();
    if (!counts.hasData) return;
    promptedRef.current = true;

    const parts = [];
    if (counts.projects) parts.push(`${counts.projects} project${counts.projects === 1 ? '' : 's'}`);
    if (counts.sessions) parts.push(`${counts.sessions} session${counts.sessions === 1 ? '' : 's'}`);
    if (counts.transactions) parts.push(`${counts.transactions} transaction${counts.transactions === 1 ? '' : 's'}`);

    (async () => {
      const accepted = await confirm(
        `This device has guest data (${parts.join(', ')}). Import it into your account so it syncs everywhere?`,
        { title: 'Import your data', confirmLabel: 'Import', cancelLabel: 'Keep local only' }
      );

      if (!accepted) {
        localStorage.setItem(declinedKey(user.id), 'true');
        return;
      }

      try {
        await migrateGuestData(user.id);
        showToast('Guest data imported to your account.', { type: 'success' });
        setTimeout(() => window.location.reload(), 1200);
      } catch (err) {
        console.error('Guest data import failed:', err);
        showToast(
          'Import failed part-way — nothing was lost. It will resume next time you sign in.',
          { type: 'error' }
        );
      }
    })();
  }, [user, confirm, showToast]);

  return null;
};

export default GuestDataImport;
