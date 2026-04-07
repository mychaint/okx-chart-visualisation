import type { ChartRequest, ChartResponse } from '../types.js'
import { renderKline }          from './kline.js'
import { renderIndicator }      from './indicator.js'
import { renderOrderbook }      from './orderbook.js'
import { renderOpenInterest }   from './open-interest.js'
import { renderFundingRate }    from './funding-rate.js'
import { renderTradesHeatmap }  from './trades-heatmap.js'
import { renderPnl }            from './pnl.js'
import { renderTickerCard }     from './ticker-card.js'

export async function route(req: ChartRequest): Promise<ChartResponse> {
  switch (req.chartType) {
    case 'kline':           return renderKline(req)
    case 'indicator':       return renderIndicator(req)
    case 'orderbook':       return renderOrderbook(req)
    case 'open-interest':   return renderOpenInterest(req)
    case 'funding-rate':    return renderFundingRate(req)
    case 'trades-heatmap':  return renderTradesHeatmap(req)
    case 'pnl':             return renderPnl(req)
    case 'ticker-card':     return renderTickerCard(req)
    default:
      throw new Error(`Unknown chartType: ${(req as any).chartType}`)
  }
}
