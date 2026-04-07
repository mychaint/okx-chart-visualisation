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
