import { createChartCanvas } from '../renderer/canvas.js';
import { LW_THEME } from '../renderer/theme.js';
import { computeLayout } from '../renderer/layout.js';
export async function renderOpenInterest(req) {
    const W = 800, H = 300;
    const rows = [...(req.data?.data ?? [])]
        .reverse()
        .map((r) => ({ oi: Number(r.oi), ts: Number(r.ts) }));
    if (rows.length === 0)
        throw new Error('No open interest data');
    const layout = computeLayout(W, H, [{ heightRatio: 1 }]);
    const pane = layout.panes[0];
    const { ctx, encode } = createChartCanvas(W, H);
    ctx.fillStyle = LW_THEME.background;
    ctx.fillRect(0, 0, W, H);
    const minOI = Math.min(...rows.map(r => r.oi));
    const maxOI = Math.max(...rows.map(r => r.oi));
    const range = maxOI - minOI || 1;
    const toX = (i) => pane.x + (i / (rows.length - 1)) * pane.width;
    const toY = (oi) => pane.y + pane.height - ((oi - minOI) / range) * pane.height;
    // Grid
    ctx.strokeStyle = LW_THEME.grid.color;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = pane.y + (pane.height / 4) * i;
        ctx.beginPath();
        ctx.moveTo(pane.x, y);
        ctx.lineTo(pane.x + pane.width, y);
        ctx.stroke();
    }
    // Fill area
    ctx.fillStyle = 'rgba(33,150,243,0.15)';
    ctx.beginPath();
    ctx.moveTo(toX(0), pane.y + pane.height);
    rows.forEach((r, i) => ctx.lineTo(toX(i), toY(r.oi)));
    ctx.lineTo(toX(rows.length - 1), pane.y + pane.height);
    ctx.closePath();
    ctx.fill();
    // Line
    ctx.strokeStyle = '#2196f3';
    ctx.lineWidth = 2;
    ctx.beginPath();
    rows.forEach((r, i) => i === 0 ? ctx.moveTo(toX(i), toY(r.oi)) : ctx.lineTo(toX(i), toY(r.oi)));
    ctx.stroke();
    ctx.fillStyle = LW_THEME.textColor;
    ctx.font = `bold ${LW_THEME.fontSize + 1}px ${LW_THEME.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`${req.params.instId ?? ''}  Open Interest`, pane.x + 4, LW_THEME.padding.top);
    ctx.strokeStyle = LW_THEME.scale.borderColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pane.x + pane.width, pane.y);
    ctx.lineTo(pane.x + pane.width, pane.y + pane.height);
    ctx.stroke();
    return { png: await encode(), width: W, height: H };
}
//# sourceMappingURL=open-interest.js.map