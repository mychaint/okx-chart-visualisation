#!/usr/bin/env node
// PostToolUse hook for Claude Code
// Receives JSON via stdin, writes JSON via stdout

const chunks = []
process.stdin.resume()
process.stdin.on('data', d => chunks.push(d))
process.stdin.on('end', async () => {
  const raw   = Buffer.concat(chunks).toString('utf8')
  const event = JSON.parse(raw)

  // Strip MCP server prefix: "mcp__okx-trade-mcp__market_get_candles" → "market_get_candles"
  const toolName = event.tool_name?.replace(/^mcp__[^_]+__/, '') ?? ''

  const { renderChart, TOOL_CHART_MAP } = await import('@chart-viz/core')

  const chartType = TOOL_CHART_MAP[toolName]
  if (!chartType) {
    process.stdout.write(JSON.stringify({}))
    process.exit(0)
  }

  const textContent = event.tool_response?.content?.find(c => c.type === 'text')?.text ?? '{}'
  let data
  try { data = JSON.parse(textContent) } catch { data = {} }

  const req = {
    chartType,
    toolName,
    data,
    params: {
      instId: event.tool_input?.instId ?? event.tool_input?.instrument_id,
      bar:    event.tool_input?.bar,
      ...event.tool_input,
    },
  }

  try {
    const result  = await renderChart(req)
    const base64  = result.png.toString('base64')
    const output  = {
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        updatedMCPToolOutput: [
          { type: 'text',  text: textContent },
          { type: 'image', data: base64, mimeType: 'image/png' },
        ],
      },
    }
    process.stdout.write(JSON.stringify(output))
  } catch (err) {
    // On render error, pass through original content unchanged
    process.stdout.write(JSON.stringify({}))
  }

  process.exit(0)
})
