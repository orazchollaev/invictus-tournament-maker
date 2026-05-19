<div align="center">

<img src="./public/favicon.svg" width="60" />

# Tournament Sim

A browser-based tournament bracket simulator built with Vue 3 and TypeScript.

Create tournaments, manage teams, simulate matches with penalty shootouts, and follow the bracket from first match to final.

</div>

## Features

- Create and manage multiple tournaments with custom team rosters
- Automatic single-elimination bracket generation
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
├── modules/
│   ├── tournament/  # Tournament pages, bracket, draw
│   ├── teams/       # Team management
│   └── settings/    # App settings
└── examples/        # Sample tournament JSON files
```
