import { describe, it, expect } from 'vitest'
import { renderKline } from '../../src/charts/kline.js'
import { isValidPng, getPngDimensions } from '../helpers.js'
import type { ChartRequest } from '../../src/types.js'

function makeKlineRequest(): ChartRequest {
  const now = Date.now()
  const rows = Array.from({ length: 30 }, (_, i) => {
    const ts    = String(now - (29 - i) * 86400000)
    const open  = String(40000 + i * 100)
    const close = String(40000 + i * 100 + 50)
    const high  = String(40000 + i * 100 + 200)
    const low   = String(40000 + i * 100 - 100)
    const vol   = String(1000 + i * 10)
    return [ts, open, high, low, close, vol, vol, vol, '1']
  }).reverse()   // newest first, matching OKX API

  return {
    chartType: 'kline',
    toolName:  'market_get_candles',
    data:      { code: '0', msg: '', data: rows },
    params:    { instId: 'BTC-USDT', bar: '1D' },
  }
}

describe('renderKline', () => {
  it('returns valid PNG buffer', async () => {
    const result = await renderKline(makeKlineRequest())
    expect(result.png).toBeInstanceOf(Buffer)
    expect(isValidPng(result.png)).toBe(true)
  })

  it('output dimensions are 800x400', async () => {
    const result = await renderKline(makeKlineRequest())
    const dims = getPngDimensions(result.png)
    expect(dims.width).toBe(800)
    expect(dims.height).toBe(400)
  })

  it('throws when data array is empty', async () => {
    const req = makeKlineRequest()
    ;(req.data as any).data = []
    await expect(renderKline(req)).rejects.toThrow('No candle data')
  })
})
