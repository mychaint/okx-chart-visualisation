import type { SKRSContext2D } from '@napi-rs/canvas';
export interface ChartCanvas {
    ctx: SKRSContext2D;
    encode: () => Promise<Buffer>;
}
export declare function createChartCanvas(width: number, height: number): ChartCanvas;
//# sourceMappingURL=canvas.d.ts.map