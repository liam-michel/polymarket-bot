# polymarket-bot — Bun + TypeScript backend

Quick start (Bun):

Install dependencies (dev deps listed in `package.json`):

```bash
bun install
```

Install the dev dependencies listed in `package.json` (if you prefer explicit install):

```bash
bun add -d typescript oxlint oxfmt @types/node
```

Run the app:

```bash
bun run src/index.ts
```

Or use the npm scripts in `package.json`:

```bash
bun run dev
# or
bun run start
```

Lint and format:

```bash
bun run lint
bun run format
bun run format:check
```

CLI examples:

```bash
bun run startcli -- markets list-markets
bun run startcli -- markets get <conditionId>
bun run startcli -- markets import <conditionId>
bun run startcli -- signal create <wallet> <conditionId> <side> <outcomeIndex> <price> <confidence>
bun run startcli -- signal list
bun run startcli -- signal get <id>
bun run startcli -- signal mark-executed <id>
bun run startcli -- watchlist list
bun run startcli -- watchlist add <wallet> "high signal trader" 1.25
bun run startcli -- watchlist remove <wallet>
```
