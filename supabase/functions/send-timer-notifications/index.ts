// send-timer-notifications
//
// Supabase Edge Function (Deno). Invoked every minute by pg_cron via pg_net.
// Delivers Web Push notifications for Pomodoro timers whose fire_at has passed
// while the user's tab was closed.
//
// Deployed with `--no-verify-jwt` (cron has no user JWT). Access is instead
// guarded by a shared secret: callers must send `x-cron-secret` matching the
// CRON_SECRET env var.
//
// Required secrets (set via `supabase secrets set`):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:...), CRON_SECRET
// Auto-injected by the platform:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push";

const STALE_MINUTES = 15;
const HOUSEKEEPING_DAYS = 7;

interface TimerNotification {
  id: string;
  user_id: string;
  fire_at: string;
  title: string;
  body: string;
  tag: string;
}

interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  subscription: unknown;
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "missing Supabase env" }, 500);
  }
  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    return jsonResponse({ error: "missing VAPID env" }, 500);
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const staleCutoffIso = new Date(now - STALE_MINUTES * 60_000).toISOString();

  // 1. Fetch due rows (unsent, fire_at in the past).
  const { data: dueRows, error: dueError } = await supabase
    .from("timer_notifications")
    .select("id, user_id, fire_at, title, body, tag")
    .is("sent_at", null)
    .lte("fire_at", nowIso)
    .order("fire_at", { ascending: true });

  if (dueError) {
    return jsonResponse({ error: dueError.message }, 500);
  }

  const rows = (dueRows ?? []) as TimerNotification[];
  const freshRows = rows.filter((r) => r.fire_at > staleCutoffIso);
  const staleRows = rows.filter((r) => r.fire_at <= staleCutoffIso);

  let sent = 0;
  let failed = 0;
  const prunedSubscriptionIds = new Set<string>();
  const processedIds: string[] = [];

  for (const row of freshRows) {
    processedIds.push(row.id);

    const { data: subs, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, subscription")
      .eq("user_id", row.user_id);

    if (subsError || !subs || subs.length === 0) {
      if (subsError) failed += 1;
      continue;
    }

    const payload = JSON.stringify({
      title: row.title,
      body: row.body,
      tag: row.tag,
    });

    for (const sub of subs as PushSubscriptionRow[]) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await webpush.sendNotification(sub.subscription as any, payload);
        sent += 1;
      } catch (err) {
        failed += 1;
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          prunedSubscriptionIds.add(sub.id);
        }
      }
    }
  }

  // Prune expired subscriptions.
  if (prunedSubscriptionIds.size > 0) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .in("id", [...prunedSubscriptionIds]);
  }

  // 3. Mark processed + stale rows sent (whether or not delivery succeeded).
  const toMarkSent = [...processedIds, ...staleRows.map((r) => r.id)];
  if (toMarkSent.length > 0) {
    await supabase
      .from("timer_notifications")
      .update({ sent_at: nowIso })
      .in("id", toMarkSent);
  }

  // 4. Housekeeping: delete sent rows older than 7 days.
  const housekeepingCutoffIso = new Date(
    now - HOUSEKEEPING_DAYS * 24 * 60 * 60_000,
  ).toISOString();
  await supabase
    .from("timer_notifications")
    .delete()
    .not("sent_at", "is", null)
    .lt("sent_at", housekeepingCutoffIso);

  return jsonResponse({
    due: rows.length,
    sent,
    failed,
    prunedSubscriptions: prunedSubscriptionIds.size,
  });
});
