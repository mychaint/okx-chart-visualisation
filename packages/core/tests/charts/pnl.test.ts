import { describe, it, expect } from 'vitest'
import { renderPnl } from '../../src/charts/pnl.js'
import { isValidPng } from '../helpers.js'
import type { ChartRequest } from '../../src/types.js'

function makePnlReq(): ChartRequest {
  return {
    chartType: 'pnl',
    toolName:  'account_get_positions',
    data: {
      code: '0',
      data: [
        { instId: 'BTC-USDT-SWAP', instType: 'SWAP', pos: '0.5',  avgPx: '42000', upl: '500',  uplRatio: '0.0238',  lever: '10' },
        { instId: 'ETH-USDT-SWAP', instType: 'SWAP', pos: '-1.2', avgPx: '2800',  upl: '-200', uplRatio: '-0.059',  lever: '5'  },
        { instId: 'SOL-USDT-SWAP', instType: 'SWAP', pos: '10',   avgPx: '150',   upl: '300',  uplRatio: '0.2',     lever: '3'  },
      ],
    },
    params: {},
  }
}

describe('renderPnl', () => {
  it('returns valid PNG', async () => {
    const result = await renderPnl(makePnlReq())
    expect(isValidPng(result.png)).toBe(true)
  })

  it('throws on empty positions', async () => {
    const req = makePnlReq()
    ;(req.data as any).data = []
    await expect(renderPnl(req)).rejects.toThrow('No position data')
  })
})
