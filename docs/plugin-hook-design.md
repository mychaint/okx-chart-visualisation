# Plugin Hook System Design

**Date:** 2026-04-08  
**Status:** Proposal  
**Target:** `@okx_ai/okx-trade-cli`

---

## Overview

A lightweight hook system that allows third-party plugins to intercept tool call results from `@okx_ai/okx-trade-cli`. The CLI emits a `PostToolUse` event after each tool function returns; plugins register handlers against these events to extend behavior without modifying the CLI source.

**Design goals:**
- Zero overhead when no plugins are registered
- No changes to existing tool function signatures
- Plugins are isolated — one plugin crashing does not affect others or the CLI
- Works with global npm installs (no symlinks, no monorepo required)

---

## Architecture

```
CLI startup
  │
  ├─ read ~/.okx/config.toml → plugins = ["okx-chart-visualisation"]
  ├─ import('okx-chart-visualisation')
  └─ plugin.register(hookRegistry)
            │
            ▼
     hookRegistry.on('market_get_candles', handler)

CLI executes tool
  │
  ├─ result = await api.getCandles(params)
  └─ hookRegistry.emit('market_get_candles', { toolName, params, result })
            │
            ▼
     plugin handler fires → renderChart() → PNG output
```

---

## okx-trade-cli Changes Required

### 1. HookRegistry (`src/hooks.ts`)

```typescript
export interface PostHookContext {
  toolName: string    // e.g. 'market_get_candles'
  params:   unknown   // original call parameters
  result:   unknown   // raw API response
}

type PostHook = (ctx: PostHookContext) => Promise<void>

export class HookRegistry {
  private hooks = new Map<string, PostHook[]>()

  on(toolName: string | '*', hook: PostHook): void {
    const list = this.hooks.get(toolName) ?? []
    this.hooks.set(toolName, [...list, hook])
  }

  async emit(toolName: string, ctx: PostHookContext): Promise<void> {
    const handlers = [
      ...(this.hooks.get('*')        ?? []),
      ...(this.hooks.get(toolName)   ?? []),
    ]
    for (const handler of handlers) {
      try {
        await handler(ctx)
      } catch (err) {
        // plugin errors must not crash the CLI
        console.error(`[plugin hook error] ${toolName}:`, err)
      }
    }
  }
}

// module-level singleton — shared across all imports in the same process
export const hookRegistry = new HookRegistry()
```

### 2. Public export (`src/index.ts`)

```typescript
export { hookRegistry } from './hooks.js'
export type { HookRegistry, PostHookContext } from './hooks.js'
```

### 3. Emit after each tool call

```typescript
// before
async function marketGetCandles(params: CandleParams) {
  return await api.getCandles(params)
}

// after
async function marketGetCandles(params: CandleParams) {
  const result = await api.getCandles(params)
  await hookRegistry.emit('market_get_candles', { toolName: 'market_get_candles', params, result })
  return result
}
```

Tool names follow the existing MCP tool naming convention (no prefix):

| Tool function | Emit event name |
|---|---|
| `marketGetCandles` | `market_get_candles` |
| `marketGetOrderbook` | `market_get_orderbook` |
| `marketGetTicker` | `market_get_ticker` |
| `accountGetPositions` | `account_get_positions` |
| *(all tools)* | `*` (wildcard) |

### 4. Plugin loader (`src/bootstrap.ts`)

Runs once at CLI startup before any command is executed.

```typescript
import { hookRegistry } from './hooks.js'

export async function loadPlugins(pluginIds: string[]): Promise<void> {
  for (const id of pluginIds) {
    try {
      const mod = await import(id)
      await mod.default?.register(hookRegistry)
    } catch (err) {
      console.error(`[plugin load error] ${id}:`, err)
      // continue loading remaining plugins
    }
  }
}
```

### 5. Config (`~/.okx/config.toml`)

```toml
[default]
plugins = ["okx-chart-visualisation"]
```

---

## Plugin Contract

A plugin is any npm package that exports a default object with a `register` function:

```typescript
import type { HookRegistry } from '@okx_ai/okx-trade-cli'

export default {
  register(hooks: HookRegistry): void | Promise<void> {
    hooks.on('market_get_candles', async ({ params, result }) => {
      // handle result
    })
  }
}
```

Rules:
- `register` is called once at CLI startup
- `register` must not throw — wrap internal errors
- Handlers registered with `'*'` receive every tool event
- Handlers must not mutate `ctx.result` (read-only)

---

## Plugin Installation

### `postinstall` — auto-register in config.toml

```typescript
// src/postinstall.ts
import { execSync } from 'child_process'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { satisfies } from 'semver'

const PLUGIN_NAME  = 'okx-chart-visualisation'
const PEER_PKG     = '@okx_ai/okx-trade-cli'
const PEER_REQUIRE = '>=1.3.0'

// --- step 1: verify peer dependency ---

function getInstalledVersion(pkg: string): string | null {
  try {
    const out = execSync(`npm list -g ${pkg} --json`, { encoding: 'utf8' })
    return JSON.parse(out).dependencies?.[pkg]?.version ?? null
  } catch {
    return null
  }
}

const version = getInstalledVersion(PEER_PKG)

if (!version) {
  console.error(`
✗ Missing peer dependency: ${PEER_PKG}

  Install it first:
    npm install -g ${PEER_PKG}

  Then reinstall this plugin:
    npm install -g ${PLUGIN_NAME}
`)
  process.exit(1)
}

if (!satisfies(version, PEER_REQUIRE)) {
  console.error(`
✗ ${PEER_PKG}@${version} is too old (requires ${PEER_REQUIRE})

  Update it:
    npm install -g ${PEER_PKG}@latest

  Then reinstall this plugin:
    npm install -g ${PLUGIN_NAME}
`)
  process.exit(1)
}

console.log(`✓ ${PEER_PKG}@${version}`)

// --- step 2: write config.toml ---

const configPath = join(homedir(), '.okx', 'config.toml')

if (!existsSync(configPath)) {
  console.warn(`  config not found at ${configPath}, skipping auto-register`)
  process.exit(0)
}

const content = readFileSync(configPath, 'utf8')

if (content.includes(PLUGIN_NAME)) {
  console.log(`✓ Already registered in ${configPath}`)
  process.exit(0)
}

let updated: string

if (/^plugins\s*=/m.test(content)) {
  // append to existing plugins array
  updated = content.replace(
    /^(plugins\s*=\s*\[)([^\]]*)\]/m,
    (_, open, existing) => {
      const items = existing.split(',').map((s: string) => s.trim()).filter(Boolean)
      items.push(`"${PLUGIN_NAME}"`)
      return `${open}${items.join(', ')}]`
    }
  )
} else {
  // add plugins line under [default] section
  updated = content.replace(
    /(\[default\][^\[]*)/s,
    `$1plugins = ["${PLUGIN_NAME}"]\n`
  )
}

writeFileSync(configPath, updated)
console.log(`✓ Registered ${PLUGIN_NAME} in ${configPath}`)
```

### `preuninstall` — clean up on removal

```typescript
// src/preuninstall.ts
const updated = content
  .replace(new RegExp(`,?\\s*"${PLUGIN_NAME}"|"${PLUGIN_NAME}"\\s*,?`, 'g'), '')
  .replace(/^plugins\s*=\s*\[\s*\]\n?/m, '')   // remove empty plugins line

writeFileSync(configPath, updated)
console.log(`✓ Unregistered ${PLUGIN_NAME} from ${configPath}`)
```

---

## Runtime Version Check

`postinstall` runs once at install time. For long-lived environments where the peer may be downgraded later, `register()` repeats the check at runtime:

```typescript
// src/plugin.ts
import { createRequire } from 'module'
import { satisfies } from 'semver'
import type { HookRegistry } from '@okx_ai/okx-trade-cli'

const PEER_REQUIRE = '>=1.3.0'

export default {
  register(hooks: HookRegistry) {
    try {
      const req = createRequire(import.meta.url)
      const { version } = req('@okx_ai/okx-trade-cli/package.json')
      if (!satisfies(version, PEER_REQUIRE)) {
        console.warn(
          `[okx-chart-visualisation] skipped: requires @okx_ai/okx-trade-cli ${PEER_REQUIRE}, found ${version}`
        )
        return
      }
    } catch {
      console.warn('[okx-chart-visualisation] skipped: @okx_ai/okx-trade-cli not found')
      return
    }

    hooks.on('*', async ({ toolName, params, result }) => {
      // render chart
    })
  }
}
```

---

## End-to-End Install Experience

```bash
# 1. install CLI (if not already)
npm install -g @okx_ai/okx-trade-cli

# 2. install plugin
npm install -g okx-chart-visualisation
# ✓ @okx_ai/okx-trade-cli@1.3.0
# ✓ Registered okx-chart-visualisation in ~/.okx/config.toml

# 3. use normally — charts appear automatically
okx market candles BTC-USDT --bar 1D --limit 7
# → K-line chart rendered inline

# 4. uninstall cleanly
npm uninstall -g okx-chart-visualisation
# ✓ Unregistered okx-chart-visualisation from ~/.okx/config.toml
```

---

## Summary of Changes

| Side | Change |
|---|---|
| `@okx_ai/okx-trade-cli` | Add `HookRegistry`, export singleton, emit after each tool call, load plugins at startup |
| `okx-chart-visualisation` | Add `src/plugin.ts` with `register()`, add `postinstall`/`preuninstall` scripts, add `peerDependencies` |
