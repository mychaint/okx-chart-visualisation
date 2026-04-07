import { describe, it, expect } from 'vitest'
import { LW_THEME } from '../../src/renderer/theme.js'

describe('LW_THEME', () => {
  it('has correct candle up color', () => {
    expect(LW_THEME.candle.upColor).toBe('#26a69a')
  })
  it('has correct candle down color', () => {
    expect(LW_THEME.candle.downColor).toBe('#ef5350')
  })
  it('has white background', () => {
    expect(LW_THEME.background).toBe('#FFFFFF')
  })
})

import { createChartCanvas } from '../../src/renderer/canvas.js'
import { isValidPng, getPngDimensions } from '../helpers.js'

describe('createChartCanvas', () => {
  it('encodes to valid PNG buffer', async () => {
    const { ctx, encode } = createChartCanvas(200, 100)
    ctx.fillStyle = '#FF0000'
    ctx.fillRect(0, 0, 200, 100)
    const buf = await encode()
    expect(buf).toBeInstanceOf(Buffer)
    expect(isValidPng(buf)).toBe(true)
  })

  it('PNG dimensions match requested size', async () => {
    const { encode } = createChartCanvas(300, 150)
    const buf = await encode()
    const dims = getPngDimensions(buf)
    expect(dims.width).toBe(300)
    expect(dims.height).toBe(150)
  })
})
