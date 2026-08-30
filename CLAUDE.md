# Invictus Tournament Maker

Vue 3 + TypeScript + Pinia + Capacitor. Football tournament simulator for browser and
Android. Package manager: **pnpm**.

Full reasoning behind these rules: [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Commands

```bash
pnpm dev                # vite dev server on :2008
pnpm lint               # eslint
pnpm exec vue-tsc -b    # type check
pnpm test               # vitest run
pnpm build              # vue-tsc -b && vitest run && vite build
```

## Where code goes

```
src/
  assets/style/   Global CSS only: tokens, base, layout, utilities.
  components/
    layout/       App shell (header, bottom nav, error boundary).
    ui/           Design-system primitives. Only place reka-ui may be imported.
  composables/    App-wide composables.
  constants/      App-wide constants, split by subject.
  engine/         Pure domain logic. No Vue, no stores, no DOM. Well tested.
  i18n/           vue-i18n setup + locales.
  lib/            App-wide infrastructure adapters.
  modules/        Feature modules (core, history, players, settings, teams, tournament).
  router/
```

Every module uses the same skeleton — use these names, not synonyms:

```
src/modules/<name>/
  components/     Only .vue. Subfolders group by feature, each with an index.ts barrel.
  composables/    Only use*.ts. Anything else is a util or a service.
  pages/          Route targets.
  services/       IO and side effects (persistence, export).
  store.ts        Pinia store — OR store/ when split into slices. Never both.
  utils/          Pure helpers. No reactivity, no IO.
  constants.ts
  types.ts
```

## Rules

**Imports** — always `@/`. `./sibling` and `../types` are fine; `../../` or deeper is not.

**UI** — feature modules never import `reka-ui`. Compose the wrappers in
`@/components/ui` (`AppModal`, `AppSelect`, `AppTabs`, …). If a wrapper does not cover
the case, extend the wrapper; do not rebuild the primitive in the feature module. A
genuine exception gets an `eslint-disable-next-line no-restricted-imports -- <reason>`.

**Naming** — `src/components/ui/*` is prefixed `App`. Templates use PascalCase for
components.

**Styling** — three places, in order: `<style scoped>` for one component; a sibling
`.css` file named after its folder, imported via `<style scoped src="./x.css">`, when
2+ components in that folder share it; `src/assets/style/` for tokens and globals only.
Use `var(--token)`, never literal hex.

**Size** — `.vue` over 400 lines warns. Past that, split out a child component or a
composable.

**Tests** — `__tests__/` next to the code. `src/engine/__tests__/` is the model: plain
function tests, no mounting.

## Conventions

- Conventional Commits (commitlint + husky are wired up).
- Prettier + ESLint run on staged files via lint-staged.
- Order in SFCs: `<script>`, `<template>`, `<style>` (enforced).
