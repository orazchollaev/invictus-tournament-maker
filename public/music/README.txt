Drop the bundled background track here as `theme.mp3`.

It is referenced by src/modules/music/constants.ts as `music/theme.mp3`.
If the file is absent the app does not error: the player treats the built-in
track as unavailable and falls back to whatever the user has uploaded.
