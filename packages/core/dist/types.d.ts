export type ChartType = 'kline' | 'indicator' | 'orderbook' | 'open-interest' | 'funding-rate' | 'trades-heatmap' | 'ticker-card' | 'pnl';
export interface ChartRequest {
    chartType: ChartType;
    toolName: string;
    data: unknown;
    params: {
        instId?: string;
        bar?: string;
        [key: string]: unknown;
    };
}
export interface ChartResponse {
    png: Buffer;
    width: number;
    height: number;
}
export type OkxCandleRow = [string, string, string, string, string, string, ...string[]];
export interface OkxApiResponse<T> {
    code: string;
    msg: string;
    data: T;
}
//# sourceMappingURL=types.d.ts.map