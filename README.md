<div align="center">

```
  ____            _    __       _ _         __  __  ____ ____
 |  _ \ ___  _ __| |_ / _| ___ | (_) ___   |  \/  |/ ___|  _ \
 | |_) / _ \| '__| __| |_ / _ \| | |/ _ \  | |\/| | |   | |_) |
 |  __/ (_) | |  | |_|  _| (_) | | | (_) | | |  | | |___|  __/
 |_|   \___/|_|   \__|_|  \___/|_|_|\___/  |_|  |_|\____|_|

         ░░  the portfolio is the protocol  ░░
```

### A career told in tools, not pages.

**54 typed tools · 39 interactive widgets · 4-level drill · Neo4j live knowledge graph · Vercel Sandbox built-in · zero static HTML**

[![MCP](https://img.shields.io/badge/MCP-0.10.0-9333ea?style=for-the-badge&logo=anthropic&logoColor=white)](https://modelcontextprotocol.io)
[![mcp-use](https://img.shields.io/badge/mcp--use-latest-22c55e?style=for-the-badge&logo=node.js&logoColor=white)](https://mcp-use.com)
[![Neo4j](https://img.shields.io/badge/Neo4j-Aura-008CC1?style=for-the-badge&logo=neo4j&logoColor=white)](https://neo4j.com/cloud/platform/aura-graph-database/)
[![Vercel](https://img.shields.io/badge/deploy-Vercel-000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-f59e0b?style=for-the-badge)](LICENSE)

<sub>built with `mcp-use` · powered by `Hono` · rendered by `React 19` · enriched by `Neo4j Aura` · validated by `Zod`</sub>

[**Quick Start**](#-quick-start) · [**Deploy**](#-deploy-to-vercel) · [**Tool Catalog**](#the-54-tool-hierarchy) · [**Knowledge Graph**](#-live-knowledge-graph-enrichment) · [**Vercel Sandbox**](#vercel-sandbox-6-tools) · [**Architecture**](#-architecture) · [**Integrate**](#-integration-recipes) · [**Docs**](#-docs)

</div>

---

## Branches & Variants

This repo ships **two production branches** so consumers can pick the surface that fits their environment:

| Branch | Tools | What's included | When to use |
|---|---|---|---|
| `main` | **42** | 36 universal portfolio + 6 Vercel Sandbox tools. Zero external dependencies — no Neo4j, no GitHub token, no API keys required. | You want a self-contained MCP UI surface that works the moment it's deployed. Sandbox tier activates the moment `VERCEL_TOKEN` is present. |
| `feature/knowledge-graph` *(this branch)* | **54** | Everything in `main` **plus** 7 Neo4j knowledge-graph tools, 4 Sprint 4 tools (resume export, GitHub stats, drafts, save), `get_oss_feed`, and `kg_semantic_search`. Live enrichment props (`live*`) wired into 9 fixture tools. | You want the full HR-grade portfolio with live graph backing. Needs Neo4j Aura credentials; degrades gracefully when absent. |

Both branches deploy identically to Vercel or Manufact Cloud. The 36 universal portfolio tools are bit-for-bit identical across branches.

```bash
# Universal (default for new consumers)
git clone -b main https://github.com/khiwniti/portfolio-mcp-ui.git

# Full knowledge-graph build (this branch)
git clone -b feature/knowledge-graph https://github.com/khiwniti/portfolio-mcp-ui.git
```

---

## Why this exists

> *Every portfolio is a static page. This one is a **protocol surface**.*

A normal portfolio is `index.html` plus a PDF. You read it. You leave. The recruiter never knows what was true.

`portfolio-mcp-ui` flips that. Every section — the hero, the projects grid, the skill chip you just hovered, the metric tile inside that project's KPI dashboard — is an **addressable tool call**. AI assistants don't paraphrase a bio: they fetch typed `structuredContent`, render the same widget the website renders, and cite the exact tool that returned it.

On top of the fixture layer, a live **Neo4j Aura** knowledge graph with 222 k nodes and 241 k relationships enriches 9 of those tools with real-time graph data — technology rankings, repo-to-tech relationships, deployment topology, and aggregated career stats — served as additive `live*` props so the response never fails even when the graph is unreachable.

```
┌─ Page                                  ┌─ Protocol
│                                        │
│   <section class="projects">           │   tools/call("get_projects")
│     <div class="card">…</div>          │     → get_project_detail(id)
│     <div class="card">…</div>          │        → get_project_techstack(id)
│     <div class="card">…</div>          │           → get_project_module(id, modId)
│   </section>                           │              → primary source
│                                        │
│   1 surface. 0 drill. read-only.       │   4 levels. typed. composable.
```

| | **Static portfolio** | **portfolio-mcp-ui** |
|---|---|---|
| Same source for site + AI? | no — bio in HTML, bio re-typed into prompts | yes — one tool surface, both consumers |
| Drill into a single skill? | scroll, hope, ctrl-F | `get_skill_detail("Kubernetes")` |
| Drill into the module that proves it? | impossible | `get_project_module("edge-stream", "mod-sse")` |
| Live graph-enriched context? | impossible | `kg_overview` + live KG props on 9 tools |
| Embeddable from any framework? | iframe a screenshot | call a tool, render the widget |
| Recruiter pastes a JD? | resend a PDF | `submit_contact_message` + JD-tailored evidence |

---

## What you get out of the box

<table>
<tr>
<td width="33%" valign="top">

### 54 typed tools
Every section, sub-section, primary source, write-back, knowledge graph query, GitHub ingestion, and drafts surface as a Zod-validated MCP tool. Tool registry auto-generated to `.mcp-use/tool-registry.d.ts` — full autocomplete in any consumer.

</td>
<td width="33%" valign="top">

### 39 responsive widgets
React 19 + theme-aware, mobile/tablet/desktop adaptive via a JS-based `useViewport()` hook, `McpUseProvider autoSize`. Cross-link via `sendFollowUpMessage` so the AI can drill deeper from inside a widget.

</td>
<td width="33%" valign="top">

### 4-level drill
`section → component → sub-component → primary source`. The full path from "Projects grid" to "the SSE module that ships 12k rps to 4 PoPs" is one chain of typed calls.

</td>
</tr>
<tr>
<td valign="top">

### Live knowledge graph
Neo4j Aura integration via `lib/graph-v4.ts`. 222 k nodes, 241 k relationships. 9 existing tools return `live*` props when the graph is reachable, with graceful fallback to fixture data when it is not.

</td>
<td valign="top">

### Deploy in one click
`vercel.json` + Hono `handle()` adapter. Push to main, get an MCP endpoint at `your-app.vercel.app/mcp`. Also: `mcp-use deploy` for Manufact Cloud.

</td>
<td valign="top">

### HR-grade depth
About → career journey → individual milestone. Skills → skill detail → per-language LOC stats. Designed by an architecture-led recruiter brief; every claim is drillable.

</td>
</tr>
</table>

---

## Quick Start

```bash
git clone <this-repo> portfolio-mcp-ui
cd portfolio-mcp-ui
npm install
npm run dev
```

That's it. The Inspector opens automatically. List tools, call any of them, and watch the widget render inline.

```bash
# verify the surface
curl -X POST http://localhost:3000/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' \
  | jq '.result.tools | length'
# → 48
```

### Optional: enable live knowledge graph

Copy `.env.example` to `.env` and fill in your Neo4j Aura credentials:

```bash
NEO4J_URI=neo4j+s://<instance-id>.databases.neo4j.io
NEO4J_USERNAME=<username>
NEO4J_PASSWORD=<password>
NEO4J_DATABASE=<database>
```

Without these values the server starts normally — KG-enriched tools return fixture data only and the 6 dedicated KG tools return a `"knowledge graph not configured"` message.

---

## Deploy to Vercel

Production deployment is a single `git push`. The repo ships with a complete Vercel config — Hono is adapted via `hono/vercel`'s `handle()` and every path is rewritten to one serverless function.

### Option 1 — CLI

```bash
npm i -g vercel
vercel --prod
```

### Option 2 — Git

1. Push the repo to GitHub/GitLab/Bitbucket.
2. **Import** at <https://vercel.com/new>.
3. Vercel auto-detects `vercel.json`, runs `mcp-use build`, deploys.

Set environment variables in the Vercel project dashboard (Settings → Environment Variables) for Neo4j Aura credentials if you want live KG enrichment in production.

Your MCP endpoint is live at:

```
https://<project>.vercel.app/mcp
```

### What ships inside the box

| File | Role |
|---|---|
| `vercel.json` | Routes every request to `/api/index`, sets 60s `maxDuration` and 1024 MB memory, opens CORS on `/mcp` and `/.well-known/*`, hardens headers. |
| `api/index.ts` | The Vercel function. Wraps `server.app` (the underlying Hono instance) with `handle()` from `hono/vercel`. |
| `index.ts` | Guards `server.listen()` behind `!process.env.VERCEL` so the same source runs on Vercel, Manufact Cloud, Docker, or `node dist/index.js` without forks. |
| `lib/graph-v5.ts` | Neo4j Aura adapter. Reads credentials via `getEnv()` (disk-based fallback for HMR). All public functions fail silently when KG is not configured. |
| `lib/sandbox-final.ts` | Vercel Sandbox adapter. `globalThis`-backed registry survives HMR reloads; credential-aware lifecycle helpers wrap `@vercel/sandbox`. |

### Plug it into Claude Desktop

After deploying, drop this into `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "portfolio": {
      "transport": {
        "type": "http",
        "url": "https://<project>.vercel.app/mcp"
      }
    }
  }
}
```

Restart Claude. Ask: *"call get_projects and show me edge-stream's metrics dashboard."* It just works.

### Production caveats

> **MCP sessions are per-request on serverless.** Vercel functions are stateless. Long-lived MCP sessions (server-initiated sampling, persistent subscriptions) need a stateful host. `portfolio-mcp-ui` is read-mostly and stateless-by-design, so this is a non-issue here.
>
> **Cold starts:** ~400ms on Vercel's Node runtime. `memory: 1024` is already configured.
>
> **Neo4j Aura latency:** KG enrichment queries add ~80–150ms per enriched tool call. Acceptable for detail pages; consider pre-warming or caching if used in high-traffic flows.

---

## Architecture

```
                ┌─────────────────────────────────────────────────────┐
                │             ANY MCP-CAPABLE HOST                    │
                │                                                     │
                │   ChatGPT · Claude · Cursor · custom React · Inspector
                └────────────────────┬────────────────────────────────┘
                                     │  JSON-RPC over Streamable HTTP
                                     ▼
   ┌──────────────────────────────────────────────────────────────────┐
   │   portfolio-mcp-ui  (Hono + mcp-use)                             │
   │                                                                  │
   │   ┌─ 42 Typed Tools ─────────┐    ┌─ 31 React Widgets ─────────┐ │
   │   │  • get_hero              │    │  • hero-section.tsx        │ │
   │   │  • get_projects          │◀──▶│  • projects-showcase.tsx   │ │
   │   │  • get_project_module    │    │  • project-module.tsx      │ │
   │   │  • kg_overview           │    │  • kg-overview.tsx         │ │
   │   │  • submit_contact_msg    │    │  • contact-confirmation    │ │
   │   │  • … 37 more             │    │  • … 26 more               │ │
   │   └──────────────────────────┘    └────────────────────────────┘ │
   │                          │                                       │
   │           ┌──────────────▼──────────────┐                        │
   │           │   Zod schemas + fixtures    │                        │
   │           │   evidence-backed claims    │                        │
   │           │   four-level drill graph    │                        │
   │           └──────────────┬──────────────┘                        │
   │                          │  live enrichment (optional)           │
   │           ┌──────────────▼──────────────┐                        │
   │           │   lib/graph-v4.ts           │                        │
   │           │   Neo4j Aura · 222k nodes   │                        │
   │           │   graceful degradation      │                        │
   │           └─────────────────────────────┘                        │
   └─────────────────┬────────────────────────────────────────────────┘
                     │  hono/vercel  handle()
                     ▼
                ┌────────────┐         ┌─────────────────┐
                │   Vercel   │   or    │  Manufact Cloud │   or  Docker / Bun / Node
                └────────────┘         └─────────────────┘
```

### Five design principles

1. **Tools, not endpoints.** `tools/call("get_projects")` reads the same way to an AI and to your React app. One contract, two consumers.
2. **Evidence over assertion.** Every claim returns a citable provenance trail — corroborating roles, projects, modules. Hover → highlight is implemented, not promised.
3. **Drill is data, not navigation.** "Click the chip" is just `sendFollowUpMessage("get_skill_detail …")`. The AI can do it without a click; the user can do it without a tool.
4. **Widgets own their state.** Filters, expansions, hover — local to the widget. Tools own server state. No `setFilter` tool, ever.
5. **Graceful degradation.** Fixture data is always returned. Neo4j enrichment is additive. If the graph is unreachable, every tool still responds in full.

---

## The 54-tool hierarchy

### Level 1 — Section roots (9 tools)

| Tool | Returns | Drill targets |
|---|---|---|
| `get_hero` | headline, location chip, CTAs, capability highlights | `get_hero_highlight`, `get_hero_stats` |
| `get_availability` | sticky status strip, response time, preferred roles | `get_availability_detail` |
| `get_about` | bio, value props, principles | `get_career_journey` |
| `get_skills(category?)` | filterable grid with evidence sidebar | `get_skill_detail` |
| `get_experience(tech?)` | vertical timeline, expandable role cards | `get_role_detail` |
| `get_projects(tag?)` | card grid with status badges + filter chips | `get_project_detail`, `get_project_metrics` |
| `get_open_source` | OSS contributions list | `get_oss_contribution` |
| `get_education` | degrees + certifications | `get_education_item` |
| `get_contact` | email, channels, FAQ entry points | `get_contact_channel`, `get_contact_faq`, `submit_contact_message` |

### Level 2 — Component drills (12 tools)

| Tool | Returns |
|---|---|
| `get_hero_highlight(id)` | one capability + corroborating skills/roles/projects |
| `get_hero_stats` | career stats card (years, projects, OSS commits) |
| `get_availability_detail` | rolling calendar, comp/location/team preferences |
| `get_career_journey` | full chronological journey with milestone markers |
| `get_skill_detail(skill_id)` | evidence list, level/years, sibling skills, related roles + projects |
| `get_role_detail(role_id)` | scope, impact metrics, decisions, achievements, stack |
| `get_project_detail(project_id)` | description, stack, team, timeline, changelog, related roles |
| `get_project_metrics(project_id)` | KPI dashboard with sparkline trends |
| `get_oss_contribution(id)` | single PR/issue/release with diff stats |
| `get_education_item(id)` | one degree or certification with curriculum |
| `get_contact_channel(id)` | one channel: handle, best-for, response time |
| `get_contact_faq` | FAQ index |

### Level 3 — Sub-component drills (8 tools)

| Tool | Returns |
|---|---|
| `get_career_milestone(id)` | a single milestone with full story |
| `get_language_stat(language)` | LOC, projects, frameworks for one language |
| `get_role_achievement(roleId, achId)` | one quantified achievement |
| `get_role_decision(roleId, decId)` | one decision with rationale + outcome |
| `get_project_techstack(project_id)` | full tech breakdown by category |
| `get_contact_faq_item(id)` | one FAQ entry |
| `list_posts(category?, tag?)` | blog / writing index |
| `search_content(query, section?)` | scoped full-text search |

### Level 4 — Primary sources (2 tools)

| Tool | Returns |
|---|---|
| `get_project_language_stat(project_id, language)` | per-project LOC / file count / hot modules for that language |
| `get_project_module(project_id, module_id)` | a single source-tree module with purpose + linked code excerpt |

### Cross-cutting (5 tools)

| Tool | Returns |
|---|---|
| `get_domains` | portfolio domain map (canonical URLs, email roots) |
| `get_portfolio_stats` | aggregate metrics across all sections |
| `search_all(query, limit?)` | global search across every surface |
| `track_event(event, section?, metadata?)` | analytics write-back |
| `submit_contact_message(name, email, message)` | validated write-back → confirmation widget |

### Knowledge graph (7 tools)

Backed by a live Neo4j Aura instance — gracefully degrades when `NEO4J_*` env vars are absent.

| Tool | Returns |
|---|---|
| `kg_health` | connection probe — node count, relationship count, server version, response time |
| `kg_schema` | labels with counts, relationship types, list of indexes (BTREE / FULLTEXT / VECTOR) |
| `kg_person_overview` | Person node: authored repos, deployments owned, top languages aggregated across the graph |
| `kg_skill_evidence(skill)` | Technology node lookup + every repo using it, with GitHub URLs |
| `kg_search(query, label?, limit?)` | label-scoped substring search across Person / Repo / Technology / File nodes |
| `kg_semantic_search(query, label?, limit?)` | three-tier search — vector index → fulltext index → tokenised CONTAINS fallback |
| `kg_query(cypher, params?, limit?)` | execute a read-only Cypher query (write clauses rejected at the parser layer) |

### Vercel Sandbox (6 tools)

Opt-in cloud micro-VMs — activate the moment `VERCEL_TOKEN` / `VERCEL_TEAM_ID` / `VERCEL_PROJECT_ID` are set. Without credentials, every sandbox tool returns a clean "not configured" widget or error rather than crashing.

| Tool | Returns |
|---|---|
| `sandbox_console` | registry dashboard: KPI cards (total / running / stopped / errored), per-sandbox cards with last-3 commands, credential-health pill — widget: `sandbox-console` |
| `sandbox_create(name?, gitUrl?, gitRevision?, tarballUrl?, ports?, runtime?, timeoutMs?, vcpus?)` | spawns a new cloud VM, optionally clones a git source, exposes ports, returns the `sandbox-detail` widget with public URLs |
| `sandbox_run(name, command, args?, env?, cwd?)` | runs a shell command inside the sandbox — widget renders stdout/stderr in terminal style with exit code + duration chips |
| `sandbox_write_files(name, files)` | bulk file write into a sandbox with optional POSIX `mode` per file |
| `sandbox_stop(name)` | idempotent stop — updates registry status to `"stopped"` |
| `sandbox_status(name)` | deep drill: metadata grid, public URLs per exposed port, full reverse-chrono command log with collapsible output |

> The in-memory sandbox registry is promoted to a `globalThis` singleton so it survives Vite HMR module reloads and serverless cold starts within the same warm function instance.

---

## Live knowledge graph enrichment

Nine existing tools return an extra `live*` prop when Neo4j Aura is reachable. The prop is `null` when the graph is offline — the rest of the response is unchanged.

| Tool | Live prop | Source |
|---|---|---|
| `get_hero` | `liveKGSummary` | Person node + aggregate repo/deployment counts |
| `get_skills` | `liveKGTechRankings` | Technology nodes ranked by repo count |
| `get_skill_detail` | `liveKGTechDetail` | Technology node + repos using it |
| `get_experience` | `liveKGRoleEvidence` | Repos and deployments correlated to role dates |
| `get_projects` | `liveKGRepos` | Repo nodes with technology lists |
| `get_project_detail` | `liveKGTechStack` | Full tech stack from graph relationships |
| `get_project_techstack` | `liveKGRelatedTech` | Co-occurring technologies in the graph |
| `get_about` | `liveKGPersonBio` | Person node profile fields |
| `get_portfolio_stats` | `liveKGAggregates` | Aggregate node/relationship stats from Aura |

**Fixture data is always returned first.** If the graph query fails or is unconfigured, the tool response is identical to what it would be without the KG integration.

---

## A real drill in five calls

> The recruiter wants to know if you actually shipped SSE at scale, or if it's just on the resume.

```bash
# 1. start at the section root
tools/call get_projects { "tag": "streaming" }
   → 3 projects matching "streaming"

# 2. open one
tools/call get_project_detail { "project_id": "edge-stream" }
   → full description + 6-entry changelog + team + related roles

# 3. see what it's built with
tools/call get_project_techstack { "project_id": "edge-stream" }
   → categorised stack: runtime, infra, observability, data

# 4. drill into the language
tools/call get_project_language_stat { "project_id": "edge-stream", "language": "typescript" }
   → 18.4k LOC, 142 files, 7 hot modules

# 5. open the module that ships the proof
tools/call get_project_module { "project_id": "edge-stream", "module_id": "mod-sse" }
   → sse/ — purpose: "edge SSE fan-out", excerpt:
     export function sse(init: ...): Response { ... }
```

Five tool calls. Page → primary source. Same chain works from a human clicking chips or an AI following `sendFollowUpMessage` cues.

---

## Integration Recipes

### React (`mcp-use` client)

```ts
import { MCPClient } from "mcp-use/client";

const client = new MCPClient({
  mcpServers: {
    portfolio: { url: "https://<project>.vercel.app/mcp" }
  }
});

const session = await client.createSession("portfolio");
const projects = await session.callTool("get_projects", { tag: "ai" });
// projects.structuredContent → fully typed via tool-registry.d.ts
```

### Next.js Server Component

```tsx
// app/portfolio/page.tsx
import { MCPClient } from "mcp-use/client";

export default async function Page() {
  const client = new MCPClient({
    mcpServers: { p: { url: process.env.MCP_URL! } }
  });
  const session = await client.createSession("p");
  const { structuredContent } = await session.callTool("get_hero", {});

  return <HeroSection {...structuredContent} />;
}
```

### Claude API with `mcp_servers`

```ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const msg = await client.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: 4096,
  mcp_servers: [
    { type: "url", url: "https://<project>.vercel.app/mcp", name: "portfolio" }
  ],
  messages: [{ role: "user", content: "What did Khiw ship at Northbeam?" }]
});
```

### ChatGPT (Apps SDK)

Drop the deployed URL into a Custom GPT's Action config. Every tool call returns a widget; the widget renders natively inside the chat.

### Raw JSON-RPC

```bash
curl -X POST https://<project>.vercel.app/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call",
       "params":{"name":"get_skill_detail","arguments":{"skill_id":"kubernetes"}}}'
```

Full recipe library lives in **[USAGE_GUIDE.md](./USAGE_GUIDE.md)** and integration plans for migrating an existing portfolio site live in **[INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)**.

---

## Project Structure

```
portfolio-mcp-ui/
├── index.ts                     # 54 tools, fixtures, MCPServer init, Auth0 wiring
├── lib/
│   ├── graph-v5.ts              # Neo4j Aura adapter (graceful degradation)
│   ├── github-v2.ts             # cached GitHub API client (graceful, optional token)
│   └── sandbox-final.ts         # Vercel Sandbox adapter + globalThis registry
├── api/
│   └── index.ts                 # Vercel handler — wraps server.app via hono/vercel
├── vercel.json                  # routes, headers, CORS, function config
├── resources/                   # 39 React widgets, fully responsive
│   ├── hero-section.tsx
│   ├── projects-showcase.tsx
│   ├── project-detail.tsx
│   ├── project-techstack.tsx
│   ├── project-language-stat.tsx
│   ├── project-module.tsx
│   ├── kg-overview.tsx          # Knowledge graph dashboard widget
│   ├── kg-search-results.tsx
│   ├── sandbox-console.tsx      # Vercel Sandbox registry widget
│   ├── sandbox-detail.tsx
│   ├── sandbox-command-result.tsx
│   ├── … 25 more
│   └── contact-confirmation.tsx
├── public/                      # favicon, icon
├── README.md                    # you are here
├── USAGE_GUIDE.md               # 16-section integration handbook
├── INTEGRATION_GUIDE.md         # 5-sprint roadmap to wire khiw.console v3
├── .env.example                 # Neo4j Aura credential template
├── package.json
└── tsconfig.json
```

---

## Verify locally before pushing

```bash
npm run dev              # Inspector + HMR
npm run build            # mcp-use build → dist/
npx tsc --noEmit         # strict type check (passes)

# confirm tool count
curl -sX POST http://localhost:3000/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' \
  | jq '.result.tools | length'
# → 54

# confirm KG enrichment (requires .env with valid credentials)
curl -sX POST http://localhost:3000/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call",
       "params":{"name":"kg_health","arguments":{}}}' \
  | jq '.result.structuredContent.configured'
# → true  (or false if .env is absent — graceful)

# confirm Vercel Sandbox health (requires VERCEL_TOKEN / TEAM_ID / PROJECT_ID)
curl -sX POST http://localhost:3000/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call",
       "params":{"name":"sandbox_console","arguments":{}}}' \
  | jq '.result.structuredContent.configured'
# → true  (or false if env vars absent — graceful)
```

---

## Who this is for

| If you are… | This repo lets you… |
|---|---|
| **A senior engineer** | Showcase architecture decisions as drillable, evidence-backed tool calls instead of bullet points. |
| **A team that ships AI products** | Demonstrate MCP-native UX patterns: cross-widget drilling, `sendFollowUpMessage` flows, evidence provenance, live graph enrichment. |
| **A recruiter** | Connect any MCP host to one URL and explore the candidate at the depth you need — 30 seconds or 30 minutes. |
| **An indie hacker** | Fork it, swap the fixtures at the top of `index.ts`, deploy your own protocol-native portfolio in an afternoon. |
| **A studio / agency** | Use it as a reference architecture for any "deep content with drill" product: e-commerce, docs, internal wikis. |

---

## Docs

| Doc | Audience | Length |
|---|---|---|
| [**README.md**](./README.md) | First-time visitor | this file |
| [**USAGE_GUIDE.md**](./USAGE_GUIDE.md) | Any frontend / host developer integrating the server | 16 sections |
| [**INTEGRATION_GUIDE.md**](./INTEGRATION_GUIDE.md) | Teams porting an existing portfolio site to MCP | 5 sprints |

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Protocol | **MCP** (Streamable HTTP) | Same surface for AI + UI |
| Server framework | **mcp-use** on Hono | Tiny core, native React widget pipeline, type-safe tool registry |
| Validation | **Zod** (4.3) | Schemas double as runtime guards + LLM-facing descriptions |
| Widgets | **React 19** | Concurrent rendering, useTransition, autoSize via `McpUseProvider` |
| Build | **mcp-use build** | Bundles widgets, generates tool registry types |
| Knowledge graph | **Neo4j Aura** | Graph RAG over 222k nodes; enriches 9 tools with live data |
| Edge runtime | **Vercel Node + `hono/vercel`** | One file deployment, free tier covers it |
| Type system | **TypeScript 5.9 strict** | Zod-inferred props, auto-generated tool registry |

---

## Roadmap

- [x] 36-tool universal portfolio hierarchy across 4 drill levels
- [x] 7 knowledge graph tools (`kg_health`, `kg_schema`, `kg_query`, `kg_person_overview`, `kg_skill_evidence`, `kg_search`, `kg_semantic_search`)
- [x] Live Neo4j Aura enrichment on 9 existing tools (graceful degradation)
- [x] 6 Vercel Sandbox tools (`sandbox_create`, `sandbox_run`, `sandbox_write_files`, `sandbox_stop`, `sandbox_status`, `sandbox_console`)
- [x] 39 fully responsive widgets (mobile / tablet / desktop via `useViewport()`)
- [x] Vercel one-click deploy via `hono/vercel` adapter
- [x] Integration handbook + sprint roadmap docs
- [x] JD-tailored resume PDF export (`get_resume_pdf`)
- [x] OAuth-gated drafts surface (`get_drafts` / `save_draft` via Auth0 proxy)
- [x] Live GitHub ingestion (`get_github_stats` / `get_oss_feed`)
- [x] Three-tier semantic KG search — vector → fulltext → CONTAINS fallback
- [ ] Real-time availability calendar sync (Google Calendar / Cal.com)
- [ ] GitHub webhook live OSS contribution feed
- [ ] khiw.console v3 frontend wiring (Sprints 1–5 of `INTEGRATION_GUIDE.md`)

---

## License

MIT — fork freely. Attribution appreciated but not required.

---

<div align="center">

```
            ┌─────────────────────────────────────────┐
            │   the portfolio  is  the  protocol      │
            └─────────────────────────────────────────┘
```

**Built with `mcp-use` · Powered by `Hono` · Enriched by `Neo4j Aura` · Deployed on `Vercel`**

<sub>Have feedback? Open an issue or hit `submit_contact_message` — yes, that's a real tool.</sub>

</div>
