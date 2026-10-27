# Design

**Theme: Paper.** Light, editorial, evidence-first. Chosen because this is a
strategy and research tool, not a systems dashboard, and because a project that
asks you to audit its arithmetic should read like a document rather than a
terminal. One theme, everywhere: app, screenshots, social preview.

Token *values* live in [`frontend/src/index.css`](../frontend/src/index.css);
their Tailwind names live in
[`frontend/tailwind.config.js`](../frontend/tailwind.config.js). Components
reference names only — a raw hex in a component means the system is being
bypassed.

## Colour

| Token | Value | Use |
|---|---|---|
| `background` | `#F6F5F1` | Page |
| `card` | `#FFFFFF` | Panels, tables |
| `surface-2` | `#EFEDE6` | Table headers, hovered rows, subtle fills |
| `border` | `#E2DFD6` | Hairlines, card borders |
| `strong` | `#C9C5B9` | Inputs, emphasised rules |
| `foreground` | `#15171A` | Primary text |
| `muted` | `#5B5F66` | Secondary text and labels |
| `subtle` | `#8C9097` | Captions and axis ticks only — never body copy |
| `primary` | `#1D3FD8` | The one accent |
| `success` `warning` `danger` | `#0F8A5F` `#B7791F` `#C2362F` | Status only |
| `chart-1/2/3` | `#1D3FD8` `#8C9097` `#C9C5B9` | Highlight mode |

Tokens are stored as RGB channels (`--primary-rgb: 29 63 216`) so Tailwind can
inject an alpha (`bg-primary/10`), with a colour form derived from them
(`--primary: rgb(var(--primary-rgb))`) for SVG `fill` and `stroke` attributes.

**One accent, about 5% of the screen.** On this app that budget is spent on: the
single primary action, the active nav item, focus rings, section numbers, and
the plotted point on the matrix. Everything else — including the axis-input
meters and the provenance chips, which appear dozens of times per page — is
grey. Four cobalt meters next to each other emphasise nothing.

## Type

Instrument Serif for display (≥24px only, never fake-bolded; it ships 400 and
italic). Geist for UI. Geist Mono for every number, label and section marker.
Scale in px: 11 · 12 · 13 · 14 · 16 · 18 · 20 · 24 · 30 · 36 · 48. Body is 14,
tables 13, labels 12. Numbers are `tabular-nums` so they compare down a column.

## Signature

Three details make a screen read as this project rather than a template:

1. A **serif headline with one italic word** — "Every figure here is *computed*,
   not asserted".
2. **Numbered sections** in mono: `01 SWOT scoring`, `02 GE-McKinsey matrix`.
   The number goes cobalt once that stage has run, so the page is also a
   progress indicator.
3. **Full-width hairline rules** between sections instead of boxing every block
   in a card.

## Rules

- Radius 2px on controls, 4px on cards. Sharp, because editorial.
- Elevation is a 1px border. Shadows only on things that genuinely float —
  the command palette and the shortcut dialog.
- Modal scrim is `foreground` at 40%. A light scrim on a light theme isolates
  nothing.
- Every interactive element has hover, focus-visible, active, disabled and
  loading. Every data area has loading (skeleton), empty (with a next action)
  and error (with the request id).
- Motion: 120ms hover, 180ms enter/exit. Opacity and transform only, and
  `prefers-reduced-motion` is respected.
- Banned: gradient heroes, glassmorphism, emoji as icons, shadows on cards,
  rainbow charts, centred body text, and anything off the 4px spacing scale.

## Checking it

```bash
cd frontend && npm run typecheck && npm run build
python3 <skill>/scripts/token_lint.py src --theme paper   # must print "clean"
```

The lint bans raw hex, the Tailwind default palette, arbitrary values,
gradients and emoji. Three lines carry a `lint-ok` marker: two sub-4px marks in
the five-segment impact bar, and the palette's viewport-relative top offset.

Then look at it at 1440 and 390 before calling it done. Reading the code is how
the last version shipped ugly.
