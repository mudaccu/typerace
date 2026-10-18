# typerace 🏁

A typing-speed racing game. Race bots, your own ghost, the world #1 and your friends.

## What's in here

```
index.html          the page
style.css           all the design (colors are at the top)
js/main.js          the game: racing, nitro, results, menus
js/words.js         word list, quotes, slang, code lines, daily challenge
js/cars.js          the garage: sports cars (drawn in code) + unlock rules
js/icons.js         line icons + the logo mark
js/keyboard.js      the on-screen keyboard with the reacting spacebar face
favicon.svg         the logo icon
js/audio.js         sound effects (made in code, no audio files)
js/stats.js         the stats page + chart
js/share.js         the shareable result image
js/store.js         saving progress in the browser
js/online.js        leaderboard + world-record ghosts
js/multiplayer.js   live rooms
js/config.js        ← paste your Supabase keys here
api/submit.js       server: saves scores (runs on Vercel)
api/_validate.js    server: anti-cheat checks
supabase.sql        database setup (run once)
```

> The site now uses JavaScript modules, so double-clicking `index.html` won't work any more.
> Open it through a web server (Vercel, or `npx serve` on your computer).

## Step 1: deploy (works right away)

Upload everything to your GitHub repo and Vercel redeploys on its own.
Sound, nitro, the garage, stats, text modes, the daily challenge and share cards all work
straight away, with no setup.

## Step 2: turn on the leaderboard, ghosts and multiplayer (free, ~10 min)

1. Make a free project at **supabase.com**.
2. In Supabase, open **SQL Editor → New query**, paste everything in `supabase.sql`, and click **Run**.
3. Open **Project Settings → API keys** and copy:
   - the **Project URL**
   - the **anon / publishable** key (public, safe to share)
   - the **service_role / secret** key (private, never put it in the code)
4. Paste the URL and the anon/publishable key into `js/config.js`.
5. In Vercel, open **your project → Settings → Environment Variables** and add:
   - `SUPABASE_URL` = your Project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = your service_role / secret key
6. Push to GitHub (or click **Redeploy** in Vercel). Done ✅

If multiplayer rooms won't connect, check **Supabase → Realtime → Settings** and make sure
public channels are allowed.

## How the anti-cheat works

Scores can only be saved through `/api/submit`. The database blocks everyone else from writing.
The server:

- checks the text is a real race text (right words, right length, today's daily)
- recalculates WPM from the keystroke timings instead of trusting the browser
- rejects anything over 250 WPM, pasted text, and perfectly even "robot" timing

A determined cheater could still fake human-looking timings. For a fun site this stops
almost everyone.

## Tweak it

- **Bot speeds:** `BOTS` at the top of `js/main.js`
- **Cars and unlock rules:** `CARS` in `js/cars.js`
- **Quotes / slang / code lines:** the lists in `js/words.js`
- **Colors:** the top of `style.css`
