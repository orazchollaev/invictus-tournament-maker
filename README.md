<div align="center">

<img src="./public/favicon.svg" width="60" />

# Invictus — Tournament Maker

A football tournament simulator for the browser and Android. Create your own competitions, enter results by hand or let the app simulate them, and track stats across multiple seasons.

</div>

---

## What you can do

### Run three types of competitions

**Knockout bracket** — teams are seeded into a single-elimination bracket. Each round the loser is out, winner advances. Matches can be single-leg or two-legged ties with aggregate scoring and penalty shootouts. There is an optional third-place match.

**Group stage + Knockout** — teams are split into groups, play a round-robin, and the top finishers advance to a knockout bracket. A wildcard tab shows the best runners-up when wildcard spots are used. The app handles cross-seeding automatically (1st in Group A vs 2nd in Group B, etc.) and also supports no-rematch and random seeding modes.

**League** — full round-robin season with a standings table (points, goal difference, goals scored). Supports multiple tiers with promotion and relegation between them: bottom teams go down, top teams from the lower tier come up at the start of each new season. Tiers can also be linked so both run in parallel. Optionally cap it off with a **playoff**: top league finishers cross into a knockout bracket to decide the champion.

**Swiss** — Champions League–style format. Every team plays a fixed number of rounds against opponents matched by standing (no fixed groups), then the top finishers in the table advance to a knockout bracket.

---

### Simulate or play it out yourself

Every match has a home and away score you can fill in yourself. If you prefer, hit **Simulate** on a single match, a whole matchday, or the entire tournament at once. Results are based on each team's **power rating**, but you can tune how random things get:

- **Surprise Factor** — 0 means the strongest team always wins; 100 is pure chaos.
- **Home Advantage** — give the home side a power boost.
- **Form Factor** — a team on a winning streak gets stronger; a losing streak makes them weaker.

### Watch it live

Instead of just simulating a result, hit **Live** to play the match out minute by minute with goal events as they happen. Knockout ties that are tied after 90 go to real extra time, and if it's still level, a real penalty shootout — kick by kick, not just a coin flip.

---

### Manage your teams

Build a roster of teams, each with a name, color, and power rating. The team detail page shows their full match history, season-by-season stats (wins, goals, clean sheets), and a visual chart of how their standing changed over the season.

---

### Run multiple seasons

When a tournament ends, click **New Season** to run it again with the same teams. Each season is numbered (S1, S2, …) and everything is kept. The draw for the next season can be random, seeded (best teams kept apart), or done manually by dragging teams into position.

---

### Look back at history

The History section keeps a record across all seasons:

- **Champions** — who won the most titles and finals appearances
- **All Finals / All Seasons** — every result, season by season
- **All-Time Table** — league standings accumulated across all seasons
- **Statistics** — total matches and goals, biggest win, most clean sheets, title streaks
- **Teams** — per-team all-time record broken down by season

---

### Available in 15 languages

English, Turkish, German, French, Arabic, Spanish, Portuguese, Russian, Japanese, Korean, Thai, Vietnamese, Polish, Indonesian, and Hindi.

---

### Settings worth knowing

- **Language** — switch between all 15 supported locales, UI and engine labels included
- **Themes** — Light, Dark, or a World Cup 2026 theme
- **Bracket style** — Double-Sided (teams on both sides), Classic (left-to-right), or Auto
- **Leg modes** — set single or double legs separately for group stage, knockout rounds, and the final
- **Tiebreaker** — head-to-head results or overall goal difference
- **Sample data** — load a preset team list (Champions League, World Cup, etc.) to get started fast
- **Export / Import** — save all your teams and tournaments to a JSON file and restore later

---

### Available on Android

The app is packaged as a native Android app via Capacitor and is available on the Play Store. It works fully in the browser too — all data is stored locally and survives page refreshes.

<a href="https://play.google.com/store/apps/details?id=com.orazchollaev.invictustournamentmaker">
  <img alt="Get it on Google Play" src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" height="60"/>
</a>

---

## Run locally

```bash
pnpm install
pnpm dev
```

Build for production:

```bash
pnpm build
```
