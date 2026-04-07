import { describe, it, expect } from 'vitest'
import { spawnSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const HOOK = path.join(__dirname, '../hooks/post-tool-use.js')

function runHook(stdin) {
  const result = spawnSync('node', [HOOK], {
    input: JSON.stringify(stdin),
    encoding: 'utf8',
    timeout: 15000,
  })
  return result
}

const CANDLE_ROWS = Array.from({ length: 10 }, (_, i) => [
  String(Date.now() - (9 - i) * 86400000),
  '40000', '41000', '39000', '40500', '1000', '1000', '1000', '1',
]).reverse()

describe('post-tool-use hook', () => {
  it('outputs updatedMCPToolOutput with image block for market_get_candles', () => {
    const stdin = {
      tool_name: 'mcp__okx-trade-mcp__market_get_candles',
      tool_input: { instId: 'BTC-USDT', bar: '1D' },
      tool_response: {
        content: [{ type: 'text', text: JSON.stringify({ code: '0', data: CANDLE_ROWS }) }],
      },
      session_id: 'test',
    }
    const result = runHook(stdin)
    expect(result.status).toBe(0)
    const out = JSON.parse(result.stdout)
    expect(out.hookSpecificOutput.hookEventName).toBe('PostToolUse')
    const content = out.hookSpecificOutput.updatedMCPToolOutput
    expect(content.some((c) => c.type === 'image')).toBe(true)
    const img = content.find((c) => c.type === 'image')
    expect(img.mimeType).toBe('image/png')
    expect(typeof img.data).toBe('string')
    expect(img.data.length).toBeGreaterThan(100)
  })

  it('passes through unchanged for unknown tools', () => {
    const stdin = {
      tool_name: 'mcp__okx-trade-mcp__spot_place_order',
      tool_input: {},
      tool_response: { content: [{ type: 'text', text: '{}' }] },
      session_id: 'test',
    }
    const result = runHook(stdin)
    expect(result.status).toBe(0)
    expect(result.stdout.trim()).toBe('{}')
  })
})
