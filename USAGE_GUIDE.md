# Portfolio MCP UI — Usage Guide

> The complete handbook for consuming `portfolio-mcp-ui` from any frontend, AI host, or backend.
>
> **Server identity:** `portfolio-mcp-ui` · **Tools:** 42 · **Widgets:** 31 · **Drill levels:** 4

---

## Table of Contents

1. [What this server is](#1-what-this-server-is)
2. [Who this guide is for](#2-who-this-guide-is-for)
3. [Core concepts](#3-core-concepts)
4. [Quick start by client](#4-quick-start-by-client)
   - 4.1 [MCP Inspector (browser)](#41-mcp-inspector-browser)
   - 4.2 [Claude Desktop](#42-claude-desktop)
   - 4.3 [ChatGPT (Apps SDK)](#43-chatgpt-apps-sdk)
   - 4.4 [Custom React frontend](#44-custom-react-frontend-mcp-use-client)
   - 4.5 [Claude API with `mcp_servers`](#45-claude-api-with-mcp_servers)
   - 4.6 [Direct HTTP / raw protocol](#46-direct-http--raw-protocol)
5. [The 42-tool catalog](#5-the-42-tool-catalog)
   5a. [Knowledge graph tools](#5a-knowledge-graph-tools)
6. [Drill-down patterns](#6-drill-down-patterns)
7. [Widget rendering contract](#7-widget-rendering-contract)
8. [Common integration recipes](#8-common-integration-recipes)
9. [Error handling and edge cases](#9-error-handling-and-edge-cases)
10. [Customization guide](#10-customization-guide)
11. [Performance and caching](#11-performance-and-caching)
12. [Security checklist](#12-security-checklist)
13. [Troubleshooting](#13-troubleshooting)
14. [FAQ](#14-faq)
15. [Glossary](#15-glossary)

---

## 1. What this server is

`portfolio-mcp-ui` is a Model Context Protocol server that exposes a complete, interactive personal portfolio as a hierarchical set of callable tools, each backed by a React widget. Every claim is reachable in at most four tool calls, every widget is self-rendering, and every section is independently embeddable.

It is two things at once:

- **A protocol-native portfolio.** Any MCP host (Claude, ChatGPT, Cursor, mcp-use) can call the tools and render the same widgets that a public website would.
- **A reference architecture.** A working blueprint for any team that wants to expose a hierarchical content API as MCP rather than REST/GraphQL.

There is no separate frontend required. The widgets are the frontend. Your job as an integrator is to (a) connect to the server, (b) call the right tool, (c) render the returned widget — or, if you prefer, ignore the widget and consume the `structuredContent` directly as JSON.

---

## 2. Who this guide is for

| Audience | What to read |
|---|---|
| **Frontend engineers** embedding sections into a website | Sections 3, 4.4, 7, 8 |
| **AI host integrators** (Claude / ChatGPT / Cursor users) | Sections 3, 4.1–4.3, 4.5, 6 |
| **Backend engineers** consuming JSON without rendering widgets | Sections 3, 4.6, 5, 9 |
| **Forkers** customizing the portfolio with their own data | Sections 3, 10, 11 |
| **Anyone evaluating MCP** as a content-delivery protocol | Sections 1, 3, 6 |

---

## 3. Core concepts

### 3.1 Tools, not endpoints

There are no REST routes. Every interaction is a `tools/call` JSON-RPC request that names a tool and supplies a JSON argument. The server replies with a `CallToolResult` whose two interesting fields are:

- `structuredContent` — typed JSON your code can parse directly
- `content[]` — including `ui-resource` blocks the MCP host renders as a widget

### 3.2 The four-level drill hierarchy

Every section exposes between two and four call depths so a caller can move from "what does this person do" to "what does this individual module of this project actually do" without leaving the protocol.

```
Level 1  section root        get_projects
Level 2  component detail    get_project_detail(id)
Level 3  sub-component       get_project_techstack(id)
Level 4  primary source      get_project_module(id, modId)
```

Each Level 2+ widget includes:

- A **breadcrumb header** so the caller always knows where it is.
- **Sibling chips** for lateral browsing (e.g. related skills, related projects).
- An **up-link button** that asks the host to re-call the parent tool.

### 3.3 Widgets vs. raw data

Every tool returns both. A graphical host (Claude Desktop, ChatGPT, the MCP Inspector) renders the widget. A headless client (a server-side script, a CMS importer, a CLI) just reads `structuredContent` and ignores the rest. **You never have to render the widget to use this server.**

### 3.4 Stateless, idempotent, side-effect-free (with one exception)

41 of the 42 tools are pure reads. `submit_contact_message` is the only write. `track_event` is logged but has no observable side effect in v1.

---

## 4. Quick start by client

> Throughout this guide, the placeholder endpoint is `https://your-deployment.run.mcp-use.com/mcp`. Replace with your real deployment URL (`mcp-use deploy` prints it).

### 4.1 MCP Inspector (browser)

Fastest way to explore the server. No code.

1. Open the embedded Inspector in this sandbox, or visit any MCP Inspector instance.
2. Connect to the server URL.
3. Click **List Tools** — you should see 42 tools.
4. Click any tool, fill the JSON args, hit **Call Tool**. The widget renders inline.

Start with `get_hero` (no args), then click through the breadcrumbs of any drill-down widget.

### 4.2 Claude Desktop

Add to `claude_desktop_config.json`:

```jsonc
{
  "mcpServers": {
    "portfolio": {
      "url": "https://your-deployment.run.mcp-use.com/mcp"
    }
  }
}
```

Restart Claude Desktop. Then in any conversation:

> Show me the portfolio hero, then drill into the project edge-stream.

Claude will discover the tools and chain `get_hero` → `get_projects` → `get_project_detail`. Widgets render inline.

### 4.3 ChatGPT (Apps SDK)

In the ChatGPT app builder UI, add a new MCP connector pointing at the server URL. ChatGPT auto-discovers the 42 tools. Native widget rendering is supported by the Apps SDK.

### 4.4 Custom React frontend (`mcp-use` client)

This is the most common integration. You want a real website that calls the MCP server for content.

**Install:**

```bash
npm install mcp-use @tanstack/react-query
```

**Create a single shared client:**

```typescript
// src/lib/mcp.ts
import { MCPClient } from "mcp-use/client";

export const mcpClient = new MCPClient({
  mcpServers: {
    portfolio: {
      url: import.meta.env.VITE_MCP_URL ?? "https://your-deployment.run.mcp-use.com/mcp",
    },
  },
});

let sessionPromise: Promise<Awaited<ReturnType<typeof mcpClient.createSession>>> | null = null;
export function getSession() {
  if (!sessionPromise) sessionPromise = mcpClient.createSession("portfolio");
  return sessionPromise;
}
```

**Reusable hook:**

```typescript
// src/hooks/useMCPTool.ts
import { useQuery } from "@tanstack/react-query";
import { getSession } from "../lib/mcp";

export function useMCPTool<T = unknown>(name: string, args: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: [name, args],
    queryFn: async () => {
      const session = await getSession();
      const result = await session.callTool({ name, arguments: args });
      return result.structuredContent as T;
    },
    staleTime: 60_000,
  });
}
```

**Use it in a component:**

```tsx
// src/sections/Hero.tsx
import { useMCPTool } from "../hooks/useMCPTool";

type HeroProps = {
  name: string;
  headline: string;
  subhead: string;
  location: { city: string; country: string; status: string };
  highlights: { id: string; icon: string; title: string; description: string }[];
  ctas: { label: string; href: string; primary?: boolean }[];
};

export function Hero() {
  const { data, isLoading, error } = useMCPTool<HeroProps>("get_hero");

  if (isLoading) return <HeroSkeleton />;
  if (error || !data) return <HeroError />;

  return (
    <section className="hero">
      <span className="status-chip">{data.location.city} · {data.location.status}</span>
      <h1>{data.headline}</h1>
      <p>{data.subhead}</p>
      <div className="ctas">
        {data.ctas.map((cta) => (
          <a key={cta.label} href={cta.href} className={cta.primary ? "primary" : ""}>
            {cta.label}
          </a>
        ))}
      </div>
      <div className="highlight-grid">
        {data.highlights.map((h) => (
          <article key={h.id}>
            <span>{h.icon}</span>
            <h3>{h.title}</h3>
            <p>{h.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
```

This pattern works for every Level 1 tool. For Level 2+ tools, pass the parent ID as an argument and unmount/remount the child component when the ID changes.

### 4.5 Claude API with `mcp_servers`

If you have an AI chat in your product and want it to answer using the live portfolio content:

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const message = await client.beta.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: 1024,
  mcp_servers: [
    {
      type: "url",
      url: "https://your-deployment.run.mcp-use.com/mcp",
      name: "portfolio",
    },
  ],
  messages: [
    { role: "user", content: "Which roles used Kubernetes? Cite the role detail." },
  ],
});
```

Claude will chain `get_experience({ tech: "Kubernetes" })` → `get_role_detail(id)` automatically. Add prompt caching by setting `cache_control: { type: "ephemeral" }` on stable system prompts.

### 4.6 Direct HTTP / raw protocol

For headless backends, CMS importers, or static-site builders, you can speak JSON-RPC over Streamable HTTP directly.

```bash
# 1. Initialize
curl -X POST https://your-deployment.run.mcp-use.com/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"curl","version":"1.0"}}}'

# 2. List tools
curl -X POST https://your-deployment.run.mcp-use.com/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H 'Mcp-Session-Id: <returned-session-id>' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'

# 3. Call a tool
curl -X POST https://your-deployment.run.mcp-use.com/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H 'Mcp-Session-Id: <returned-session-id>' \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_hero","arguments":{}}}'
```

Use this for static-site generation: at build time, fetch every section, render to HTML, ship as a static bundle.

---

## 5. The 42-tool catalog

Every tool name links the call signature, what it returns, and what it drills into. All argument names are camelCase or snake_case depending on the tool — the schema is the source of truth (call `tools/list` to introspect).

### 5.1 Level 1 — Section roots (9 tools)

| Tool | Args | Returns | Drills into |
|---|---|---|---|
| `get_hero` | — | headline, subhead, location, CTAs, 4 highlights | `get_hero_highlight`, `get_hero_stats` |
| `get_availability` | — | status, response time, preferred roles | `get_availability_detail` |
| `get_about` | — | bio paragraphs, values, philosophy, career arc | `get_career_journey` |
| `get_skills` | `category?` | filterable skill grid with evidence | `get_skill_detail` |
| `get_experience` | `tech?` | timeline of roles, filterable by tech | `get_role_detail` |
| `get_projects` | `tag?` | project grid, filterable by tag | `get_project_detail`, `get_project_metrics` |
| `get_open_source` | — | OSS contribution summary + grid | `get_oss_contribution` |
| `get_education` | — | degrees + certifications grid | `get_education_item` |
| `get_contact` | — | channels, FAQ link, quick-message form | `get_contact_channel`, `get_contact_faq`, `submit_contact_message` |

### 5.2 Level 2 — Component details (12 tools)

| Tool | Args | Returns |
|---|---|---|
| `get_hero_highlight` | `id` | Capability detail + corroborating skills/roles/projects |
| `get_hero_stats` | — | Career stat card (years, roles, projects, OSS) |
| `get_availability_detail` | — | Rolling interview calendar + comp/location/role preferences |
| `get_career_journey` | — | Chronological milestones |
| `get_skill_detail` | `name` | Evidence list, level, years, related roles/projects, siblings |
| `get_role_detail` | `id` | Scope, impact metrics, decisions, achievements, stack, related projects |
| `get_project_detail` | `id` | Full description, stack, team, timeline, changelog, related roles |
| `get_project_metrics` | `id` | KPI dashboard + 6-point weekly time series |
| `get_oss_contribution` | `id` | PR/issue summary, repo, accepted/merged status, impact |
| `get_education_item` | `id` | Single course/cert/degree with skills, transcript hints |
| `get_contact_channel` | `id` | Single channel detail (handle, best-for, response time) |
| `get_contact_faq` | — | FAQ list |

### 5.3 Level 3 — Sub-components (8 tools)

| Tool | Args | Returns |
|---|---|---|
| `get_career_milestone` | `id` | Single milestone with before/after framing |
| `get_language_stat` | `language` | Cross-portfolio stat card for one language (LOC, projects, years) |
| `get_role_achievement` | `roleId`, `achId` | Achievement with metric and proof |
| `get_role_decision` | `roleId`, `decId` | Decision / rationale / outcome breakdown |
| `get_project_techstack` | `id` | All languages + frameworks for one project |
| `get_contact_faq_item` | `id` | Single Q/A |
| `list_posts` | `category?`, `tag?` | Blog/writing posts |
| `search_content` | `query`, `section?` | Section-scoped search results |

### 5.4 Level 4 — Primary source (2 tools)

| Tool | Args | Returns |
|---|---|---|
| `get_project_language_stat` | `id`, `language` | LOC, files, percentage for one language in one project |
| `get_project_module` | `id`, `modId` | Single module of a project — purpose, files, key APIs |

### 5.5 Cross-cutting (5 tools)

| Tool | Args | Returns |
|---|---|---|
| `get_domains` | — | Portfolio domain/infrastructure metadata |
| `get_portfolio_stats` | — | Aggregate counts across the whole portfolio |
| `search_all` | `query`, `limit?` | Global search across all sections |
| `track_event` | `eventName`, `section?`, `metadata?` | Analytics write (logged server-side) |
| `submit_contact_message` | `name`, `email`, `message` | Confirmation widget with reference id |

To get the canonical signature of any tool, call `tools/list` and read the `inputSchema`. The schemas are Zod-derived and authoritative.

### 5a. Knowledge graph tools (6 tools)

These tools query the live Neo4j Aura knowledge graph. When the graph is not configured they return a clear error message — no other tool is affected.

| Tool | Args | Returns |
|---|---|---|
| `kg_overview` | none | Graph dashboard widget: node/rel counts, top technologies, repo clusters |
| `kg_health` | none | Connectivity check: node count, relationship count, response time |
| `kg_schema` | none | Node labels, relationship types, property keys present in the graph |
| `kg_person_overview` | none | Person node summary: repos authored, deployments owned, top languages |
| `kg_skill_evidence` | `skill_name` | Technology node + repos that USES the technology |
| `kg_query` | `cypher` (non-empty string) | Execute a read-only Cypher query; returns rows as JSON array |

**Live enrichment props** — 9 existing tools return an extra `live*` prop when Neo4j is reachable:

| Tool | Live prop | What it adds |
|---|---|---|
| `get_hero_stats` | `liveSummary` | Person node, repo count, deployment count, top languages |
| `get_skills` | `liveTechRankings` | Technology nodes ranked by repo-count |
| `get_skill_detail` | `liveEvidence` | Technology node + list of repos using it |
| `get_projects` | `liveStats` | Aggregate repo/deployment/language stats |
| `get_project_detail` | `liveRepo` / `liveTechStack` | Repo node + tech relationships |
| `get_project_techstack` | `liveTechStack` | Tech stack from graph edges |
| `get_open_source` | `liveRepoCount` / `liveTopRepos` | Repo count + top repos by tech breadth |
| `get_portfolio_stats` | `liveGraphStats` | Aggregate node/relationship counts |
| `get_language_stat` | `liveEvidence` | Repos using the language, with GitHub URLs |

The live prop is always `null` when the graph is unreachable — the rest of the response is unchanged.

To enable live enrichment, add to your `.env`:
```env
NEO4J_URI=neo4j+s://<instance-id>.databases.neo4j.io
NEO4J_USERNAME=<username>
NEO4J_PASSWORD=<password>
NEO4J_DATABASE=<database>
```

---

## 6. Drill-down patterns

### 6.1 The user-driven drill

Your component owns the path. When the user clicks a project tile, you call the child tool:

```tsx
const [projectId, setProjectId] = useState<string | null>(null);
const list = useMCPTool("get_projects");
const detail = useMCPTool("get_project_detail", projectId ? { id: projectId } : {});

return projectId
  ? <ProjectDetail data={detail.data} onBack={() => setProjectId(null)} />
  : <ProjectGrid data={list.data} onSelect={setProjectId} />;
```

### 6.2 The AI-driven drill

If you let an LLM choose tools (Claude API, ChatGPT), pass the schema and a system prompt instructing it to drill on user intent:

```text
You have access to a portfolio MCP server. When a user asks about a topic, call the
broadest matching Level 1 tool first, then drill to the most specific Level N tool
that answers the question. Always cite the tool name used.
```

The 4-level naming convention (`get_X` → `get_X_detail` → `get_X_techstack` → `get_X_module`) gives the LLM a predictable path.

### 6.3 Breadcrumb continuity

Every Level 2+ widget exposes a `breadcrumb` field in `structuredContent`. If you render your own UI, reuse it:

```tsx
{data.breadcrumb && (
  <nav className="crumbs">
    {data.breadcrumb.map((c, i) => (
      <span key={c.id}>
        {i > 0 && " › "}
        <button onClick={() => goTo(c.id)}>{c.label}</button>
      </span>
    ))}
  </nav>
)}
```

### 6.4 Sibling navigation

Level 2+ widgets also return `siblings: { id, label }[]`. Render as chips for lateral browsing without going back up:

```tsx
{data.siblings?.map((s) => (
  <button key={s.id} className="chip" onClick={() => onSelect(s.id)}>
    {s.label}
  </button>
))}
```

---

## 7. Widget rendering contract

The widgets in this server follow these guarantees so any host can render them safely.

| Guarantee | Detail |
|---|---|
| Self-contained | Each widget mounts inside `<McpUseProvider autoSize>` and ships its own styles. No global CSS dependency. |
| Theme-aware | Widgets call `useWidgetTheme()` and render light/dark palettes. Host need not opt in. |
| Auto-sizing | The host iframe resizes to fit content. Don't set a fixed height. |
| Loading state | Every widget checks `isPending` and renders a skeleton until props are hydrated. |
| Cross-link via host | Widgets cross-link by calling `sendFollowUpMessage` (host-driven) — they never call other tools directly. |
| No global state | A widget can be unmounted and remounted with new props at any time. No singletons. |

### 7.1 If you don't want the widget

Just ignore the `ui-resource` content block. Read `structuredContent` and render with your own components. Everything in the catalog above is a normal JSON object.

### 7.2 If you want only the widget

Some hosts accept a `ui://` URI directly. The widget identifiers are listed in `resources/list`; you can read a single widget without calling its companion tool.

---

## 8. Common integration recipes

### 8.1 Static-site generation (build-time)

Fetch every Level 1 tool at build, render to HTML, ship as a static bundle. Re-deploy when content changes.

```typescript
// scripts/prerender.ts
import { writeFile } from "node:fs/promises";
import { mcpClient } from "../src/lib/mcp";

const sections = [
  "get_hero", "get_availability", "get_about", "get_skills",
  "get_experience", "get_projects", "get_open_source",
  "get_education", "get_contact",
];

const session = await mcpClient.createSession("portfolio");
const snapshot: Record<string, unknown> = {};
for (const name of sections) {
  const r = await session.callTool({ name, arguments: {} });
  snapshot[name] = r.structuredContent;
}
await writeFile("public/portfolio-snapshot.json", JSON.stringify(snapshot));
```

Then in your app, hydrate from the JSON file synchronously and update from MCP on-demand for drill-downs.

### 8.2 Server-side rendering (request-time)

In Next.js / Remix / Astro, call MCP from the loader/server component:

```typescript
// app/page.tsx (Next.js App Router)
import { mcpClient } from "@/lib/mcp";

export default async function Home() {
  const session = await mcpClient.createSession("portfolio");
  const hero = await session.callTool({ name: "get_hero", arguments: {} });
  return <Hero data={hero.structuredContent} />;
}
```

Cache results with `unstable_cache` or your framework's equivalent — see Section 11.

### 8.3 Embedded chat with live context

Drop a Claude-powered chat into the page. The `mcp_servers` field gives the model the full catalog. Pair it with a section-scoped system prompt so it only drills the section the user is on:

```typescript
const message = await client.beta.messages.create({
  model: "claude-sonnet-4-5",
  mcp_servers: [{ type: "url", url: MCP_URL, name: "portfolio" }],
  system: [
    {
      type: "text",
      text: `You are an assistant on the Skills section of khiw.dev.
        Answer using portfolio MCP tools. Cite tool names.`,
      cache_control: { type: "ephemeral" },
    },
  ],
  messages: [{ role: "user", content: userQuestion }],
});
```

### 8.4 Section-by-section embedding (any framework)

Each Level 1 widget can be hosted in its own slot anywhere — a Webflow page, a Notion embed, an internal docs site. Use an `<iframe>` pointing at the widget URL emitted by the host you're using.

---

## 9. Error handling and edge cases

### 9.1 Tool not found

A typo in the tool name returns:

```json
{ "isError": true, "content": [{ "type": "text", "text": "Tool not found: get_heros" }] }
```

Always validate against `tools/list` at startup. Don't hardcode.

### 9.2 Invalid arguments

Zod-derived schemas reject malformed input:

```json
{ "isError": true, "content": [{ "type": "text", "text": "Invalid arguments for get_project_module: id required" }] }
```

Match the host's idiomatic error path:

```typescript
const result = await session.callTool({ name, arguments: args });
if (result.isError) {
  throw new Error(result.content[0]?.text ?? "Unknown MCP error");
}
```

### 9.3 Unknown id

Asking for a project that doesn't exist returns a friendly `error()` result, not a thrown exception:

```json
{ "isError": true, "content": [{ "type": "text", "text": "Project not found: xyz" }] }
```

Render a user-visible message; do not retry.

### 9.4 Stale session

Streamable HTTP sessions can drop. Wrap calls in a thin retry that re-creates the session on `session_expired`:

```typescript
async function safeCall(name: string, args: Record<string, unknown>) {
  try {
    return await (await getSession()).callTool({ name, arguments: args });
  } catch (e) {
    sessionPromise = null;
    return await (await getSession()).callTool({ name, arguments: args });
  }
}
```

### 9.5 `submit_contact_message` validation

This is the only write tool. It validates:

- `name` non-empty
- `email` matches RFC-5322 pattern
- `message` between 10 and 4000 chars

Returns a confirmation widget with a `MSG-XXXXXXXX` reference. Treat the reference as an opaque idempotency key.

---

## 10. Customization guide

You will probably want to fork this server and replace the fixture data with your own.

### 10.1 The fixture surface

All fixtures live at the top of `index.ts`. Look for these constants:

- `HERO`, `AVAILABILITY`, `ABOUT`, `CAREER_JOURNEY`
- `SKILLS[]`, `LANGUAGE_STATS{}`
- `ROLES[]`, `ROLE_ENRICHMENT{}`
- `PROJECTS[]`, `PROJECT_ENRICHMENT{}`
- `OSS_CONTRIBUTIONS[]`, `EDUCATION_ITEMS[]`
- `CONTACT_CHANNELS[]`, `CONTACT_FAQ[]`
- `POSTS[]`, `DOMAINS{}`, `PORTFOLIO_STATS`

Replace any value, keep the shape. The widgets are decoupled from content via Zod schemas, so as long as the shape matches, the widget will render.

### 10.2 Wiring to a real backend

Swap a fixture constant for an async function that queries your CMS, database, or knowledge graph. Inside each tool handler:

```typescript
// Before
const project = PROJECTS.find((p) => p.id === id);

// After
const project = await db.project.findUnique({ where: { id } });
```

Tools are async — no other changes needed.

### 10.3 Adding a new section

1. Add fixture data at the top of `index.ts`.
2. Create `resources/my-section.tsx` exporting `widgetMetadata` (Zod schema for props) and a default React component.
3. Add a `server.tool({ name: "get_my_section", widget: { name: "my-section" } }, ...)` block.
4. Run `npm run dev`; HMR picks up both files; the type registry regenerates.

### 10.4 Adding a new drill level

Use the same convention: `get_x` → `get_x_detail(id)` → `get_x_subdetail(id, subId)`. Always return a `breadcrumb` array and `siblings` array on Level 2+ widgets.

### 10.5 Removing a section

1. Delete the `server.tool(...)` block.
2. Delete the widget file in `resources/`.
3. Run `npm run dev` — HMR re-registers cleanly.

Sections are independent; removing one never breaks another.

---

## 11. Performance and caching

### 11.1 Server-side

The server is stateless and idempotent for read tools. Cache layer suggestions:

| Layer | TTL | Why |
|---|---|---|
| HTTP edge (CDN) | 60s | Section roots rarely change |
| Application (LRU) | 5m | Drill-down details — small, hot, immutable |
| None | — | Search and analytics tools |

### 11.2 Client-side

With React Query / SWR, `staleTime: 60_000` for section roots and `Infinity` for primary-source tools (Level 4 — they're tied to a static id).

### 11.3 Bundle size

Each widget is ~6–12 KB minified. Lazy-load drill-down widgets behind dynamic imports so they don't bloat the initial bundle.

```typescript
const ProjectDetail = lazy(() => import("./sections/ProjectDetail"));
```

### 11.4 Concurrent calls

`mcp-use`'s session supports concurrent `callTool` requests. Don't serialize for no reason — fire all Level 1 fetches in parallel on page load:

```typescript
const [hero, availability, skills, projects] = await Promise.all([
  session.callTool({ name: "get_hero", arguments: {} }),
  session.callTool({ name: "get_availability", arguments: {} }),
  session.callTool({ name: "get_skills", arguments: {} }),
  session.callTool({ name: "get_projects", arguments: {} }),
]);
```

---

## 12. Security checklist

- [ ] **Public endpoint** — All read tools are safe to expose. No authentication required for v1.
- [ ] **Rate limiting** — Add `hono-rate-limiter` at the edge if you expect bot traffic. The server has no built-in throttle.
- [ ] **Email validation on `submit_contact_message`** — Already enforced. Do NOT also accept arbitrary HTML/Markdown without sanitization in your own UI layer.
- [ ] **CORS** — Default config allows `*`. Lock to your origin in production by editing the Hono middleware (see `references/foundations/architecture.md`).
- [ ] **PII** — `track_event` payloads end up in server logs. Do not pass user-identifying information.
- [ ] **Secrets** — None required for v1. If you add OAuth, follow `references/authentication/overview.md`.

---

## 13. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Tool not found` | Typo or stale `tools/list` cache | Re-run `tools/list`; ensure exact name match (snake_case) |
| Widget renders but no data | Forgot `isPending` check | Render skeleton until `isPending === false` |
| `Invalid arguments` | Wrong arg name/shape | Read the `inputSchema` from `tools/list`; arg names are case-sensitive |
| 502 / connection drop | Session reaped | Recreate session and retry (Section 9.4) |
| TypeScript `unknown` errors in your code | Missing `useWidget<Props>()` generic | Pass an inferred type from your Zod schema |
| Widget too narrow | Host iframe sized fixed | Let `<McpUseProvider autoSize>` handle it; remove fixed height |
| `submit_contact_message` rejects valid input | Email regex too strict for your case | Pre-validate client-side and surface the server error |
| `tools/list` returns < 36 | Build/HMR not yet complete | Wait for `[HMR] Reloaded` in dev-server logs |

---

## 14. FAQ

**Do I need to render the widgets?**
No. Every tool returns `structuredContent` you can consume as JSON.

**Can I use this with React Native / Vue / Svelte?**
Yes — the `mcp-use` client is framework-agnostic; only the widget rendering layer is React. If you skip the widget and use `structuredContent`, any framework works.

**Can I run this offline?**
Yes — clone the repo, `npm install`, `npm run dev`. The server runs on `localhost:3000` with no external dependencies.

**How do I deploy?**
`npm run deploy` (one command) deploys to Manufact Cloud. See `references/foundations/deployment.md`.

**Why are some tools snake_case and others camelCase?**
The current v1 uses snake_case (`get_hero`, `submit_contact_message`). Args within tools use camelCase (`roleId`, `eventName`). The schema is canonical — call `tools/list`.

**Can I add authentication?**
Yes. Wrap with OAuth — see `references/authentication/overview.md`. For private deployments, prefer Auth0, WorkOS, or Better Auth.

**What's the latency target?**
Section roots return in ~30–80 ms cold, ~5–10 ms warm. Drill-down details are similar. Geographic location of the deployment dominates.

**How big is the response?**
Section roots: 2–6 KB. Detail tools: 4–12 KB. Search results: capped at 20 items by default.

**Can I have multiple instances with different fixture data?**
Yes — fork, replace fixtures, deploy with a new name. Each instance is independent.

**Is this a real MCP server or a wrapper?**
Real. Uses `@modelcontextprotocol/sdk` under the hood via the `mcp-use` framework, which adds widget compilation, HMR, deploy tooling, and the type registry.

---

## 15. Glossary

| Term | Meaning |
|---|---|
| **MCP** | Model Context Protocol — JSON-RPC 2.0 spec for AI tool/resource exchange |
| **MCP host** | A client that hosts a conversation and can call MCP servers (Claude, ChatGPT, Cursor) |
| **Tool** | A callable function the host can invoke with structured input |
| **Resource** | A read-only addressable artifact (in v1, mostly widgets at `ui://...`) |
| **Widget** | A React component compiled into an iframe-rendered UI block |
| **`structuredContent`** | The typed JSON portion of a `CallToolResult` |
| **`ui-resource`** | A content block type that hosts render as a widget |
| **Drill level** | The depth of a tool call in the section hierarchy (1 = root, 4 = primary source) |
| **Breadcrumb** | The ordered list of parent tools the current widget descended from |
| **Sibling** | A peer of the current entity (e.g. other projects in the same tag, other skills in the same category) |
| **Fixture** | Hardcoded data at the top of `index.ts` used as the content source in v1 |

---

## Closing notes

Two ways to be productive with this server:

1. **Hot path** — point your AI host at the deploy URL, ask it natural-language questions, let it choose tools.
2. **Engineered path** — wire `mcp-use` into your frontend, call tools deterministically, render widgets or roll your own UI from `structuredContent`.

Both paths are first-class. Pick the one that matches your audience.

Questions, bugs, or feature requests: file them against the repo, or message `submit_contact_message` directly through any MCP client.
