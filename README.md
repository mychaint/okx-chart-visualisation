# okx-chart-visualisation

[![CI](https://github.com/mychaint/okx-chart-visualisation/actions/workflows/ci.yml/badge.svg)](https://github.com/mychaint/okx-chart-visualisation/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js ≥ 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![pnpm](https://img.shields.io/badge/pnpm-workspace-orange?logo=pnpm&logoColor=white)](https://pnpm.io/)

A Claude Code plugin that intercepts [OKX agent-trade-kit](https://github.com/okx/agent-trade-kit) market tool results via PostToolUse hooks and automatically renders professional trading charts as PNG image attachments in conversation.

Charts replicate the visual style of [TradingView lightweight-charts 5.x](https://github.com/tradingview/lightweight-charts) and are rendered server-side using [@napi-rs/canvas](https://github.com/Brooooooklyn/canvas) — no browser required.

## Supported Charts

| Tool | Chart | Size |
|------|-------|------|
| `market_get_candles` / `market_get_index_candles` | K-line + Volume | 800×400 |
| `market_get_indicator` | MACD / RSI / MA / BB / KDJ | 800×300 |
| `market_get_orderbook` | Order book depth | 800×350 |
| `market_get_open_interest` | Open interest trend | 800×300 |
| `market_get_funding_rate` | Funding rate histogram | 800×300 |
| `market_get_trades` | Trade volume heatmap | 800×350 |
| `market_get_ticker` / `market_get_tickers` | Price summary card | 500×200 |
| `account_get_positions` | Position P&L ratio | 800×300 |

## How It Works

```
Agent calls market_get_candles(...)
        │
        ▼
[PostToolUse Hook fires]
  1. Match tool name → chart type
  2. Parse tool result JSON
  3. Render chart via @napi-rs/canvas → PNG
  4. Encode to base64
        │
        ▼
Claude receives: original JSON + chart image
```

The hook executes in 15–80ms and does not affect SSE token streaming.

## Installation

### Claude Code Plugin Marketplace (Recommended)

```
/plugin marketplace add mychaint/okx-chart-visualisation
/plugin install chart-visualisation@okx-chart-visualisation
```

### Manual Hook Registration

Add to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "mcp__okx-trade-mcp__(market_get_candles|market_get_index_candles|market_get_indicator|market_get_open_interest|market_get_funding_rate|market_get_orderbook|market_get_trades|market_get_ticker|market_get_tickers|account_get_positions)",
        "hooks": [
          {
            "type": "command",
            "command": "node \"/absolute/path/to/okx-chart-visualisation/packages/claude-code/hooks/post-tool-use.js\""
          }
        ]
      }
    ]
  }
}
```

See [docs/INSTALL.md](docs/INSTALL.md) for full installation instructions.

## Prerequisites

- Node.js ≥ 18
- [OKX agent-trade-kit](https://github.com/okx/agent-trade-kit) installed and running

## Repository Structure

```
okx-chart-visualisation/
├── .claude-plugin/          # Claude Code plugin metadata & hook registration
│   ├── plugin.json
│   ├── hooks.json
│   └── marketplace.json
├── packages/
│   ├── core/                # Chart rendering engine (@napi-rs/canvas)
│   │   └── src/
│   │       ├── charts/      # K-line, indicator, orderbook, ...
│   │       ├── renderer/    # Canvas, theme, layout
│   │       └── index.ts
│   └── claude-code/         # Claude Code plugin
│       ├── hooks/
│       │   └── post-tool-use.js
│       └── skills/
│           └── trading-charts/
└── docs/
    └── INSTALL.md
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE).
