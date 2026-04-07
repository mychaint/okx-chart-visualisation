import { LW_THEME } from './theme.js'

export interface PaneConfig {
  heightRatio: number   // fraction of total chart area height (must sum to 1.0)
  label?: string
}

export interface PaneBounds {
  x:      number   // left edge (after left padding)
  y:      number   // top edge of this pane
  width:  number   // chart area width
  height: number   // chart area height
}

export interface LayoutResult {
  panes:           PaneBounds[]
  priceAxisWidth:  number
  timeAxisHeight:  number
  leftPadding:     number
  topPadding:      number
  separatorHeight: number
  totalWidth:      number
  totalHeight:     number
}

export function computeLayout(
  width: number,
  height: number,
  panes: PaneConfig[],
): LayoutResult {
  const priceAxisWidth  = LW_THEME.padding.right
  const timeAxisHeight  = LW_THEME.padding.bottom
  const leftPadding     = LW_THEME.padding.left
  const topPadding      = LW_THEME.padding.top
  const separatorHeight = LW_THEME.pane.separatorHeight

  const chartAreaWidth  = width  - leftPadding - priceAxisWidth
  const chartAreaHeight = height - topPadding - timeAxisHeight
                        - separatorHeight * (panes.length - 1)

  const bounds: PaneBounds[] = []
  let y = topPadding
  let allocatedHeight = 0

  for (let i = 0; i < panes.length; i++) {
    const isLast = i === panes.length - 1
    const h = isLast
      ? chartAreaHeight - allocatedHeight
      : Math.floor(chartAreaHeight * panes[i].heightRatio)
    allocatedHeight += h
    bounds.push({ x: leftPadding, y, width: chartAreaWidth, height: h })
    y += h + separatorHeight
  }

  return {
    panes:           bounds,
    priceAxisWidth,
    timeAxisHeight,
    leftPadding,
    topPadding,
    separatorHeight,
    totalWidth:  width,
    totalHeight: height,
  }
}
