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
