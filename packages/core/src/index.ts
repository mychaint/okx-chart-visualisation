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
