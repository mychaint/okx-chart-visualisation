# Trading Chart Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a monorepo plugin that intercepts okx-trade-mcp market tool results via PostToolUse hooks, renders professional trading charts with @napi-rs/canvas (replicating lightweight-charts 5.x visual style), and injects PNG images into Claude Code and OpenClaw conversations.

**Architecture:** Shared `@chart-viz/core` package handles all rendering logic; `@chart-viz/claude-code` and `@chart-viz/openclaw` are thin hook adapters that normalize platform-specific stdin/stdout formats into the shared `ChartRequest` type, call core, and write the result back.

**Tech Stack:** Node.js 25, TypeScript 5, pnpm 10 workspaces, @napi-rs/canvas 0.1.97, vitest 4.1.3

---

## File Map

```
chart-visualisation/
├── package.json                          root workspace
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── packages/
    ├── core/
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── src/
    │   │   ├── types.ts                  ChartRequest, ChartResponse, OKX data types
    │   │   ├── renderer/
    │   │   │   ├── theme.ts              LW_THEME constants
    │   │   │   ├── canvas.ts             @napi-rs/canvas wrapper
    │   │   │   └── layout.ts             multi-pane layout calculator
    │   │   ├── charts/
    │   │   │   ├── kline.ts              K-line + volume bars
    │   │   │   ├── indicator.ts          MACD / RSI / MA / BB / KDJ
    │   │   │   ├── orderbook.ts          depth chart
    │   │   │   ├── open-interest.ts      OI trend line
    │   │   │   ├── funding-rate.ts       funding rate histogram
    │   │   │   ├── trades-heatmap.ts     trade volume heatmap
    │   │   │   ├── pnl.ts                position P&L ratio bars
    │   │   │   ├── ticker-card.ts        price summary card
    │   │   │   └── route.ts              ChartRequest → chart fn router
    │   │   └── index.ts                  public API: renderChart()
    │   └── tests/
    │       ├── helpers.ts                PNG validation, fixture factories
    │       ├── renderer/
    │       │   ├── canvas.test.ts
    │       │   └── layout.test.ts
    │       └── charts/
    │           ├── kline.test.ts
    │           ├── indicator.test.ts
    │           ├── orderbook.test.ts
    │           ├── open-interest.test.ts
    │           ├── funding-rate.test.ts
    │           ├── trades-heatmap.test.ts
    │           ├── pnl.test.ts
    │           ├── ticker-card.test.ts
    │           └── route.test.ts
    ├── claude-code/
    │   ├── package.json
    │   ├── hooks/
    │   │   └── post-tool-use.js          PostToolUse hook (plain JS, no build)
    │   ├── skills/trading-charts/
    │   │   └── SKILL.md
    │   └── settings.json                 hook registration template
    └── openclaw/
        ├── package.json
        ├── hooks/
        │   └── after-tool-call.js        after_tool_call hook (plain JS, no build)
        └── SKILL.md
```

---

## Task 1: Monorepo Scaffold

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/claude-code/package.json`
- Create: `packages/openclaw/package.json`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "chart-visualisation",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "dev": "pnpm -r --parallel dev"
  },
  "engines": { "node": ">=18" }
}
```

- [ ] **Step 2: Create pnpm-workspace.yaml**

```yaml
packages:
  - 'packages/*'
```

- [ ] **Step 3: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src",
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

- [ ] **Step 4: Create packages/core/package.json**

```json
{
  "name": "@chart-viz/core",
  "version": "0.0.1",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "@napi-rs/canvas": "0.1.97"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^4.1.3"
  }
}
```

- [ ] **Step 5: Create packages/core/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 6: Create packages/claude-code/package.json**

```json
{
  "name": "@chart-viz/claude-code",
  "version": "0.0.1",
  "type": "module",
  "dependencies": {
    "@chart-viz/core": "workspace:*"
  }
}
```

- [ ] **Step 7: Create packages/openclaw/package.json**

```json
{
  "name": "@chart-viz/openclaw",
  "version": "0.0.1",
  "type": "module",
  "dependencies": {
    "@chart-viz/core": "workspace:*"
  }
}
```

- [ ] **Step 8: Install dependencies**

```bash
pnpm install
```

Expected: `node_modules` created, `@napi-rs/canvas` downloaded with native binaries.

- [ ] **Step 9: Commit**

```bash
git add package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json packages/
git commit -m "chore: monorepo scaffold with pnpm workspaces"
```

---

## Task 2: Types & Theme

**Files:**
- Create: `packages/core/src/types.ts`
- Create: `packages/core/src/renderer/theme.ts`

- [ ] **Step 1: Write failing test for theme**

Create `packages/core/tests/renderer/canvas.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { LW_THEME } from '../../src/renderer/theme.js'

describe('LW_THEME', () => {
  it('has correct candle up color', () => {
    expect(LW_THEME.candle.upColor).toBe('#26a69a')
  })
  it('has correct candle down color', () => {
    expect(LW_THEME.candle.downColor).toBe('#ef5350')
  })
  it('has white background', () => {
    expect(LW_THEME.background).toBe('#FFFFFF')
  })
})
```

- [ ] **Step 2: Run test — confirm failure**

```bash
cd packages/core && pnpm test
```

Expected: `Cannot find module '../../src/renderer/theme.js'`

- [ ] **Step 3: Create packages/core/src/types.ts**

```typescript
export type ChartType =
  | 'kline'
  | 'indicator'
  | 'orderbook'
  | 'open-interest'
  | 'funding-rate'
  | 'trades-heatmap'
  | 'ticker-card'
  | 'pnl'

export interface ChartRequest {
  chartType: ChartType
  toolName: string
  data: unknown
  params: {
    instId?: string
    bar?: string
    [key: string]: unknown
  }
}

export interface ChartResponse {
  png: Buffer
  width: number
  height: number
}

// OKX candle row: [ts, open, high, low, close, vol, volCcy, volCcyQuote, confirm]
export type OkxCandleRow = [string, string, string, string, string, string, ...string[]]

export interface OkxApiResponse<T> {
  code: string
  msg: string
  data: T
}
```

- [ ] **Step 4: Create packages/core/src/renderer/theme.ts**

```typescript
export const LW_THEME = {
  background: '#FFFFFF',
  textColor:  '#191919',
  fontSize:   12,
  fontFamily: `-apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif`,

  grid: {
    color: '#D6DCDE',
    style: 'solid' as const,
  },

  crosshair: {
    color:           '#9598A1',
    labelBackground: '#131722',
    width:           1,
  },

  scale: {
    borderColor: '#2B2B43',
    tickLength:  4,
  },

  candle: {
    upColor:         '#26a69a',
    downColor:       '#ef5350',
    wickUpColor:     '#26a69a',
    wickDownColor:   '#ef5350',
    borderUpColor:   '#26a69a',
    borderDownColor: '#ef5350',
  },

  histogram: {
    upColor:   'rgba(38, 166, 154, 0.5)',
    downColor: 'rgba(239, 83, 80, 0.5)',
  },

  pane: {
    separatorColor: '#E0E3EB',
    separatorHeight: 1,
  },

  padding: {
    top:    10,
    right:  60,  // price axis width
    bottom: 24,  // time axis height
    left:   8,
  },
} as const
```

- [ ] **Step 5: Run test — confirm passing**

```bash
cd packages/core && pnpm test
```

Expected: `3 passed`

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/types.ts packages/core/src/renderer/theme.ts packages/core/tests/renderer/canvas.test.ts
git commit -m "feat(core): add ChartRequest types and LW_THEME constants"
```

---

## Task 3: Canvas Wrapper

**Files:**
- Create: `packages/core/src/renderer/canvas.ts`
- Create: `packages/core/tests/helpers.ts`

- [ ] **Step 1: Write failing test**

Create `packages/core/tests/helpers.ts`:

```typescript
export function isValidPng(buf: Buffer): boolean {
  return (
    buf[0] === 0x89 &&
    buf[1] === 0x50 && // P
    buf[2] === 0x4e && // N
    buf[3] === 0x47    // G
  )
}

export function getPngDimensions(buf: Buffer): { width: number; height: number } {
  return {
    width:  buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
  }
}
```

Add to `packages/core/tests/renderer/canvas.test.ts` (append after existing tests):

```typescript
import { createChartCanvas } from '../../src/renderer/canvas.js'
import { isValidPng, getPngDimensions } from '../helpers.js'

describe('createChartCanvas', () => {
  it('encodes to valid PNG buffer', async () => {
    const { ctx, encode } = createChartCanvas(200, 100)
    ctx.fillStyle = '#FF0000'
    ctx.fillRect(0, 0, 200, 100)
    const buf = await encode()
    expect(buf).toBeInstanceOf(Buffer)
    expect(isValidPng(buf)).toBe(true)
  })

  it('PNG dimensions match requested size', async () => {
    const { encode } = createChartCanvas(300, 150)
    const buf = await encode()
    const dims = getPngDimensions(buf)
    expect(dims.width).toBe(300)
    expect(dims.height).toBe(150)
  })
})
```

- [ ] **Step 2: Run test — confirm failure**

```bash
cd packages/core && pnpm test
```

Expected: `Cannot find module '../../src/renderer/canvas.js'`

- [ ] **Step 3: Create packages/core/src/renderer/canvas.ts**

```typescript
import { createCanvas } from '@napi-rs/canvas'
import type { SKRSContext2D } from '@napi-rs/canvas'

export interface ChartCanvas {
  ctx: SKRSContext2D
  encode: () => Promise<Buffer>
}

export function createChartCanvas(width: number, height: number): ChartCanvas {
  const MAX_W = 800
  const MAX_H = 600
  const scale = Math.min(1, Math.min(MAX_W / width, MAX_H / height))
  const w = Math.round(width  * scale)
  const h = Math.round(height * scale)

  const canvas = createCanvas(w, h)
  const ctx    = canvas.getContext('2d')

  return {
    ctx,
    encode: () => canvas.encode('png') as Promise<Buffer>,
  }
}
```

- [ ] **Step 4: Run test — confirm passing**

```bash
cd packages/core && pnpm test
```

Expected: `5 passed`

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/renderer/canvas.ts packages/core/tests/helpers.ts packages/core/tests/renderer/canvas.test.ts
git commit -m "feat(core): add canvas wrapper with PNG encode and size cap"
```

---

## Task 4: Layout Engine

**Files:**
- Create: `packages/core/src/renderer/layout.ts`
- Create: `packages/core/tests/renderer/layout.test.ts`

- [ ] **Step 1: Write failing test**

Create `packages/core/tests/renderer/layout.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { computeLayout } from '../../src/renderer/layout.js'

describe('computeLayout', () => {
  it('single pane fills chart area', () => {
    const layout = computeLayout(800, 400, [{ heightRatio: 1 }])
    expect(layout.panes).toHaveLength(1)
    expect(layout.panes[0].width).toBeGreaterThan(0)
    expect(layout.panes[0].height).toBeGreaterThan(0)
  })

  it('two panes sum to chart height minus time axis', () => {
    const layout = computeLayout(800, 400, [
      { heightRatio: 0.75 },
      { heightRatio: 0.25 },
    ])
    const totalPaneH = layout.panes.reduce((s, p) => s + p.height, 0)
    const chartH = layout.totalHeight - layout.timeAxisHeight - layout.panes.length * layout.separatorHeight
    expect(totalPaneH).toBeCloseTo(chartH, 0)
  })

  it('pane x starts after left padding', () => {
    const layout = computeLayout(800, 400, [{ heightRatio: 1 }])
    expect(layout.panes[0].x).toBe(layout.leftPadding)
  })

  it('pane width excludes right axis', () => {
    const layout = computeLayout(800, 400, [{ heightRatio: 1 }])
    expect(layout.panes[0].width).toBe(800 - layout.leftPadding - layout.priceAxisWidth)
  })
})
```

- [ ] **Step 2: Run test — confirm failure**

```bash
cd packages/core && pnpm test
```

Expected: `Cannot find module '../../src/renderer/layout.js'`

- [ ] **Step 3: Create packages/core/src/renderer/layout.ts**

```typescript
import { LW_THEME } from './theme.js'

export interface PaneConfig {
  heightRatio: number   // fraction of total chart area height (must sum to 1.0)
  label?: string
}

export interface PaneBounds {
  x:      number   // left edge (after left padding)
  y:      number   // top edge of this pane
  width:  number   // chart area width
  height: number   // chart area height
}

export interface LayoutResult {
  panes:           PaneBounds[]
  priceAxisWidth:  number
  timeAxisHeight:  number
  leftPadding:     number
  separatorHeight: number
  totalWidth:      number
  totalHeight:     number
}

export function computeLayout(
  width: number,
  height: number,
  panes: PaneConfig[],
): LayoutResult {
  const priceAxisWidth  = LW_THEME.padding.right
  const timeAxisHeight  = LW_THEME.padding.bottom
  const leftPadding     = LW_THEME.padding.left
  const topPadding      = LW_THEME.padding.top
  const separatorHeight = LW_THEME.pane.separatorHeight

  const chartAreaWidth  = width  - leftPadding - priceAxisWidth
  const chartAreaHeight = height - topPadding  - timeAxisHeight
                        - separatorHeight * (panes.length - 1)

  const bounds: PaneBounds[] = []
  let y = topPadding

  for (const pane of panes) {
    const h = Math.round(chartAreaHeight * pane.heightRatio)
    bounds.push({ x: leftPadding, y, width: chartAreaWidth, height: h })
    y += h + separatorHeight
  }

  return {
    panes:           bounds,
    priceAxisWidth,
    timeAxisHeight,
    leftPadding,
    separatorHeight,
    totalWidth:  width,
    totalHeight: height,
  }
}
```

- [ ] **Step 4: Run test — confirm passing**

```bash
cd packages/core && pnpm test
```

Expected: `9 passed`

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/renderer/layout.ts packages/core/tests/renderer/layout.test.ts
git commit -m "feat(core): add multi-pane layout engine"
```

---

## Task 5: K-line Chart

**Files:**
- Create: `packages/core/src/charts/kline.ts`
- Create: `packages/core/tests/charts/kline.test.ts`

- [ ] **Step 1: Write failing test**

Create `packages/core/tests/charts/kline.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { renderKline } from '../../src/charts/kline.js'
import { isValidPng, getPngDimensions } from '../helpers.js'
import type { ChartRequest } from '../../src/types.js'

function makeKlineRequest(): ChartRequest {
  // OKX format: [ts, open, high, low, close, vol, ...]  newest-first
  const now = Date.now()
  const rows = Array.from({ length: 30 }, (_, i) => {
    const ts    = String(now - (29 - i) * 86400000)
    const open  = String(40000 + i * 100)
    const close = String(40000 + i * 100 + 50)
    const high  = String(40000 + i * 100 + 200)
    const low   = String(40000 + i * 100 - 100)
    const vol   = String(1000 + i * 10)
    return [ts, open, high, low, close, vol, vol, vol, '1']
  }).reverse()   // newest first, matching OKX API

  return {
    chartType: 'kline',
    toolName:  'market_get_candles',
    data:      { code: '0', msg: '', data: rows },
    params:    { instId: 'BTC-USDT', bar: '1D' },
  }
}

describe('renderKline', () => {
  it('returns valid PNG buffer', async () => {
    const result = await renderKline(makeKlineRequest())
    expect(result.png).toBeInstanceOf(Buffer)
    expect(isValidPng(result.png)).toBe(true)
  })

  it('output dimensions are 800x400', async () => {
    const result = await renderKline(makeKlineRequest())
    const dims = getPngDimensions(result.png)
    expect(dims.width).toBe(800)
    expect(dims.height).toBe(400)
  })

  it('throws when data array is empty', async () => {
    const req = makeKlineRequest()
    ;(req.data as any).data = []
    await expect(renderKline(req)).rejects.toThrow('No candle data')
  })
})
```

- [ ] **Step 2: Run test — confirm failure**

```bash
cd packages/core && pnpm test tests/charts/kline.test.ts
```

Expected: `Cannot find module '../../src/charts/kline.js'`

- [ ] **Step 3: Create packages/core/src/charts/kline.ts**

```typescript
import type { ChartRequest, ChartResponse, OkxCandleRow } from '../types.js'
import { createChartCanvas } from '../renderer/canvas.js'
import { LW_THEME } from '../renderer/theme.js'
import { computeLayout } from '../renderer/layout.js'

interface Candle {
  ts:     number
  open:   number
  high:   number
  low:    number
  close:  number
  volume: number
}

function parseCandles(data: unknown): Candle[] {
  const rows: OkxCandleRow[] = (data as any)?.data ?? []
  if (rows.length === 0) return []
  return [...rows].reverse().map(row => ({
    ts:     Number(row[0]),
    open:   Number(row[1]),
    high:   Number(row[2]),
    low:    Number(row[3]),
    close:  Number(row[4]),
    volume: Number(row[5]),
  }))
}

function priceToY(price: number, min: number, max: number, top: number, h: number): number {
  return top + h - ((price - min) / (max - min)) * h
}

function volToY(vol: number, maxVol: number, top: number, h: number): number {
  return top + h - (vol / maxVol) * h
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatPrice(p: number): string {
  return p >= 1000 ? p.toFixed(0) : p.toFixed(2)
}

export async function renderKline(req: ChartRequest): Promise<ChartResponse> {
  const W = 800, H = 400
  const candles = parseCandles(req.data)
  if (candles.length === 0) throw new Error('No candle data')

  const layout = computeLayout(W, H, [
    { heightRatio: 0.75 },
    { heightRatio: 0.25 },
  ])
  const pricePane  = layout.panes[0]
  const volumePane = layout.panes[1]

  const { ctx, encode } = createChartCanvas(W, H)

  // ── Background ──────────────────────────────────────────────
  ctx.fillStyle = LW_THEME.background
  ctx.fillRect(0, 0, W, H)

  // ── Price range ─────────────────────────────────────────────
  const minPrice = Math.min(...candles.map(c => c.low))
  const maxPrice = Math.max(...candles.map(c => c.high))
  const priceRange = maxPrice - minPrice || 1
  const pMin = minPrice - priceRange * 0.05
  const pMax = maxPrice + priceRange * 0.05
  const maxVol = Math.max(...candles.map(c => c.volume))

  // ── Grid lines (horizontal) ──────────────────────────────────
  ctx.strokeStyle = LW_THEME.grid.color
  ctx.lineWidth = 1
  const gridLines = 5
  for (let i = 0; i <= gridLines; i++) {
    const y = pricePane.y + (pricePane.height / gridLines) * i
    ctx.beginPath()
    ctx.moveTo(pricePane.x, y)
    ctx.lineTo(pricePane.x + pricePane.width, y)
    ctx.stroke()
  }

  // ── Candles ──────────────────────────────────────────────────
  const totalW    = pricePane.width
  const barW      = Math.max(1, Math.floor(totalW / candles.length) - 1)
  const halfBar   = Math.max(0.5, barW / 2)

  candles.forEach((c, i) => {
    const x     = pricePane.x + (i / candles.length) * totalW + (totalW / candles.length) * 0.1
    const cx    = x + halfBar
    const isUp  = c.close >= c.open
    const color = isUp ? LW_THEME.candle.upColor : LW_THEME.candle.downColor

    const highY  = priceToY(c.high,  pMin, pMax, pricePane.y, pricePane.height)
    const lowY   = priceToY(c.low,   pMin, pMax, pricePane.y, pricePane.height)
    const openY  = priceToY(c.open,  pMin, pMax, pricePane.y, pricePane.height)
    const closeY = priceToY(c.close, pMin, pMax, pricePane.y, pricePane.height)

    // wick
    ctx.beginPath()
    ctx.strokeStyle = color
    ctx.lineWidth = 1
    ctx.moveTo(cx, highY)
    ctx.lineTo(cx, lowY)
    ctx.stroke()

    // body
    const bodyTop = Math.min(openY, closeY)
    const bodyH   = Math.max(1, Math.abs(closeY - openY))
    ctx.fillStyle = color
    ctx.fillRect(x, bodyTop, barW, bodyH)

    // volume bar
    const volY = volToY(c.volume, maxVol, volumePane.y, volumePane.height)
    ctx.fillStyle = isUp ? LW_THEME.histogram.upColor : LW_THEME.histogram.downColor
    ctx.fillRect(x, volY, barW, volumePane.y + volumePane.height - volY)
  })

  // ── Pane separator ───────────────────────────────────────────
  const sepY = pricePane.y + pricePane.height
  ctx.fillStyle = LW_THEME.pane.separatorColor
  ctx.fillRect(0, sepY, W, LW_THEME.pane.separatorHeight)

  // ── Scale borders ────────────────────────────────────────────
  ctx.strokeStyle = LW_THEME.scale.borderColor
  ctx.lineWidth = 1
  const axisX = pricePane.x + pricePane.width
  ctx.beginPath()
  ctx.moveTo(axisX, 0)
  ctx.lineTo(axisX, H - layout.timeAxisHeight)
  ctx.stroke()

  const timeY = H - layout.timeAxisHeight
  ctx.beginPath()
  ctx.moveTo(pricePane.x, timeY)
  ctx.lineTo(axisX, timeY)
  ctx.stroke()

  // ── Price axis labels ─────────────────────────────────────────
  ctx.fillStyle = LW_THEME.textColor
  ctx.font = `${LW_THEME.fontSize}px ${LW_THEME.fontFamily}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  for (let i = 0; i <= gridLines; i++) {
    const price = pMax - ((pMax - pMin) / gridLines) * i
    const y = pricePane.y + (pricePane.height / gridLines) * i
    ctx.fillText(formatPrice(price), axisX + 4, y)
  }

  // ── Time axis labels ──────────────────────────────────────────
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  const labelCount = Math.min(6, candles.length)
  const step = Math.floor(candles.length / labelCount)
  for (let i = 0; i < candles.length; i += step) {
    const c = candles[i]
    const x = pricePane.x + (i / candles.length) * totalW + totalW / candles.length / 2
    ctx.fillText(formatDate(c.ts), x, timeY + 4)
  }

  // ── Title ─────────────────────────────────────────────────────
  if (req.params.instId) {
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.font = `bold ${LW_THEME.fontSize + 1}px ${LW_THEME.fontFamily}`
    ctx.fillStyle = LW_THEME.textColor
    ctx.fillText(`${req.params.instId}  ${req.params.bar ?? ''}`, pricePane.x + 4, LW_THEME.padding.top)
  }

  return { png: await encode(), width: W, height: H }
}
```

- [ ] **Step 4: Run test — confirm passing**

```bash
cd packages/core && pnpm test tests/charts/kline.test.ts
```

Expected: `3 passed`

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/charts/kline.ts packages/core/tests/charts/kline.test.ts
git commit -m "feat(core): render K-line chart with volume sub-pane"
```

---

## Task 6: Indicator Chart

**Files:**
- Create: `packages/core/src/charts/indicator.ts`
- Create: `packages/core/tests/charts/indicator.test.ts`

OKX `market_get_indicator` response format (per OKX docs):

```json
{
  "code": "0",
  "data": {
    "indicator": "MACD",
    "instId": "BTC-USDT",
    "ts": ["1700000000000", ...],
    "macd": ["100.5", ...],
    "signal": ["98.2", ...],
    "hist": ["2.3", ...]
  }
}
```

For RSI: `data.rsi = ["65.2", ...]`
For MA/EMA: `data.ma = ["42000", ...]` or `data.ema = ["42000", ...]`
For BB: `data.upper = [...]`, `data.middle = [...]`, `data.lower = [...]`
For KDJ: `data.k = [...]`, `data.d = [...]`, `data.j = [...]`

- [ ] **Step 1: Write failing test**

Create `packages/core/tests/charts/indicator.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { renderIndicator } from '../../src/charts/indicator.js'
import { isValidPng } from '../helpers.js'
import type { ChartRequest } from '../../src/types.js'

function makeIndicatorReq(indicator: string, extra: Record<string, string[]>): ChartRequest {
  const ts = Array.from({ length: 20 }, (_, i) => String(Date.now() - (19 - i) * 3600000))
  return {
    chartType: 'indicator',
    toolName:  'market_get_indicator',
    data: { code: '0', data: { indicator, instId: 'BTC-USDT', ts, ...extra } },
    params: { instId: 'BTC-USDT', indicator },
  }
}

describe('renderIndicator', () => {
  it('renders MACD as valid PNG', async () => {
    const req = makeIndicatorReq('MACD', {
      macd:   Array.from({ length: 20 }, (_, i) => String(i * 5 - 50)),
      signal: Array.from({ length: 20 }, (_, i) => String(i * 4 - 40)),
      hist:   Array.from({ length: 20 }, (_, i) => String(i - 10)),
    })
    const result = await renderIndicator(req)
    expect(isValidPng(result.png)).toBe(true)
  })

  it('renders RSI as valid PNG', async () => {
    const req = makeIndicatorReq('RSI', {
      rsi: Array.from({ length: 20 }, (_, i) => String(30 + i * 2)),
    })
    const result = await renderIndicator(req)
    expect(isValidPng(result.png)).toBe(true)
  })

  it('throws on empty ts array', async () => {
    const req = makeIndicatorReq('RSI', { rsi: [] })
    ;(req.data as any).data.ts = []
    await expect(renderIndicator(req)).rejects.toThrow('No indicator data')
  })
})
```

- [ ] **Step 2: Run test — confirm failure**

```bash
cd packages/core && pnpm test tests/charts/indicator.test.ts
```

Expected: `Cannot find module '../../src/charts/indicator.js'`

- [ ] **Step 3: Create packages/core/src/charts/indicator.ts**

```typescript
import type { ChartRequest, ChartResponse } from '../types.js'
import { createChartCanvas } from '../renderer/canvas.js'
import { LW_THEME } from '../renderer/theme.js'
import { computeLayout } from '../renderer/layout.js'

interface IndicatorData {
  indicator: string
  instId:    string
  ts:        string[]
  [key: string]: string | string[]
}

function valToY(val: number, min: number, max: number, top: number, h: number): number {
  const range = max - min || 1
  return top + h - ((val - min) / range) * h
}

function drawLine(
  ctx: CanvasRenderingContext2D | any,
  xs: number[],
  vals: number[],
  min: number,
  max: number,
  pane: { x: number; y: number; width: number; height: number },
  color: string,
): void {
  ctx.beginPath()
  ctx.strokeStyle = color
  ctx.lineWidth = 1.5
  vals.forEach((v, i) => {
    const x = pane.x + (i / (vals.length - 1)) * pane.width
    const y = valToY(v, min, max, pane.y, pane.height)
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  })
  ctx.stroke()
}

export async function renderIndicator(req: ChartRequest): Promise<ChartResponse> {
  const W = 800, H = 300
  const d = (req.data as any)?.data as IndicatorData
  if (!d?.ts?.length) throw new Error('No indicator data')

  const ind  = (d.indicator ?? '').toUpperCase()
  const { ctx, encode } = createChartCanvas(W, H)

  ctx.fillStyle = LW_THEME.background
  ctx.fillRect(0, 0, W, H)

  const layout = computeLayout(W, H, [{ heightRatio: 1 }])
  const pane   = layout.panes[0]

  // Grid
  ctx.strokeStyle = LW_THEME.grid.color
  ctx.lineWidth = 1
  for (let i = 0; i <= 4; i++) {
    const y = pane.y + (pane.height / 4) * i
    ctx.beginPath()
    ctx.moveTo(pane.x, y)
    ctx.lineTo(pane.x + pane.width, y)
    ctx.stroke()
  }

  if (ind === 'MACD') {
    const macd   = (d.macd   as string[]).map(Number)
    const signal = (d.signal as string[]).map(Number)
    const hist   = (d.hist   as string[]).map(Number)
    const allVals = [...macd, ...signal, ...hist]
    const min = Math.min(...allVals), max = Math.max(...allVals)

    // Histogram bars
    hist.forEach((v, i) => {
      const x    = pane.x + (i / hist.length) * pane.width
      const barW = Math.max(1, pane.width / hist.length - 1)
      const zeroY = valToY(0, min, max, pane.y, pane.height)
      const valY  = valToY(v, min, max, pane.y, pane.height)
      ctx.fillStyle = v >= 0 ? LW_THEME.candle.upColor : LW_THEME.candle.downColor
      ctx.fillRect(x, Math.min(valY, zeroY), barW, Math.abs(valY - zeroY))
    })

    // Zero line
    const zeroY = valToY(0, min, max, pane.y, pane.height)
    ctx.strokeStyle = LW_THEME.crosshair.color
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(pane.x, zeroY)
    ctx.lineTo(pane.x + pane.width, zeroY)
    ctx.stroke()
    ctx.setLineDash([])

    drawLine(ctx, [], macd,   min, max, pane, '#2196f3')
    drawLine(ctx, [], signal, min, max, pane, '#FF6D00')

  } else if (ind === 'RSI') {
    const rsi = (d.rsi as string[]).map(Number)
    const min = 0, max = 100

    // Overbought / oversold bands
    const y70 = valToY(70, min, max, pane.y, pane.height)
    const y30 = valToY(30, min, max, pane.y, pane.height)
    ctx.fillStyle = 'rgba(239,83,80,0.07)'
    ctx.fillRect(pane.x, pane.y, pane.width, y70 - pane.y)
    ctx.fillStyle = 'rgba(38,166,154,0.07)'
    ctx.fillRect(pane.x, y30, pane.width, pane.y + pane.height - y30)

    ;[70, 30].forEach(level => {
      const y = valToY(level, min, max, pane.y, pane.height)
      ctx.strokeStyle = LW_THEME.crosshair.color
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath(); ctx.moveTo(pane.x, y); ctx.lineTo(pane.x + pane.width, y); ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = LW_THEME.textColor
      ctx.font = `${LW_THEME.fontSize - 1}px ${LW_THEME.fontFamily}`
      ctx.textAlign = 'right'
      ctx.fillText(String(level), pane.x + pane.width - 2, y - 2)
    })

    drawLine(ctx, [], rsi, min, max, pane, '#9C27B0')

  } else {
    // Generic: draw all numeric arrays as lines
    const colors = ['#2196f3', '#FF6D00', '#9C27B0', '#4CAF50']
    const arrays = Object.entries(d)
      .filter(([k]) => !['indicator','instId','ts'].includes(k))
      .map(([, v]) => (v as string[]).map(Number))
    const allVals = arrays.flat()
    const min = Math.min(...allVals), max = Math.max(...allVals)
    arrays.forEach((arr, i) => drawLine(ctx, [], arr, min, max, pane, colors[i % colors.length]))
  }

  // Title
  ctx.fillStyle = LW_THEME.textColor
  ctx.font = `bold ${LW_THEME.fontSize}px ${LW_THEME.fontFamily}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText(`${d.instId}  ${ind}`, pane.x + 4, LW_THEME.padding.top)

  // Scale border
  ctx.strokeStyle = LW_THEME.scale.borderColor
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(pane.x + pane.width, pane.y)
  ctx.lineTo(pane.x + pane.width, pane.y + pane.height)
  ctx.stroke()

  return { png: await encode(), width: W, height: H }
}
```

- [ ] **Step 4: Run test — confirm passing**

```bash
cd packages/core && pnpm test tests/charts/indicator.test.ts
```

Expected: `3 passed`

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/charts/indicator.ts packages/core/tests/charts/indicator.test.ts
git commit -m "feat(core): render indicator chart (MACD, RSI, generic)"
```

---

## Task 7: Orderbook Depth Chart

**Files:**
- Create: `packages/core/src/charts/orderbook.ts`
- Create: `packages/core/tests/charts/orderbook.test.ts`

OKX `market_get_orderbook` response: `{ data: [{ bids: [["price","size","0","1"], ...], asks: [...], ts: "..." }] }`

- [ ] **Step 1: Write failing test**

Create `packages/core/tests/charts/orderbook.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { renderOrderbook } from '../../src/charts/orderbook.js'
import { isValidPng } from '../helpers.js'
import type { ChartRequest } from '../../src/types.js'

function makeOrderbookReq(): ChartRequest {
  const mid = 42000
  const bids = Array.from({ length: 20 }, (_, i) => [String(mid - i * 10), String(1 + i * 0.5), '0', '1'])
  const asks = Array.from({ length: 20 }, (_, i) => [String(mid + (i + 1) * 10), String(1 + i * 0.5), '0', '1'])
  return {
    chartType: 'orderbook',
    toolName:  'market_get_orderbook',
    data:      { code: '0', data: [{ bids, asks, ts: String(Date.now()) }] },
    params:    { instId: 'BTC-USDT' },
  }
}

describe('renderOrderbook', () => {
  it('returns valid PNG', async () => {
    const result = await renderOrderbook(makeOrderbookReq())
    expect(isValidPng(result.png)).toBe(true)
  })

  it('throws when no orderbook data', async () => {
    const req = makeOrderbookReq()
    ;(req.data as any).data = []
    await expect(renderOrderbook(req)).rejects.toThrow('No orderbook data')
  })
})
```

- [ ] **Step 2: Run test — confirm failure**

```bash
cd packages/core && pnpm test tests/charts/orderbook.test.ts
```

- [ ] **Step 3: Create packages/core/src/charts/orderbook.ts**

```typescript
import type { ChartRequest, ChartResponse } from '../types.js'
import { createChartCanvas } from '../renderer/canvas.js'
import { LW_THEME } from '../renderer/theme.js'
import { computeLayout } from '../renderer/layout.js'

interface Level { price: number; size: number }

export async function renderOrderbook(req: ChartRequest): Promise<ChartResponse> {
  const W = 800, H = 350
  const book = (req.data as any)?.data?.[0]
  if (!book) throw new Error('No orderbook data')

  const bids: Level[] = [...(book.bids as string[][])].map(r => ({ price: Number(r[0]), size: Number(r[1]) }))
    .sort((a, b) => b.price - a.price)
  const asks: Level[] = [...(book.asks as string[][])].map(r => ({ price: Number(r[0]), size: Number(r[1]) }))
    .sort((a, b) => a.price - b.price)

  // Cumulative sizes
  const cumBids: Level[] = []
  const cumAsks: Level[] = []
  let acc = 0
  for (const b of bids) { acc += b.size; cumBids.push({ price: b.price, size: acc }) }
  acc = 0
  for (const a of asks) { acc += a.size; cumAsks.push({ price: a.price, size: acc }) }

  const allLevels = [...cumBids, ...cumAsks]
  const minPrice  = Math.min(...allLevels.map(l => l.price))
  const maxPrice  = Math.max(...allLevels.map(l => l.price))
  const maxSize   = Math.max(...allLevels.map(l => l.size))

  const layout = computeLayout(W, H, [{ heightRatio: 1 }])
  const pane   = layout.panes[0]
  const { ctx, encode } = createChartCanvas(W, H)

  ctx.fillStyle = LW_THEME.background
  ctx.fillRect(0, 0, W, H)

  // Grid
  ctx.strokeStyle = LW_THEME.grid.color
  ctx.lineWidth = 1
  for (let i = 0; i <= 4; i++) {
    const y = pane.y + (pane.height / 4) * i
    ctx.beginPath(); ctx.moveTo(pane.x, y); ctx.lineTo(pane.x + pane.width, y); ctx.stroke()
  }

  const priceToX = (p: number) => pane.x + ((p - minPrice) / (maxPrice - minPrice)) * pane.width
  const sizeToY  = (s: number) => pane.y + pane.height - (s / maxSize) * pane.height

  // Bid area (green)
  ctx.fillStyle = 'rgba(38,166,154,0.25)'
  ctx.beginPath()
  ctx.moveTo(priceToX(cumBids[0].price), pane.y + pane.height)
  for (const l of cumBids) ctx.lineTo(priceToX(l.price), sizeToY(l.size))
  ctx.lineTo(priceToX(cumBids[cumBids.length - 1].price), pane.y + pane.height)
  ctx.closePath(); ctx.fill()

  ctx.strokeStyle = LW_THEME.candle.upColor
  ctx.lineWidth = 1.5
  ctx.beginPath()
  cumBids.forEach((l, i) => i === 0 ? ctx.moveTo(priceToX(l.price), sizeToY(l.size)) : ctx.lineTo(priceToX(l.price), sizeToY(l.size)))
  ctx.stroke()

  // Ask area (red)
  ctx.fillStyle = 'rgba(239,83,80,0.25)'
  ctx.beginPath()
  ctx.moveTo(priceToX(cumAsks[0].price), pane.y + pane.height)
  for (const l of cumAsks) ctx.lineTo(priceToX(l.price), sizeToY(l.size))
  ctx.lineTo(priceToX(cumAsks[cumAsks.length - 1].price), pane.y + pane.height)
  ctx.closePath(); ctx.fill()

  ctx.strokeStyle = LW_THEME.candle.downColor
  ctx.lineWidth = 1.5
  ctx.beginPath()
  cumAsks.forEach((l, i) => i === 0 ? ctx.moveTo(priceToX(l.price), sizeToY(l.size)) : ctx.lineTo(priceToX(l.price), sizeToY(l.size)))
  ctx.stroke()

  // Mid price line
  const midPrice = (bids[0].price + asks[0].price) / 2
  const midX = priceToX(midPrice)
  ctx.strokeStyle = LW_THEME.crosshair.color
  ctx.lineWidth = 1
  ctx.setLineDash([4, 4])
  ctx.beginPath(); ctx.moveTo(midX, pane.y); ctx.lineTo(midX, pane.y + pane.height); ctx.stroke()
  ctx.setLineDash([])

  // Labels
  ctx.fillStyle = LW_THEME.textColor
  ctx.font = `bold ${LW_THEME.fontSize + 1}px ${LW_THEME.fontFamily}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText(`${req.params.instId ?? ''}  Order Book Depth`, pane.x + 4, LW_THEME.padding.top)

  ctx.strokeStyle = LW_THEME.scale.borderColor
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(pane.x + pane.width, pane.y)
  ctx.lineTo(pane.x + pane.width, pane.y + pane.height)
  ctx.stroke()

  return { png: await encode(), width: W, height: H }
}
```

- [ ] **Step 4: Run test — confirm passing**

```bash
cd packages/core && pnpm test tests/charts/orderbook.test.ts
```

Expected: `2 passed`

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/charts/orderbook.ts packages/core/tests/charts/orderbook.test.ts
git commit -m "feat(core): render orderbook depth chart"
```

---

## Task 8: Open Interest Chart

**Files:**
- Create: `packages/core/src/charts/open-interest.ts`
- Create: `packages/core/tests/charts/open-interest.test.ts`

OKX `market_get_open_interest` response: `{ data: [{ instId, oi, oiCcy, ts }, ...] }` (array, newest first)

- [ ] **Step 1: Write failing test**

Create `packages/core/tests/charts/open-interest.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { renderOpenInterest } from '../../src/charts/open-interest.js'
import { isValidPng } from '../helpers.js'
import type { ChartRequest } from '../../src/types.js'

function makeOIReq(): ChartRequest {
  const now = Date.now()
  const data = Array.from({ length: 24 }, (_, i) => ({
    instId: 'BTC-USDT-SWAP',
    oi:     String(100000 + i * 500),
    oiCcy:  String(2 + i * 0.01),
    ts:     String(now - (23 - i) * 3600000),
  })).reverse()
  return {
    chartType: 'open-interest',
    toolName:  'market_get_open_interest',
    data:      { code: '0', data },
    params:    { instId: 'BTC-USDT-SWAP' },
  }
}

describe('renderOpenInterest', () => {
  it('returns valid PNG', async () => {
    const result = await renderOpenInterest(makeOIReq())
    expect(isValidPng(result.png)).toBe(true)
  })

  it('throws on empty data', async () => {
    const req = makeOIReq()
    ;(req.data as any).data = []
    await expect(renderOpenInterest(req)).rejects.toThrow('No open interest data')
  })
})
```

- [ ] **Step 2: Run test — confirm failure**

```bash
cd packages/core && pnpm test tests/charts/open-interest.test.ts
```

- [ ] **Step 3: Create packages/core/src/charts/open-interest.ts**

```typescript
import type { ChartRequest, ChartResponse } from '../types.js'
import { createChartCanvas } from '../renderer/canvas.js'
import { LW_THEME } from '../renderer/theme.js'
import { computeLayout } from '../renderer/layout.js'

export async function renderOpenInterest(req: ChartRequest): Promise<ChartResponse> {
  const W = 800, H = 300
  const rows: Array<{ oi: number; ts: number }> = [...((req.data as any)?.data ?? [])]
    .reverse()
    .map((r: any) => ({ oi: Number(r.oi), ts: Number(r.ts) }))
  if (rows.length === 0) throw new Error('No open interest data')

  const layout = computeLayout(W, H, [{ heightRatio: 1 }])
  const pane   = layout.panes[0]
  const { ctx, encode } = createChartCanvas(W, H)

  ctx.fillStyle = LW_THEME.background
  ctx.fillRect(0, 0, W, H)

  const minOI = Math.min(...rows.map(r => r.oi))
  const maxOI = Math.max(...rows.map(r => r.oi))
  const range = maxOI - minOI || 1

  const toX = (i: number) => pane.x + (i / (rows.length - 1)) * pane.width
  const toY = (oi: number) => pane.y + pane.height - ((oi - minOI) / range) * pane.height

  // Grid
  ctx.strokeStyle = LW_THEME.grid.color
  ctx.lineWidth = 1
  for (let i = 0; i <= 4; i++) {
    const y = pane.y + (pane.height / 4) * i
    ctx.beginPath(); ctx.moveTo(pane.x, y); ctx.lineTo(pane.x + pane.width, y); ctx.stroke()
  }

  // Fill area under line
  ctx.fillStyle = 'rgba(33,150,243,0.15)'
  ctx.beginPath()
  ctx.moveTo(toX(0), pane.y + pane.height)
  rows.forEach((r, i) => ctx.lineTo(toX(i), toY(r.oi)))
  ctx.lineTo(toX(rows.length - 1), pane.y + pane.height)
  ctx.closePath(); ctx.fill()

  // Line
  ctx.strokeStyle = '#2196f3'
  ctx.lineWidth = 2
  ctx.beginPath()
  rows.forEach((r, i) => i === 0 ? ctx.moveTo(toX(i), toY(r.oi)) : ctx.lineTo(toX(i), toY(r.oi)))
  ctx.stroke()

  // Title + axis
  ctx.fillStyle = LW_THEME.textColor
  ctx.font = `bold ${LW_THEME.fontSize + 1}px ${LW_THEME.fontFamily}`
  ctx.textAlign = 'left'; ctx.textBaseline = 'top'
  ctx.fillText(`${req.params.instId ?? ''}  Open Interest`, pane.x + 4, LW_THEME.padding.top)

  ctx.strokeStyle = LW_THEME.scale.borderColor
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(pane.x + pane.width, pane.y)
  ctx.lineTo(pane.x + pane.width, pane.y + pane.height)
  ctx.stroke()

  return { png: await encode(), width: W, height: H }
}
```

- [ ] **Step 4: Run test — confirm passing**

```bash
cd packages/core && pnpm test tests/charts/open-interest.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/charts/open-interest.ts packages/core/tests/charts/open-interest.test.ts
git commit -m "feat(core): render open interest trend chart"
```

---

## Task 9: Funding Rate Chart

**Files:**
- Create: `packages/core/src/charts/funding-rate.ts`
- Create: `packages/core/tests/charts/funding-rate.test.ts`

OKX `market_get_funding_rate` response (history=true): `{ data: [{ instId, fundingRate, fundingTime }, ...] }` newest first

- [ ] **Step 1: Write failing test**

Create `packages/core/tests/charts/funding-rate.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { renderFundingRate } from '../../src/charts/funding-rate.js'
import { isValidPng } from '../helpers.js'
import type { ChartRequest } from '../../src/types.js'

function makeFRReq(): ChartRequest {
  const now = Date.now()
  const data = Array.from({ length: 30 }, (_, i) => ({
    instId:      'BTC-USDT-SWAP',
    fundingRate: String((Math.sin(i) * 0.001).toFixed(6)),
    fundingTime: String(now - (29 - i) * 28800000),
  })).reverse()
  return {
    chartType: 'funding-rate',
    toolName:  'market_get_funding_rate',
    data:      { code: '0', data },
    params:    { instId: 'BTC-USDT-SWAP' },
  }
}

describe('renderFundingRate', () => {
  it('returns valid PNG', async () => {
    const result = await renderFundingRate(makeFRReq())
    expect(isValidPng(result.png)).toBe(true)
  })

  it('throws on empty data', async () => {
    const req = makeFRReq()
    ;(req.data as any).data = []
    await expect(renderFundingRate(req)).rejects.toThrow('No funding rate data')
  })
})
```

- [ ] **Step 2: Run test — confirm failure**

```bash
cd packages/core && pnpm test tests/charts/funding-rate.test.ts
```

- [ ] **Step 3: Create packages/core/src/charts/funding-rate.ts**

```typescript
import type { ChartRequest, ChartResponse } from '../types.js'
import { createChartCanvas } from '../renderer/canvas.js'
import { LW_THEME } from '../renderer/theme.js'
import { computeLayout } from '../renderer/layout.js'

export async function renderFundingRate(req: ChartRequest): Promise<ChartResponse> {
  const W = 800, H = 300
  const rows = [...((req.data as any)?.data ?? [])].reverse()
    .map((r: any) => ({ rate: Number(r.fundingRate), ts: Number(r.fundingTime) }))
  if (rows.length === 0) throw new Error('No funding rate data')

  const layout = computeLayout(W, H, [{ heightRatio: 1 }])
  const pane   = layout.panes[0]
  const { ctx, encode } = createChartCanvas(W, H)

  ctx.fillStyle = LW_THEME.background
  ctx.fillRect(0, 0, W, H)

  const absMax = Math.max(...rows.map(r => Math.abs(r.rate))) || 0.001
  const min = -absMax * 1.2, max = absMax * 1.2

  // Grid
  ctx.strokeStyle = LW_THEME.grid.color
  ctx.lineWidth = 1
  for (let i = 0; i <= 4; i++) {
    const y = pane.y + (pane.height / 4) * i
    ctx.beginPath(); ctx.moveTo(pane.x, y); ctx.lineTo(pane.x + pane.width, y); ctx.stroke()
  }

  // Zero line
  const zeroY = pane.y + pane.height / 2
  ctx.strokeStyle = LW_THEME.crosshair.color
  ctx.lineWidth = 1
  ctx.setLineDash([4, 4])
  ctx.beginPath(); ctx.moveTo(pane.x, zeroY); ctx.lineTo(pane.x + pane.width, zeroY); ctx.stroke()
  ctx.setLineDash([])

  const barW = Math.max(2, Math.floor(pane.width / rows.length) - 1)

  rows.forEach((r, i) => {
    const x   = pane.x + (i / rows.length) * pane.width
    const toY = (v: number) => pane.y + pane.height - ((v - min) / (max - min)) * pane.height
    const rY  = toY(r.rate)
    ctx.fillStyle = r.rate >= 0 ? LW_THEME.candle.upColor : LW_THEME.candle.downColor
    ctx.fillRect(x, Math.min(rY, zeroY), barW, Math.abs(rY - zeroY))
  })

  ctx.fillStyle = LW_THEME.textColor
  ctx.font = `bold ${LW_THEME.fontSize + 1}px ${LW_THEME.fontFamily}`
  ctx.textAlign = 'left'; ctx.textBaseline = 'top'
  ctx.fillText(`${req.params.instId ?? ''}  Funding Rate`, pane.x + 4, LW_THEME.padding.top)

  ctx.strokeStyle = LW_THEME.scale.borderColor
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(pane.x + pane.width, pane.y)
  ctx.lineTo(pane.x + pane.width, pane.y + pane.height)
  ctx.stroke()

  return { png: await encode(), width: W, height: H }
}
```

- [ ] **Step 4: Run test — confirm passing**

```bash
cd packages/core && pnpm test tests/charts/funding-rate.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/charts/funding-rate.ts packages/core/tests/charts/funding-rate.test.ts
git commit -m "feat(core): render funding rate histogram chart"
```

---

## Task 10: Trades Heatmap

**Files:**
- Create: `packages/core/src/charts/trades-heatmap.ts`
- Create: `packages/core/tests/charts/trades-heatmap.test.ts`

OKX `market_get_trades` response: `{ data: [{ instId, side, sz, px, ts, tradeId }, ...] }` newest first

- [ ] **Step 1: Write failing test**

Create `packages/core/tests/charts/trades-heatmap.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { renderTradesHeatmap } from '../../src/charts/trades-heatmap.js'
import { isValidPng } from '../helpers.js'
import type { ChartRequest } from '../../src/types.js'

function makeTradesReq(): ChartRequest {
  const now = Date.now()
  const data = Array.from({ length: 100 }, (_, i) => ({
    instId:  'BTC-USDT',
    side:    i % 3 === 0 ? 'sell' : 'buy',
    sz:      String(0.1 + (i % 10) * 0.05),
    px:      String(42000 + (i % 20) * 10),
    ts:      String(now - (99 - i) * 6000),
    tradeId: String(i),
  }))
  return {
    chartType: 'trades-heatmap',
    toolName:  'market_get_trades',
    data:      { code: '0', data },
    params:    { instId: 'BTC-USDT' },
  }
}

describe('renderTradesHeatmap', () => {
  it('returns valid PNG', async () => {
    const result = await renderTradesHeatmap(makeTradesReq())
    expect(isValidPng(result.png)).toBe(true)
  })

  it('throws on empty data', async () => {
    const req = makeTradesReq()
    ;(req.data as any).data = []
    await expect(renderTradesHeatmap(req)).rejects.toThrow('No trades data')
  })
})
```

- [ ] **Step 2: Run test — confirm failure**

```bash
cd packages/core && pnpm test tests/charts/trades-heatmap.test.ts
```

- [ ] **Step 3: Create packages/core/src/charts/trades-heatmap.ts**

```typescript
import type { ChartRequest, ChartResponse } from '../types.js'
import { createChartCanvas } from '../renderer/canvas.js'
import { LW_THEME } from '../renderer/theme.js'
import { computeLayout } from '../renderer/layout.js'

export async function renderTradesHeatmap(req: ChartRequest): Promise<ChartResponse> {
  const W = 800, H = 350
  const trades = ((req.data as any)?.data ?? []) as Array<{
    side: string; sz: string; px: string; ts: string
  }>
  if (trades.length === 0) throw new Error('No trades data')

  // Bin by price level (20 buckets) × time (40 buckets)
  const prices = trades.map(t => Number(t.px))
  const times  = trades.map(t => Number(t.ts))
  const minP = Math.min(...prices), maxP = Math.max(...prices)
  const minT = Math.min(...times),  maxT = Math.max(...times)

  const PRICE_BINS = 20, TIME_BINS = 40
  const grid: number[][] = Array.from({ length: PRICE_BINS }, () => Array(TIME_BINS).fill(0))

  trades.forEach(t => {
    const pIdx = Math.min(PRICE_BINS - 1, Math.floor(((Number(t.px) - minP) / (maxP - minP || 1)) * PRICE_BINS))
    const tIdx = Math.min(TIME_BINS  - 1, Math.floor(((Number(t.ts) - minT) / (maxT - minT || 1)) * TIME_BINS))
    grid[pIdx][tIdx] += Number(t.sz)
  })

  const maxVal = Math.max(...grid.flat()) || 1

  const layout = computeLayout(W, H, [{ heightRatio: 1 }])
  const pane   = layout.panes[0]
  const { ctx, encode } = createChartCanvas(W, H)

  ctx.fillStyle = LW_THEME.background
  ctx.fillRect(0, 0, W, H)

  const cellW = pane.width  / TIME_BINS
  const cellH = pane.height / PRICE_BINS

  grid.forEach((row, pIdx) => {
    row.forEach((val, tIdx) => {
      if (val === 0) return
      const intensity = val / maxVal
      const r = Math.round(239 * intensity)
      const g = Math.round(83  * intensity)
      const b = Math.round(80  * intensity)
      ctx.fillStyle = `rgba(${r},${g},${b},${0.2 + intensity * 0.8})`
      ctx.fillRect(
        pane.x + tIdx * cellW,
        pane.y + (PRICE_BINS - 1 - pIdx) * cellH,
        cellW, cellH,
      )
    })
  })

  ctx.fillStyle = LW_THEME.textColor
  ctx.font = `bold ${LW_THEME.fontSize + 1}px ${LW_THEME.fontFamily}`
  ctx.textAlign = 'left'; ctx.textBaseline = 'top'
  ctx.fillText(`${req.params.instId ?? ''}  Trade Volume Heatmap`, pane.x + 4, LW_THEME.padding.top)

  ctx.strokeStyle = LW_THEME.scale.borderColor
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(pane.x + pane.width, pane.y)
  ctx.lineTo(pane.x + pane.width, pane.y + pane.height)
  ctx.stroke()

  return { png: await encode(), width: W, height: H }
}
```

- [ ] **Step 4: Run test — confirm passing**

```bash
cd packages/core && pnpm test tests/charts/trades-heatmap.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/charts/trades-heatmap.ts packages/core/tests/charts/trades-heatmap.test.ts
git commit -m "feat(core): render trades volume heatmap"
```

---

## Task 11: P&L Chart

**Files:**
- Create: `packages/core/src/charts/pnl.ts`
- Create: `packages/core/tests/charts/pnl.test.ts`

OKX `account_get_positions` response: `{ data: [{ instId, instType, pos, avgPx, upl, uplRatio, liqPx, lever, ... }, ...] }`

- [ ] **Step 1: Write failing test**

Create `packages/core/tests/charts/pnl.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { renderPnl } from '../../src/charts/pnl.js'
import { isValidPng } from '../helpers.js'
import type { ChartRequest } from '../../src/types.js'

function makePnlReq(): ChartRequest {
  return {
    chartType: 'pnl',
    toolName:  'account_get_positions',
    data: {
      code: '0',
      data: [
        { instId: 'BTC-USDT-SWAP', instType: 'SWAP', pos: '0.5',  avgPx: '42000', upl: '500',   uplRatio: '0.0238', lever: '10' },
        { instId: 'ETH-USDT-SWAP', instType: 'SWAP', pos: '-1.2', avgPx: '2800',  upl: '-200',  uplRatio: '-0.059', lever: '5'  },
        { instId: 'SOL-USDT-SWAP', instType: 'SWAP', pos: '10',   avgPx: '150',   upl: '300',   uplRatio: '0.2',    lever: '3'  },
      ],
    },
    params: {},
  }
}

describe('renderPnl', () => {
  it('returns valid PNG', async () => {
    const result = await renderPnl(makePnlReq())
    expect(isValidPng(result.png)).toBe(true)
  })

  it('throws on empty positions', async () => {
    const req = makePnlReq()
    ;(req.data as any).data = []
    await expect(renderPnl(req)).rejects.toThrow('No position data')
  })
})
```

- [ ] **Step 2: Run test — confirm failure**

```bash
cd packages/core && pnpm test tests/charts/pnl.test.ts
```

- [ ] **Step 3: Create packages/core/src/charts/pnl.ts**

```typescript
import type { ChartRequest, ChartResponse } from '../types.js'
import { createChartCanvas } from '../renderer/canvas.js'
import { LW_THEME } from '../renderer/theme.js'

interface Position {
  instId:   string
  upl:      number
  uplRatio: number
}

export async function renderPnl(req: ChartRequest): Promise<ChartResponse> {
  const W = 800, H = 300
  const positions: Position[] = ((req.data as any)?.data ?? [])
    .map((p: any) => ({ instId: p.instId, upl: Number(p.upl), uplRatio: Number(p.uplRatio) }))
  if (positions.length === 0) throw new Error('No position data')

  const { ctx, encode } = createChartCanvas(W, H)

  ctx.fillStyle = LW_THEME.background
  ctx.fillRect(0, 0, W, H)

  const paddingLeft = 160  // room for instId labels
  const paddingRight  = LW_THEME.padding.right
  const paddingTop    = LW_THEME.padding.top + 24  // title space
  const paddingBottom = LW_THEME.padding.bottom

  const chartW = W - paddingLeft - paddingRight
  const chartH = H - paddingTop - paddingBottom
  const barH   = Math.floor(chartH / positions.length) - 4

  const maxAbs = Math.max(...positions.map(p => Math.abs(p.uplRatio))) || 0.01

  // Title
  ctx.fillStyle = LW_THEME.textColor
  ctx.font = `bold ${LW_THEME.fontSize + 1}px ${LW_THEME.fontFamily}`
  ctx.textAlign = 'left'; ctx.textBaseline = 'top'
  ctx.fillText('Position P&L', paddingLeft, LW_THEME.padding.top)

  // Center line
  const centerX = paddingLeft + chartW / 2
  ctx.strokeStyle = LW_THEME.crosshair.color
  ctx.lineWidth = 1
  ctx.setLineDash([4, 4])
  ctx.beginPath(); ctx.moveTo(centerX, paddingTop); ctx.lineTo(centerX, paddingTop + chartH); ctx.stroke()
  ctx.setLineDash([])

  // Grid vertical lines
  ctx.strokeStyle = LW_THEME.grid.color
  ctx.lineWidth = 1
  for (let i = 0; i <= 4; i++) {
    const x = paddingLeft + (chartW / 4) * i
    ctx.beginPath(); ctx.moveTo(x, paddingTop); ctx.lineTo(x, paddingTop + chartH); ctx.stroke()
  }

  positions.forEach((pos, i) => {
    const y      = paddingTop + i * (barH + 4)
    const ratio  = pos.uplRatio / maxAbs        // -1 to 1
    const barLen = (Math.abs(ratio) * (chartW / 2)) || 2
    const isProfit = pos.uplRatio >= 0
    const barX  = isProfit ? centerX : centerX - barLen

    ctx.fillStyle = isProfit ? LW_THEME.candle.upColor : LW_THEME.candle.downColor
    ctx.fillRect(barX, y, barLen, barH)

    // instId label
    ctx.fillStyle = LW_THEME.textColor
    ctx.font = `${LW_THEME.fontSize}px ${LW_THEME.fontFamily}`
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle'
    ctx.fillText(pos.instId, paddingLeft - 8, y + barH / 2)

    // P&L value
    const sign    = isProfit ? '+' : ''
    const pnlText = `${sign}${(pos.uplRatio * 100).toFixed(2)}%`
    ctx.textAlign = isProfit ? 'left' : 'right'
    ctx.fillText(pnlText, isProfit ? centerX + barLen + 4 : centerX - barLen - 4, y + barH / 2)
  })

  ctx.strokeStyle = LW_THEME.scale.borderColor
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(paddingLeft + chartW, paddingTop)
  ctx.lineTo(paddingLeft + chartW, paddingTop + chartH)
  ctx.stroke()

  return { png: await encode(), width: W, height: H }
}
```

- [ ] **Step 4: Run test — confirm passing**

```bash
cd packages/core && pnpm test tests/charts/pnl.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/charts/pnl.ts packages/core/tests/charts/pnl.test.ts
git commit -m "feat(core): render position P&L ratio bar chart"
```

---

## Task 12: Ticker Card

**Files:**
- Create: `packages/core/src/charts/ticker-card.ts`
- Create: `packages/core/tests/charts/ticker-card.test.ts`

OKX `market_get_ticker` response: `{ data: [{ instId, last, lastSz, askPx, bidPx, open24h, high24h, low24h, vol24h, ts }] }`

- [ ] **Step 1: Write failing test**

Create `packages/core/tests/charts/ticker-card.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { renderTickerCard } from '../../src/charts/ticker-card.js'
import { isValidPng } from '../helpers.js'
import type { ChartRequest } from '../../src/types.js'

function makeTickerReq(): ChartRequest {
  return {
    chartType: 'ticker-card',
    toolName:  'market_get_ticker',
    data: {
      code: '0',
      data: [{
        instId:  'BTC-USDT',
        last:    '67890.5',
        lastSz:  '0.01',
        askPx:   '67891.0',
        bidPx:   '67890.0',
        open24h: '66000.0',
        high24h: '68500.0',
        low24h:  '65800.0',
        vol24h:  '12345.67',
        ts:      String(Date.now()),
      }],
    },
    params: { instId: 'BTC-USDT' },
  }
}

describe('renderTickerCard', () => {
  it('returns valid PNG', async () => {
    const result = await renderTickerCard(makeTickerReq())
    expect(isValidPng(result.png)).toBe(true)
  })

  it('throws on empty data', async () => {
    const req = makeTickerReq()
    ;(req.data as any).data = []
    await expect(renderTickerCard(req)).rejects.toThrow('No ticker data')
  })
})
```

- [ ] **Step 2: Run test — confirm failure**

```bash
cd packages/core && pnpm test tests/charts/ticker-card.test.ts
```

- [ ] **Step 3: Create packages/core/src/charts/ticker-card.ts**

```typescript
import type { ChartRequest, ChartResponse } from '../types.js'
import { createChartCanvas } from '../renderer/canvas.js'
import { LW_THEME } from '../renderer/theme.js'

export async function renderTickerCard(req: ChartRequest): Promise<ChartResponse> {
  const W = 500, H = 200
  const ticker = (req.data as any)?.data?.[0]
  if (!ticker) throw new Error('No ticker data')

  const last    = Number(ticker.last)
  const open24h = Number(ticker.open24h)
  const change  = last - open24h
  const changePct = (change / open24h) * 100
  const isUp    = change >= 0

  const { ctx, encode } = createChartCanvas(W, H)

  ctx.fillStyle = LW_THEME.background
  ctx.fillRect(0, 0, W, H)

  // Border
  ctx.strokeStyle = LW_THEME.scale.borderColor
  ctx.lineWidth = 1
  ctx.strokeRect(0.5, 0.5, W - 1, H - 1)

  const pad = 20

  // instId
  ctx.fillStyle = LW_THEME.textColor
  ctx.font = `bold 14px ${LW_THEME.fontFamily}`
  ctx.textAlign = 'left'; ctx.textBaseline = 'top'
  ctx.fillText(ticker.instId, pad, pad)

  // Last price
  ctx.font = `bold 36px ${LW_THEME.fontFamily}`
  ctx.fillStyle = isUp ? LW_THEME.candle.upColor : LW_THEME.candle.downColor
  ctx.fillText(Number(last).toLocaleString(), pad, pad + 24)

  // Change
  const sign = isUp ? '+' : ''
  ctx.font = `16px ${LW_THEME.fontFamily}`
  ctx.fillText(`${sign}${change.toFixed(2)}  (${sign}${changePct.toFixed(2)}%)`, pad, pad + 70)

  // Stats row
  ctx.fillStyle = LW_THEME.textColor
  ctx.font = `${LW_THEME.fontSize}px ${LW_THEME.fontFamily}`
  const stats = [
    `H: ${Number(ticker.high24h).toLocaleString()}`,
    `L: ${Number(ticker.low24h).toLocaleString()}`,
    `Vol: ${Number(ticker.vol24h).toFixed(0)}`,
  ]
  stats.forEach((s, i) => {
    ctx.fillText(s, pad + i * 150, H - pad - LW_THEME.fontSize)
  })

  // Bid/Ask
  ctx.textAlign = 'right'
  ctx.fillStyle = LW_THEME.candle.upColor
  ctx.fillText(`Bid ${Number(ticker.bidPx).toLocaleString()}`, W - pad, pad + 24)
  ctx.fillStyle = LW_THEME.candle.downColor
  ctx.fillText(`Ask ${Number(ticker.askPx).toLocaleString()}`, W - pad, pad + 44)

  return { png: await encode(), width: W, height: H }
}
```

- [ ] **Step 4: Run test — confirm passing**

```bash
cd packages/core && pnpm test tests/charts/ticker-card.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/charts/ticker-card.ts packages/core/tests/charts/ticker-card.test.ts
git commit -m "feat(core): render ticker price summary card"
```

---

## Task 13: Router & Public API

**Files:**
- Create: `packages/core/src/charts/route.ts`
- Create: `packages/core/src/index.ts`
- Create: `packages/core/tests/charts/route.test.ts`

- [ ] **Step 1: Write failing test**

Create `packages/core/tests/charts/route.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { renderChart } from '../../src/index.js'
import { isValidPng } from '../helpers.js'
import type { ChartRequest } from '../../src/types.js'

describe('renderChart', () => {
  it('routes kline chartType to kline renderer', async () => {
    const now = Date.now()
    const rows = Array.from({ length: 10 }, (_, i) => [
      String(now - (9 - i) * 86400000),
      '40000', '41000', '39000', '40500', '1000', '1000', '1000', '1',
    ]).reverse()
    const req: ChartRequest = {
      chartType: 'kline',
      toolName: 'market_get_candles',
      data: { code: '0', data: rows },
      params: { instId: 'BTC-USDT' },
    }
    const result = await renderChart(req)
    expect(isValidPng(result.png)).toBe(true)
  })

  it('throws on unknown chartType', async () => {
    const req = { chartType: 'unknown', toolName: 'x', data: {}, params: {} } as unknown as ChartRequest
    await expect(renderChart(req)).rejects.toThrow('Unknown chartType: unknown')
  })
})
```

- [ ] **Step 2: Run test — confirm failure**

```bash
cd packages/core && pnpm test tests/charts/route.test.ts
```

- [ ] **Step 3: Create packages/core/src/charts/route.ts**

```typescript
import type { ChartRequest, ChartResponse } from '../types.js'
import { renderKline }          from './kline.js'
import { renderIndicator }      from './indicator.js'
import { renderOrderbook }      from './orderbook.js'
import { renderOpenInterest }   from './open-interest.js'
import { renderFundingRate }    from './funding-rate.js'
import { renderTradesHeatmap }  from './trades-heatmap.js'
import { renderPnl }            from './pnl.js'
import { renderTickerCard }     from './ticker-card.js'

export async function route(req: ChartRequest): Promise<ChartResponse> {
  switch (req.chartType) {
    case 'kline':           return renderKline(req)
    case 'indicator':       return renderIndicator(req)
    case 'orderbook':       return renderOrderbook(req)
    case 'open-interest':   return renderOpenInterest(req)
    case 'funding-rate':    return renderFundingRate(req)
    case 'trades-heatmap':  return renderTradesHeatmap(req)
    case 'pnl':             return renderPnl(req)
    case 'ticker-card':     return renderTickerCard(req)
    default:
      throw new Error(`Unknown chartType: ${(req as any).chartType}`)
  }
}
```

- [ ] **Step 4: Create packages/core/src/index.ts**

```typescript
export { route as renderChart } from './charts/route.js'
export type { ChartRequest, ChartResponse, ChartType } from './types.js'

export const TOOL_CHART_MAP: Record<string, import('./types.js').ChartType> = {
  market_get_candles:        'kline',
  market_get_index_candles:  'kline',
  market_get_indicator:      'indicator',
  market_get_open_interest:  'open-interest',
  market_get_funding_rate:   'funding-rate',
  market_get_orderbook:      'orderbook',
  market_get_trades:         'trades-heatmap',
  market_get_ticker:         'ticker-card',
  market_get_tickers:        'ticker-card',
  account_get_positions:     'pnl',
}
```

- [ ] **Step 5: Run test — confirm passing**

```bash
cd packages/core && pnpm test
```

Expected: all tests pass

- [ ] **Step 6: Build core**

```bash
cd packages/core && pnpm build
```

Expected: `dist/` directory created with `index.js`, `index.d.ts`

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/charts/route.ts packages/core/src/index.ts packages/core/tests/charts/route.test.ts packages/core/dist/
git commit -m "feat(core): add router and public renderChart API, build dist"
```

---

## Task 14: Claude Code Hook

**Files:**
- Create: `packages/claude-code/hooks/post-tool-use.js`
- Create: `packages/claude-code/settings.json`
- Create: `packages/claude-code/skills/trading-charts/SKILL.md`

- [ ] **Step 1: Write failing test**

Create `packages/claude-code/tests/hook.test.js`:

```javascript
import { describe, it, expect } from 'vitest'
import { spawnSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const HOOK = path.join(__dirname, '../hooks/post-tool-use.js')

function runHook(stdin) {
  const result = spawnSync('node', [HOOK], {
    input: JSON.stringify(stdin),
    encoding: 'utf8',
    timeout: 10000,
  })
  return result
}

const CANDLE_ROWS = Array.from({ length: 10 }, (_, i) => [
  String(Date.now() - (9 - i) * 86400000),
  '40000', '41000', '39000', '40500', '1000', '1000', '1000', '1',
]).reverse()

describe('post-tool-use hook', () => {
  it('outputs updatedMCPToolOutput with image block for market_get_candles', () => {
    const stdin = {
      tool_name: 'mcp__okx-trade-mcp__market_get_candles',
      tool_input: { instId: 'BTC-USDT', bar: '1D' },
      tool_response: {
        content: [{ type: 'text', text: JSON.stringify({ code: '0', data: CANDLE_ROWS }) }],
      },
      session_id: 'test',
    }
    const result = runHook(stdin)
    expect(result.status).toBe(0)
    const out = JSON.parse(result.stdout)
    expect(out.hookSpecificOutput.hookEventName).toBe('PostToolUse')
    const content = out.hookSpecificOutput.updatedMCPToolOutput
    expect(content.some((c) => c.type === 'image')).toBe(true)
    const img = content.find((c) => c.type === 'image')
    expect(img.mimeType).toBe('image/png')
    expect(typeof img.data).toBe('string')
    expect(img.data.length).toBeGreaterThan(100)
  })

  it('passes through unchanged for unknown tools', () => {
    const stdin = {
      tool_name: 'mcp__okx-trade-mcp__spot_place_order',
      tool_input: {},
      tool_response: { content: [{ type: 'text', text: '{}' }] },
      session_id: 'test',
    }
    const result = runHook(stdin)
    expect(result.status).toBe(0)
    expect(result.stdout.trim()).toBe('{}')
  })
})
```

Add `vitest` to `packages/claude-code/package.json`:

```json
{
  "name": "@chart-viz/claude-code",
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "test": "vitest run"
  },
  "dependencies": {
    "@chart-viz/core": "workspace:*"
  },
  "devDependencies": {
    "vitest": "^4.1.3"
  }
}
```

- [ ] **Step 2: Run test — confirm failure**

```bash
cd packages/claude-code && pnpm install && pnpm test
```

Expected: `Cannot find module '../hooks/post-tool-use.js'` or hook does not output expected shape

- [ ] **Step 3: Create packages/claude-code/hooks/post-tool-use.js**

```javascript
#!/usr/bin/env node
// PostToolUse hook for Claude Code
// Receives JSON via stdin, writes JSON via stdout

import { createRequire } from 'module'
import { readFileSync }  from 'fs'

// Read all stdin synchronously
const chunks = []
process.stdin.resume()
process.stdin.on('data', d => chunks.push(d))
process.stdin.on('end', async () => {
  const raw   = Buffer.concat(chunks).toString('utf8')
  const event = JSON.parse(raw)

  // Strip MCP server prefix: "mcp__okx-trade-mcp__market_get_candles" → "market_get_candles"
  const toolName = event.tool_name?.replace(/^mcp__[^_]+__/, '') ?? ''

  // Dynamically import core (ESM)
  const { renderChart, TOOL_CHART_MAP } = await import('@chart-viz/core')

  const chartType = TOOL_CHART_MAP[toolName]
  if (!chartType) {
    // Not a chart tool — pass through with empty response
    process.stdout.write(JSON.stringify({}))
    process.exit(0)
  }

  const textContent = event.tool_response?.content?.find(c => c.type === 'text')?.text ?? '{}'
  let data
  try { data = JSON.parse(textContent) } catch { data = {} }

  const req = {
    chartType,
    toolName,
    data,
    params: {
      instId: event.tool_input?.instId ?? event.tool_input?.instrument_id,
      bar:    event.tool_input?.bar,
      ...event.tool_input,
    },
  }

  try {
    const result  = await renderChart(req)
    const base64  = result.png.toString('base64')
    const output  = {
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        updatedMCPToolOutput: [
          { type: 'text',  text: textContent },
          { type: 'image', data: base64, mimeType: 'image/png' },
        ],
      },
    }
    process.stdout.write(JSON.stringify(output))
  } catch (err) {
    // On render error, pass through original content unchanged
    process.stdout.write(JSON.stringify({}))
  }

  process.exit(0)
})
```

- [ ] **Step 4: Run test — confirm passing**

```bash
cd packages/claude-code && pnpm test
```

Expected: `2 passed`

- [ ] **Step 5: Create packages/claude-code/settings.json**

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "mcp__okx-trade-mcp__(market_get_candles|market_get_index_candles|market_get_indicator|market_get_open_interest|market_get_funding_rate|market_get_orderbook|market_get_trades|market_get_ticker|market_get_tickers|account_get_positions)",
        "hooks": [
          {
            "type": "command",
            "command": "node REPLACE_WITH_ABSOLUTE_PATH/packages/claude-code/hooks/post-tool-use.js"
          }
        ]
      }
    ]
  }
}
```

> **Install note:** Replace `REPLACE_WITH_ABSOLUTE_PATH` with the absolute path to this repo. Merge this into `~/.claude/settings.json` (global) or `.claude/settings.json` (project). The two files can coexist — project settings override global.

- [ ] **Step 6: Create packages/claude-code/skills/trading-charts/SKILL.md**

```markdown
---
name: trading-charts
description: Request specific trading charts by type and parameters
triggers:
  - "show me.*chart"
  - "draw.*chart"
  - "plot.*"
  - "visualize.*"
---

# Trading Charts Skill

Charts are automatically rendered whenever market data tools return results.
Use this skill when the user explicitly requests a specific chart type or indicator.

## Available Chart Types

- **K-line**: "Show BTC/USDT daily candles for the past 30 days"
- **MACD**: "Show MACD indicator for ETH-USDT"
- **RSI**: "Show RSI for SOL-USDT on the 4h timeframe"
- **Order Book Depth**: "Show BTC order book depth"
- **Open Interest**: "Show open interest for BTC-USDT-SWAP"
- **Funding Rate**: "Show funding rate history for BTC perpetual"
- **P&L**: "Show my current position P&L"

## How It Works

When a market data tool runs, the PostToolUse hook automatically renders a chart
from the response data. No additional action is needed.

For explicit chart requests, call the appropriate market tool with the right parameters,
then the hook renders the chart automatically.
```

- [ ] **Step 7: Commit**

```bash
git add packages/claude-code/
git commit -m "feat(claude-code): add PostToolUse hook and settings template"
```

---

## Task 15: OpenClaw Hook

**Files:**
- Create: `packages/openclaw/hooks/after-tool-call.js`
- Create: `packages/openclaw/SKILL.md`

- [ ] **Step 1: Write failing test**

Create `packages/openclaw/tests/hook.test.js`:

```javascript
import { describe, it, expect } from 'vitest'
import { spawnSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const HOOK = path.join(__dirname, '../hooks/after-tool-call.js')

function runHook(stdin) {
  return spawnSync('node', [HOOK], {
    input: JSON.stringify(stdin),
    encoding: 'utf8',
    timeout: 10000,
  })
}

const CANDLE_ROWS = Array.from({ length: 10 }, (_, i) => [
  String(Date.now() - (9 - i) * 86400000),
  '40000', '41000', '39000', '40500', '1000', '1000', '1000', '1',
]).reverse()

describe('after-tool-call hook', () => {
  it('outputs replace_output with image block for market_get_candles', () => {
    const stdin = {
      event: 'after_tool_call',
      tool: {
        name:   'market_get_candles',
        server: 'okx-trade-mcp',
        input:  { instId: 'BTC-USDT', bar: '1D' },
        output: { text: JSON.stringify({ code: '0', data: CANDLE_ROWS }) },
      },
      session: { id: 'test', channel: 'telegram' },
    }
    const result = runHook(stdin)
    expect(result.status).toBe(0)
    const out = JSON.parse(result.stdout)
    expect(out.action).toBe('replace_output')
    const img = out.content.find((c) => c.type === 'image')
    expect(img).toBeDefined()
    expect(img.mimeType).toBe('image/png')
    expect(typeof img.data).toBe('string')
  })

  it('passes through for non-chart tools', () => {
    const stdin = {
      event: 'after_tool_call',
      tool: {
        name:   'spot_place_order',
        server: 'okx-trade-mcp',
        input:  {},
        output: { text: '{}' },
      },
      session: { id: 'test', channel: 'telegram' },
    }
    const result = runHook(stdin)
    expect(result.status).toBe(0)
    expect(JSON.parse(result.stdout)).toEqual({})
  })
})
```

Update `packages/openclaw/package.json`:

```json
{
  "name": "@chart-viz/openclaw",
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "test": "vitest run"
  },
  "dependencies": {
    "@chart-viz/core": "workspace:*"
  },
  "devDependencies": {
    "vitest": "^4.1.3"
  }
}
```

- [ ] **Step 2: Run test — confirm failure**

```bash
cd packages/openclaw && pnpm install && pnpm test
```

- [ ] **Step 3: Create packages/openclaw/hooks/after-tool-call.js**

```javascript
#!/usr/bin/env node
// after_tool_call Plugin SDK hook for OpenClaw

const chunks = []
process.stdin.resume()
process.stdin.on('data', d => chunks.push(d))
process.stdin.on('end', async () => {
  const raw   = Buffer.concat(chunks).toString('utf8')
  const event = JSON.parse(raw)

  const toolName = event.tool?.name ?? ''

  const { renderChart, TOOL_CHART_MAP } = await import('@chart-viz/core')

  const chartType = TOOL_CHART_MAP[toolName]
  if (!chartType) {
    process.stdout.write(JSON.stringify({}))
    process.exit(0)
  }

  const textContent = event.tool?.output?.text ?? '{}'
  let data
  try { data = JSON.parse(textContent) } catch { data = {} }

  const req = {
    chartType,
    toolName,
    data,
    params: {
      instId: event.tool?.input?.instId,
      bar:    event.tool?.input?.bar,
      ...event.tool?.input,
    },
  }

  try {
    const result = await renderChart(req)
    const base64 = result.png.toString('base64')
    const output = {
      action: 'replace_output',
      content: [
        { type: 'text',  text: textContent },
        { type: 'image', data: base64, mimeType: 'image/png' },
      ],
    }
    process.stdout.write(JSON.stringify(output))
  } catch {
    process.stdout.write(JSON.stringify({}))
  }

  process.exit(0)
})
```

- [ ] **Step 4: Run test — confirm passing**

```bash
cd packages/openclaw && pnpm test
```

Expected: `2 passed`

- [ ] **Step 5: Create packages/openclaw/SKILL.md**

```markdown
---
name: trading-charts
description: Automatically render trading charts from OKX market data tool results
version: 0.1.0
hooks:
  - event: after_tool_call
    filter:
      tool_name_pattern: "^(market_get_candles|market_get_index_candles|market_get_indicator|market_get_open_interest|market_get_funding_rate|market_get_orderbook|market_get_trades|market_get_ticker|market_get_tickers|account_get_positions)$"
    handler: hooks/after-tool-call.js
---

# Trading Charts

Automatically renders professional trading charts whenever OKX market data tools return results.
Charts are injected as image attachments alongside the original JSON data.

## Supported Charts

| Tool | Chart |
|------|-------|
| market_get_candles / market_get_index_candles | K-line + volume |
| market_get_indicator | MACD / RSI / MA / BB / KDJ |
| market_get_orderbook | Order book depth |
| market_get_open_interest | Open interest trend |
| market_get_funding_rate | Funding rate histogram |
| market_get_trades | Trade volume heatmap |
| market_get_ticker / market_get_tickers | Price summary card |
| account_get_positions | Position P&L ratio |
```

- [ ] **Step 6: Commit**

```bash
git add packages/openclaw/
git commit -m "feat(openclaw): add after_tool_call hook and SKILL.md"
```

---

## Task 16: Full Test Suite + Final Verification

- [ ] **Step 1: Run all tests from root**

```bash
pnpm test
```

Expected output: all packages pass. Example:

```
packages/core      ✓ 20+ tests passed
packages/claude-code  ✓ 2 tests passed
packages/openclaw     ✓ 2 tests passed
```

- [ ] **Step 2: Verify core builds cleanly**

```bash
pnpm build
```

Expected: no TypeScript errors, `packages/core/dist/` contains `index.js`, `index.d.ts`

- [ ] **Step 3: Smoke test hook manually**

```bash
echo '{"tool_name":"mcp__okx-trade-mcp__market_get_candles","tool_input":{"instId":"BTC-USDT","bar":"1D"},"tool_response":{"content":[{"type":"text","text":"{\"code\":\"0\",\"data\":[[\"1709251200000\",\"67890\",\"68000\",\"67800\",\"67950\",\"1234\",\"1234\",\"1234\",\"1\"],[\"1709164800000\",\"67000\",\"67900\",\"66800\",\"67890\",\"2345\",\"2345\",\"2345\",\"1\"]]}"}]},"session_id":"smoke"}' \
  | node packages/claude-code/hooks/post-tool-use.js \
  | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); const o=JSON.parse(d); const img=o.hookSpecificOutput?.updatedMCPToolOutput?.find(c=>c.type==='image'); console.log('image present:', !!img, 'data length:', img?.data?.length)"
```

Expected: `image present: true  data length: <number>`

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: all tests passing, full suite verified"
```

---

## Self-Review

### Spec Coverage

| Spec requirement | Task |
|---|---|
| Monorepo with pnpm workspaces | Task 1 |
| `@napi-rs/canvas` PNG output, max 800×600 | Task 3 |
| LW_THEME constants from lightweight-charts 5.x | Task 2 |
| `ChartRequest` / `ChartResponse` types | Task 2 |
| K-line + volume | Task 5 |
| Indicator (MACD/RSI/MA/BB/KDJ) | Task 6 |
| Orderbook depth | Task 7 |
| Open interest | Task 8 |
| Funding rate | Task 9 |
| Trades heatmap | Task 10 |
| P&L ratio | Task 11 |
| Ticker card | Task 12 |
| `TOOL_CHART_MAP` router | Task 13 |
| Claude Code PostToolUse hook (stdin/stdout format) | Task 14 |
| Claude Code settings.json registration | Task 14 |
| OpenClaw after_tool_call hook (stdin/stdout format) | Task 15 |
| OpenClaw SKILL.md with hook registration | Task 15 |
| Both hooks: pass-through on unknown tools | Task 14, 15 |
| Both hooks: render error → pass-through | Task 14, 15 |
