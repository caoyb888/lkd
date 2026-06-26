## 莱矿档案管理系统 设计系统 — 使用约定

This DS is the **lkda-web-react** React component library (shadcn/ui-style primitives on Radix UI),
styled with **Tailwind CSS** plus a small set of brand design tokens. Build with the real components
below — every one renders from `window.LkdaDS.<Name>` (the bundle is loaded from `_ds_bundle.js`).

### Setup & wrapping
- **No global provider is required** for the primitives — import a component and render it.
- A few components need a context wrapper:
  - **Tooltip** must be wrapped in `TooltipProvider` (once, near the app root).
  - **Dialog / Drawer / Select / Popover** are Radix-based and render their open content in a portal;
    compose `*Trigger` + `*Content` as shown in each component's `.prompt.md`.
- Layout components (`AppLayout`, `Sidebar`, `TopHeader`, `MobileDrawer`, `BottomNav`) and the page-level
  `*View` components require a React Router context (`react-router-dom`) and live data — use them only
  inside a routed app shell, not as standalone widgets.

### Styling idiom — Tailwind utilities + brand tokens
Style with Tailwind utility classes. This DS extends Tailwind with brand-specific utilities — prefer
these over raw hex so designs stay on-brand:

| Purpose | Utilities |
|---|---|
| Brand color | `bg-primary` `text-primary` `bg-primary-dark` `hover:bg-primary-dark` `bg-primary/10` (teal #14B8A6) |
| Accent | `text-accent` `bg-accent` (orange #FB923C) |
| Surfaces | `bg-background-main` `bg-background-aside` `bg-background-soft` |
| Text | `text-slate-title` (headings) `text-slate-body` (body copy) |
| Radius | `rounded-card` (16px, cards/panels) `rounded-btn` (8px, buttons/inputs) `rounded-tag` (pill, badges) |
| Elevation | `shadow-card` (soft teal-tinted card shadow) |

Theme-aware values are also exposed as CSS custom properties (light + `.dark` themes) and used via
Tailwind arbitrary values, e.g. `text-[var(--color-slate-body)]`, `border-[var(--color-border-light)]`,
`bg-[var(--color-bg-main)]`. Common tokens: `--color-primary{,-light,-dark}`, `--color-accent`,
`--color-bg-{main,aside,soft,page}`, `--color-slate-{title,body}`, `--color-border-{light,medium}`,
`--color-header-bg`. Dark mode is class-based (`<html class="dark">`).

### Where the truth lives
- Compiled styles + every token definition: `styles.css` (which `@import`s `_ds_bundle.css`).
- Per-component API + usage: each component's `<Name>.d.ts` (props) and `<Name>.prompt.md`.

### Idiomatic example
```tsx
import { Card, CardHeader, CardTitle, CardContent, CardFooter, Button, Badge } from 'lkda-web-react'

<Card className="max-w-sm">
  <CardHeader>
    <div className="flex items-center justify-between">
      <CardTitle>地质勘探报告</CardTitle>
      <Badge variant="success">已归档</Badge>
    </div>
  </CardHeader>
  <CardContent>
    <p className="text-sm text-[var(--color-slate-body)]">档号 01.8.01.0101.01.003</p>
  </CardContent>
  <CardFooter className="gap-2">
    <Button size="sm">查看详情</Button>
    <Button size="sm" variant="outline">编辑</Button>
  </CardFooter>
</Card>
```
Variants follow this DS's vocabulary: `Button` → `variant="primary|outline|ghost|danger|link"`,
`size="sm|md|lg|icon"`; `Badge` → `variant="default|primary|success|warning|danger|outline"`;
`Alert` → `variant="default|success|warning|destructive"`.
