// Vercel Sandbox adapter
//
// Wraps @vercel/sandbox with credential probing, an in-memory registry of
// sandboxes spawned in this server's lifetime, and command-history capture
// for the sandbox-console widget. The portfolio MCP tools degrade gracefully
// when VERCEL_TOKEN / VERCEL_TEAM_ID / VERCEL_PROJECT_ID are absent: every
// sandbox_* tool returns a `notConfigured` envelope rather than throwing,
// so the universal portfolio surface stays intact even without credentials.

import { Sandbox } from "@vercel/sandbox";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// ─────────────────────────────────────────────────────────────────────────────
// .env fallback (matches the pattern proven in the prior graph adapter)
// ─────────────────────────────────────────────────────────────────────────────

function loadDotenv(): Record<string, string> {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return {};
  try {
    const raw = readFileSync(envPath, "utf8");
    const out: Record<string, string> = {};
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const k = trimmed.slice(0, eq).trim();
      let v = trimmed.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

function getEnv(key: string): string | undefined {
  const fromProcess = process.env[key];
  if (fromProcess && fromProcess.length > 0) return fromProcess;
  const fromFile = loadDotenv()[key];
  return fromFile && fromFile.length > 0 ? fromFile : undefined;
}

export function sandboxCredentials(): {
  token: string;
  teamId: string;
  projectId: string;
} | null {
  const token = getEnv("VERCEL_TOKEN");
  const teamId = getEnv("VERCEL_TEAM_ID");
  const projectId = getEnv("VERCEL_PROJECT_ID");
  if (!token || !teamId || !projectId) return null;
  return { token, teamId, projectId };
}

export function sandboxConfigured(): boolean {
  return sandboxCredentials() !== null;
}

// ─────────────────────────────────────────────────────────────────────────────
// In-memory registry — tracks sandboxes spawned by this server process
// ─────────────────────────────────────────────────────────────────────────────

export interface CommandHistoryEntry {
  id: string;
  command: string;
  args: string[];
  stdout: string;
  stderr: string;
  exitCode: number | null;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
}

export interface SandboxRecord {
  id: string;
  createdAt: string;
  runtime?: string;
  source?: string;
  ports: number[];
  status: "running" | "stopped" | "error";
  lastError?: string;
  history: CommandHistoryEntry[];
  // Held in memory only; not serialised. Re-resolved via Sandbox.get when needed.
  handle: Sandbox;
}

// Use globalThis so the registry survives HMR module reloads AND avoids the
// divergence-bug where two cached module instances each captured their own
// Map closure. Every consumer must call getReg() — never a closure-scoped
// `registry` const — otherwise lookups silently miss sandboxes that other
// module instances created.
const REGISTRY_KEY = "__portfolioMcpSandboxRegistry__";

function getReg(): Map<string, SandboxRecord> {
  const g = globalThis as Record<string, unknown>;
  const existing = g[REGISTRY_KEY];
  if (existing instanceof Map) return existing as Map<string, SandboxRecord>;
  const fresh = new Map<string, SandboxRecord>();
  g[REGISTRY_KEY] = fresh;
  return fresh;
}

export function registrySnapshot(): Omit<SandboxRecord, "handle">[] {
  return [...getReg().values()].map(({ handle: _handle, ...rest }) => ({
    ...rest,
    // Trim history to last 10 entries per sandbox for list views.
    history: rest.history.slice(-10),
  }));
}

export function registryGet(id: string): SandboxRecord | undefined {
  return getReg().get(id);
}

export function registryAll(): SandboxRecord[] {
  return [...getReg().values()];
}

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle helpers (every one is credential-aware)
// ─────────────────────────────────────────────────────────────────────────────

export type SandboxResult<T> =
  | { ok: true; data: T; tookMs: number }
  | { ok: false; reason: string; notConfigured?: boolean; tookMs: number };

function notConfigured<T>(): SandboxResult<T> {
  return {
    ok: false,
    reason:
      "Vercel Sandbox is not configured. Set VERCEL_TOKEN, VERCEL_TEAM_ID, and VERCEL_PROJECT_ID env vars (Vercel dashboard → Settings → Tokens).",
    notConfigured: true,
    tookMs: 0,
  };
}

export interface CreateSandboxInput {
  name?: string;
  runtime?: string;
  source?:
    | { type: "git"; url: string; revision?: string }
    | { type: "tarball"; url: string };
  ports?: number[];
  timeoutMs?: number;
  vcpus?: number;
}

export async function createSandbox(
  input: CreateSandboxInput
): Promise<SandboxResult<Omit<SandboxRecord, "handle">>> {
  const creds = sandboxCredentials();
  if (!creds) return notConfigured();
  const started = Date.now();
  try {
    const sandbox = await Sandbox.create({
      token: creds.token,
      teamId: creds.teamId,
      projectId: creds.projectId,
      name: input.name,
      runtime: input.runtime,
      source: input.source,
      ports: input.ports,
      timeout: input.timeoutMs,
      resources: input.vcpus ? { vcpus: input.vcpus } : undefined,
    });
    const record: SandboxRecord = {
      id: sandbox.name,
      createdAt: new Date().toISOString(),
      runtime: input.runtime,
      source: input.source ? `${input.source.type}:${(input.source as { url: string }).url}` : undefined,
      ports: input.ports ?? [],
      status: "running",
      history: [],
      handle: sandbox,
    };
    getReg().set(record.id, record);
    const { handle: _h, ...safe } = record;
    return { ok: true, data: safe, tookMs: Date.now() - started };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : String(err),
      tookMs: Date.now() - started,
    };
  }
}

export async function runInSandbox(
  sandboxId: string,
  command: string,
  args: string[]
): Promise<SandboxResult<CommandHistoryEntry>> {
  if (!sandboxConfigured()) return notConfigured();
  const started = Date.now();
  const record = getReg().get(sandboxId);
  if (!record) {
    return {
      ok: false,
      reason: `Unknown sandbox ${sandboxId}. Use sandbox_create or sandbox_list.`,
      tookMs: 0,
    };
  }
  try {
    const result = await record.handle.runCommand(command, args);
    const finishedAt = Date.now();
    const stdoutStr = await result.stdout();
    const stderrStr = await result.stderr();
    const entry: CommandHistoryEntry = {
      id: `cmd-${started}-${Math.random().toString(36).slice(2, 8)}`,
      command,
      args,
      stdout: stdoutStr.slice(0, 8192),
      stderr: stderrStr.slice(0, 8192),
      exitCode: result.exitCode ?? null,
      startedAt: new Date(started).toISOString(),
      finishedAt: new Date(finishedAt).toISOString(),
      durationMs: finishedAt - started,
    };
    record.history.push(entry);
    if (record.history.length > 50) record.history.shift();
    return { ok: true, data: entry, tookMs: finishedAt - started };
  } catch (err) {
    record.status = "error";
    record.lastError = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      reason: record.lastError,
      tookMs: Date.now() - started,
    };
  }
}

export async function writeSandboxFiles(
  sandboxId: string,
  files: { path: string; content: string; mode?: number }[]
): Promise<SandboxResult<{ written: number; paths: string[] }>> {
  if (!sandboxConfigured()) return notConfigured();
  const started = Date.now();
  const record = getReg().get(sandboxId);
  if (!record) {
    return {
      ok: false,
      reason: `Unknown sandbox ${sandboxId}.`,
      tookMs: 0,
    };
  }
  try {
    await record.handle.writeFiles(files);
    return {
      ok: true,
      data: { written: files.length, paths: files.map((f) => f.path) },
      tookMs: Date.now() - started,
    };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : String(err),
      tookMs: Date.now() - started,
    };
  }
}

export async function stopSandbox(
  sandboxId: string
): Promise<SandboxResult<{ id: string; status: string }>> {
  if (!sandboxConfigured()) return notConfigured();
  const started = Date.now();
  const reg = getReg();
  const allKeys = [...reg.keys()];
  const sizeNow = reg.size;
  const record = reg.get(sandboxId);
  if (!record) {
    return {
      ok: false,
      reason: `STOPv6: registry has ${sizeNow} entries [${allKeys.join(", ") || "none"}] but no key matches "${sandboxId}"`,
      tookMs: 0,
    };
  }
  try {
    await record.handle.stop();
    record.status = "stopped";
    return {
      ok: true,
      data: { id: sandboxId, status: "stopped" },
      tookMs: Date.now() - started,
    };
  } catch (err) {
    record.status = "error";
    record.lastError = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      reason: record.lastError,
      tookMs: Date.now() - started,
    };
  }
}

export function getSandboxDomain(sandboxId: string, port: number): string | null {
  const record = getReg().get(sandboxId);
  if (!record) return null;
  try {
    return record.handle.domain(port);
  } catch {
    return null;
  }
}
