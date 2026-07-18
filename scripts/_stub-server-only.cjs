// Preloaded via `node -r` so standalone debug scripts can import server-only
// modules (lib/gemini.ts, lib/db/index.ts, etc.) outside Next's bundler,
// which is the only context that actually enforces the "server-only" guard.
/* eslint-disable @typescript-eslint/no-require-imports */
const Module = require("module");
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === "server-only") {
    return require.resolve("./_noop-server-only.cjs");
  }
  return originalResolve.call(this, request, ...rest);
};
