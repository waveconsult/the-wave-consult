# The Wave Consult

A tennis betting **consulting** product (ATP & WTA) built as an installable PWA.
It is an **analysis / discipline tool — not a bookmaker.** No money is staked,
taken, or moved inside the app. That distinction is a brand pillar and a
compliance requirement (see [Compliance](#compliance)).

Built per the build briefing: **Next.js 16 (App Router) + TypeScript +
Tailwind v4 + Supabase**.

> **Note on Next.js 16:** Middleware is now called **Proxy** — session handling
> lives in [`proxy.ts`](proxy.ts), not `middleware.ts`. `cookies()` is async.

---

## Stack

| Area | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 (design tokens in [`app/globals.css`](app/globals.css)) |
| Backend / DB / Auth / Storage | Supabase (Postgres + Auth + Storage) |
| Auth | Email + password |
| Payments | Deferred — Apply flow + role/tier gating built; Stripe hooks left clean |
| Install | PWA (manifest + service worker) |

## What's built

- **Auth** — email/password login & signup (`app/(auth)`), session refresh + route guarding in [`proxy.ts`](proxy.ts).
- **Feed** — `Bets | Insights` toggle, `BetCard` / `InsightCard`, tournament filter (`app/(app)/bets`).
- **Tournaments** — list + tap-to-filter (`app/(app)/tournaments`).
- **Tools** — Kelly staking calculator, can return **"No bet"** ([`lib/staking.ts`](lib/staking.ts), `app/(app)/tools`).
- **Plans** — Core / Private, Monthly/Yearly, **Apply** (no checkout) → `applications` (`app/(app)/plans`).
- **Profile** — subscription tier, **demo** CLV sparkline, editable Risk Management (bankroll drives every stake amount live), responsible-gambling banner, admin link (`app/(app)/profile`).
- **Admin** (`role = admin`, server-gated) — New Bet (with screenshot upload) + New Insight (`app/admin`).
- **PWA** — [`public/manifest.json`](public/manifest.json), [`public/sw.js`](public/sw.js), purple icons.

Stake **amount** is never stored — it is derived from `bankroll × stake_pct` at
render time, so changing bankroll updates every card.

---

## Operator setup (the parts only you can do)

1. **Create a Supabase project.**
2. **Run the schema:** paste [`supabase/schema.sql`](supabase/schema.sql) into the Supabase SQL editor and run it. This creates the tables, `is_admin()`, RLS policies, the signup trigger, and storage policies.
3. **Create the Storage bucket** named `bet-shots`.
   - MVP: mark it **public read**, and set `NEXT_PUBLIC_BET_SHOTS_PUBLIC=true`.
   - Safer: keep it **private** (default) — screenshots are served via signed URLs.
4. **Fill `.env.local`** — copy [`.env.local.example`](.env.local.example) and paste your keys.
   The `SUPABASE_SERVICE_ROLE_KEY` is **server-only** — never expose it to the browser or commit it.
5. *(Optional)* **Seed the prototype's demo content** — run [`supabase/seed.sql`](supabase/seed.sql) to populate the feed (5 tournaments, 4 bets, 2 insights) so the app matches the clickable prototype 1:1. Clear it before real publishing.
6. **Sign up once in the app, then make yourself admin:**
   ```sql
   update public.profiles set role = 'admin' where email = 'YOUR_EMAIL_HERE';
   ```
7. **Grant plan access** by setting `profiles.tier` (`core` / `private`) manually until Stripe lands.

## Run locally

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run start    # serve the build
npm run icons    # regenerate PWA icons from the brand glyph
```

> A placeholder `.env.local` is included so the app builds/runs immediately;
> replace the values with real Supabase keys to enable data.

## Deploy

- Push to a Git host and import into **Vercel**.
- Add the same env vars in Vercel project settings.
- Connect the domain **`thewaveconsult.com`**.

---

## Compliance

Must pass before any public launch (briefing §13):

- [ ] **18+** and **"Gamble responsibly"** visible — present in the footer & profile.
- [ ] Replace the **AT problem-gambling helpline placeholder** (`HELPLINE_PLACEHOLDER` in [`components/ResponsibleGambling.tsx`](components/ResponsibleGambling.tsx)) with the official line.
- [ ] No profit-guarantee / "successful betting" language — copy is calm & analytical.
- [ ] **No fabricated stats/CLV** — track-record and CLV stay as placeholders until real, documented data is supplied. The profile sparkline is explicitly marked **Demo**.
- [ ] App framed as analysis/consulting, not wager processing.

## Deferred (clean hooks left, not built)

- **Stripe** subscriptions — on application `accepted`, send a checkout link; on webhook success set `profiles.tier`; later tighten content RLS to gate by `tier != 'none'`.
- Native app-store builds.
- Real CLV / track-record numbers.
