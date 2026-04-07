import { createChartCanvas } from '../renderer/canvas.js';
import { LW_THEME } from '../renderer/theme.js';
import { computeLayout } from '../renderer/layout.js';
function valToY(val, min, max, top, h) {
    const range = max - min || 1;
    return top + h - ((val - min) / range) * h;
}
function drawLine(ctx, vals, min, max, pane, color) {
    if (vals.length === 0)
        return;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    vals.forEach((v, i) => {
        const x = pane.x + (i / (vals.length - 1)) * pane.width;
        const y = valToY(v, min, max, pane.y, pane.height);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
}
export async function renderIndicator(req) {
    const W = 800, H = 300;
    const d = req.data?.data;
    if (!d?.ts?.length)
        throw new Error('No indicator data');
    const ind = (d.indicator ?? '').toUpperCase();
    const { ctx, encode } = createChartCanvas(W, H);
    ctx.fillStyle = LW_THEME.background;
    ctx.fillRect(0, 0, W, H);
    const layout = computeLayout(W, H, [{ heightRatio: 1 }]);
    const pane = layout.panes[0];
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
    if (ind === 'MACD') {
        const macd = d.macd.map(Number);
        const signal = d.signal.map(Number);
        const hist = d.hist.map(Number);
        const allVals = [...macd, ...signal, ...hist];
        const min = Math.min(...allVals), max = Math.max(...allVals);
        // Histogram bars
        hist.forEach((v, i) => {
            const x = pane.x + (i / hist.length) * pane.width;
            const barW = Math.max(1, pane.width / hist.length - 1);
            const zeroY = valToY(0, min, max, pane.y, pane.height);
            const valY = valToY(v, min, max, pane.y, pane.height);
            ctx.fillStyle = v >= 0 ? LW_THEME.candle.upColor : LW_THEME.candle.downColor;
            ctx.fillRect(x, Math.min(valY, zeroY), barW, Math.abs(valY - zeroY));
        });
        // Zero line
        const zeroY = valToY(0, min, max, pane.y, pane.height);
        ctx.strokeStyle = LW_THEME.crosshair.color;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(pane.x, zeroY);
        ctx.lineTo(pane.x + pane.width, zeroY);
        ctx.stroke();
        ctx.setLineDash([]);
        drawLine(ctx, macd, min, max, pane, '#2196f3');
        drawLine(ctx, signal, min, max, pane, '#FF6D00');
    }
    else if (ind === 'RSI') {
        const rsi = d.rsi.map(Number);
        const min = 0, max = 100;
        const y70 = valToY(70, min, max, pane.y, pane.height);
        const y30 = valToY(30, min, max, pane.y, pane.height);
        ctx.fillStyle = 'rgba(239,83,80,0.07)';
        ctx.fillRect(pane.x, pane.y, pane.width, y70 - pane.y);
        ctx.fillStyle = 'rgba(38,166,154,0.07)';
        ctx.fillRect(pane.x, y30, pane.width, pane.y + pane.height - y30);
        [70, 30].forEach(level => {
            const y = valToY(level, min, max, pane.y, pane.height);
            ctx.strokeStyle = LW_THEME.crosshair.color;
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(pane.x, y);
            ctx.lineTo(pane.x + pane.width, y);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = LW_THEME.textColor;
            ctx.font = `${LW_THEME.fontSize - 1}px ${LW_THEME.fontFamily}`;
            ctx.textAlign = 'right';
            ctx.fillText(String(level), pane.x + pane.width - 2, y - 2);
        });
        drawLine(ctx, rsi, min, max, pane, '#9C27B0');
    }
    else {
        // Generic: draw all numeric arrays as lines
        const colors = ['#2196f3', '#FF6D00', '#9C27B0', '#4CAF50'];
        const arrays = Object.entries(d)
            .filter(([k]) => !['indicator', 'instId', 'ts'].includes(k))
            .map(([, v]) => v.map(Number));
        const allVals = arrays.flat();
        if (allVals.length > 0) {
            const min = Math.min(...allVals), max = Math.max(...allVals);
            arrays.forEach((arr, i) => drawLine(ctx, arr, min, max, pane, colors[i % colors.length]));
        }
    }
    // Title
    ctx.fillStyle = LW_THEME.textColor;
    ctx.font = `bold ${LW_THEME.fontSize}px ${LW_THEME.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`${d.instId}  ${ind}`, pane.x + 4, LW_THEME.padding.top);
    // Scale border
    ctx.strokeStyle = LW_THEME.scale.borderColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pane.x + pane.width, pane.y);
    ctx.lineTo(pane.x + pane.width, pane.y + pane.height);
    ctx.stroke();
    return { png: await encode(), width: W, height: H };
}
//# sourceMappingURL=indicator.js.map