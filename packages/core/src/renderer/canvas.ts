import { createCanvas } from '@napi-rs/canvas'
import type { SKRSContext2D } from '@napi-rs/canvas'

export interface ChartCanvas {
  ctx: SKRSContext2D
  encode: () => Promise<Buffer>
}

export function createChartCanvas(width: number, height: number): ChartCanvas {
  const MAX_W = 800
  const MAX_H = 600
  const scale = Math.min(1, Math.min(MAX_W / width, MAX_H / height))
  const w = Math.round(width  * scale)
  const h = Math.round(height * scale)

  const canvas = createCanvas(w, h)
  const ctx    = canvas.getContext('2d')

  return {
    ctx,
    encode: () => canvas.encode('png') as Promise<Buffer>,
  }
}
