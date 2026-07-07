import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

const STORAGE_KEY_NOTIFICATION_SETTINGS = 'notificationSettings';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export function isPushSupported() {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export async function ensurePushSubscription(user) {
  try {
    if (
      !user ||
      !isSupabaseConfigured ||
      !supabase ||
      !isPushSupported() ||
      Notification.permission !== 'granted' ||
      !process.env.REACT_APP_VAPID_PUBLIC_KEY
    ) {
      return false;
    }

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();

    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.REACT_APP_VAPID_PUBLIC_KEY)
      });
    }

    await supabase
      .from('push_subscriptions')
      .upsert(
        { user_id: user.id, endpoint: sub.endpoint, subscription: sub.toJSON() },
        { onConflict: 'endpoint' }
      );

    return true;
  } catch {
    return false;
  }
}

export async function scheduleCompletionPush(user, endTime, mode) {
  try {
    if (
      !user ||
      !isSupabaseConfigured ||
      !supabase ||
      !isPushSupported() ||
      !process.env.REACT_APP_VAPID_PUBLIC_KEY
    ) {
      return false;
    }

    const notificationSettings = JSON.parse(
      localStorage.getItem(STORAGE_KEY_NOTIFICATION_SETTINGS) || '{}'
    );

    const isFocus = mode === 'focus';
    const settingEnabled = isFocus
      ? notificationSettings.pomodoroComplete
      : notificationSettings.breakComplete;

    if (!settingEnabled || Notification.permission !== 'granted') {
      return false;
    }

    const title = isFocus ? 'Pomodoro Complete! 🎉' : 'Break Complete! ✨';
    const body = isFocus
      ? 'Great work! Time for a break.'
      : 'Time to get back to work!';

    await supabase
      .from('timer_notifications')
      .delete()
      .eq('user_id', user.id)
      .is('sent_at', null);

    await supabase.from('timer_notifications').insert({
      user_id: user.id,
      fire_at: new Date(endTime).toISOString(),
      title,
      body,
      tag: 'pomodoro-complete'
    });

    return true;
  } catch {
    return false;
  }
}

export async function cancelCompletionPush(user) {
  try {
    if (!user || !isSupabaseConfigured || !supabase) {
      return false;
    }

    await supabase
      .from('timer_notifications')
      .delete()
      .eq('user_id', user.id)
      .is('sent_at', null);

    return true;
  } catch {
    return false;
  }
}
