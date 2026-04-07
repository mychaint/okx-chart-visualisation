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
