import { createChartCanvas } from '../renderer/canvas.js';
import { LW_THEME } from '../renderer/theme.js';
import { computeLayout } from '../renderer/layout.js';
export async function renderFundingRate(req) {
    const W = 800, H = 300;
    const rows = [...(req.data?.data ?? [])].reverse()
        .map((r) => ({ rate: Number(r.fundingRate), ts: Number(r.fundingTime) }));
    if (rows.length === 0)
        throw new Error('No funding rate data');
    const layout = computeLayout(W, H, [{ heightRatio: 1 }]);
    const pane = layout.panes[0];
    const { ctx, encode } = createChartCanvas(W, H);
    ctx.fillStyle = LW_THEME.background;
    ctx.fillRect(0, 0, W, H);
    const absMax = Math.max(...rows.map(r => Math.abs(r.rate))) || 0.001;
    const min = -absMax * 1.2, max = absMax * 1.2;
    ctx.strokeStyle = LW_THEME.grid.color;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = pane.y + (pane.height / 4) * i;
        ctx.beginPath();
        ctx.moveTo(pane.x, y);
        ctx.lineTo(pane.x + pane.width, y);
        ctx.stroke();
    }
    const zeroY = pane.y + pane.height / 2;
    ctx.strokeStyle = LW_THEME.crosshair.color;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pane.x, zeroY);
    ctx.lineTo(pane.x + pane.width, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);
    const barW = Math.max(2, Math.floor(pane.width / rows.length) - 1);
    const toY = (v) => pane.y + pane.height - ((v - min) / (max - min)) * pane.height;
    rows.forEach((r, i) => {
        const x = pane.x + (i / rows.length) * pane.width;
        const rY = toY(r.rate);
        ctx.fillStyle = r.rate >= 0 ? LW_THEME.candle.upColor : LW_THEME.candle.downColor;
        ctx.fillRect(x, Math.min(rY, zeroY), barW, Math.abs(rY - zeroY));
    });
    ctx.fillStyle = LW_THEME.textColor;
    ctx.font = `bold ${LW_THEME.fontSize + 1}px ${LW_THEME.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`${req.params.instId ?? ''}  Funding Rate`, pane.x + 4, LW_THEME.padding.top);
    ctx.strokeStyle = LW_THEME.scale.borderColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pane.x + pane.width, pane.y);
    ctx.lineTo(pane.x + pane.width, pane.y + pane.height);
    ctx.stroke();
    return { png: await encode(), width: W, height: H };
}
//# sourceMappingURL=funding-rate.js.map