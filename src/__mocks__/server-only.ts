// Vitest-only shim for the `server-only` package.
// Real `server-only` throws at import time from anywhere except React server
// components, which makes testing server-side modules impossible. In tests we
// alias this shim in its place (see vitest.config.ts).
export {};
