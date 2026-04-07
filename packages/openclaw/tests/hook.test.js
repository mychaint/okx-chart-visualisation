import { describe, it, expect } from 'vitest'
import { spawnSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const HOOK = path.join(__dirname, '../hooks/after-tool-call.js')

function runHook(stdin) {
  return spawnSync('node', [HOOK], {
    input: JSON.stringify(stdin),
    encoding: 'utf8',
    timeout: 15000,
  })
}

const CANDLE_ROWS = Array.from({ length: 10 }, (_, i) => [
  String(Date.now() - (9 - i) * 86400000),
  '40000', '41000', '39000', '40500', '1000', '1000', '1000', '1',
]).reverse()

describe('after-tool-call hook', () => {
  it('outputs replace_output with image block for market_get_candles', () => {
    const stdin = {
      event: 'after_tool_call',
      tool: {
        name:   'market_get_candles',
        server: 'okx-trade-mcp',
        input:  { instId: 'BTC-USDT', bar: '1D' },
        output: { text: JSON.stringify({ code: '0', data: CANDLE_ROWS }) },
      },
      session: { id: 'test', channel: 'telegram' },
    }
    const result = runHook(stdin)
    expect(result.status).toBe(0)
    const out = JSON.parse(result.stdout)
    expect(out.action).toBe('replace_output')
    const img = out.content.find((c) => c.type === 'image')
    expect(img).toBeDefined()
    expect(img.mimeType).toBe('image/png')
    expect(typeof img.data).toBe('string')
  })

  it('passes through for non-chart tools', () => {
    const stdin = {
      event: 'after_tool_call',
      tool: {
        name:   'spot_place_order',
        server: 'okx-trade-mcp',
        input:  {},
        output: { text: '{}' },
      },
      session: { id: 'test', channel: 'telegram' },
    }
    const result = runHook(stdin)
    expect(result.status).toBe(0)
    expect(JSON.parse(result.stdout)).toEqual({})
  })
})
