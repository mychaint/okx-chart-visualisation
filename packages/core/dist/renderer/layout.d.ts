export interface PaneConfig {
    heightRatio: number;
    label?: string;
}
export interface PaneBounds {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface LayoutResult {
    panes: PaneBounds[];
    priceAxisWidth: number;
    timeAxisHeight: number;
    leftPadding: number;
    topPadding: number;
    separatorHeight: number;
    totalWidth: number;
    totalHeight: number;
}
export declare function computeLayout(width: number, height: number, panes: PaneConfig[]): LayoutResult;
//# sourceMappingURL=layout.d.ts.map