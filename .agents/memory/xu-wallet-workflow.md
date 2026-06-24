---
name: XU Wallet workflow
description: How to run the XU Wallet Expo app in the Replit workspace.
---

# XU Wallet Workflow

**Why:** `npx expo` tries to interactively install expo — must use the local binary.

## Command
```
cd xu-wallet && EXPO_NO_TELEMETRY=1 ./node_modules/.bin/expo start --web --port 3000
```

## How to apply
- The workflow is named "XU Wallet" and configured via configureWorkflow.
- The `xu-wallet/` directory is in `pnpm-workspace.yaml` (not `artifacts/`), so it is a workspace package but NOT a registered Replit artifact — it won't appear in the preview dropdown automatically.
- Dependencies must be installed from the workspace root: `pnpm install --no-frozen-lockfile` (xu-wallet has its own deps that aren't in the workspace catalog).
- The devtools error (`libglib-2.0.so.0`) is non-fatal — Metro bundler still runs.
- Peer dependency warnings (react-native, @types/react versions) are pre-existing and non-fatal.
