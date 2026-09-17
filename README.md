# Syllab for NTU Learn

Formal MVP engineering workspace for Syllab v0.1.0. The Chrome extension and the lightweight
AI proxy backend are separate workspaces and share only versioned API contracts.

Working in here as an agent? Read `AGENTS.md` first — it is the shared instruction file for this
repository.

## Development

Requires Node.js 22 or newer.

```bash
npm install
npm run ci
```

Build outputs:

- `extension/dist/` — load this directory as an unpacked Manifest V3 extension.
- `backend/dist/server.js` — start with `npm run start -w @syllab/backend` after building.

The backend reads `DEEPSEEK_API_KEY` only through its server-side secret boundary, and the key is
supplied from the environment by whoever starts it.

v0.1.0 has passed its final acceptance. The runtime path runs end to end — discovery and fetch,
parsing, normalization, extraction, Review, then the confirmed Course Brief — and the extension can
export the Brief to a calendar. See `docs/final-acceptance-v0.1.0.md` for the acceptance record, the
known risks and the product feedback the next version has to answer.
