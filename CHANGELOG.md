# Changelog

## [0.1.0] - 2026-04-08

### Added

- Initial release
- Claude Code PostToolUse hook that intercepts OKX agent-trade-kit market tool results
- Chart rendering engine (`packages/core`) using `@napi-rs/canvas` replicating TradingView lightweight-charts 5.x visual style
- 8 chart types: K-line + volume, indicator (MACD/RSI/MA/BB/KDJ), order book depth, open interest, funding rate, trade volume heatmap, price summary card, position P&L ratio
- Claude Code plugin marketplace support via `.claude-plugin/`
- Multi-pane layout engine with separator and time axis
