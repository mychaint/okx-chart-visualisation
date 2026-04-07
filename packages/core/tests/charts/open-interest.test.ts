import { describe, it, expect } from 'vitest'
import { renderOpenInterest } from '../../src/charts/open-interest.js'
import { isValidPng } from '../helpers.js'
import type { ChartRequest } from '../../src/types.js'

function makeOIReq(): ChartRequest {
  const now = Date.now()
  const data = Array.from({ length: 24 }, (_, i) => ({
    instId: 'BTC-USDT-SWAP',
    oi:     String(100000 + i * 500),
    oiCcy:  String(2 + i * 0.01),
    ts:     String(now - (23 - i) * 3600000),
  })).reverse()
  return {
    chartType: 'open-interest',
    toolName:  'market_get_open_interest',
    data:      { code: '0', data },
    params:    { instId: 'BTC-USDT-SWAP' },
  }
}

describe('renderOpenInterest', () => {
  it('returns valid PNG', async () => {
    const result = await renderOpenInterest(makeOIReq())
    expect(isValidPng(result.png)).toBe(true)
  })

  it('throws on empty data', async () => {
    const req = makeOIReq()
    ;(req.data as any).data = []
    await expect(renderOpenInterest(req)).rejects.toThrow('No open interest data')
  })
})
