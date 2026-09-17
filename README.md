# Syllab for NTU Learn

Formal MVP engineering workspace for Syllab v0.1.0. The Chrome extension and the lightweight
AI proxy backend are separate workspaces and share only versioned API contracts.

## Development

Requires Node.js 22 or newer.

```bash
npm install
npm run ci
```

Build outputs:

- `extension/dist/` — load this directory as an unpacked Manifest V3 extension.
- `backend/dist/server.js` — start with `npm run start -w @syllab/backend` after building.

The backend reads `DEEPSEEK_API_KEY` only through its server-side secret boundary. Phase 1 does
not call DeepSeek or implement the extraction pipeline.

See `docs/phase-1-acceptance.md` for the current phase evidence and remaining manual gate.
