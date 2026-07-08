# Web Push Timer Notifications — Setup

This wires up push notifications so that when a Pomodoro completes while the
user's PomPay tab is **closed**, a notification still arrives.

## How it works

1. The client subscribes the browser via `pushManager` and upserts the
   subscription into `push_subscriptions`.
2. When a timer starts, the client inserts one row into `timer_notifications`
   with `fire_at` = the timer's end time. On pause/reset/in-app completion the
   client deletes its unsent rows.
3. A `pg_cron` job hits the `send-timer-notifications` edge function every
   minute. The function finds due rows, sends a Web Push to that user's
   subscriptions, marks the rows sent, and prunes expired subscriptions.

> **Latency:** cron runs at 1-minute granularity, so a notification can arrive
> up to ~60s after the timer's exact end time. This is expected and acceptable
> for the Pomodoro use case.

All steps below are performed **manually** by the project owner.

---

## 1. Run the migration

In the Supabase SQL editor (project `ccvyqazcuyumsvgwyxut`), run:

```
database/migrations/add_push_notifications.sql
```

This creates `push_subscriptions` and `timer_notifications` with owner-only RLS.
Safe to re-run.

## 2. Generate VAPID keys

VAPID keys authenticate your server to the push services. Generate once:

```bash
npx web-push generate-vapid-keys
```

Record the **public** and **private** keys. The public key is used by both the
client (to subscribe) and the server (to sign); the private key is server-only —
never commit it or expose it to the client.

## 3. Client environment variable

The client needs the **public** VAPID key to create subscriptions.

- Local: add to `.env` (CRA requires the `REACT_APP_` prefix):

  ```
  REACT_APP_VAPID_PUBLIC_KEY=<your public key>
  ```

- Production: add the same key in **Netlify → Site settings → Environment
  variables**, then trigger a redeploy.

> Only the **public** key goes in client env. The private key stays a Supabase
> secret (step 4).

## 4. Deploy the edge function + set secrets

Requires the [Supabase CLI](https://supabase.com/docs/guides/cli) and a login
(`supabase login`).

```bash
# Link the local repo to the project (once)
supabase link --project-ref ccvyqazcuyumsvgwyxut

# Deploy — --no-verify-jwt because cron calls it without a user JWT
supabase functions deploy send-timer-notifications --no-verify-jwt

# Set secrets (CRON_SECRET should be a long random string, e.g. `openssl rand -hex 32`)
supabase secrets set \
  VAPID_PUBLIC_KEY=<your public key> \
  VAPID_PRIVATE_KEY=<your private key> \
  VAPID_SUBJECT=mailto:you@example.com \
  CRON_SECRET=<random secret>
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically — do
**not** set them manually.

The function ignores callers whose `x-cron-secret` header does not match
`CRON_SECRET`, so the same secret must be used in the cron job below.

## 5. Schedule it every minute (pg_cron + pg_net)

In the Supabase SQL editor:

Replace `<CRON_SECRET>` with the same value set in step 4, then run
(single-quoted command form — the dashboard SQL editor mis-splits `$$`
dollar-quoted bodies; note the doubled `''` quotes):

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'send-timer-notifications',
  '* * * * *',
  'select net.http_post(
     url := ''https://ccvyqazcuyumsvgwyxut.supabase.co/functions/v1/send-timer-notifications'',
     headers := ''{"Content-Type": "application/json", "x-cron-secret": "<CRON_SECRET>"}''::jsonb,
     body := ''{}''::jsonb
   )'
);
```

To change or remove the schedule later:

```sql
-- Update: unschedule then re-run cron.schedule above.
select cron.unschedule('send-timer-notifications');

-- Inspect scheduled jobs.
select * from cron.job;
```

> Storing the secret inline in the cron command is standard for pg_cron. It is
> only visible to Postgres superusers / the project owner via `cron.job`.

---

## Troubleshooting

| Symptom | Check |
| --- | --- |
| No push arrives at all | Function logs in **Supabase → Edge Functions → send-timer-notifications → Logs**. A 401 there means the `x-cron-secret` header does not match `CRON_SECRET`. |
| Cron never fires | `select * from cron.job_run_details order by start_time desc limit 20;` — look for the job name and any error in `return_message`. Confirm `pg_cron` + `pg_net` are enabled. |
| Function returns `{ "failed": N }` | A push service rejected the send. `404`/`410` rejections auto-prune the stale subscription; other codes usually mean bad/expired VAPID config. |
| Push worked before, now silent | The browser subscription likely expired and was pruned. Re-subscribe from the app (re-grant notification permission). |
| Browser never asks / blocks | Notification permission is denied for the site. Reset it in the browser's site settings and re-subscribe. |
| Rows pile up unsent | Confirm the cron job is calling the function (job_run_details) and the function returns 200 with a non-zero `due` when timers are pending. Rows older than 15 min are marked sent without delivery by design. |

### Quick manual test

Invoke the function directly (bypassing cron) to verify wiring:

```bash
curl -i -X POST \
  https://ccvyqazcuyumsvgwyxut.supabase.co/functions/v1/send-timer-notifications \
  -H "x-cron-secret: <CRON_SECRET>" \
  -H "Content-Type: application/json" -d '{}'
```

A `200` with `{"due":...,"sent":...,"failed":...,"prunedSubscriptions":...}`
confirms the function, secrets, and DB access are all healthy.
