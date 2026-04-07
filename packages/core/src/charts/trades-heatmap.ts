import type { ChartRequest, ChartResponse } from '../types.js'
import { createChartCanvas } from '../renderer/canvas.js'
import { LW_THEME } from '../renderer/theme.js'
import { computeLayout } from '../renderer/layout.js'

export async function renderTradesHeatmap(req: ChartRequest): Promise<ChartResponse> {
  const W = 800, H = 350
  const trades = ((req.data as any)?.data ?? []) as Array<{
    side: string; sz: string; px: string; ts: string
  }>
  if (trades.length === 0) throw new Error('No trades data')

  const PRICE_BINS = 20, TIME_BINS = 40
  const prices = trades.map(t => Number(t.px))
  const times  = trades.map(t => Number(t.ts))
  const minP = Math.min(...prices), maxP = Math.max(...prices)
  const minT = Math.min(...times),  maxT = Math.max(...times)

  const grid: number[][] = Array.from({ length: PRICE_BINS }, () => Array(TIME_BINS).fill(0))
  trades.forEach(t => {
    const pIdx = Math.min(PRICE_BINS - 1, Math.floor(((Number(t.px) - minP) / (maxP - minP || 1)) * PRICE_BINS))
    const tIdx = Math.min(TIME_BINS  - 1, Math.floor(((Number(t.ts) - minT) / (maxT - minT || 1)) * TIME_BINS))
    grid[pIdx][tIdx] += Number(t.sz)
  })
  const maxVal = Math.max(...grid.flat()) || 1

  const layout = computeLayout(W, H, [{ heightRatio: 1 }])
  const pane   = layout.panes[0]
  const { ctx, encode } = createChartCanvas(W, H)

  ctx.fillStyle = LW_THEME.background
  ctx.fillRect(0, 0, W, H)

  const cellW = pane.width  / TIME_BINS
  const cellH = pane.height / PRICE_BINS

  grid.forEach((row, pIdx) => {
    row.forEach((val, tIdx) => {
      if (val === 0) return
      const intensity = val / maxVal
      const r = Math.round(239 * intensity)
      const g = Math.round(83  * intensity)
      const b = Math.round(80  * intensity)
      ctx.fillStyle = `rgba(${r},${g},${b},${0.2 + intensity * 0.8})`
      ctx.fillRect(
        pane.x + tIdx * cellW,
        pane.y + (PRICE_BINS - 1 - pIdx) * cellH,
        cellW, cellH,
      )
    })
  })

  ctx.fillStyle = LW_THEME.textColor
  ctx.font = `bold ${LW_THEME.fontSize + 1}px ${LW_THEME.fontFamily}`
  ctx.textAlign = 'left'; ctx.textBaseline = 'top'
  ctx.fillText(`${req.params.instId ?? ''}  Trade Volume Heatmap`, pane.x + 4, LW_THEME.padding.top)

  ctx.strokeStyle = LW_THEME.scale.borderColor
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(pane.x + pane.width, pane.y)
  ctx.lineTo(pane.x + pane.width, pane.y + pane.height)
  ctx.stroke()

  return { png: await encode(), width: W, height: H }
}
