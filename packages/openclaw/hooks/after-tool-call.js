#!/usr/bin/env node
// after_tool_call Plugin SDK hook for OpenClaw

const chunks = []
process.stdin.resume()
process.stdin.on('data', d => chunks.push(d))
process.stdin.on('end', async () => {
  const raw   = Buffer.concat(chunks).toString('utf8')
  const event = JSON.parse(raw)

  const toolName = event.tool?.name ?? ''

  const { renderChart, TOOL_CHART_MAP } = await import('@chart-viz/core')

  const chartType = TOOL_CHART_MAP[toolName]
  if (!chartType) {
    process.stdout.write(JSON.stringify({}))
    process.exit(0)
  }

  const textContent = event.tool?.output?.text ?? '{}'
  let data
  try { data = JSON.parse(textContent) } catch { data = {} }

  const req = {
    chartType,
    toolName,
    data,
    params: {
      instId: event.tool?.input?.instId,
      bar:    event.tool?.input?.bar,
      ...event.tool?.input,
    },
  }

  try {
    const result = await renderChart(req)
    const base64 = result.png.toString('base64')
    const output = {
      action: 'replace_output',
      content: [
        { type: 'text',  text: textContent },
        { type: 'image', data: base64, mimeType: 'image/png' },
      ],
    }
    process.stdout.write(JSON.stringify(output))
  } catch {
    process.stdout.write(JSON.stringify({}))
  }

  process.exit(0)
})
