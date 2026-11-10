# Announcements

A popup shown inside the app during a date window, in the user's language. One
JSON file per announcement lives here, so every one has a history in git.
Firestore (`announcements/{id}`) holds what is live; the app reads it.

## Admin panel

`/admin/` on the deployed site (locally `pnpm dev` → `localhost:2008/admin/`) lists,
creates, edits, duplicates, switches off and deletes announcements, with a preview. Only
`orazchollaev@gmail.com` can sign in (Google); `firestore.rules` enforces the same address,
so the rules below must be published once. Source: `src/admin/`.

One-time Firebase setup: Authentication → Sign-in method → **Google** enabled, and
Authentication → Settings → **Authorized domains** includes the Vercel domain.

## Publishing from the command line

```bash
pnpm announce check   announcements/my-news.json   # validate + preview, touches nothing
pnpm announce publish announcements/my-news.json   # create or replace
pnpm announce list                                 # what exists, and what is live
pnpm announce disable my-news                      # emergency off switch
```

Everything except `check` needs a service-account key: Firebase console →
Project settings → Service accounts → **Generate new private key**, saved as
`.secrets/firebase-admin.json` (gitignored). Never commit it.

`firestore.rules` must include the `match /announcements/{id}` block. Paste
the file into Firebase console → Firestore → Rules and publish it once.

## File format

Start from [`_example.json`](_example.json).

| Field           | Default   | Meaning                                                                                                                  |
| --------------- | --------- | ------------------------------------------------------------------------------------------------------------------------ |
| `id`            | file name | Lowercase, digits, `-`, `_`. **Devices remember ids**: a new id shows again to everyone.                                 |
| `startAt`       | required  | With a zone: `"2026-11-10T09:00:00+03:00"`. Inclusive.                                                                   |
| `endAt`         | required  | Same format. Exclusive.                                                                                                  |
| `enabled`       | `true`    | Off switch that leaves the dates alone.                                                                                  |
| `frequency`     | `"once"`  | `once` ever · `daily` (once per calendar day) · `launch` (every cold start).                                             |
| `priority`      | `0`       | Only one popup per check; the highest wins, then the most recent start.                                                  |
| `platforms`     | all       | e.g. `["android"]`. Values: `android`, `ios`, `web`.                                                                     |
| `minVersion`    | none      | Inclusive. `maxVersion: "4.0.9"` + a store link = "please update" for old versions.                                      |
| `defaultLocale` | none      | Language for users whose own is missing. Leave out to show **only** to listed languages.                                 |
| `content`       | required  | `{ "<locale>": { "title", "body", "cta"? } }`. Title ≤ 80, body ≤ 1000, cta ≤ 30.                                        |
| `action`        | none      | `{ "type": "route", "target": "/market" }` or `{ "type": "url", "target": "https://…" }`. Needs `cta` in every language. |
| `imageUrl`      | none      | https image, shown 2:1 above the text.                                                                                   |

Locale codes are the file names in `src/i18n/locales` (`en`, `tr`, `pt-BR`, `in` = Hindi, …).
A user on `pt-BR` with only `pt` written gets `pt`, and the other way round.

The body is plain text; line breaks are kept, nothing else is interpreted.

## How the app decides

- Checks 4 s after launch, and again on return after 30+ minutes in the background.
- One Firestore query per hour at most per device. A `disable` therefore takes up to an hour to land.
- Dates are checked against the **server's** clock, so a wrong phone clock does not matter.
- Waits until the user is on a list page with nothing else open (no onboarding, sheet or
  dialog); gives up after 3 minutes and tries next time.
- Analytics: `announcement_shown`, `announcement_dismissed`, `announcement_action` (param `id`).

Testing on a device: publish with a near `startAt`, then clear the app's storage keys
`invictus_announcements_cache_v1` (skips the one-hour cache) and
`invictus_announcements_seen_v1` (forgets what was shown).
