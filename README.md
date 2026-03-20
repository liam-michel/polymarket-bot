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
