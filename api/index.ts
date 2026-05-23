/**
 * Vercel serverless entry for portfolio-mcp-ui.
 *
 * `mcp-use` is built on Hono, so `server.app` is a standard Hono instance.
 * `hono/vercel`'s `handle()` adapts it to Vercel's Node runtime — every
 * incoming request is dispatched through the full Hono middleware chain
 * including the MCP transport mounted at `/mcp`, widget asset routes, and
 * `.well-known/*` discovery endpoints.
 *
 * vercel.json rewrites every path to `/api`, so this single function serves
 * the entire MCP surface with no path-specific routing config.
 */
import { handle } from "hono/vercel";
import { app } from "../index.js";

export const config = {
  runtime: "nodejs",
  // MCP responses can stream; 60s covers the longest realistic tool invocation
  // including ones that emit progress notifications.
  maxDuration: 60,
};

export default handle(app);
