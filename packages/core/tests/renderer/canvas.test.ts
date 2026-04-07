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
