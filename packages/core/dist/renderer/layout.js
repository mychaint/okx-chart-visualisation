import { LW_THEME } from './theme.js';
export function computeLayout(width, height, panes) {
    const priceAxisWidth = LW_THEME.padding.right;
    const timeAxisHeight = LW_THEME.padding.bottom;
    const leftPadding = LW_THEME.padding.left;
    const topPadding = LW_THEME.padding.top;
    const separatorHeight = LW_THEME.pane.separatorHeight;
    const chartAreaWidth = width - leftPadding - priceAxisWidth;
    const chartAreaHeight = height - topPadding - timeAxisHeight
        - separatorHeight * (panes.length - 1);
    const bounds = [];
    let y = topPadding;
    let allocatedHeight = 0;
    for (let i = 0; i < panes.length; i++) {
        const isLast = i === panes.length - 1;
        const h = isLast
            ? chartAreaHeight - allocatedHeight
            : Math.floor(chartAreaHeight * panes[i].heightRatio);
        allocatedHeight += h;
        bounds.push({ x: leftPadding, y, width: chartAreaWidth, height: h });
        y += h + separatorHeight;
    }
    return {
        panes: bounds,
        priceAxisWidth,
        timeAxisHeight,
        leftPadding,
        topPadding,
        separatorHeight,
        totalWidth: width,
        totalHeight: height,
    };
}
//# sourceMappingURL=layout.js.map