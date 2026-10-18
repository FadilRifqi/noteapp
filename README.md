# Archnote

A temporary-notes scratchpad for Linux, inspired by Antinote. One floating window,
a stack of plain-text notes, a tray icon, and a global hotkey.

## Development

```bash
npm install
npm run tauri dev
```

## Build

```bash
npm run tauri build
```

Bundle output: `src-tauri/target/release/bundle/`.

## Shortcuts

| Shortcut | Action |
| --- | --- |
| Ctrl+N | New note |
| Ctrl+Alt+Left / Ctrl+Alt+Right | Previous / next note |
| Ctrl+Shift+Backspace | Delete current note (to the Void) |
| Ctrl+= / Ctrl+- / Ctrl+0 | Note font bigger / smaller / reset |
| Aa button | Font family, weight and size for notes |
| Super+N | Summon Archnote (registered through the XDG GlobalShortcuts portal; approve KDE's prompt on first run) |
| Horizontal two-finger swipe | Navigate notes; swipe past the newest starts a new one |

The **Aa** button opens the note font picker: the system font (from your KDE
settings) or any installed family, with Regular/Medium/SemiBold weights and a size
control. It applies to the editor and sticky notes only.

The title bar also has a **pin** button (pin the current note to the desktop as a
moveable sticky) and a **trash** button (delete to The Void, with a 5 second undo).

## Background and autostart

Archnote runs in the tray and hides to the tray when closed. It registers itself for
autostart at login (`~/.config/autostart/`), launching hidden with `--hidden`.

Super+N is registered automatically through the XDG GlobalShortcuts portal (KDE
Plasma 6.4+). Approve the shortcut prompt the first time it appears. The shortcut can
be inspected later under System Settings -> Shortcuts.

If the portal is unavailable, bind it manually:

1. System Settings -> Shortcuts -> Custom Shortcuts -> Edit -> New -> Global Shortcut -> Command/URL
2. Trigger: `Super+N`
3. Action: `/path/to/archnote --toggle`

`--toggle` talks to the already-running instance (single instance), so it will never
open a second copy.

## Data

Notes live in SQLite at the app data directory (`archnote.db`). Deleting a note marks it
deleted (the Void) instead of removing the row. No network access, no accounts.

Pinned notes open as small windows that sit on the desktop (below normal windows, hidden
from the task manager, Alt+Tab and the pager) and are remembered by KWin window rules (`~/.config/kwinrulesrc`, one rule per pinned note
with Remember position/size). They reopen automatically when the app starts.

## Project layout

```
src/                  React frontend
src/components/       Title bar, editor, dots, theme menu, icons
src/hooks/useNotes.ts Note stack state and persistence
src/lib/              Database access, themes
src-tauri/            Rust backend: tray, autostart, single instance, SQLite migrations
DESIGN.md             Visual direction and design decisions
```
