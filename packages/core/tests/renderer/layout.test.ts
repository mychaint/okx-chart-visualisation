import { describe, it, expect } from 'vitest'
import { computeLayout } from '../../src/renderer/layout.js'

describe('computeLayout', () => {
  it('single pane fills chart area', () => {
    const layout = computeLayout(800, 400, [{ heightRatio: 1 }])
    expect(layout.panes).toHaveLength(1)
    expect(layout.panes[0].width).toBeGreaterThan(0)
    expect(layout.panes[0].height).toBeGreaterThan(0)
  })

  it('two panes sum to chart height minus time axis', () => {
    const layout = computeLayout(800, 400, [
      { heightRatio: 0.75 },
      { heightRatio: 0.25 },
    ])
    const totalPaneH = layout.panes.reduce((s, p) => s + p.height, 0)
    // panes fill: totalHeight - topPadding - timeAxisHeight - separators between panes
    const expectedH = layout.totalHeight - layout.topPadding - layout.timeAxisHeight
                    - (layout.panes.length - 1) * layout.separatorHeight
    expect(totalPaneH).toBeCloseTo(expectedH, 0)
  })

  it('panes do not overflow canvas height', () => {
    const layout = computeLayout(800, 400, [
      { heightRatio: 0.75 },
      { heightRatio: 0.25 },
    ])
    const lastPane = layout.panes[layout.panes.length - 1]
    const bottom = lastPane.y + lastPane.height + layout.timeAxisHeight
    expect(bottom).toBeLessThanOrEqual(400)
  })

  it('pane x starts after left padding', () => {
    const layout = computeLayout(800, 400, [{ heightRatio: 1 }])
    expect(layout.panes[0].x).toBe(layout.leftPadding)
  })

  it('pane width excludes right axis', () => {
    const layout = computeLayout(800, 400, [{ heightRatio: 1 }])
    expect(layout.panes[0].width).toBe(800 - layout.leftPadding - layout.priceAxisWidth)
  })
})
