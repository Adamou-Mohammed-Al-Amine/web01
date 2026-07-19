# Outreach Studio

A fast, dark-mode personal outreach CRM for one freelance video editor.
Vanilla HTML/CSS/JS front end, Supabase as the database, deployed on Vercel.
No build step, no framework.

## v1.1 (latest)

Additive, backward-compatible update — no tables were dropped or recreated,
no existing data was touched.

- **Research Session redesigned** as per-creator cards instead of a wide
  table: clearer spacing, section dividers, and icons on every link field
  (📺 Channel, 📷 Instagram, ❌ X, 📧 Email, 🎥 Original Video, ✂️ Re-edit)
  with format-hinting placeholders.
- **Removed** the Subject and Custom First Email fields from Research
  Session — the app was never sending email itself, so these were dead
  weight in the form. (Existing `subject` / `custom_first_email` values on
  creators added before v1.1 are preserved in the database and still used
  for those creators' Gmail compose / Re: subject line — nothing was
  deleted.)
- **New "Need Re-edit" workflow**: mark a creator as needing a re-edit
  before outreach starts. It shows as a bright-cyan **Need Re-edit** status
  with a blinking indicator, sorted right after Replies and before Need
  First Email. Clicking **Re-edit Ready** in the creator's side panel
  clears the flag, drops it into Need First Email automatically, and logs
  "Re-edit completed" on the timeline.
- **Database migration**: run `sql/migrations/002_v1.1_need_reedit.sql` —
  a single `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statement. Safe to
  run on a live project, safe to run twice.

## What changed in v2

This is a rebuild of the original "Personal Outreach CRM" prototype into
the full Outreach Studio spec: notification center, priority-sorted
Outreach queue, a creator detail side panel with a timeline, Gmail-based
sending (first email + randomized non-repeating follow-ups with a preview
popup), Social DM tracking, and a Settings page. The stack, hosting, and
overall file layout are unchanged.

**Migration note:** the `creators` table shape changed substantially
(new fields, hour-based timestamps instead of date-only columns, plus two
new tables). Re-run `sql/schema.sql` in Supabase — it drops and recreates
`creators`, `creator_events`, and `notifications`, so back up first if you
already have real data in the old shape.

## Project structure

```
outreach-crm/
├── index.html            Dashboard — stats, today's progress, activity, notifications
├── research.html         Research Session (always starts empty)
├── outreach.html         The Outreach pipeline table
├── settings.html         User info, signature, timezone, follow-up delays
├── data/
│   └── followups.json    The follow-up message library — edit freely
├── css/
│   └── style.css         All styling, dark mode only
├── js/
│   ├── supabase-client.js  Every Supabase call lives here
│   ├── sequence.js          The timeline (steps + delay hours) — edit to change the workflow
│   ├── followups.js          Loads data/followups.json, picks a non-repeating random message
│   ├── gmail.js               Builds the Gmail compose deep link (never auto-sends)
│   ├── status.js              Status labels, colors, sort priority
│   ├── notifications.js       Top-right bell + dropdown, mounted on every page
│   ├── dates.js                Date/time helpers (hour-based delays)
│   ├── nav.js                   Shared sidebar
│   ├── ui.js                     Toasts, modal, and drawer (side panel) helpers
│   ├── dashboard.js            Logic for index.html
│   ├── research.js              Logic for research.html
│   ├── outreach.js              Logic for outreach.html (the big one)
│   └── settings.js              Logic for settings.html
├── api/
│   └── config.js          Vercel serverless function — hands Supabase keys
│                           to the browser from environment variables
├── sql/
│   ├── schema.sql            Fresh-install baseline only — do not run on a live DB
│   └── migrations/
│       └── 002_v1.1_need_reedit.sql   Additive migration, safe on live data
├── package.json
├── .env.example
└── .gitignore
```

`api/config.js` is the one piece of server-side code, and it exists only
so Supabase keys never have to be hardcoded in a file committed to GitHub.

---

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. **Brand-new project?** Open **SQL Editor**, paste the entire contents of
   `sql/schema.sql`, and run it. **Already running Outreach Studio with
   real data?** Skip `schema.sql` — instead run the file(s) in
   `sql/migrations/` (currently just `002_v1.1_need_reedit.sql`), which
   only add columns and never touch existing rows.
3. Go to **Project Settings → API** and grab:
   - **Project URL** → `SUPABASE_URL`
   - **anon / public key** → `SUPABASE_ANON_KEY`

   Never use the `service_role` key here — only the anon key, which is
   safe to expose to a browser.

## 2. Push to GitHub

```bash
git init
git add .
git commit -m "Outreach Studio v2"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

`.env` is already in `.gitignore` — only `.env.example` gets committed.

## 3. Deploy to Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → import the repo.
2. Framework preset: **Other** (static site + one serverless function,
   no build command needed).
3. **Environment Variables** → add `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
4. **Deploy**. You'll get a URL like `https://outreach-studio-yourname.vercel.app`.

### Local development

```bash
npm i -g vercel
cp .env.example .env   # fill in your real Supabase values
vercel dev
```

---

## How the workflow works

1. **Research Session** — add a row per creator (name, platform, priority,
   links, problem found, your re-edit, subject line, a fully custom first
   email you write yourself, notes). Empty rows are ignored, duplicate
   names are blocked. **Finish Research Session** saves everyone and
   clears the page. Creators with no email start on **Need Social DM**
   instead of **Need First Email**.

2. **Outreach** — the pipeline, always sorted:
   `Replies → Need First Email → Need Social DM → Follow-up Due → Waiting → Client → Closed`.

   - **Send First Email** opens a prefilled Gmail compose window with your
     custom subject + body. You send it yourself in Gmail, then click
     **I Sent It** to start the sequence (this is the only thing that
     starts it — nothing sends automatically, ever).
   - **Send Follow-up** picks a random message from `data/followups.json`
     that this creator hasn't received yet, shows a preview popup
     (**Send** / **Choose Another**), opens Gmail with `Re: <subject>`,
     then waits for **I Sent It** to log it and schedule the next step.
   - **Social DM Sent** is just a reminder button — never automated.
   - Click a creator's name to open the **side panel**: every field,
     links, problem/notes, the full timeline, and Mark Replied / Convert
     To Client / Close Conversation / Delete.
   - **Mark Replied** stops the sequence entirely, turns the row purple,
     and fires a notification in the top-right bell.

3. **Dashboard** — stat cards for every status, Today's Progress
   (`completed / total` tasks touched today), Upcoming Tasks, Recent
   Activity, and a Notifications summary.

4. **Settings** — user name, business name, email signature, timezone,
   and the follow-up delay (in hours) for each step in the sequence.

## Changing the timeline or follow-up library later

- **Steps and default delays**: edit `STEP_DEFS` in `js/sequence.js`.
- **Actual delay hours in use**: editable live from the Settings page
  (stored in the `settings.followup_delays` column, one number per step).
- **Follow-up wording**: edit `data/followups.json` — add, remove, or
  reword messages freely; `{{name}}` and `{{signature}}` are replaced
  automatically.

## Adding future features (v3+)

The code is deliberately split into small modules so these can be added
without a rewrite:

- **Automatic sending / Gmail API** — replace `js/gmail.js`'s
  `openGmailCompose` with a real Gmail API call; nothing else needs to change.
- **AI-written follow-ups** — add a generation step before
  `showFollowupModal` in `js/outreach.js`.
- **Analytics** — `creator_events` already has full timestamped history
  per creator to build charts from.
- **Calendar** — `next_action_at` already exists on every row; a calendar
  view is just a different rendering of the same data.
- **Authentication** — add Supabase Auth, then tighten the RLS policies
  in `sql/schema.sql` to filter by `auth.uid()` instead of `using (true)`.
