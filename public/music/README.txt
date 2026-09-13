Drop the bundled background track here as `theme.ogg`.

It is referenced by src/modules/music/constants.ts as `music/theme.ogg`.
If the file is absent the app does not error: the player treats the built-in
track as unavailable and falls back to whatever the user has uploaded.
