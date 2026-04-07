import type { ChartRequest, ChartResponse } from '../types.js'
import { createChartCanvas } from '../renderer/canvas.js'
import { LW_THEME } from '../renderer/theme.js'

interface Position {
  instId:   string
  upl:      number
  uplRatio: number
}

export async function renderPnl(req: ChartRequest): Promise<ChartResponse> {
  const W = 800, H = 300
  const positions: Position[] = ((req.data as any)?.data ?? [])
    .map((p: any) => ({ instId: p.instId, upl: Number(p.upl), uplRatio: Number(p.uplRatio) }))
  if (positions.length === 0) throw new Error('No position data')

  const { ctx, encode } = createChartCanvas(W, H)

  ctx.fillStyle = LW_THEME.background
  ctx.fillRect(0, 0, W, H)

  const paddingLeft   = 160
  const paddingRight  = LW_THEME.padding.right
  const paddingTop    = LW_THEME.padding.top + 24
  const paddingBottom = LW_THEME.padding.bottom

  const chartW = W - paddingLeft - paddingRight
  const chartH = H - paddingTop - paddingBottom
  const barH   = Math.floor(chartH / positions.length) - 4

  const maxAbs = Math.max(...positions.map(p => Math.abs(p.uplRatio))) || 0.01

  ctx.fillStyle = LW_THEME.textColor
  ctx.font = `bold ${LW_THEME.fontSize + 1}px ${LW_THEME.fontFamily}`
  ctx.textAlign = 'left'; ctx.textBaseline = 'top'
  ctx.fillText('Position P&L', paddingLeft, LW_THEME.padding.top)

  const centerX = paddingLeft + chartW / 2
  ctx.strokeStyle = LW_THEME.crosshair.color
  ctx.lineWidth = 1
  ctx.setLineDash([4, 4])
  ctx.beginPath(); ctx.moveTo(centerX, paddingTop); ctx.lineTo(centerX, paddingTop + chartH); ctx.stroke()
  ctx.setLineDash([])

  ctx.strokeStyle = LW_THEME.grid.color
  ctx.lineWidth = 1
  for (let i = 0; i <= 4; i++) {
    const x = paddingLeft + (chartW / 4) * i
    ctx.beginPath(); ctx.moveTo(x, paddingTop); ctx.lineTo(x, paddingTop + chartH); ctx.stroke()
  }

  positions.forEach((pos, i) => {
    const y      = paddingTop + i * (barH + 4)
    const ratio  = pos.uplRatio / maxAbs
    const barLen = Math.max(2, (Math.abs(ratio) * (chartW / 2)))
    const isProfit = pos.uplRatio >= 0
    const barX  = isProfit ? centerX : centerX - barLen

    ctx.fillStyle = isProfit ? LW_THEME.candle.upColor : LW_THEME.candle.downColor
    ctx.fillRect(barX, y, barLen, barH)

    ctx.fillStyle = LW_THEME.textColor
    ctx.font = `${LW_THEME.fontSize}px ${LW_THEME.fontFamily}`
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle'
    ctx.fillText(pos.instId, paddingLeft - 8, y + barH / 2)

    const sign    = isProfit ? '+' : ''
    const pnlText = `${sign}${(pos.uplRatio * 100).toFixed(2)}%`
    ctx.textAlign = isProfit ? 'left' : 'right'
    ctx.fillText(pnlText, isProfit ? centerX + barLen + 4 : centerX - barLen - 4, y + barH / 2)
  })

  ctx.strokeStyle = LW_THEME.scale.borderColor
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(paddingLeft + chartW, paddingTop)
  ctx.lineTo(paddingLeft + chartW, paddingTop + chartH)
  ctx.stroke()

  return { png: await encode(), width: W, height: H }
}
