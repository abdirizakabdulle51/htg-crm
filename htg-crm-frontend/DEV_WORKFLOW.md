# Developer Workflow

Next.js dev builds can keep stale `.next` chunks after commits or production builds.
When that happens, pages may render raw or get stuck on loading states, and the
terminal can show errors like `Cannot find module './682.js'`.

Before running a production build, stop the dev server first.

After Codex changes, start local development with:

```cmd
npm run dev:clean
```

For verification builds, use:

```cmd
npm run build:clean
```

Both commands remove `.next` before starting so stale chunks do not leak into the
next dev or build run.
