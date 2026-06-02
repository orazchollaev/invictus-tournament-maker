<div align="center">

<img src="./public/favicon.svg" width="60" />

# Invictus - Tournament Maker

A browser-based tournament bracket simulator built with Vue 3 and TypeScript.

Create tournaments, manage teams, simulate matches with penalty shootouts, and follow the bracket from first match to final.

</div>

## Features

- Create and manage multiple tournaments with custom team rosters
- Two tournament formats: **single-elimination bracket** and **group stage + knockout**
- Group stage with round-robin fixtures and live standings (pts / gd / gf)
- Classic cross-seeding when advancing from groups (1A vs 2B, 1B vs 2A …)
- Match results with optional penalty shootout scores
- Manual draw support for seeded tournaments
- Persistent state — everything survives a page refresh
- Pre-built example data (Champions League, World Cup formats)

## Tech Stack

| Layer        | Tool                                               |
| ------------ | -------------------------------------------------- |
| UI Framework | [Vue 3](https://vuejs.org/) + TypeScript           |
| Build        | [Vite](https://vite.dev/)                          |
| State        | [Pinia](https://pinia.vuejs.org/) with persistence |
| Routing      | [vue-router](https://router.vuejs.org/)            |

## Getting Started

```bash
pnpm install
pnpm dev
```

Build for production:

```bash
pnpm build
```

## Project Structure

```
src/
├── engine/          # Core bracket & match logic
│   ├── utils.ts         # uid, shuffle, round naming
│   ├── simulation.ts    # Match & penalty shootout simulation
│   ├── bracket.ts       # Bracket generation & winner propagation
│   ├── groups.ts        # Group fixtures, standings, simulation
│   ├── tournament.ts    # Tournament factory & group seeding
│   └── index.ts         # Barrel export
├── modules/
│   ├── tournament/  # Tournament pages, bracket, draw
│   ├── teams/       # Team management
│   └── settings/    # App settings
└── examples/        # Sample tournament JSON files
```
