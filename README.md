# Chat Widget UI (React + Vite + Tailwind)

A floating chat widget UI (WhatsApp-style bubbles, typing indicator, composer with multi-line textarea, optional branding banner).

## Getting started

### Install

```bash
pnpm install
```

### Run dev server

```bash
pnpm dev
```

### Build

```bash
pnpm build
```

## Key features

- **Multi-line composer**: `Enter` sends, `Shift+Enter` inserts a newline
- **Message grouping**:
  - bubbles align **right** for `user`, **left** for `assistant`/`agent`
  - curved “tail” only on the **last message in a group**
  - timestamps show only on the **last message** in a consecutive same-sender + same-minute block
- **Typing indicator**: dot1 → dot2 → dot3, pause, repeat
- **Optional branding banner** below the composer (“Powered by …”)

## Project structure

### UI components

- `src/App.tsx`: thin wrapper that exports the widget
- `src/chat/ChatWidget.tsx`: widget shell, open/close, header, layout
- `src/chat/ChatBody.tsx`: bubble rendering, grouping logic, avatar/timestamp row
- `src/chat/ChatComposer.tsx`: textarea + attach + send + branding banner
- `src/chat/TypingIndicator.tsx`: typing dots component
- `src/chat/sampleMessages.ts`: long demo dataset for UI testing

### Styling

- Tailwind utilities are applied directly in TSX.
- `src/chat/styles/custom.css` contains only the pieces Tailwind can’t express cleanly:
  - bubble tail `mask` shapes
  - calc-based radii / “tail reserve” border
  - typing keyframes
  - chat font variable hook (`--chat-font`)

### Helpers

- `src/helpers/index.ts`:
  - `getInitials(name, role)` for avatar initials
  - `getMessageMeta(messages)` returns grouping metadata (`side`, `isLastOfGroup`, `initials`)

## Configuration knobs

- **Font**: `src/index.css` → `--chat-font`
- **Branding banner**: `src/chat/ChatWidget.tsx` passes `showBranding`, `brandingHref`, `brandingLabel` into `ChatComposer`

## Notes

- The widget uses CSS custom properties (see `src/index.css`) to control sizing/positioning.
- Inter is loaded via `index.html` for a modern, professional UI font.
