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
