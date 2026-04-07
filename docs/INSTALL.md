# 安装指南

**okx-chart-visualisation** 是一个为 [OKX agent-trade-kit](https://github.com/okx/agent-trade-kit) 设计的 Claude Code 插件。当 OKX 市场工具返回数据时，插件自动渲染专业交易图表并作为图片附件注入对话。

---

## 前置条件

| 依赖 | 版本要求 | 说明 |
|------|---------|------|
| Node.js | ≥ 20 | 必须 |
| pnpm | ≥ 8 | 包管理器 |
| agent-trade-kit | 已安装并运行 | OKX MCP 服务器 |

安装 pnpm（若未安装）：

```bash
npm install -g pnpm
```

---

## 安装

### 方式一：Claude Code Plugin 系统（推荐）

```
/plugin marketplace add mychaint/okx-chart-visualisation
/plugin install chart-visualisation@okx-chart-visualisation
```

Claude Code 会自动注册 PostToolUse hook，无需手动编辑任何配置文件。

### 方式二：手动注册 Hook

将以下配置合并到 `~/.claude/settings.json`：

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "mcp__okx-trade-mcp__(market_get_candles|market_get_index_candles|market_get_indicator|market_get_open_interest|market_get_funding_rate|market_get_orderbook|market_get_trades|market_get_ticker|market_get_tickers|account_get_positions)",
        "hooks": [
          {
            "type": "command",
            "command": "node \"/absolute/path/to/okx-chart-visualisation/packages/claude-code/hooks/post-tool-use.js\""
          }
        ]
      }
    ]
  }
}
```

将 `/absolute/path/to/okx-chart-visualisation` 替换为实际绝对路径。

---

## 验证安装

在 Claude Code 中向 agent-trade-kit 发起一条市场查询，例如：

> "查一下 BTC-USDT 最近30根1小时K线"

对话中会同时显示 JSON 数据和 K 线图片。

也可以手动测试 hook 脚本：

```bash
echo '{
  "tool_name": "mcp__okx-trade-mcp__market_get_ticker",
  "tool_input": { "instId": "BTC-USDT" },
  "tool_response": {
    "content": [{
      "type": "text",
      "text": "[{\"instId\":\"BTC-USDT\",\"last\":\"65000\",\"bidPx\":\"64999\",\"askPx\":\"65001\",\"open24h\":\"63000\",\"high24h\":\"66000\",\"low24h\":\"62500\",\"vol24h\":\"12345\"}]"
    }]
  },
  "session_id": "test"
}' | node packages/claude-code/hooks/post-tool-use.js
```

正常输出应包含 `updatedMCPToolOutput`，其中有 `type: "image"` 的 base64 数据块。

---

## 支持的图表

| 触发工具 | 渲染图表 | 尺寸 |
|---------|---------|------|
| `market_get_candles` / `market_get_index_candles` | K 线 + 成交量 | 800×400 |
| `market_get_indicator` | MACD / RSI / MA / BB / KDJ | 800×300 |
| `market_get_orderbook` | 订单簿深度图 | 800×350 |
| `market_get_open_interest` | 持仓量趋势 | 800×300 |
| `market_get_funding_rate` | 资金费率柱状图 | 800×300 |
| `market_get_trades` | 交易量热力图 | 800×350 |
| `market_get_ticker` / `market_get_tickers` | 价格摘要卡片 | 500×200 |
| `account_get_positions` | 仓位盈亏比 | 800×300 |

---

## 常见问题

**Q: hook 脚本静默退出，没有图片输出**

检查 node 版本是否 ≥ 18：`node --version`

检查 `packages/core/dist/` 是否存在：
```bash
ls packages/core/dist/index.js
```
如不存在，运行 `pnpm build`。

**Q: `@napi-rs/canvas` 安装失败（native binding 错误）**

该包含有平台原生绑定。确保系统已安装 build tools：
- macOS：`xcode-select --install`
- Linux：`apt-get install build-essential`

然后重新安装：`pnpm install`

**Q: Claude Code 没有触发 hook**

使用插件安装方式时，确认 `/plugin marketplace add` 和 `/plugin install` 均成功执行。

使用手动方式时，确认 `settings.json` 中的路径是绝对路径（不含 `~`），且 agent-trade-kit MCP server 名称为 `okx-trade-mcp`。
