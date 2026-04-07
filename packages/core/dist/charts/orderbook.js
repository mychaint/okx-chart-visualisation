import { createChartCanvas } from '../renderer/canvas.js';
import { LW_THEME } from '../renderer/theme.js';
import { computeLayout } from '../renderer/layout.js';
export async function renderOrderbook(req) {
    const W = 800, H = 350;
    const book = req.data?.data?.[0];
    if (!book)
        throw new Error('No orderbook data');
    const bids = [...book.bids].map(r => ({ price: Number(r[0]), size: Number(r[1]) }))
        .sort((a, b) => b.price - a.price);
    const asks = [...book.asks].map(r => ({ price: Number(r[0]), size: Number(r[1]) }))
        .sort((a, b) => a.price - b.price);
    // Cumulative sizes
    const cumBids = [];
    const cumAsks = [];
    let acc = 0;
    for (const b of bids) {
        acc += b.size;
        cumBids.push({ price: b.price, size: acc });
    }
    acc = 0;
    for (const a of asks) {
        acc += a.size;
        cumAsks.push({ price: a.price, size: acc });
    }
    const allLevels = [...cumBids, ...cumAsks];
    const minPrice = Math.min(...allLevels.map(l => l.price));
    const maxPrice = Math.max(...allLevels.map(l => l.price));
    const maxSize = Math.max(...allLevels.map(l => l.size));
    const layout = computeLayout(W, H, [{ heightRatio: 1 }]);
    const pane = layout.panes[0];
    const { ctx, encode } = createChartCanvas(W, H);
    ctx.fillStyle = LW_THEME.background;
    ctx.fillRect(0, 0, W, H);
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
    const priceToX = (p) => pane.x + ((p - minPrice) / (maxPrice - minPrice)) * pane.width;
    const sizeToY = (s) => pane.y + pane.height - (s / maxSize) * pane.height;
    // Bid area (green)
    ctx.fillStyle = 'rgba(38,166,154,0.25)';
    ctx.beginPath();
    ctx.moveTo(priceToX(cumBids[0].price), pane.y + pane.height);
    for (const l of cumBids)
        ctx.lineTo(priceToX(l.price), sizeToY(l.size));
    ctx.lineTo(priceToX(cumBids[cumBids.length - 1].price), pane.y + pane.height);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = LW_THEME.candle.upColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    cumBids.forEach((l, i) => i === 0 ? ctx.moveTo(priceToX(l.price), sizeToY(l.size)) : ctx.lineTo(priceToX(l.price), sizeToY(l.size)));
    ctx.stroke();
    // Ask area (red)
    ctx.fillStyle = 'rgba(239,83,80,0.25)';
    ctx.beginPath();
    ctx.moveTo(priceToX(cumAsks[0].price), pane.y + pane.height);
    for (const l of cumAsks)
        ctx.lineTo(priceToX(l.price), sizeToY(l.size));
    ctx.lineTo(priceToX(cumAsks[cumAsks.length - 1].price), pane.y + pane.height);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = LW_THEME.candle.downColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    cumAsks.forEach((l, i) => i === 0 ? ctx.moveTo(priceToX(l.price), sizeToY(l.size)) : ctx.lineTo(priceToX(l.price), sizeToY(l.size)));
    ctx.stroke();
    // Mid price line
    const midPrice = (bids[0].price + asks[0].price) / 2;
    const midX = priceToX(midPrice);
    ctx.strokeStyle = LW_THEME.crosshair.color;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(midX, pane.y);
    ctx.lineTo(midX, pane.y + pane.height);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = LW_THEME.textColor;
    ctx.font = `bold ${LW_THEME.fontSize + 1}px ${LW_THEME.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`${req.params.instId ?? ''}  Order Book Depth`, pane.x + 4, LW_THEME.padding.top);
    ctx.strokeStyle = LW_THEME.scale.borderColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pane.x + pane.width, pane.y);
    ctx.lineTo(pane.x + pane.width, pane.y + pane.height);
    ctx.stroke();
    return { png: await encode(), width: W, height: H };
}
//# sourceMappingURL=orderbook.js.map