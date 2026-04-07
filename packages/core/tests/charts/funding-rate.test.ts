import { describe, it, expect } from 'vitest'
import { renderFundingRate } from '../../src/charts/funding-rate.js'
import { isValidPng } from '../helpers.js'
import type { ChartRequest } from '../../src/types.js'

function makeFRReq(): ChartRequest {
  const now = Date.now()
  const data = Array.from({ length: 30 }, (_, i) => ({
    instId:      'BTC-USDT-SWAP',
    fundingRate: String((Math.sin(i) * 0.001).toFixed(6)),
    fundingTime: String(now - (29 - i) * 28800000),
  })).reverse()
  return {
    chartType: 'funding-rate',
    toolName:  'market_get_funding_rate',
    data:      { code: '0', data },
    params:    { instId: 'BTC-USDT-SWAP' },
  }
}

describe('renderFundingRate', () => {
  it('returns valid PNG', async () => {
    const result = await renderFundingRate(makeFRReq())
    expect(isValidPng(result.png)).toBe(true)
  })

  it('throws on empty data', async () => {
    const req = makeFRReq()
    ;(req.data as any).data = []
    await expect(renderFundingRate(req)).rejects.toThrow('No funding rate data')
  })
})
