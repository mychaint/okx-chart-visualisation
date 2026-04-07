import { createChartCanvas } from '../renderer/canvas.js';
import { LW_THEME } from '../renderer/theme.js';
import { computeLayout } from '../renderer/layout.js';
function parseCandles(data) {
    const rows = data?.data ?? [];
    if (rows.length === 0)
        return [];
    return [...rows].reverse().map(row => ({
        ts: Number(row[0]),
        open: Number(row[1]),
        high: Number(row[2]),
        low: Number(row[3]),
        close: Number(row[4]),
        volume: Number(row[5]),
    }));
}
function priceToY(price, min, max, top, h) {
    return top + h - ((price - min) / (max - min)) * h;
}
function volToY(vol, maxVol, top, h) {
    return top + h - (vol / maxVol) * h;
}
function formatDate(ts) {
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function formatPrice(p) {
    return p >= 1000 ? p.toFixed(0) : p.toFixed(2);
}
export async function renderKline(req) {
    const W = 800, H = 400;
    const candles = parseCandles(req.data);
    if (candles.length === 0)
        throw new Error('No candle data');
    const layout = computeLayout(W, H, [
        { heightRatio: 0.75 },
        { heightRatio: 0.25 },
    ]);
    const pricePane = layout.panes[0];
    const volumePane = layout.panes[1];
    const { ctx, encode } = createChartCanvas(W, H);
    // ── Background ──────────────────────────────────────────────
    ctx.fillStyle = LW_THEME.background;
    ctx.fillRect(0, 0, W, H);
    // ── Price range ─────────────────────────────────────────────
    const minPrice = Math.min(...candles.map(c => c.low));
    const maxPrice = Math.max(...candles.map(c => c.high));
    const priceRange = maxPrice - minPrice || 1;
    const pMin = minPrice - priceRange * 0.05;
    const pMax = maxPrice + priceRange * 0.05;
    const maxVol = Math.max(...candles.map(c => c.volume));
    // ── Grid lines (horizontal) ──────────────────────────────────
    ctx.strokeStyle = LW_THEME.grid.color;
    ctx.lineWidth = 1;
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
        const y = pricePane.y + (pricePane.height / gridLines) * i;
        ctx.beginPath();
        ctx.moveTo(pricePane.x, y);
        ctx.lineTo(pricePane.x + pricePane.width, y);
        ctx.stroke();
    }
    // ── Candles ──────────────────────────────────────────────────
    const totalW = pricePane.width;
    const barW = Math.max(1, Math.floor(totalW / candles.length) - 1);
    const halfBar = Math.max(0.5, barW / 2);
    candles.forEach((c, i) => {
        const x = pricePane.x + (i / candles.length) * totalW + (totalW / candles.length) * 0.1;
        const cx = x + halfBar;
        const isUp = c.close >= c.open;
        const color = isUp ? LW_THEME.candle.upColor : LW_THEME.candle.downColor;
        const highY = priceToY(c.high, pMin, pMax, pricePane.y, pricePane.height);
        const lowY = priceToY(c.low, pMin, pMax, pricePane.y, pricePane.height);
        const openY = priceToY(c.open, pMin, pMax, pricePane.y, pricePane.height);
        const closeY = priceToY(c.close, pMin, pMax, pricePane.y, pricePane.height);
        // wick
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.moveTo(cx, highY);
        ctx.lineTo(cx, lowY);
        ctx.stroke();
        // body
        const bodyTop = Math.min(openY, closeY);
        const bodyH = Math.max(1, Math.abs(closeY - openY));
        ctx.fillStyle = color;
        ctx.fillRect(x, bodyTop, barW, bodyH);
        // volume bar
        const volY = volToY(c.volume, maxVol, volumePane.y, volumePane.height);
        ctx.fillStyle = isUp ? LW_THEME.histogram.upColor : LW_THEME.histogram.downColor;
        ctx.fillRect(x, volY, barW, volumePane.y + volumePane.height - volY);
    });
    // ── Pane separator ───────────────────────────────────────────
    const sepY = pricePane.y + pricePane.height;
    ctx.fillStyle = LW_THEME.pane.separatorColor;
    ctx.fillRect(0, sepY, W, LW_THEME.pane.separatorHeight);
    // ── Scale borders ────────────────────────────────────────────
    ctx.strokeStyle = LW_THEME.scale.borderColor;
    ctx.lineWidth = 1;
    const axisX = pricePane.x + pricePane.width;
    ctx.beginPath();
    ctx.moveTo(axisX, 0);
    ctx.lineTo(axisX, H - layout.timeAxisHeight);
    ctx.stroke();
    const timeY = H - layout.timeAxisHeight;
    ctx.beginPath();
    ctx.moveTo(pricePane.x, timeY);
    ctx.lineTo(axisX, timeY);
    ctx.stroke();
    // ── Price axis labels ─────────────────────────────────────────
    ctx.fillStyle = LW_THEME.textColor;
    ctx.font = `${LW_THEME.fontSize}px ${LW_THEME.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= gridLines; i++) {
        const price = pMax - ((pMax - pMin) / gridLines) * i;
        const y = pricePane.y + (pricePane.height / gridLines) * i;
        ctx.fillText(formatPrice(price), axisX + 4, y);
    }
    // ── Time axis labels ──────────────────────────────────────────
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const labelCount = Math.min(6, candles.length);
    const step = Math.floor(candles.length / labelCount);
    for (let i = 0; i < candles.length; i += step) {
        const c = candles[i];
        const x = pricePane.x + (i / candles.length) * totalW + totalW / candles.length / 2;
        ctx.fillText(formatDate(c.ts), x, timeY + 4);
    }
    // ── Title ─────────────────────────────────────────────────────
    if (req.params.instId) {
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = `bold ${LW_THEME.fontSize + 1}px ${LW_THEME.fontFamily}`;
        ctx.fillStyle = LW_THEME.textColor;
        ctx.fillText(`${req.params.instId}  ${req.params.bar ?? ''}`, pricePane.x + 4, LW_THEME.padding.top);
    }
    return { png: await encode(), width: W, height: H };
}
//# sourceMappingURL=kline.js.map