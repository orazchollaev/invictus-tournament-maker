# Changelog

## [1.7.0](https://github.com/orazchollaev/invictus-tournament-maker/compare/v1.6.0...v1.7.0) (2026-06-03)

### Features

- add Android platform with Capacitor ([75caffd](https://github.com/orazchollaev/invictus-tournament-maker/commit/75caffd286bcad44e9708c3b22facae6bd121de2))
- **bracket:** add bracket style setting (Double-Sided / Classic / Auto) ([1e1f3f8](https://github.com/orazchollaev/invictus-tournament-maker/commit/1e1f3f8262d480a28945bff77b73bc96ee1ce639))
- full mobile responsive layout for Play Store release ([22b3c78](https://github.com/orazchollaev/invictus-tournament-maker/commit/22b3c7859ff17bb5a5262583c2b5cf175bab16a6))
- **tournament:** add Sim 3rd Place button to bracket toolbar ([e2e450b](https://github.com/orazchollaev/invictus-tournament-maker/commit/e2e450b36c3ef4cb92462933cf77158a1878252e))
- **tournament:** persist active tab in URL query across page reloads ([7cfd537](https://github.com/orazchollaev/invictus-tournament-maker/commit/7cfd537e8910d4d072769daa39d99ea927bc994b))

### Bug Fixes

- resolve header logo and menu position issue ([c8ee0df](https://github.com/orazchollaev/invictus-tournament-maker/commit/c8ee0dfacc37ea3c9cf25132a3be36fe3770fd0f))
- stop layout jump from scrollbar changes ([2964b3e](https://github.com/orazchollaev/invictus-tournament-maker/commit/2964b3ef4eb7a5d27aa84281807df70d23719cf8))
- **tournament:** persist draw type per tournament across seasons ([e646383](https://github.com/orazchollaev/invictus-tournament-maker/commit/e6463838af78fbaccea69f0e879f746d4cdbf3ce))

### Code Refactoring

- **css:** split monolithic index.css into modular structure ([4641177](https://github.com/orazchollaev/invictus-tournament-maker/commit/46411773622a05405c01ddfdbd29db13404dc386))
- new main page set to tournaments ([6af7e87](https://github.com/orazchollaev/invictus-tournament-maker/commit/6af7e876211bc4355d21e3dd7f5f5a8f2151a338))

### Chores

- add capacitor ([7b979e0](https://github.com/orazchollaev/invictus-tournament-maker/commit/7b979e05c927671c4b148d25d9b3df7ee95d8c3f))
- rebrand project as Invictus ([0ea589d](https://github.com/orazchollaev/invictus-tournament-maker/commit/0ea589dc963bee028e352664c211ac5ecfe2ba73))
- resolve tsconfig.tsbuildinfo ([c5bb0ad](https://github.com/orazchollaev/invictus-tournament-maker/commit/c5bb0adc915389c20bfaa6d13075fc1d4f2e234a))

## [1.6.0](https://github.com/orazchollaev/invictus-tournament-maker/compare/v1.5.1...v1.6.0) (2026-05-31)

### Features

- **bracket:** rewrite to left-right layout with final in center and 3rd place below ([424d2af](https://github.com/orazchollaev/invictus-tournament-maker/commit/424d2afec8d115845ae60ae51c43ab4010caf4ce))
- **league:** add 3x/4x leg modes and fix multi-tier leg mode change ([0a2bf4f](https://github.com/orazchollaev/invictus-tournament-maker/commit/0a2bf4ff0fa1d1b8b00b0c51828f25b1408390f3))
- **settings:** add changelog button next to version ([aeaa01b](https://github.com/orazchollaev/invictus-tournament-maker/commit/aeaa01bea2855fe67834aeb5b9bf871dea7d1c98))
- **settings:** add configurable home advantage (0–20 power bonus) ([abd00fb](https://github.com/orazchollaev/invictus-tournament-maker/commit/abd00fbc1ced1ce2d2cb290a0923d06759c2b6e9))
- **settings:** add form factor — last-5-match power adjustment ([c0095c1](https://github.com/orazchollaev/invictus-tournament-maker/commit/c0095c1514a03dca054ca3e2b7063aa0838e0e84))
- **settings:** add reset all settings button ([91a7120](https://github.com/orazchollaev/invictus-tournament-maker/commit/91a7120541af71e1d1fd0c7dcb468a9225c8b34f))
- **teams:** add tournament filter dropdown to match history on team detail page ([d8bf416](https://github.com/orazchollaev/invictus-tournament-maker/commit/d8bf416990a076891a8286b6b12a69e811571f70))
- **tournament:** add 3x/4x leg modes to create tournament modal ([0635843](https://github.com/orazchollaev/invictus-tournament-maker/commit/06358436267adf3b4532a2aa84e3b09ea04a3f5b))
- **tournament:** add dedicated create and settings pages for tournaments ([39c85ae](https://github.com/orazchollaev/invictus-tournament-maker/commit/39c85ae6951253b84064cdb5809d716239d5be62))
- **tournaments:** add group standings progress line chart ([0f6c47c](https://github.com/orazchollaev/invictus-tournament-maker/commit/0f6c47cddab0c9aba0437678171302b59a685fe1))
- **tournaments:** add league standings progress line chart ([860a81b](https://github.com/orazchollaev/invictus-tournament-maker/commit/860a81b33764be919b41a834a7d621409e938022))
- **ui:** replace native alert/confirm with custom AppDialog modal ([f7ee64a](https://github.com/orazchollaev/invictus-tournament-maker/commit/f7ee64acd8aae9db83a00c69e877af9822eb04c5))

### Bug Fixes

- **bracket:** export PNG captures inner .bracket element to avoid scrollbar and clipping ([1f8dfed](https://github.com/orazchollaev/invictus-tournament-maker/commit/1f8dfede61b737c985cca96fdd45d46f89b734de))
- **league:** reset activeTierIdx on navigation and redirect multi-tier new season to detail page ([6d2960d](https://github.com/orazchollaev/invictus-tournament-maker/commit/6d2960d425e4b52394809440171acd700ebb65ee))
- random tournament name year function removed ([732f238](https://github.com/orazchollaev/invictus-tournament-maker/commit/732f238731904a1a58dc60c588bd943577e0609e))
- **styles:** replace hardcoded colors with CSS vars and fix Chart.js types ([b59103e](https://github.com/orazchollaev/invictus-tournament-maker/commit/b59103e820d88abc299f475ce3c7318403afa71f))
- **teams:** show league and tiered-league matches on team detail page ([66c4169](https://github.com/orazchollaev/invictus-tournament-maker/commit/66c4169b1b31cb8e9a55a50bc1ec21fd26f996d2))

### Code Refactoring

- remove new season button from tournaments list ([36c715f](https://github.com/orazchollaev/invictus-tournament-maker/commit/36c715f6d1d09d4f682be88a4a72f3e382f659d2))
- **ui:** redesign SeasonChart with CSS rows replacing SVG bar chart ([87ccae0](https://github.com/orazchollaev/invictus-tournament-maker/commit/87ccae0016e98ba239d93a1da11197e3f73d2427))

### Chores

- **deps:** update minor dependencies ([8074af9](https://github.com/orazchollaev/invictus-tournament-maker/commit/8074af9dca37862d4bd32f4c3e03e3e4b00775bd))
- migrate from lucide-vue-next to @lucide/vue ([7698bd9](https://github.com/orazchollaev/invictus-tournament-maker/commit/7698bd9434c2b25b6babd6e9f0801f738d2745a0))

## [1.5.1](https://github.com/orazchollaev/invictus-tournament-maker/compare/v1.5.0...v1.5.1) (2026-05-30)

### Bug Fixes

- resolce vercel deployment issue ([20436df](https://github.com/orazchollaev/invictus-tournament-maker/commit/20436df3f802f12c96117bf3bad8db111a074cdf))

## [1.5.0](https://github.com/orazchollaev/invictus-tournament-maker/compare/v1.4.0...v1.5.0) (2026-05-30)

### Features

- **groups, tournament:** add wildcard slots — best N runner-up teams advance to knockout ([1abde21](https://github.com/orazchollaev/invictus-tournament-maker/commit/1abde212d7be6c611e8c4bd1a5251c37a1dff51b))
- **history:** enrich stats tab and add per-team all-time stats ([cd07898](https://github.com/orazchollaev/invictus-tournament-maker/commit/cd07898a4853b37232ddcfd4ff8dd5e969960e27))
- **league:** add multi-tier league system with automatic promotion/relegation between divisions ([399b444](https://github.com/orazchollaev/invictus-tournament-maker/commit/399b444b0240a9193e58393302b30b58b9cf5d2a))
- **league:** add promotion/relegation zones ([1d43bca](https://github.com/orazchollaev/invictus-tournament-maker/commit/1d43bcab17a3ba15d071049d3b0f92edc919c42f))
- **settings:** allow changing division count and promotion slots before season starts ([89accba](https://github.com/orazchollaev/invictus-tournament-maker/commit/89accbaf40ae8fa7108990ab142a62b88a95696d))

### Bug Fixes

- **league:** correct multi-tier promotion/relegation swap for 3+ divisions ([0251a6d](https://github.com/orazchollaev/invictus-tournament-maker/commit/0251a6d8ffae636449d6b3b76d219a293cbac6f7))
- **league:** smooth tier tab transition by remounting LeagueView on tier change ([7d10dc5](https://github.com/orazchollaev/invictus-tournament-maker/commit/7d10dc54b316bbea6569c52e030f5fd02d6e2743))

## [1.4.0](https://github.com/orazchollaev/invictus-tournament-maker/compare/v1.3.4...v1.4.0) (2026-05-29)

### Features

- add league system ([9b4d16b](https://github.com/orazchollaev/invictus-tournament-maker/commit/9b4d16b2c2ca560db7fd022d8672fb31254db7dd))
- add per-tournament tiebreaker setting (H2H vs goal difference) for group and league tables ([f4a370f](https://github.com/orazchollaev/invictus-tournament-maker/commit/f4a370f64c5db3d736b6cc5b0a0d057e5167722c))
- add random name button to team and tournament name inputs ([37497bb](https://github.com/orazchollaev/invictus-tournament-maker/commit/37497bb74826d1bb4cef4792b146caf3fdcf11f4))
- add save button to tournament settings panel ([83d8ea7](https://github.com/orazchollaev/invictus-tournament-maker/commit/83d8ea74730829bf0cc67617af6829f6808fbd23))
- **history:** league-compatible history with All Seasons and All-Time Table tabs ([9937a1c](https://github.com/orazchollaev/invictus-tournament-maker/commit/9937a1ccbb795bf37497d14424c111ad569d0620))

### Bug Fixes

- **history:** exclude champion from runner-up count in league series ([42934ce](https://github.com/orazchollaev/invictus-tournament-maker/commit/42934ce2f4a4302b6a33551ba91157c9ed651098))
- **league:** add stats support, position colors, table animation, match overflow ([0d3333b](https://github.com/orazchollaev/invictus-tournament-maker/commit/0d3333b6b029e389eb5b56f470e1ba3f3a050716))
- stop overwriting global settings when creating a tournament ([fdc1beb](https://github.com/orazchollaev/invictus-tournament-maker/commit/fdc1bebdcb2558c5dd4a66004a17c9364f44dc37))

### Code Refactoring

- **league:** compact right panel — tighter matches, icon-only sim, smaller pills and nav ([a17593d](https://github.com/orazchollaev/invictus-tournament-maker/commit/a17593d439b7b31e1a73562e239fae7f54989e85))

### Chores

- **deps:** add workbox-window dependency ([44c8f7d](https://github.com/orazchollaev/invictus-tournament-maker/commit/44c8f7d44bdfc5295f509eee092f542760f51593))
- fix build warnings ([c17c880](https://github.com/orazchollaev/invictus-tournament-maker/commit/c17c880c8018ada3fa6817d1c6512de701f1c126))

## [1.3.4](https://github.com/orazchollaev/invictus-tournament-maker/compare/v1.3.3...v1.3.4) (2026-05-27)

### Features

- consolidate shared styles into global css and fix radius inconsistencies ([32d56af](https://github.com/orazchollaev/invictus-tournament-maker/commit/32d56af3da78f4b550c49bfe4a634bfbd5499cd2))
- show update button in header when new PWA version is available ([8d69f1c](https://github.com/orazchollaev/invictus-tournament-maker/commit/8d69f1c7aafbb28d71a823ab535b1cff15115b07))

### Chores

- **deps:** update dependencies ([b30236c](https://github.com/orazchollaev/invictus-tournament-maker/commit/b30236c996a144daae5aa75615cdafdf4bda3600))

## [1.3.3](https://github.com/orazchollaev/invictus-tournament-maker/compare/v1.3.2...v1.3.3) (2026-05-27)

### Bug Fixes

- remove unused variables and fix some boolean type error ([4270e91](https://github.com/orazchollaev/invictus-tournament-maker/commit/4270e91997de66fb49c69baeee108b2590959008))

## [1.3.2](https://github.com/orazchollaev/invictus-tournament-maker/compare/v1.3.1...v1.3.2) (2026-05-27)

### Features

- add detailed history for tournaments ([f1c7928](https://github.com/orazchollaev/invictus-tournament-maker/commit/f1c7928ec3f620727176d4a44b03222dc63da39b))
- **settings:** add champion confetti on/off toggle ([d64a2ed](https://github.com/orazchollaev/invictus-tournament-maker/commit/d64a2ed82a9dce38446d04385078339dcbd913de))

## [1.3.1](https://github.com/orazchollaev/invictus-tournament-maker/compare/v1.3.0...v1.3.1) (2026-05-27)

### Features

- **ui:** add W/D/L, GF/GA/GD, group, and rank columns to participants table ([ea32209](https://github.com/orazchollaev/invictus-tournament-maker/commit/ea322097f71bc12eb1139e73f6d9118762a9769f))
- **ui:** convert AppModal to right-side drawer with enter/exit animations ([02de09d](https://github.com/orazchollaev/invictus-tournament-maker/commit/02de09d352dc03edebf4a3ace02813916e8e9f26))
- **ui:** fully redesigned fixture view in knockout ([b061c08](https://github.com/orazchollaev/invictus-tournament-maker/commit/b061c08b1e0dbed9c5a791c5d24857f05ed13372))

### Bug Fixes

- **engine:** don't mark BYE matches as double-leg ([4e9bad5](https://github.com/orazchollaev/invictus-tournament-maker/commit/4e9bad57d5082d6ed42315fa686da6f0f1904c29))
- **engine:** don't mark BYE matches as double-leg ([a4bd31c](https://github.com/orazchollaev/invictus-tournament-maker/commit/a4bd31c1eb713e160105d2b1d6c5f440194a3c06))
- **fixture:** emit sim-third-place for 3rd place match simulation ([c8aa32d](https://github.com/orazchollaev/invictus-tournament-maker/commit/c8aa32d0d6580e6b23dfd26ed982001709fca0d3))

### Code Refactoring

- **ui:** merge stats and participants into main tab bar on tournament detail page ([2a7d2bf](https://github.com/orazchollaev/invictus-tournament-maker/commit/2a7d2bf5abec934f62f8cd3ca039e87d7263b438))
- **ui:** replace winner banner with compact chip in header actions ([926ad8b](https://github.com/orazchollaev/invictus-tournament-maker/commit/926ad8b8ae4d0f99d452dcd012ff9da660d0fe6f))

## [1.3.0](https://github.com/orazchollaev/invictus-tournament-maker/compare/v1.2.0...v1.3.0) (2026-05-26)

### Features

- **settings:** add toggle to show/hide team abbreviations ([5c0d1d5](https://github.com/orazchollaev/invictus-tournament-maker/commit/5c0d1d5450775c776369df5bead195bd6f7f4151))
- **settings:** persist draw type per format and default redraw to tournament's draw mode ([35a15aa](https://github.com/orazchollaev/invictus-tournament-maker/commit/35a15aa673707bc7499e533e08a39e9509e2f829))
- **settings:** skip new-season draw prompt, read type from settings ([cc226c5](https://github.com/orazchollaev/invictus-tournament-maker/commit/cc226c5252012c380615f5b7f858c4e7b86e3157))
- **ui:** add new FIFA World Cup 2026 theme and teams ([8e2f778](https://github.com/orazchollaev/invictus-tournament-maker/commit/8e2f778e159a3f9f68d2da6798a519a68fd069ba))
- **ui:** full animation pass — page transitions ([8b2e013](https://github.com/orazchollaev/invictus-tournament-maker/commit/8b2e01365814b6e913fe20678c0dd4c82fa9824e))
- **ui:** stabilize AppModal — ESC key, X button, scroll, open animation ([8dca71b](https://github.com/orazchollaev/invictus-tournament-maker/commit/8dca71bebba98f72df042d374815ba1d204721d1))

### Bug Fixes

- include leg 2 goals in stats and require delete confirmation ([f396ef7](https://github.com/orazchollaev/invictus-tournament-maker/commit/f396ef752fff9233f6584c9b4da1effdcdedc735))
- **tournament:** apply leg modes when seeding bracket from groups ([045bfec](https://github.com/orazchollaev/invictus-tournament-maker/commit/045bfec2eb12a1ac9856dfb5b3ea36c2251babb6))

### Code Refactoring

- **ui:** redesign settings and tournament creation UX with clearer labels, and contextual hints ([3eed7f9](https://github.com/orazchollaev/invictus-tournament-maker/commit/3eed7f97dac654f90342072b2248a125c26d5077))

### Chores

- fix build warnings ([f9b55d9](https://github.com/orazchollaev/invictus-tournament-maker/commit/f9b55d9159bcf9f7c172ac6d9d5d0bd9dd1f4b62))

## [1.2.0](https://github.com/orazchollaev/invictus-tournament-maker/compare/v1.1.0...v1.2.0) (2026-05-24)

### Features

- **header:** add GitHub star button ([3283d44](https://github.com/orazchollaev/invictus-tournament-maker/commit/3283d44e2cc6aa5a3c436a84766d80fcba9c34db))
- **search:** add live search to teams and tournaments list ([a28eb8d](https://github.com/orazchollaev/invictus-tournament-maker/commit/a28eb8dc8beaf2df2672b4c2c9a2887fd24450f9))
- **settings:** add match defaults and surprise factor steppers ([a8a9b21](https://github.com/orazchollaev/invictus-tournament-maker/commit/a8a9b21eff746d5916b7f045e92a324cc48e1b45))
- **teams:** add abbr field with auto-fit display across bracket, fixture, and group stage ([4c8880d](https://github.com/orazchollaev/invictus-tournament-maker/commit/4c8880d4d7740dde92eeec557e17a16247840437))
- **teams:** raise team limit to 128 ([cd103b9](https://github.com/orazchollaev/invictus-tournament-maker/commit/cd103b9953ebe6eb9c4124f7b691dde371d7459d))
- **teams:** replace inline edit with modal form and redesign list UI ([ba39cd9](https://github.com/orazchollaev/invictus-tournament-maker/commit/ba39cd9cc75124123cb4e32d5b45e0a6bf0c8273))
- **teams:** replace native color input with custom color picker ([5f6ae44](https://github.com/orazchollaev/invictus-tournament-maker/commit/5f6ae4438e7839fca41ba36a1b7b20fc836a42d0))
- **tournaments:** clean up list UI ([b6cadde](https://github.com/orazchollaev/invictus-tournament-maker/commit/b6cadde2147535e2720f1b9acef0eb3c83a17d56))
- **ui:** replace Open text buttons with chevron icons in lists ([bed11e4](https://github.com/orazchollaev/invictus-tournament-maker/commit/bed11e44ca633de133454cb0cd56804a76fbb973))

### Chores

- **i18n:** translate remaining Turkish strings to English ([59a9435](https://github.com/orazchollaev/invictus-tournament-maker/commit/59a943588dace1964f5bd9d71cb8072d4cc7caef))

## [1.1.0](https://github.com/orazchollaev/invictus-tournament-maker/compare/v1.0.1...v1.1.0) (2026-05-24)

### Features

- add two leg system for group matches and knockouts ([c8b79ab](https://github.com/orazchollaev/invictus-tournament-maker/commit/c8b79abf3f1a4684cc39ef2f87f151ddab1a08b3))
- **bracket:** add PNG export button to download bracket as image ([0bede40](https://github.com/orazchollaev/invictus-tournament-maker/commit/0bede4061f0f891b323c40809323e9904c52b4b1))
- **bracket:** add zoom controls to bracket and full view modal ([e6fabce](https://github.com/orazchollaev/invictus-tournament-maker/commit/e6fabce39392e6ab579a2d9166e2d1b8b9fda856))
- **groups:** add per-group and global sim-week buttons ([07ae09f](https://github.com/orazchollaev/invictus-tournament-maker/commit/07ae09f0246f292b4cee24c468eeda4441edc1e3))
- **teams:** add per-season W/D/L bar chart to team detail page ([613a335](https://github.com/orazchollaev/invictus-tournament-maker/commit/613a3353cecea0032f403d3bb09f5c0e95112bde))
- **teams:** clamp power rating to 1–99 ([a46f225](https://github.com/orazchollaev/invictus-tournament-maker/commit/a46f225ca8ce64f6a7a43f11c5a6b68378f68845))
- **tournament:** add simulate all button to run full tournament at once ([07914db](https://github.com/orazchollaev/invictus-tournament-maker/commit/07914db3717093174f3bd542aef3ac3945b39ffc))

### Bug Fixes

- **groups:** truncate long team names and fix 2-group grid layout ([adbe389](https://github.com/orazchollaev/invictus-tournament-maker/commit/adbe389ff5f9cd798e967641c923e428a956d050))
- **teams:** show penalty score for two-leg matches in team detail page ([4259fac](https://github.com/orazchollaev/invictus-tournament-maker/commit/4259facef917084ddeb41ba6af17d8dae7f6d310))

## [1.0.1](https://github.com/orazchollaev/invictus-tournament-maker/compare/v1.0.0...v1.0.1) (2026-05-23)

### Features

- **branding:** replace project logos with new design ([bfbefd6](https://github.com/orazchollaev/invictus-tournament-maker/commit/bfbefd6de3801426584f4ec92458099c8de7aab5))

## [1.0.0](https://github.com/orazchollaev/invictus-tournament-maker/compare/v0.8.1...v1.0.0) (2026-05-23)

### Features

- add third place matches to team history and stats ([32dd20c](https://github.com/orazchollaev/invictus-tournament-maker/commit/32dd20cdf5bd0f26eeccf736d67f3380dfe40a48))
- **groups:** group fixture matches by round day with headers ([a75935c](https://github.com/orazchollaev/invictus-tournament-maker/commit/a75935ca436fe79cdfd6af43f74a990dd96bf3d9))
- increase maximum team limit from 32 to 40 ([e632faa](https://github.com/orazchollaev/invictus-tournament-maker/commit/e632faabae56cf2689f16535cb79c30f7556002d))
- make project fully responsive for mobile screens ([e0dfca5](https://github.com/orazchollaev/invictus-tournament-maker/commit/e0dfca5d5061d678ec472a9cc15877e27234958e))
- **tournament:** add fixture system as alternative to bracket format ([9e5b45f](https://github.com/orazchollaev/invictus-tournament-maker/commit/9e5b45fb9645107962346e52bfc579cac5e0f46c))
- **ui:** increase container width for wider layout support ([7074924](https://github.com/orazchollaev/invictus-tournament-maker/commit/707492467e0bb670b9718cbecad463fc51cfe9f1))

### Bug Fixes

- align back button icons with text using inline-flex ([1e67ed1](https://github.com/orazchollaev/invictus-tournament-maker/commit/1e67ed102c8357b95c9e8fe300920b81efbd1d10))
- exclude bye matches from team statistics and history ([69695cb](https://github.com/orazchollaev/invictus-tournament-maker/commit/69695cbdb0651df8c7aec139885c28ab78b92a9a))
- **groups:** resolve TypeScript errors in getMatchRounds function ([7441c0a](https://github.com/orazchollaev/invictus-tournament-maker/commit/7441c0a73377be5468724f8585b2857cb6ab455a))
- prevent new season start before third place match is completed ([2bdf70e](https://github.com/orazchollaev/invictus-tournament-maker/commit/2bdf70e9dee6eefb674d3c3e8b325f6ca74a7055))
- **tournament:** ensure third place match is not reset in subsequent seasons ([b368002](https://github.com/orazchollaev/invictus-tournament-maker/commit/b3680022759fc8b7aff9e7e5c86e095a956abe59))

### Code Refactoring

- **tournament:** split store into slices and extract BracketPanel component ([3c35c4e](https://github.com/orazchollaev/invictus-tournament-maker/commit/3c35c4e7897dfb0cd4c57d2769c1029db4f8e79c))

### Styles

- refresh header with pill nav and settings icon button ([6132ed1](https://github.com/orazchollaev/invictus-tournament-maker/commit/6132ed17d0b49c7b86983636d2b2d9bfd540ac4c))
- soften light theme, darken dark theme, switch accent to teal ([2937b19](https://github.com/orazchollaev/invictus-tournament-maker/commit/2937b19960d8576a5ab910dc25bedf441726a37e))

## [0.8.1](https://github.com/orazchollaev/invictus-tournament-maker/compare/v0.8.0...v0.8.1) (2026-05-22)

### Features

- add third place match ([d69280b](https://github.com/orazchollaev/invictus-tournament-maker/commit/d69280bd1d1958f2bf4a3739b71146b143bfb168))
- **bracket:** simplify bracket layout, fix 3rd place positioning, gold final card ([5f87bd9](https://github.com/orazchollaev/invictus-tournament-maker/commit/5f87bd96e0edd09bc7e50b3be48d6af26819226d))
- **tournament:** add in-tournament team statistics panel ([f96b015](https://github.com/orazchollaev/invictus-tournament-maker/commit/f96b0158c160144836a4229f9cdf6d2abcb20939))

### Bug Fixes

- **style:** winner tag border-radius fixed ([ecc8d4d](https://github.com/orazchollaev/invictus-tournament-maker/commit/ecc8d4d5eb4e298ed077e565a98c6c223938fae7))

## [0.8.0](https://github.com/orazchollaev/invictus-tournament-maker/compare/v0.7.1...v0.8.0) (2026-05-20)

### Features

- add group count editing in tournament settings ([c71c27c](https://github.com/orazchollaev/invictus-tournament-maker/commit/c71c27cecee724e5b60b0f58789f480c0b7381a8))
- configurable qualifiers-per-group with correct cross seeding ([e20f6ac](https://github.com/orazchollaev/invictus-tournament-maker/commit/e20f6ac7de50e3c99a3c60088a559701bc4a1255))
- **style:** flat sports theme with accent colors, rounded cards, and clean tab borders ([fa24ffb](https://github.com/orazchollaev/invictus-tournament-maker/commit/fa24ffb03f88a911ed122801ef17201d225fdcb3))
- **ui:** create separate modal for tournament creation ([3298f30](https://github.com/orazchollaev/invictus-tournament-maker/commit/3298f3037765d08c39761dee6beb03124499e7b9))
- **ui:** replaced emojis with proper icons across the app ([804bc99](https://github.com/orazchollaev/invictus-tournament-maker/commit/804bc99bc43afa2c45bd8ee239898783c7d7a9af))

### Bug Fixes

- group matches replay bug fixed ([4b25340](https://github.com/orazchollaev/invictus-tournament-maker/commit/4b25340f965963a4a55d2e318cda6eea4320c63d))
- **teams:** block deletion of teams added to tournaments ([cca8ec4](https://github.com/orazchollaev/invictus-tournament-maker/commit/cca8ec4f863976b3c00e56ac7c477df0280ef2bd))
- **ui:** fixed dark and light mode colors of notices ([54393be](https://github.com/orazchollaev/invictus-tournament-maker/commit/54393be306c45663de06c6e47d4ac0b5a51bfe4b))

## [0.7.1](https://github.com/orazchollaev/invictus-tournament-maker/compare/v0.7.0...v0.7.1) (2026-05-20)

### Bug Fixes

- reset activeTab to 'groups' on new season start after group tournament ([451a62e](https://github.com/orazchollaev/invictus-tournament-maker/commit/451a62e60e6dc64c9a054ec2113ad6e3110ff651))

### Code Refactoring

- extract some components, useModal/useTeamLookup composables, unify utility CSS ([06b4ee0](https://github.com/orazchollaev/invictus-tournament-maker/commit/06b4ee0d9196f01162f1a961833660b980d1a1b1))

## [0.7.0](https://github.com/orazchollaev/invictus-tournament-maker/compare/v0.6.5...v0.7.0) (2026-05-20)

### Features

- add random/seeded/manual draw type selection to regenerate draw in tournament settings ([f92210d](https://github.com/orazchollaev/invictus-tournament-maker/commit/f92210d816e014d890e73641b1f3f5248f9fbd47))
- **group-stage:** score button accent color from winning team, grey for draws ([465acd6](https://github.com/orazchollaev/invictus-tournament-maker/commit/465acd6791a5fcb60acd55e64cc959a1f344243a))
- **settings:** carry playoff seed mode to new seasons ([9039a03](https://github.com/orazchollaev/invictus-tournament-maker/commit/9039a03d023fb31ed3bbc116878e4e37976fdbcf))

### Code Refactoring

- **settings:** replace card grids with compact btn-group selectors and inline team chips ([7376a47](https://github.com/orazchollaev/invictus-tournament-maker/commit/7376a479a5ff0c3fddca4c0344a32fb37f44d3bf))
- **tournament-detail:** tighten bracket section spacing ([4965292](https://github.com/orazchollaev/invictus-tournament-maker/commit/49652923f537936737ad04c967afc44156859f29))

## [0.6.5](https://github.com/orazchollaev/invictus-tournament-maker/compare/v0.6.4...v0.6.5) (2026-05-19)

### Features

- add tournament settings modal with team management and draw controls ([1cb1df7](https://github.com/orazchollaev/invictus-tournament-maker/commit/1cb1df791cacb302d3cd6549aab5513c5a8cb63a))
- move reset/delete to settings danger zone, new season to header ([dc7fbda](https://github.com/orazchollaev/invictus-tournament-maker/commit/dc7fbda5ac41b683e3fd1131a5d34b1d4aee971d))

### Bug Fixes

- distribute bracket byes evenly to prevent null-vs-null matches ([ebf0fc0](https://github.com/orazchollaev/invictus-tournament-maker/commit/ebf0fc06b85d7da2dcfdb0e3ba4cd41b215bb9fc))

## [0.6.4](https://github.com/orazchollaev/invictus-tournament-maker/compare/v0.6.3...v0.6.4) (2026-05-19)

### Chores

- test github release ([4ac1d12](https://github.com/orazchollaev/invictus-tournament-maker/commit/4ac1d1297475ee94ecd1a8bab40c7f9d1959bdb8))

## [0.6.3](https://github.com/orazchollaev/invictus-tournament-maker/compare/v0.6.2...v0.6.3) (2026-05-19)

### Features

- add PWA support with offline caching ([5e2bdd5](https://github.com/orazchollaev/invictus-tournament-maker/commit/5e2bdd5159ae27bfee6a0ef7cc21364049e02a59))

### Bug Fixes

- pwa logo names ([517dafc](https://github.com/orazchollaev/invictus-tournament-maker/commit/517dafca52d677a56b2389646840ecd7c34237b1))

### Documentation

- update README for group+bracket format and engine refactor ([8910336](https://github.com/orazchollaev/invictus-tournament-maker/commit/8910336c20ef1a38d6d525969960697739f3172c))

## [0.6.2](https://github.com/orazchollaev/invictus-tournament-maker/compare/v0.6.1...v0.6.2) (2026-05-19)

### Features

- add rank index column to group standings table ([66e23a8](https://github.com/orazchollaev/invictus-tournament-maker/commit/66e23a80090a26ae9cc44458d2b8941cd722001e))

### Bug Fixes

- stabilize group stage UI and clean up GroupDraw strings ([650f84d](https://github.com/orazchollaev/invictus-tournament-maker/commit/650f84da84754e8b201938b9bba1a8ac40a4911c))

### Code Refactoring

- **engine:** split logic.ts into focused modules ([03764c5](https://github.com/orazchollaev/invictus-tournament-maker/commit/03764c5597d19f3425ca8586fa9a1ee1fa78073e))

## [0.6.1](https://github.com/orazchollaev/invictus-tournament-maker/compare/v0.6.0...v0.6.1) (2026-05-19)

### Bug Fixes

- add manuel group draw, resolve new season group format issue and group ui stabilized ([6ea08eb](https://github.com/orazchollaev/invictus-tournament-maker/commit/6ea08ebba9e9dd126165eb23cad5cab96260a131))
- randomize group placement within seeded tiers on new season ([6c89a5f](https://github.com/orazchollaev/invictus-tournament-maker/commit/6c89a5ff45fa976fc5172b0ae39ebe207a1a6fae))

### Chores

- resolve vercel deploy issue ([2648f6b](https://github.com/orazchollaev/invictus-tournament-maker/commit/2648f6bfcf88a8e77ef4fbb8c668ebd41b58aa1f))

## [0.6.0](https://github.com/orazchollaev/invictus-tournament-maker/compare/v0.5.0...v0.6.0) (2026-05-19)

### Features

- add basic group stage system ([d844e0e](https://github.com/orazchollaev/invictus-tournament-maker/commit/d844e0ecd83fbfe18aa7f96e7773c3b60e7427f8))
- add match result with penalties in team detail page ([f39fac9](https://github.com/orazchollaev/invictus-tournament-maker/commit/f39fac9228f3ce2c3a156253be3954d791278446))
- add project logos and branding assets ([c397750](https://github.com/orazchollaev/invictus-tournament-maker/commit/c397750d5d089b62d4eb2dc8739c69108a685693))

### Documentation

- add logo in README.md ([ee3ce07](https://github.com/orazchollaev/invictus-tournament-maker/commit/ee3ce0744aa5717f61844e1b1132a4957e9eca8a))
- enrich README with features, project structure, and tech table ([ce815a8](https://github.com/orazchollaev/invictus-tournament-maker/commit/ce815a8cd9deead946def71f5b7bbb0fafae2d5e))
- fix README group stage text ([dcf3eca](https://github.com/orazchollaev/invictus-tournament-maker/commit/dcf3ecac89243c64e1441234046fe0fa0f9acd2a))

## [0.5.0](https://github.com/orazchollaev/invictus-tournament-maker/compare/v0.4.1...v0.5.0) (2026-05-18)

### ⚠ BREAKING CHANGES

- add penalty system

### Features

- add not found page ([2507858](https://github.com/orazchollaev/invictus-tournament-maker/commit/2507858f2a2c010e5b4f376c85652dbb54f78b5e))
- add penalty shootout for drawn matches ([0db449a](https://github.com/orazchollaev/invictus-tournament-maker/commit/0db449a207f202f4952ef319a14a7df8941c1f1a))
- add penalty system ([563b1a1](https://github.com/orazchollaev/invictus-tournament-maker/commit/563b1a1d02bd7eaa340185e319b5d88eb1ccb50e))

## [0.4.1](https://github.com/orazchollaev/invictus-tournament-maker/compare/v0.4.0...v0.4.1) (2026-05-18)

### Features

- add back button in settings page ([eccf4ed](https://github.com/orazchollaev/invictus-tournament-maker/commit/eccf4ed27c3d13db150617bf442cb28054af6039))
- **teams:** add team detail page with match history and form ([40107b9](https://github.com/orazchollaev/invictus-tournament-maker/commit/40107b9ae382663025f57c3f3f5afb0ff2401689))

### Chores

- **deps:** update minor dependencies ([dbc7334](https://github.com/orazchollaev/invictus-tournament-maker/commit/dbc73342a4080386cab3862626cd849f61a3835a))

### Styles

- restyle winner tag with team-color left border ([28d6709](https://github.com/orazchollaev/invictus-tournament-maker/commit/28d67090532a8bb9ab0fc7536bdb1903ffa93dab))

## [0.4.0](https://github.com/orazchollaev/invictus-tournament-maker/compare/v0.3.2...v0.4.0) (2026-05-18)

### Features

- add responsive design support ([cdea19a](https://github.com/orazchollaev/invictus-tournament-maker/commit/cdea19a1d1a50e8fcf346cf5ea467e8117df08b6))
- **settings:** add file-based sample datasets with auto-discovery ([d80265d](https://github.com/orazchollaev/invictus-tournament-maker/commit/d80265d374136de6f298209810787a027b5405ab))

## [0.3.2](https://github.com/orazchollaev/invictus-tournament-maker/compare/v0.3.1...v0.3.2) (2026-05-18)

### Bug Fixes

- **confetti:** raise z-index above bracket fullscreen modal ([02df297](https://github.com/orazchollaev/invictus-tournament-maker/commit/02df29720f2950fde18ee1df7e0b72d9ca4690ca))

## [0.3.1](https://github.com/orazchollaev/invictus-tournament-maker/compare/v0.3.0...v0.3.1) (2026-05-18)

### Features

- **bracket:** add fullscreen full view modal ([f375efc](https://github.com/orazchollaev/invictus-tournament-maker/commit/f375efc6c98a4534c38c8f260204b4792689a17a))

## [0.3.0](https://github.com/orazchollaev/invictus-tournament-maker/compare/v0.2.2...v0.3.0) (2026-05-18)

### Features

- **settings:** add data export and import functionality ([0a428d9](https://github.com/orazchollaev/invictus-tournament-maker/commit/0a428d9ce4e79722213ae580542a54edecb88895))
- **settings:** show app version below settings ([8cef388](https://github.com/orazchollaev/invictus-tournament-maker/commit/8cef388a41a03c868b468dcf6dbb952f6a8db3f1))
- **ui:** increase team limit to 32 and improve large-bracket UX ([6d514d6](https://github.com/orazchollaev/invictus-tournament-maker/commit/6d514d6fdc49f980ee6926a4600f44a914960368))

### Bug Fixes

- **ui:** bracket winner background dark mode color fixed ([81c487f](https://github.com/orazchollaev/invictus-tournament-maker/commit/81c487fb14affc5bfefefe0fb49a1549f994a488))

### Code Refactoring

- **style:** replace inline styles with scoped CSS classes ([8b92a85](https://github.com/orazchollaev/invictus-tournament-maker/commit/8b92a85a95e147fb66c6e2258a5785ba3a58eca7))

## [0.2.2](https://github.com/orazchollaev/invictus-tournament-maker/compare/v0.2.1...v0.2.2) (2026-05-18)

### Features

- **settings:** add settings page with theme switcher and clear data ([9cdb002](https://github.com/orazchollaev/invictus-tournament-maker/commit/9cdb0026d860ce448fadf44925d59820f7c83f32))

## [0.2.1](https://github.com/orazchollaev/invictus-tournament-maker/compare/v0.2.0...v0.2.1) (2026-05-18)

### Features

- **tournament:** add manual draw and remove tournament rename ([f959cfd](https://github.com/orazchollaev/invictus-tournament-maker/commit/f959cfd759512cb7419de6f680248af5e9bd7dbc))
- **ui:** replace inline styles with css classes and add new season modal ([4bc89bc](https://github.com/orazchollaev/invictus-tournament-maker/commit/4bc89bca4d5f95b4b9112aa57297efeb637d339b))

### Bug Fixes

- **tournament:** extract new season handlers to fix template syntax error ([41c9b55](https://github.com/orazchollaev/invictus-tournament-maker/commit/41c9b55b93378de935d3f2921324016eacf930a7))
- **tournament:** show new season draw picker as modal in detail page ([508c896](https://github.com/orazchollaev/invictus-tournament-maker/commit/508c896d8b01d5e4e5f467fd5ce4e26d303f13d0))

### Styles

- **tournament:** replace radio inputs with segmented control and highlight selected team chips ([4b8c453](https://github.com/orazchollaev/invictus-tournament-maker/commit/4b8c453fb0f5067523c672b69e5a3f658e878c05))

## [0.2.0](https://github.com/orazchollaev/invictus-tournament-maker/compare/v0.1.7...v0.2.0) (2026-05-18)

### Features

- **tournament:** add season numbering, rename, and new season support ([2f9d98f](https://github.com/orazchollaev/invictus-tournament-maker/commit/2f9d98f718d2e7a5ef5a0b1e8c20bf33ed64d785))
- **tournament:** add seeded draw option for new tournaments and seasons ([d7c5ea4](https://github.com/orazchollaev/invictus-tournament-maker/commit/d7c5ea4b1d4f94d740677ae739b4f5c0fbcc672b))

### Code Refactoring

- change default team names ([738a455](https://github.com/orazchollaev/invictus-tournament-maker/commit/738a45586db849bf52fd242374b6480eca19c0ae))

### Documentation

- change project name in README.md ([2b5799e](https://github.com/orazchollaev/invictus-tournament-maker/commit/2b5799e15fd5f2d5bea0b6f5993783f0c27962a0))
- update README.md ([6767a2d](https://github.com/orazchollaev/invictus-tournament-maker/commit/6767a2dcfdcc29046600206f41b62821f1e0ad16))

## [0.1.7](https://github.com/orazchollaev/invictus-tournament-maker/compare/v0.1.6...v0.1.7) (2026-05-18)

### Features

- **tournament:** fire team-colored confetti on winner ([604d4dd](https://github.com/orazchollaev/invictus-tournament-maker/commit/604d4dd95cc7a9d281f18b3c7b2992fca1b497e7))

### Bug Fixes

- only clear downstream path when overriding a match result ([73492fa](https://github.com/orazchollaev/invictus-tournament-maker/commit/73492fa7783fb3a4c655a909522bc30a4da2087c))

### Chores

- extract component logic into composables ([fdd086d](https://github.com/orazchollaev/invictus-tournament-maker/commit/fdd086d3e8a3140a86f0a424305ec537dd2a7621))

### Styles

- customize scrollbar appearance ([ff13f61](https://github.com/orazchollaev/invictus-tournament-maker/commit/ff13f61cf9858c88fd123c89ef049847852cf092))
- update header item hover states ([b11777d](https://github.com/orazchollaev/invictus-tournament-maker/commit/b11777d86cb713fba69e7d634d43f04e2a75a255))

## [0.1.6](https://github.com/orazchollaev/invictus-tournament-maker/compare/v0.1.5...v0.1.6) (2026-05-18)

### Features

- **ui:** disable add team section instead of hiding it at max limit ([775b0eb](https://github.com/orazchollaev/invictus-tournament-maker/commit/775b0ebfc78f93ca64771d346c9bc79a75d23d26))
- **ui:** move team creation section to top ([3a6bd9a](https://github.com/orazchollaev/invictus-tournament-maker/commit/3a6bd9afbf4540f80dd202d5eddcc80cd7f02555))

### Chores

- add 'vue/block-order' config in eslint.config.mjs ([a7b55f7](https://github.com/orazchollaev/invictus-tournament-maker/commit/a7b55f73e085ec3ef03014e8bd08be34974a81ec))
- fix eslint config for vue ([b5e1b4e](https://github.com/orazchollaev/invictus-tournament-maker/commit/b5e1b4e6d405d6061496f22f983fa9e100bc45c0))

### Styles

- switch UI font to IBM Plex Sans ([a483a8e](https://github.com/orazchollaev/invictus-tournament-maker/commit/a483a8e485e321406d031a15c642c2a3fcb6e755))

## [0.1.5](https://github.com/orazchollaev/invictus-tournament-maker/compare/v0.1.4...v0.1.5) (2026-05-16)

### Features

- **engine:** improve match simulation realism with balanced randomness and strength scaling ([db2170b](https://github.com/orazchollaev/invictus-tournament-maker/commit/db2170b6cab85ca3dfcb03c52f0f3f5a98eee004))
- **tournament:** add full reset functionality for match results and winner state ([a1a43a8](https://github.com/orazchollaev/invictus-tournament-maker/commit/a1a43a81bd02f0a5ce338baa9d2068b08356d35b))

### Chores

- **eslint:** correct unused-imports plugin configuration ([d69fd9f](https://github.com/orazchollaev/invictus-tournament-maker/commit/d69fd9f1a1e9737e4a6cdf3646f3eb502fe8dd6f))
- fix unused variables and improve TypeScript/ESLint compliance ([0bdaaca](https://github.com/orazchollaev/invictus-tournament-maker/commit/0bdaacaec99951b9dcc3e888b3ab8b8b54186b19))

## [0.1.4](https://github.com/orazchollaev/invictus-tournament-maker/compare/v0.1.3...v0.1.4) (2026-05-16)

### Features

- add details button and remove row click navigation ([dfe5a24](https://github.com/orazchollaev/invictus-tournament-maker/commit/dfe5a24bce151943a0e4408a49ae7dd11f7babd6))
- **simulation:** improve match algorithm (ongoing realism enhancements) ([17adddd](https://github.com/orazchollaev/invictus-tournament-maker/commit/17adddd0a63b84c9193fbda78c8493329ed5b291))
- **ui:** hide number input spin buttons ([db33176](https://github.com/orazchollaev/invictus-tournament-maker/commit/db33176c0808d98e663463440c6d79a30a2444a8))

## [0.1.3](https://github.com/orazchollaev/invictus-tournament-maker/compare/v0.1.2...v0.1.3) (2026-05-16)

### Features

- add elimination round table to tournament detail page ([c6f4bce](https://github.com/orazchollaev/invictus-tournament-maker/commit/c6f4bce3142e4ca0b0356287974bfb28ccb72a60))
- extract tournament detail page ([42a4c37](https://github.com/orazchollaev/invictus-tournament-maker/commit/42a4c37bad419b4cf8e81a83c8396b3c1765555f))

### Code Refactoring

- extract header into reusable component ([8be00eb](https://github.com/orazchollaev/invictus-tournament-maker/commit/8be00eb320f113843134de27c66279c975700197))

## [0.1.2](https://github.com/orazchollaev/invictus-tournament-maker/compare/v0.1.1...v0.1.2) (2026-05-16)

### Features

- add data reset functionality ([ded357b](https://github.com/orazchollaev/invictus-tournament-maker/commit/ded357b3c1f67bea803fbc4fc4eac927b9ba7f4b))

### Bug Fixes

- bracket layout positioning issue ([a39a2d4](https://github.com/orazchollaev/invictus-tournament-maker/commit/a39a2d4cbe1362baac315129c20bac2f2834f2e0))

## [0.1.1](https://github.com/orazchollaev/invictus-tournament-maker/compare/v0.1.0...v0.1.1) (2026-05-16)

### Features

- add select all option for team selection ([dc0a275](https://github.com/orazchollaev/invictus-tournament-maker/commit/dc0a275e2241feeec829033f029a337a3a388602))
- persist teams and tournaments in localStorage ([f652c1d](https://github.com/orazchollaev/invictus-tournament-maker/commit/f652c1d58bab937649b2519c9c6515224da9ef1c))

## 0.1.0 (2026-05-16)

### Features

- add initial MVP implementation ([7d49ee1](https://github.com/orazchollaev/invictus-tournament-maker/commit/7d49ee1ee0b211e89283399324731f26f69d5007))
