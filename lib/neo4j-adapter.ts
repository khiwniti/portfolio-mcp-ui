/**
 * Neo4j Knowledge Graph adapter for the portfolio MCP server.
 *
 * Connection is lazy + cached. Failures are returned as `{ ok: false, reason }`
 * rather than thrown — every KG tool can then degrade gracefully and the
 * fixture-backed tools remain unaffected.
 *
 * All sessions default to READ access mode. The `runReadCypher` helper rejects
 * write keywords on the way in as a defence in depth even though the driver
 * enforces it server-side.
 */

import neo4j, { Driver, Integer } from "neo4j-driver";
import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

let driver: Driver | null = null;
let driverInitFailed = false;

// Mtime-keyed cache. Reread .env whenever it changes on disk so that
// `mcp-use dev`'s set_env_var (which rewrites .env) and HMR cycles can't
// leave stale credentials behind.
let envFileMtimeMs = 0;
let envFileCache: Record<string, string> = {};

/**
 * Read .env directly from disk and overlay any keys missing from process.env.
 * mcp-use dev's HMR doesn't restart the Node process, and `set_env_var`
 * rewrites .env but does not reload module-level state. The mtime check
 * ensures the cache invalidates whenever .env changes.
 */
function readEnvFile(key: string): string | undefined {
  const envPath = resolve(process.cwd(), ".env");
  if (existsSync(envPath)) {
    try {
      const mtime = statSync(envPath).mtimeMs;
      if (mtime !== envFileMtimeMs) {
        envFileMtimeMs = mtime;
        envFileCache = {};
        const text = readFileSync(envPath, "utf8");
        for (const line of text.split(/\r?\n/)) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) continue;
          const eq = trimmed.indexOf("=");
          if (eq <= 0) continue;
          const k = trimmed.slice(0, eq).trim();
          let v = trimmed.slice(eq + 1).trim();
          if (
            (v.startsWith('"') && v.endsWith('"')) ||
            (v.startsWith("'") && v.endsWith("'"))
          ) {
            v = v.slice(1, -1);
          }
          envFileCache[k] = v;
        }
        // Reset driver if creds may have changed.
        if (driver) {
          driver.close().catch(() => undefined);
          driver = null;
          driverInitFailed = false;
        }
      }
    } catch {
      // Ignore — fall back to process.env only.
    }
  }
  return envFileCache[key];
}

function getEnv(key: string): string | undefined {
  return process.env[key] || readEnvFile(key);
}

function getDriver(): Driver | null {
  if (driver) return driver;
  if (driverInitFailed) return null;

  const uri = getEnv("NEO4J_URI");
  const username = getEnv("NEO4J_USERNAME");
  const password = getEnv("NEO4J_PASSWORD");

  if (!uri || !username || !password) {
    driverInitFailed = true;
    return null;
  }

  try {
    driver = neo4j.driver(uri, neo4j.auth.basic(username, password), {
      maxConnectionLifetime: 60 * 60 * 1000,
      connectionTimeout: 10_000,
      maxConnectionPoolSize: 25,
      disableLosslessIntegers: true,
    });
    return driver;
  } catch (err) {
    console.error("[KG] driver init failed:", err);
    driverInitFailed = true;
    return null;
  }
}

export function kgConfigured(): boolean {
  return Boolean(getEnv("NEO4J_URI") && getEnv("NEO4J_USERNAME") && getEnv("NEO4J_PASSWORD"));
}

export function kgDatabase(): string {
  return getEnv("NEO4J_DATABASE") || "neo4j";
}

export function kgInstanceName(): string | undefined {
  return getEnv("AURA_INSTANCENAME");
}

export function kgUri(): string | undefined {
  return getEnv("NEO4J_URI");
}

export interface KgResult<T = Record<string, unknown>> {
  ok: boolean;
  reason?: string;
  records?: T[];
  meta?: { tookMs: number; database: string };
}

const WRITE_KEYWORDS = /\b(CREATE|DELETE|DETACH|MERGE|SET|REMOVE|DROP|LOAD\s+CSV|CALL\s+\{[^}]*\b(CREATE|DELETE|MERGE|SET|REMOVE)\b)/i;

/** Heuristic — returns the matched write keyword if any. */
export function detectWriteKeyword(cypher: string): string | null {
  const m = cypher.match(WRITE_KEYWORDS);
  return m ? m[0] : null;
}

/** Convert a neo4j-driver value (possibly Integer) into a plain JS value. */
function unwrap(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (neo4j.isInt(value as Integer)) return (value as Integer).toNumber();
  if (Array.isArray(value)) return value.map(unwrap);
  if (typeof value === "object") {
    // Nodes, Relationships, Paths all have a `properties` field in their JSON.
    const v = value as Record<string, unknown>;
    if ("properties" in v && "labels" in v) {
      return {
        labels: v.labels,
        properties: unwrap(v.properties),
        elementId: v.elementId,
      };
    }
    if ("properties" in v && "type" in v && "startNodeElementId" in v) {
      return {
        type: v.type,
        properties: unwrap(v.properties),
        startElementId: v.startNodeElementId,
        endElementId: v.endNodeElementId,
      };
    }
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v)) out[k] = unwrap(val);
    return out;
  }
  return value;
}

export async function runReadCypher<T = Record<string, unknown>>(
  cypher: string,
  params: Record<string, unknown> = {}
): Promise<KgResult<T>> {
  const writeKw = detectWriteKeyword(cypher);
  if (writeKw) {
    return {
      ok: false,
      reason: `Refusing to execute query: write keyword "${writeKw}" detected. This adapter is read-only.`,
    };
  }

  const d = getDriver();
  if (!d) {
    return {
      ok: false,
      reason:
        "Neo4j not configured. Set NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD in the environment.",
    };
  }

  const database = kgDatabase();
  const session = d.session({
    database,
    defaultAccessMode: neo4j.session.READ,
  });

  const start = Date.now();
  try {
    const result = await session.run(cypher, params);
    const records: T[] = result.records.map((r) => unwrap(r.toObject()) as T);
    return {
      ok: true,
      records,
      meta: { tookMs: Date.now() - start, database },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      reason: message,
      meta: { tookMs: Date.now() - start, database },
    };
  } finally {
    await session.close();
  }
}

/**
 * Pre-baked introspection: returns labels with counts and relationship types
 * with counts. Uses one round-trip to enumerate labels/types, then one count
 * round-trip per label/type. This avoids needing APOC (Aura free tier omits
 * it) and keeps each query simple and read-only.
 */
export async function kgSchemaSummary(): Promise<KgResult> {
  if (!kgConfigured()) {
    return { ok: false, reason: "Neo4j not configured." };
  }

  const start = Date.now();
  const database = kgDatabase();

  const labelsList = await runReadCypher<{ label: string }>(
    "CALL db.labels() YIELD label RETURN label"
  );
  if (!labelsList.ok) return labelsList;

  const labelCounts: { label: string; count: number }[] = [];
  for (const row of labelsList.records ?? []) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(row.label)) {
      labelCounts.push({ label: row.label, count: 0 });
      continue;
    }
    const c = await runReadCypher<{ count: number }>(
      `MATCH (n:\`${row.label}\`) RETURN count(n) AS count`
    );
    labelCounts.push({
      label: row.label,
      count: c.ok && c.records?.[0]?.count != null ? Number(c.records[0].count) : 0,
    });
  }

  const relsList = await runReadCypher<{ type: string }>(
    "CALL db.relationshipTypes() YIELD relationshipType AS type RETURN type"
  );
  const relCounts: { type: string; count: number }[] = [];
  if (relsList.ok) {
    for (const row of relsList.records ?? []) {
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(row.type)) {
        relCounts.push({ type: row.type, count: 0 });
        continue;
      }
      const c = await runReadCypher<{ count: number }>(
        `MATCH ()-[r:\`${row.type}\`]->() RETURN count(r) AS count`
      );
      relCounts.push({
        type: row.type,
        count: c.ok && c.records?.[0]?.count != null ? Number(c.records[0].count) : 0,
      });
    }
  }

  return {
    ok: true,
    records: [
      {
        labels: labelCounts,
        relationshipTypes: relCounts,
      },
    ],
    meta: { tookMs: Date.now() - start, database },
  };
}

/** Quick ping — RETURN 1 round-trip with the configured database. */
export async function kgPing(): Promise<KgResult<{ ok: number }>> {
  return runReadCypher<{ ok: number }>("RETURN 1 AS ok");
}

/* ------------------------------------------------------------------------- */
/* Enrichment helpers — bind fixture-backed tools to the live graph.          */
/* All helpers return safe defaults on failure so the caller can               */
/* unconditionally merge the result into its fixture response.                */
/* ------------------------------------------------------------------------- */

export interface TechMatch {
  slug: string;
  label: string;
  confidence: number;
  reposUsing: number;
}

export interface RepoMatch {
  slug: string;
  label: string;
  url: string;
  description?: string;
  language?: string;
  languages?: string[];
  owner?: string;
  provider?: string;
}

export interface TopLanguage {
  language: string;
  repoCount: number;
}

export interface PersonSummary {
  slug: string;
  label: string;
  reposAuthored: number;
  deploymentsOwned: number;
  conversationsAuthored: number;
  topLanguages: TopLanguage[];
}

export interface KgEnrichment<T> {
  ok: boolean;
  data?: T;
  reason?: string;
  source?: "kg";
  tookMs?: number;
}

/**
 * Look up a Technology node by name. Tries exact-case `label`, lowercase
 * `slug`, then loose CONTAINS — returning the highest-confidence match plus
 * a count of repos using it.
 */
export async function kgLookupTechnology(
  name: string
): Promise<KgEnrichment<TechMatch>> {
  if (!kgConfigured()) return { ok: false, reason: "Neo4j not configured." };
  if (!name?.trim()) return { ok: false, reason: "Empty name." };

  const start = Date.now();
  const result = await runReadCypher<{
    slug: string;
    label: string;
    confidence: number;
    reposUsing: number;
  }>(
    `
    MATCH (t:Technology)
    WHERE toLower(t.label) = toLower($name)
       OR toLower(t.slug)  = toLower($name)
       OR toLower(t.label) CONTAINS toLower($name)
    OPTIONAL MATCH (t)<-[:USES]-(r:Repo)
    WITH t, count(DISTINCT r) AS reposUsing
    RETURN t.slug AS slug,
           t.label AS label,
           coalesce(t.confidence, 0) AS confidence,
           reposUsing
    ORDER BY (CASE WHEN toLower(t.label) = toLower($name) THEN 0 ELSE 1 END),
             confidence DESC,
             reposUsing DESC
    LIMIT 1
    `,
    { name }
  );
  if (!result.ok || !result.records?.length) {
    return { ok: false, reason: result.reason ?? "No matching technology.", tookMs: Date.now() - start };
  }
  return { ok: true, source: "kg", data: result.records[0], tookMs: Date.now() - start };
}

/** Repos that have a USES edge to the given Technology slug. */
export async function kgReposUsingTechnology(
  slug: string,
  limit = 10
): Promise<KgEnrichment<RepoMatch[]>> {
  if (!kgConfigured()) return { ok: false, reason: "Neo4j not configured." };
  if (!slug?.trim()) return { ok: false, reason: "Empty slug." };

  const start = Date.now();
  const result = await runReadCypher<RepoMatch>(
    `
    MATCH (t:Technology {slug: $slug})<-[:USES]-(r:Repo)
    RETURN r.slug AS slug,
           r.label AS label,
           r.url AS url,
           r.description AS description,
           r.language AS language,
           r.languages AS languages,
           r.owner AS owner,
           r.provider AS provider
    ORDER BY coalesce(size(r.languages), 0) DESC,
             coalesce(r.label, "") ASC
    LIMIT toInteger($limit)
    `,
    { slug, limit }
  );
  if (!result.ok) {
    return { ok: false, reason: result.reason, tookMs: Date.now() - start };
  }
  return { ok: true, source: "kg", data: result.records ?? [], tookMs: Date.now() - start };
}

/** Look up a Repo by slug, label, or URL substring. */
export async function kgLookupRepo(
  query: string
): Promise<KgEnrichment<RepoMatch & { techCount: number }>> {
  if (!kgConfigured()) return { ok: false, reason: "Neo4j not configured." };
  if (!query?.trim()) return { ok: false, reason: "Empty query." };

  const start = Date.now();
  const result = await runReadCypher<RepoMatch & { techCount: number }>(
    `
    MATCH (r:Repo)
    WHERE toLower(r.slug)  = toLower($q)
       OR toLower(r.label) = toLower($q)
       OR (r.url IS NOT NULL AND toLower(r.url) CONTAINS toLower($q))
       OR toLower(r.label) CONTAINS toLower($q)
    OPTIONAL MATCH (r)-[:USES]->(t:Technology)
    WITH r, count(DISTINCT t) AS techCount
    RETURN r.slug AS slug,
           r.label AS label,
           r.url AS url,
           r.description AS description,
           r.language AS language,
           r.languages AS languages,
           r.owner AS owner,
           r.provider AS provider,
           techCount
    ORDER BY (CASE WHEN toLower(r.slug) = toLower($q) THEN 0 ELSE 1 END),
             techCount DESC
    LIMIT 1
    `,
    { q: query }
  );
  if (!result.ok || !result.records?.length) {
    return { ok: false, reason: result.reason ?? "No matching repo.", tookMs: Date.now() - start };
  }
  return { ok: true, source: "kg", data: result.records[0], tookMs: Date.now() - start };
}

/** Technologies a Repo USES, ordered alphabetically. */
export async function kgTechStackForRepo(
  repoSlug: string,
  limit = 30
): Promise<KgEnrichment<{ slug: string; label: string; confidence: number }[]>> {
  if (!kgConfigured()) return { ok: false, reason: "Neo4j not configured." };
  if (!repoSlug?.trim()) return { ok: false, reason: "Empty repo slug." };

  const start = Date.now();
  const result = await runReadCypher<{
    slug: string;
    label: string;
    confidence: number;
  }>(
    `
    MATCH (r:Repo {slug: $repoSlug})-[:USES]->(t:Technology)
    RETURN DISTINCT t.slug AS slug, t.label AS label, coalesce(t.confidence, 0) AS confidence
    ORDER BY confidence DESC, label ASC
    LIMIT toInteger($limit)
    `,
    { repoSlug, limit }
  );
  if (!result.ok) {
    return { ok: false, reason: result.reason, tookMs: Date.now() - start };
  }
  return { ok: true, source: "kg", data: result.records ?? [], tookMs: Date.now() - start };
}

/**
 * Person overview — counts of authored/owned nodes plus the top languages
 * across all authored repos (aggregated from r.language).
 */
export async function kgPersonSummary(): Promise<KgEnrichment<PersonSummary>> {
  if (!kgConfigured()) return { ok: false, reason: "Neo4j not configured." };

  const start = Date.now();
  const result = await runReadCypher<{
    slug: string;
    label: string;
    reposAuthored: number;
    deploymentsOwned: number;
    conversationsAuthored: number;
    topLanguages: TopLanguage[];
  }>(
    `
    MATCH (p:Person)
    WITH p ORDER BY coalesce(p.confidence, 0) DESC LIMIT 1
    OPTIONAL MATCH (p)-[:AUTHORED]->(r:Repo)
    WITH p, collect(DISTINCT r) AS repos
    OPTIONAL MATCH (p)-[:OWNS]->(d:Deployment)
    WITH p, repos, count(DISTINCT d) AS deploymentsOwned
    OPTIONAL MATCH (p)-[:AUTHORED]->(c:Conversation)
    WITH p, repos, deploymentsOwned, count(DISTINCT c) AS conversationsAuthored
    WITH p, size(repos) AS reposAuthored, deploymentsOwned, conversationsAuthored,
         [r IN repos WHERE r.language IS NOT NULL | r.language] AS langs
    UNWIND (CASE WHEN size(langs) = 0 THEN [null] ELSE langs END) AS lang
    WITH p, reposAuthored, deploymentsOwned, conversationsAuthored, lang
    WHERE lang IS NOT NULL
    WITH p, reposAuthored, deploymentsOwned, conversationsAuthored,
         lang, count(*) AS c
    ORDER BY c DESC
    WITH p, reposAuthored, deploymentsOwned, conversationsAuthored,
         collect({ language: lang, repoCount: c })[0..10] AS topLanguages
    RETURN p.slug AS slug,
           coalesce(p.label, p.slug) AS label,
           reposAuthored,
           deploymentsOwned,
           conversationsAuthored,
           topLanguages
    `
  );
  if (!result.ok || !result.records?.length) {
    return { ok: false, reason: result.reason ?? "No person node found.", tookMs: Date.now() - start };
  }
  return { ok: true, source: "kg", data: result.records[0], tookMs: Date.now() - start };
}

export async function closeDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
  }
}
