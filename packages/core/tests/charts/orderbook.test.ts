import { describe, it, expect } from 'vitest'
import { renderOrderbook } from '../../src/charts/orderbook.js'
import { isValidPng } from '../helpers.js'
import type { ChartRequest } from '../../src/types.js'

function makeOrderbookReq(): ChartRequest {
  const mid = 42000
  const bids = Array.from({ length: 20 }, (_, i) => [String(mid - i * 10), String(1 + i * 0.5), '0', '1'])
  const asks = Array.from({ length: 20 }, (_, i) => [String(mid + (i + 1) * 10), String(1 + i * 0.5), '0', '1'])
  return {
    chartType: 'orderbook',
    toolName:  'market_get_orderbook',
    data:      { code: '0', data: [{ bids, asks, ts: String(Date.now()) }] },
    params:    { instId: 'BTC-USDT' },
  }
}

describe('renderOrderbook', () => {
  it('returns valid PNG', async () => {
    const result = await renderOrderbook(makeOrderbookReq())
    expect(isValidPng(result.png)).toBe(true)
  })

  it('throws when no orderbook data', async () => {
    const req = makeOrderbookReq()
    ;(req.data as any).data = []
    await expect(renderOrderbook(req)).rejects.toThrow('No orderbook data')
  })
})
