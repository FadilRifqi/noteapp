# Archnote design direction

## What it is

A scratchpad for notes you will throw away. One small floating window, a stack of
plain-text notes, opened with Super+N from anywhere, always ready, never in the way.

## Identity

Quiet, warm, personal. The window should feel like a well-made paper object left on
the desk: compact, tactile, calm. Not a productivity dashboard, not a chat app.

## References

- Antinote (antinote.io) sets the interaction model: scratchpad stack, swipe
  navigation, first-line keywords, plain text, floating window.
- Catppuccin sets the default palette, because the user's desktop (KDE Plasma) already
  runs Catppuccin Frappe. The app should feel native to that desktop.

## Type

- UI and note text: Adwaita Sans. Native, humanist, calm; not the generic AI-picked
  Inter or a terminal monospace.
- Numerals, counters, keyword tags: Geist Mono, for a subtle "instrument" feel.

## Palette

Themes are token sets (see `src/index.css`):

- Frappe (default): Catppuccin Frappe base, flamingo accent
- Latte: Catppuccin Latte, flamingo accent
- Macchiato: Catppuccin Macchiato, flamingo accent
- Mocha: Catppuccin Mocha, flamingo accent
- Paper: warm cream and terracotta, an editorial alternative

Each theme defines: bg, bg-elev, bg-raised, ink, ink-dim, ink-faint, line, accent,
on-accent, selection, shadow. Accent is used sparingly: caret, active dot, focus ring,
pinned state.

## Composition

- Borderless floating card, 14px radius, one soft shadow. The window is the object.
- 44px title bar: wordmark and note counter left; theme, pin, new, minimize, hide right.
- Editor fills the window with generous padding; no toolbars, no formatting chrome.
- Bottom strip: stack dots centered, word count right in mono.
- One focal point per screen: the text cursor.

## Motion

Dial: ENERGY 2 / RHYTHM 2 / MOTION 2.

- Note transitions: 160ms horizontal slide with slight fade.
- Chrome buttons: 120ms color fade, no bounce, no scale.
- Dots: 140ms opacity/scale.
- No decorative animation anywhere.

## Copy

Plain, direct, lowercase where it reads naturally. No exclamation marks, no marketing
words, no em dashes.

## Accessibility

- Keyboard: Ctrl+N new note, Ctrl+Alt+Left/Right navigate, Ctrl+Shift+Backspace delete,
  Escape closes popovers.
- Visible focus rings on every interactive element (accent outline).
- Contrast: ink on bg uses Catppuccin's built-in AA ratios; accent is decorative, never
  the only carrier of meaning.
- Both light and dark themes ship and are verified.

## Non-goals

- No folders, tags, sync, accounts.
- No rich text toolbar.
- No AI features reading notes.
