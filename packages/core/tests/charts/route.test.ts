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
