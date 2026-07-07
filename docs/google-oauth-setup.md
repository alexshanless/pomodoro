# Google Sign-In Setup (Supabase OAuth)

One-time configuration required for the "Continue with Google" button on `/signin` and `/signup` to work. Until this is done, clicking the button shows an inline provider error.

The app code is already complete (`signInWithGoogle()` in `AuthContext` → `supabase.auth.signInWithOAuth`). No callback route is needed — Supabase's `detectSessionInUrl` plus `onAuthStateChange` pick up the redirect automatically.

---

## 1. Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → create (or select) a project, e.g. **PomPay**.
2. **APIs & Services → OAuth consent screen**
   - User type: **External**
   - App name: `PomPay`, add your support email
   - Scopes: the defaults (`email`, `profile`, `openid`) are enough — don't add more
   - Publishing status: **Testing** is fine while developing (add your Google account as a test user); switch to **In production** before launch
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `PomPay Web`
   - **Authorized JavaScript origins:**
     - `http://localhost:3000`
     - `https://<your-netlify-domain>` (e.g. `https://pompay.netlify.app`)
   - **Authorized redirect URIs:**
     - `https://ccvyqazcuyumsvgwyxut.supabase.co/auth/v1/callback`
4. Click **Create** and copy the **Client ID** and **Client Secret**.

## 2. Supabase Dashboard

1. Open the PomPay project → **Authentication → Providers → Google**.
2. Toggle **Enable Sign in with Google** on.
3. Paste the **Client ID** and **Client Secret** from step 1.4.
4. Save.

## 3. Supabase URL allow-list

**Authentication → URL Configuration:**

- **Site URL:** your production URL, e.g. `https://<your-netlify-domain>`
- **Redirect URLs** (add all):
  - `http://localhost:3000/**`
  - `https://<your-netlify-domain>/**`

The app requests `redirectTo: <origin>/dashboard`, so the wildcard entries above must cover both dev and prod origins or Supabase will fall back to the Site URL.

## 4. Test

1. `npm start` → open `http://localhost:3000/signin`.
2. Click **Continue with Google** → Google account chooser should appear.
3. Approve → you should land on `/dashboard` signed in, and the user appears under Supabase **Authentication → Users**.
4. Repeat once on the deployed Netlify site.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Inline error: "provider is not enabled" | Step 2 not done (provider toggle off or missing credentials) |
| Google error: `redirect_uri_mismatch` | Redirect URI in step 1.3 doesn't exactly match `https://ccvyqazcuyumsvgwyxut.supabase.co/auth/v1/callback` |
| Google error: `access_denied` / app not verified | Consent screen in **Testing** and your account isn't a test user |
| Lands on wrong page / prod URL after login | Missing entry in the Supabase Redirect URL allow-list (step 3) |
| Signed in on Google but app stays logged out | Check the browser console; verify `REACT_APP_SUPABASE_URL` / anon key are set and `detectSessionInUrl` isn't disabled in `supabaseClient.js` |
