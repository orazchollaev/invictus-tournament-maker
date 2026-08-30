# Architecture

How this codebase is organised, and the rules that keep it that way. If you are adding
code and wondering "where does this go?", the answer is here.

The short version lives in [`CLAUDE.md`](CLAUDE.md). This document explains the
reasoning behind it.

---

## Top level

```
src/
  assets/style/   Global CSS: design tokens, base/elements/layout/utilities. Nothing else.
  components/
    layout/       App shell: header, bottom nav, logo, error boundary.
    ui/           Design-system primitives. The ONLY place reka-ui may be imported.
  composables/    App-wide composables (haptics, dialogs, status bar, push, swipe).
  constants/      App-wide constants, split by subject.
  engine/         Pure tournament domain logic. No Vue, no stores, no DOM.
  examples/       Bundled sample data (JSON).
  i18n/           vue-i18n setup and locale files.
  lib/            App-wide infrastructure adapters (IndexedDB storage, …).
  modules/        Feature modules. See below.
  router/         Route table.
```

`engine/` is the heart of the app and the only part with meaningful test coverage today.
It stays free of Vue and framework concerns so it can be tested as plain functions.

---

## Module anatomy

Every module under `src/modules/` uses the same skeleton. Not every folder is required,
but when a module needs one, it uses **this** name:

```
src/modules/<name>/
  components/     Only .vue files. Subfolders group by feature, each with an index.ts barrel.
  composables/    Only use*.ts files. Anything that is not a composable does not live here.
  pages/          Route targets. One page per route.
  services/       IO and side effects: persistence, export, external APIs.
  store.ts        Pinia store — OR store/ for a store split into slices. Never both.
  utils/          Pure helpers. No Vue reactivity, no IO.
  constants.ts    Module-scoped constants.
  types.ts        Module-scoped types.
```

Current modules: `core`, `history`, `players`, `settings`, `teams`, `tournament`.

### Why these boundaries

- **`composables/` holds only `use*.ts`.** A file in there without the `use` prefix is a
  signal it is really a util or a service, and it will be read as reactive when it is not.
- **`utils/` is pure.** If it touches IndexedDB, the filesystem, or the network, it is a
  service.
- **`store.ts` XOR `store/`.** A store that has grown slices moves wholesale into
  `store/index.ts` + slice files. Having both a `store.ts` and a `store/` directory as
  siblings makes it ambiguous which one an import resolves to.

### Store slices

`modules/tournament/store/` is the reference pattern for a large store: `index.ts` is the
composition root that owns state and wires slices; each slice (`crud.ts`, `bracket.ts`,
`scoring.ts`, …) owns one set of rules. If an action needs more than dispatching across
slices, it belongs in a slice.

---

## Imports

**Always use the `@/` alias.** It is configured in both `vite.config.ts` and
`tsconfig.json`.

```ts
// good
import type { Team } from "@/modules/teams/types"
import { AppButton } from "@/components/ui"

// bad — deep relative imports break when a file moves
import type { Team } from "../../modules/teams/types"
```

Single-level relative imports (`./Sibling.vue`, `../types`) are fine and preferred for
files inside the same folder or its parent — they read as "next to me". Two levels or
more (`../../`) means you have left your neighbourhood: use `@/`.

`no-restricted-imports` enforces this.

### Barrels

Every `components/` subfolder exports its components through an `index.ts`. Consumers
import from the folder, not the file:

```ts
import { CreateFormatSelector, CreateGroupConfigModal } from "@/modules/tournament/components/create"
```

`src/components/ui/index.ts` is the design-system barrel — 97% of UI imports go through
it, and that is the intended path.

---

## UI components

### reka-ui is confined to `src/components/ui/`

Feature modules must not import `reka-ui` directly. They compose the wrappers in
`components/ui` instead — `AppModal`, `AppSelect`, `AppTabs`, `AppToggle`,
`AppSortFilterMenu`, and so on.

The reason is drift: when three different modules each build their own Dialog on raw
`DialogRoot`, the close animation, escape handling, backdrop z-index and focus trap all
diverge silently. Wrapping once means fixing once.

If a wrapper does not cover a case, **extend the wrapper** — add a variant or a slot —
rather than reaching for the primitive in the feature module.

Where an exception is genuinely justified, make it visible:

```ts
/* eslint-disable-next-line no-restricted-imports -- <why the wrapper cannot cover this> */
import { ComboboxRoot } from "reka-ui"
```

That way the exceptions are countable, and `pnpm lint` shows how many there are.

### Naming

Everything in `src/components/ui/` is prefixed `App`. Feature components are named after
their folder (`CreateFormatSelector` in `components/create/`, `BracketMatchCard` in
`components/bracket/`).

Templates use PascalCase for components (`vue/component-name-in-template-casing`).

### Hand-written primitives

`AppNumberInput`, `AppTable` and `AppColorPicker` are deliberately hand-written rather
than built on reka-ui. They work, they are tuned for touch, and porting them buys
consistency at the cost of real regression risk. Leave them alone unless there is a
concrete bug that the port fixes.

---

## Styling

Design tokens live in `src/assets/style/variables.css` and are re-pointed per theme by
`design.css`. **Use tokens, not literal colours** — `var(--surface-2)`, not `#1e2128`.
The codebase already has ~2550 token references; keep it that way.

Three places a style can live, in order of preference:

1. **`<style scoped>` in the component** — style used by exactly one component.
2. **A sibling `.css` file** — style shared by two or more components in the same folder.
   Import it with `<style scoped src="./bracket-viewport.css">`. Name the file after the
   folder it sits in.
3. **`src/assets/style/`** — tokens, resets, layout primitives and utility classes only.
   Anything global goes through `index.css`'s import chain, and `design.css` stays last
   because its `[data-design="…"]` blocks re-point tokens set above it.

Do not add a fourth place.

---

## Testing

Tests live in `__tests__/` next to the code they cover, run by Vitest.

`src/engine/__tests__/` is the model: plain function tests, no mounting, no mocks beyond
fixtures. Store slices and non-trivial composables should follow it. UI components are
not unit-tested today — the value is in the engine and the store rules.

`pnpm build` runs `vue-tsc -b && vitest run && vite build`, so a broken test blocks a
build.

---

## File size

`max-lines` warns at 400 lines for `.vue` files. It is a warning, not a gate — but a
component past 400 lines is almost always doing two jobs. Split the second one into a
child component or a composable.
