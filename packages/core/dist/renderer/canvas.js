import { createCanvas } from '@napi-rs/canvas';
export function createChartCanvas(width, height) {
    const MAX_W = 800;
    const MAX_H = 600;
    const scale = Math.min(1, Math.min(MAX_W / width, MAX_H / height));
    const w = Math.round(width * scale);
    const h = Math.round(height * scale);
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext('2d');
    return {
        ctx,
        encode: () => canvas.encode('png'),
    };
}
//# sourceMappingURL=canvas.js.map