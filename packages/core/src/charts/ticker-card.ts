import type { ChartRequest, ChartResponse } from '../types.js'
import { createChartCanvas } from '../renderer/canvas.js'
import { LW_THEME } from '../renderer/theme.js'

export async function renderTickerCard(req: ChartRequest): Promise<ChartResponse> {
  const W = 500, H = 200
  const ticker = (req.data as any)?.data?.[0]
  if (!ticker) throw new Error('No ticker data')

  const last    = Number(ticker.last)
  const open24h = Number(ticker.open24h)
  const change  = last - open24h
  const changePct = (change / open24h) * 100
  const isUp    = change >= 0

  const { ctx, encode } = createChartCanvas(W, H)

  ctx.fillStyle = LW_THEME.background
  ctx.fillRect(0, 0, W, H)

  ctx.strokeStyle = LW_THEME.scale.borderColor
  ctx.lineWidth = 1
  ctx.strokeRect(0.5, 0.5, W - 1, H - 1)

  const pad = 20

  ctx.fillStyle = LW_THEME.textColor
  ctx.font = `bold 14px ${LW_THEME.fontFamily}`
  ctx.textAlign = 'left'; ctx.textBaseline = 'top'
  ctx.fillText(ticker.instId, pad, pad)

  ctx.font = `bold 36px ${LW_THEME.fontFamily}`
  ctx.fillStyle = isUp ? LW_THEME.candle.upColor : LW_THEME.candle.downColor
  ctx.fillText(Number(last).toLocaleString(), pad, pad + 24)

  const sign = isUp ? '+' : ''
  ctx.font = `16px ${LW_THEME.fontFamily}`
  ctx.fillText(`${sign}${change.toFixed(2)}  (${sign}${changePct.toFixed(2)}%)`, pad, pad + 70)

  ctx.fillStyle = LW_THEME.textColor
  ctx.font = `${LW_THEME.fontSize}px ${LW_THEME.fontFamily}`
  const stats = [
    `H: ${Number(ticker.high24h).toLocaleString()}`,
    `L: ${Number(ticker.low24h).toLocaleString()}`,
    `Vol: ${Number(ticker.vol24h).toFixed(0)}`,
  ]
  stats.forEach((s, i) => {
    ctx.fillText(s, pad + i * 150, H - pad - LW_THEME.fontSize)
  })

  ctx.textAlign = 'right'
  ctx.fillStyle = LW_THEME.candle.upColor
  ctx.fillText(`Bid ${Number(ticker.bidPx).toLocaleString()}`, W - pad, pad + 24)
  ctx.fillStyle = LW_THEME.candle.downColor
  ctx.fillText(`Ask ${Number(ticker.askPx).toLocaleString()}`, W - pad, pad + 44)

  return { png: await encode(), width: W, height: H }
}
