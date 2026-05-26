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

// IMPORTANT (Vercel/serverless): mcp-use mounts /mcp, /.well-known/*, widgets, and inspector
// ONLY when you call server.listen() OR server.getHandler().
// In Vercel we don't call listen(), so we must call getHandler() once at cold start
// to mount routes onto server.app before requests arrive.
import { server } from "../index";

export const config = {
  runtime: "nodejs",
  // MCP responses can stream; 60s covers the longest realistic tool invocation.
  maxDuration: 60
};

// On Vercel we want the production/serverless mounting path.
// NOTE: mcp-use uses NODE_ENV to decide dev vs prod widget mounting.
// mcp-use types don't currently include a "vercel" provider string.
// Calling getHandler() with no provider still mounts the correct routes.
const prepare = server.getHandler();
const baseHandler = handle(server.app);

// hono/vercel's handle() returns a Fetch-style handler (Request -> Response)
export default async function vercelHandler(req: Request) {
  await prepare;
  return baseHandler(req);
}
