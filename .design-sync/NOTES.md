# design-sync notes — lkda-web-react

## Repo shape
- This is a **Vite app** (`private: true`, no library `exports`/`module` entry), NOT a packaged
  component library. The converter runs in **synth-entry mode** (`[NO_DIST] synthesizing from src`).
- The DS components live in `src/components/ui/` (shadcn-style primitives, named exports),
  `src/components/` (composites), `src/components/layout/`, and `src/views/` (page-level screens).

## Build invocation (run from repo ROOT, cwd = /home/ubuntu/lkda)
```
node .ds-sync/package-build.mjs --config .design-sync/config.json \
  --node-modules lkda-web-react/node_modules --out ./ds-bundle
node .ds-sync/package-validate.mjs ./ds-bundle
```
- **No `--entry`** — passing one disables synth discovery (no `.d.ts` exports → ZERO_MATCH).
- **Self-package symlink required** so `PKG_DIR = join(NODE_MODULES, PKG)` resolves:
  `ln -sfn "$(pwd)/lkda-web-react" lkda-web-react/node_modules/lkda-web-react`
  (gitignored — recreate on a fresh clone before building).
- Fork symlink for `ts-morph`/`esbuild` resolution from the override:
  `ln -sfn ../.ds-sync/node_modules .design-sync/node_modules`

## Fork: .design-sync/overrides/source-kit.mjs (libOverrides declared)
1. Excludes app-entry files `main.tsx` / `App.tsx` from the synth bundle + discovery
   (`main.tsx` calls `createRoot` on import → would break every preview; `App.tsx` mounts the router).
2. Adds `export { default as <Name> }` for every default-exported file — synth `export *` drops
   defaults, and all Views/layout/composites are `export default function <Name>()`. Without this,
   40+ components were missing from `window.LkdaDS` (`[BUNDLE_EXPORT]`).
   - Re-sync risk: if upstream switches a component to/from a default export, rebuild picks it up
     automatically — no action. New default-exported components are handled by the same rule.

## CSS / tokens
- `cfg.cssEntry` points at the compiled Tailwind output `dist/assets/index-<hash>.css`.
  **The hash changes on every `vite build`** — after rebuilding the app, update `cssEntry` in
  config to the new filename (or symlink a stable name). Tokens (`:root` vars) live in `src/index.css`
  and are included in that compiled CSS.

## Known render warns (triaged — not failures)
- `[FONT_MISSING] Inter`: the app only *names* `'Inter'` first in the font stack
  (`src/index.css`), it never ships/loads an `@font-face` — so system-ui fallback is faithful to
  the running app. Accepted system fallback. (Revisit only if exact Inter rendering is wanted.)
- `[RENDER_ERRORS]` on Views (`No QueryClient`) and on context-leaf parts (`SelectValue must be
  used within Select`): page-level Views need router + QueryClient + live data and cannot render as
  static preview cards → they ship as **floor cards** by design. Same for shadcn compound sub-parts
  used outside their parent.

## Preview authoring scope (chosen)
- Author rich previews for **core reusable components** (ui primitives + layout + key composites).
- Views (`src/views/**`) and shadcn compound sub-parts (CardHeader, DialogContent, SelectItem, …)
  ship as floor cards — still imported & functional, just no authored preview.

## Re-sync risks
- `cssEntry` hash drift (see CSS section) — the single most likely silent breakage.
- Self-package symlink + fork symlink are gitignored — must be recreated on a fresh clone.
- Grouping: ui primitives land in the `general/` group (the `ui/` dir is a generic container name).
  Cosmetic only.

## Authored previews (23 core components, all graded good)
Button, Card, Input, Badge, Alert, NumberInput, Pagination, Skeleton, SkeletonText,
SkeletonCard, Tabs, Table, StatusTag, PageHeader, EmptyState, ArchiveNoPreview, DataTable,
Select, DatePicker, Dialog, Drawer, Popover, Tooltip.
- Realistic content ported from `src/views/demo/ComponentDemo.tsx` (the in-repo component playground)
  — re-use it as the canonical composition source on re-sync.
- Overlays (Dialog/Drawer/Popover/Tooltip) are rendered in their OPEN state via
  `cfg.overrides.<Name> = {cardMode:"single", viewport:"WxH"}` (Radix portals escape a grid cell).
- DataTable is wide → `cfg.overrides.DataTable = {cardMode:"column"}`.
- Select/DatePicker preview their closed trigger state (inline, faithful; open calendar/dropdown portals).

## Floor-card by design (not authored)
- Page-level `*View` components (`src/views/**`) — need router + QueryClient + live data.
- Layout chrome: AppLayout, Sidebar, TopHeader, MobileDrawer, BottomNav, PageLoading — need
  react-router context; low value as isolated cards. (Could be authored later with a MemoryRouter
  provider wired via `extraEntries` + `cfg.provider`, if desired.)
- Utility wrappers: LazyImage, ErrorBoundary, VirtualCardList, PrintLayout, BottomActionBar.
- shadcn compound sub-parts (CardHeader, DialogContent, SelectItem, TableRow, …) — used within parents.

## DataTable name collision (fixed in the fork)
Two `DataTable` exports exist: the real responsive one (`components/ui/data-table.tsx`, NAMED export)
and a legacy placeholder (`components/DataTable.tsx`, DEFAULT export, only takes `className`).
The fork's `synthEntrySource` now skips a default re-export when the same name is already a named
export elsewhere — so the real DataTable wins on `window.LkdaDS`. Re-sync risk: if the legacy file is
deleted or renamed upstream, no action needed; the rule self-corrects.
