# Contributing

## Getting Started

```bash
git clone https://github.com/mychaint/okx-chart-visualisation.git
cd okx-chart-visualisation
pnpm install
pnpm build
pnpm test
```

## Project Structure

- `packages/core/src/charts/` — one file per chart type
- `packages/core/src/renderer/` — canvas wrapper, theme constants, layout engine
- `packages/claude-code/hooks/` — Claude Code PostToolUse hook script

## Adding a New Chart Type

1. Add the type to `ChartType` in `packages/core/src/types.ts`
2. Create `packages/core/src/charts/<your-chart>.ts` exporting a `render<Name>(req: ChartRequest): Promise<ChartResponse>` function
3. Add the case to `packages/core/src/charts/route.ts`
4. Add the tool → chart mapping to `TOOL_CHART_MAP` in `packages/core/src/index.ts`
5. Write tests in `packages/core/src/charts/__tests__/<your-chart>.test.ts`

## Running Tests

```bash
pnpm test
```

## Submitting a Pull Request

1. Fork the repository and create a branch from `main`
2. Make your changes with tests
3. Ensure all tests pass: `pnpm test`
4. Ensure the TypeScript build is clean: `pnpm build`
5. Submit a pull request — the template will guide you through the description

## Reporting Issues

Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md) and include a hook stdin/stdout transcript where possible.
