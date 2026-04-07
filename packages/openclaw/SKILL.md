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
