# Trading Chart Plugin Design

**Date:** 2026-04-07  
**Project:** chart-visualisation  
**Status:** Approved

---

## Overview

A plugin for Claude Code and OpenClaw that intercepts `okx-trade-mcp` market tool results via PostToolUse hooks, renders professional trading charts using `@napi-rs/canvas` (replicating TradingView lightweight-charts visual style), and injects PNG images into conversation messages as MCP image content blocks.

The plugin does **not** run as a standalone MCP server. It is a passive hook-based layer that enriches existing agent-trade-kit tool responses without modifying the agent's decision flow.

---

## Architecture

### Monorepo Structure

```
chart-visualisation/
├── packages/
│   ├── core/                          # Rendering engine (platform-agnostic)
│   │   └── src/
│   │       ├── charts/
│   │       │   ├── kline.ts           # K-line + volume bars
│   │       │   ├── indicator.ts       # MACD / RSI / MA / BB / KDJ
│   │       │   ├── orderbook.ts       # Order book depth chart
│   │       │   ├── open-interest.ts   # Open interest trend
│   │       │   ├── funding-rate.ts    # Funding rate histogram
│   │       │   ├── trades-heatmap.ts  # Trade volume heatmap
│   │       │   ├── pnl.ts             # Position P&L ratio
│   │       │   └── ticker-card.ts     # Price summary card
│   │       ├── renderer/
│   │       │   ├── canvas.ts          # @napi-rs/canvas wrapper
│   │       │   ├── theme.ts           # LW_THEME constants
│   │       │   └── layout.ts          # Multi-pane layout (main + sub panels)
│   │       └── index.ts
│   │
│   ├── claude-code/                   # Claude Code plugin
│   │   ├── hooks/
│   │   │   └── post-tool-use.js       # PostToolUse hook script
│   │   ├── skills/
│   │   │   └── trading-charts/
│   │   │       └── SKILL.md           # Optional: user-initiated chart requests
│   │   └── settings.json              # Hook registration config
│   │
│   └── openclaw/                      # OpenClaw plugin
│       ├── SKILL.md
│       ├── hooks/
│       │   └── after-tool-call.js     # Plugin SDK after_tool_call hook
│       └── package.json
│
└── package.json                       # pnpm workspaces monorepo root
```

---

## Data Flow

```
User: "过去30天BTC价格走势"
        │
        ▼
Agent calls market_get_candles({ instId: 'BTC-USDT', bar: '1D', limit: 30 })
        │
        ▼
[PostToolUse Hook fires — before Claude processes result]
  1. Match tool name against TOOL_CHART_MAP
  2. Parse tool result JSON → normalize to ChartRequest
  3. Call core chart renderer → @napi-rs/canvas → PNG buffer
  4. Base64-encode PNG
  5. Build MCP image content block
        │
        ▼
updatedMCPToolOutput: [
  { type: "text",  text: "<original JSON>" },
  { type: "image", data: "<base64>", mimeType: "image/png" }
]
        │
        ▼
Agent receives data + image → displays both in conversation
```

---

## Hook-to-Chart Mapping

```typescript
const TOOL_CHART_MAP: Record<string, ChartType> = {
  market_get_candles:        'kline',
  market_get_index_candles:  'kline',
  market_get_indicator:      'indicator',       // sub-type determined by indicator field
  market_get_open_interest:  'open-interest',
  market_get_funding_rate:   'funding-rate',
  market_get_orderbook:      'orderbook',
  market_get_trades:         'trades-heatmap',
  market_get_ticker:         'ticker-card',
  market_get_tickers:        'ticker-card',
  account_get_positions:     'pnl',
}
```

---

## Internal Message Format

Platform hooks normalize their inputs into a shared `ChartRequest` before calling `core`:

```typescript
interface ChartRequest {
  chartType: 'kline' | 'indicator' | 'orderbook' | 'open-interest'
           | 'funding-rate' | 'trades-heatmap' | 'ticker-card' | 'pnl'
  toolName: string        // original tool name, for debug/logging
  data: unknown           // raw tool result JSON, parsed by each chart module
  params: {
    instId?: string       // extracted from tool_input, used as chart title
    bar?:    string       // time period
    [key: string]: unknown
  }
}

interface ChartResponse {
  png:    Buffer
  width:  number
  height: number
}
```

---

## Platform Hook Specifications

### Claude Code — PostToolUse

**Registration** (`packages/claude-code/settings.json`):
```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "mcp__okx-trade-mcp__market_.*|mcp__okx-trade-mcp__account_get_positions",
      "hooks": [{
        "type": "command",
        "command": "node /path/to/claude-code/hooks/post-tool-use.js"
      }]
    }]
  }
}
```

**stdin** (Claude Code fixed format):
```json
{
  "tool_name":      "mcp__okx-trade-mcp__market_get_candles",
  "tool_input":     { "instId": "BTC-USDT", "bar": "1D" },
  "tool_response":  { "content": [{ "type": "text", "text": "..." }] },
  "session_id":     "xxx"
}
```

**stdout**:
```json
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "updatedMCPToolOutput": [
      { "type": "text",  "text": "<original JSON>" },
      { "type": "image", "data": "<base64>", "mimeType": "image/png" }
    ]
  }
}
```

---

### OpenClaw — after_tool_call Plugin Hook

**Registration** (`packages/openclaw/package.json` Plugin SDK):
```json
{
  "hooks": [{
    "event": "after_tool_call",
    "filter": { "tool_name_pattern": "^(market_|account_get_positions)" },
    "handler": "hooks/after-tool-call.js"
  }]
}
```

**stdin** (OpenClaw Plugin SDK format):
```json
{
  "event": "after_tool_call",
  "tool": {
    "name":   "market_get_candles",
    "server": "okx-trade-mcp",
    "input":  { "instId": "BTC-USDT", "bar": "1D" },
    "output": { "text": "..." }
  },
  "session": { "id": "xxx", "channel": "telegram" }
}
```

**stdout**:
```json
{
  "action": "replace_output",
  "content": [
    { "type": "text",  "text": "<original JSON>" },
    { "type": "image", "data": "<base64>", "mimeType": "image/png" }
  ]
}
```

---

## Visual Theme (lightweight-charts 5.x replication)

```typescript
const LW_THEME = {
  background:  '#FFFFFF',
  textColor:   '#191919',
  fontSize:    12,
  fontFamily:  `-apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif`,

  grid: {
    color: '#D6DCDE',
    style: 'solid',
  },

  crosshair: {
    color:           '#9598A1',
    labelBackground: '#131722',
    style:           'largeDashed',
    width:           1,
  },

  scale: {
    borderColor: '#2B2B43',
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
    color: '#26a69a',
  },

  pane: {
    separatorColor: '#E0E3EB',
  },
}
```

**Output size constraint:** maximum **800×600px**. Charts exceeding this are scaled down proportionally before PNG encoding to keep rendering time bounded.

---

## Performance

| Step | Time estimate |
|---|---|
| NAPI Canvas draw operations (800×400px) | 5–15ms |
| PNG encoding (`canvas.encode('png')`) | 10–25ms |
| Base64 encoding | < 1ms |
| **Total typical** | **15–40ms** |
| Complex chart (3 panes, 800×600px) | 40–80ms |

**SSE token streaming:** Not affected. The hook executes synchronously between tool completion and Claude inference. Token streaming begins only after the hook returns. The 15–80ms overhead is additive to the OKX API latency (100–500ms) and imperceptible to users.

---

## Rendering Output

- **Format:** PNG
- **Technology:** `@napi-rs/canvas` — provides browser-compatible Canvas 2D API in Node.js via native bindings
- SVG is explicitly out of scope; `@napi-rs/canvas` is a raster renderer

---

## Out of Scope

- Standalone MCP server
- Interactive charts (zoom, pan)
- Dark theme variant (light theme only, matching lightweight-charts defaults)
- Real-time streaming chart updates
