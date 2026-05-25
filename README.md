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

**36 typed tools · 30 interactive widgets · 4-level drill · zero static HTML · zero external dependencies**

[![MCP](https://img.shields.io/badge/MCP-0.10.0-9333ea?style=for-the-badge&logo=anthropic&logoColor=white)](https://modelcontextprotocol.io)
[![mcp-use](https://img.shields.io/badge/mcp--use-latest-22c55e?style=for-the-badge&logo=node.js&logoColor=white)](https://mcp-use.com)
[![Vercel](https://img.shields.io/badge/deploy-Vercel-000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-f59e0b?style=for-the-badge)](LICENSE)

<sub>built with `mcp-use` · powered by `Hono` · rendered by `React 19` · validated by `Zod`</sub>

[**Quick Start**](#-quick-start) · [**Deploy**](#-deploy-to-vercel) · [**Tool Catalog**](#-the-36-tool-hierarchy) · [**Architecture**](#-architecture) · [**Integrate**](#-integration-recipes) · [**Docs**](#-docs)

</div>

---

## Why this exists

> *Every portfolio is a static page. This one is a **protocol surface**.*

A normal portfolio is `index.html` plus a PDF. You read it. You leave. The recruiter never knows what was true.

`portfolio-mcp-ui` flips that. Every section — the hero, the projects grid, the skill chip you just hovered, the metric tile inside that project's KPI dashboard — is an **addressable tool call**. AI assistants don't paraphrase a bio: they fetch typed `structuredContent`, render the same widget the website renders, and cite the exact tool that returned it.

The server is **purely fixture-backed and self-contained** — works offline, deploys anywhere, no API keys ever required. Clone, install, push to Vercel; that is the entire setup story.

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
| External service dependencies? | many — CMS, analytics, embeds | zero — fixtures only |
| Embeddable from any framework? | iframe a screenshot | call a tool, render the widget |
| Recruiter pastes a JD? | resend a PDF | `submit_contact_message` + tailored evidence |

---

## What you get out of the box

<table>
<tr>
<td width="33%" valign="top">

### 36 typed tools
Every section, sub-section, primary source, and write-back surfaced as a Zod-validated MCP tool. Tool registry auto-generated to `.mcp-use/tool-registry.d.ts` — full autocomplete in any consumer.

</td>
<td width="33%" valign="top">

### 30 responsive widgets
React 19 + theme-aware, mobile/tablet/desktop adaptive via a JS-based `useViewport()` hook, `McpUseProvider autoSize`. Cross-link via `sendFollowUpMessage` so the AI can drill deeper from inside a widget.

</td>
<td width="33%" valign="top">

### 4-level drill
`section → component → sub-component → primary source`. The full path from "Projects grid" to "the SSE module that ships 12k rps to 4 PoPs" is one chain of typed calls.

</td>
</tr>
<tr>
<td valign="top">

### Zero external dependencies
No database, no API keys, no third-party services. Every response comes from typed fixtures inside the repo. Clone and run — it just works.

</td>
<td valign="top">

### Deploy anywhere
Vercel, Docker, Bun, Cloudflare Workers, plain Node. `vercel.json` + Hono `handle()` adapter ship in the box. Push to main, get an MCP endpoint.

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

That's it. The Inspector opens automatically. List tools, call any of them, and watch the widget render inline. No `.env` file. No credentials. No external services to provision.

```bash
# verify the surface
curl -X POST http://localhost:3000/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' \
  | jq '.result.tools | length'
# → 36
```

---

## Deploy to Vercel

Production deployment is a single `git push`. The repo ships with a complete Vercel config — Hono is adapted via `hono/vercel`'s `handle()` and every path is rewritten to one serverless function. **No environment variables required.**

### Option 1 — CLI

```bash
npm i -g vercel
vercel --prod
```

### Option 2 — Git

1. Push the repo to GitHub/GitLab/Bitbucket.
2. **Import** at <https://vercel.com/new>.
3. Vercel auto-detects `vercel.json`, runs `mcp-use build`, deploys.

Your MCP endpoint is live at:

```
https://<project>.vercel.app/mcp
```

### What ships inside the box

| File | Role |
|---|---|
| `vercel.json` | Routes every request to `/api/index`, sets 60s `maxDuration` and 1024 MB memory, opens CORS on `/mcp` and `/.well-known/*`, hardens headers. |
| `api/index.ts` | The Vercel function. Wraps `server.app` (the underlying Hono instance) with `handle()` from `hono/vercel`. |
| `index.ts` | Guards `server.listen()` behind `!process.env.VERCEL` so the same source runs on Vercel, Docker, Bun, or `node dist/index.js` without forks. |

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
   │   ┌─ 36 Typed Tools ─────────┐    ┌─ 30 React Widgets ─────────┐ │
   │   │  • get_hero              │    │  • hero-section.tsx        │ │
   │   │  • get_projects          │◀──▶│  • projects-showcase.tsx   │ │
   │   │  • get_project_module    │    │  • project-module.tsx      │ │
   │   │  • get_skill_detail      │    │  • skill-detail.tsx        │ │
   │   │  • submit_contact_msg    │    │  • contact-confirmation    │ │
   │   │  • … 31 more             │    │  • … 25 more               │ │
   │   └──────────────────────────┘    └────────────────────────────┘ │
   │                          │                                       │
   │           ┌──────────────▼──────────────┐                        │
   │           │   Zod schemas + fixtures    │                        │
   │           │   evidence-backed claims    │                        │
   │           │   four-level drill graph    │                        │
   │           └─────────────────────────────┘                        │
   └─────────────────┬────────────────────────────────────────────────┘
                     │  hono/vercel  handle()
                     ▼
                ┌────────────┐         ┌─────────────────┐
                │   Vercel   │   or    │  Docker / Bun   │   or  Cloudflare Workers / Node
                └────────────┘         └─────────────────┘
```

### Five design principles

1. **Tools, not endpoints.** `tools/call("get_projects")` reads the same way to an AI and to your React app. One contract, two consumers.
2. **Evidence over assertion.** Every claim returns a citable provenance trail — corroborating roles, projects, modules. Hover → highlight is implemented, not promised.
3. **Drill is data, not navigation.** "Click the chip" is just `sendFollowUpMessage("get_skill_detail …")`. The AI can do it without a click; the user can do it without a tool.
4. **Widgets own their state.** Filters, expansions, hover — local to the widget. Tools own server state. No `setFilter` tool, ever.
5. **Graceful degradation.** Fixture data is always returned. The server is fully self-contained.

---

## The 36-tool hierarchy

### Level 1 — Section roots (12 tools)

| Tool | Returns | Drill targets |
|---|---|---|
| `get_hero` | headline, location chip, CTAs, capability highlights | `get_hero_highlight`, `get_hero_stats` |
| `get_availability` | sticky status strip, response time, preferred roles | `get_availability_detail` |
| `get_skills(category?)` | filterable grid with evidence sidebar | `get_skill_detail` |
| `get_experience(tech?)` | vertical timeline, expandable role cards | `get_role_detail` |
| `get_projects(tag?)` | card grid with status badges + filter chips | `get_project_detail`, `get_project_metrics` |
| `get_open_source` | OSS contributions list | `get_oss_contribution` |
| `get_education` | degrees + certifications | `get_education_item` |
| `get_contact` | email, channels, FAQ entry points | `get_contact_channel`, `get_contact_faq`, `submit_contact_message` |
| `get_about` | bio, value props, principles | `get_career_journey` |
| `get_portfolio_stats` | aggregate metrics across all sections | — |
| `get_domains` | portfolio domain map (canonical URLs, email roots) | — |
| `list_posts(category?, tag?)` | blog / writing index | — |

### Level 2 — Component drills (13 tools)

| Tool | Returns |
|---|---|
| `get_hero_highlight(id)` | one capability + corroborating skills/roles/projects |
| `get_hero_stats` | career stats card (years, projects, OSS commits) |
| `get_availability_detail` | rolling calendar, comp/location/team preferences |
| `get_skill_detail(skill_id)` | evidence list, level/years, sibling skills, related roles + projects |
| `get_role_detail(role_id)` | scope, impact metrics, decisions, achievements, stack |
| `get_project_detail(project_id)` | description, stack, team, timeline, changelog, related roles |
| `get_project_metrics(project_id)` | KPI dashboard with sparkline trends |
| `get_project_techstack(project_id)` | full tech breakdown by category |
| `get_career_journey` | full chronological journey with milestone markers |
| `get_contact_channel(id)` | one channel: handle, best-for, response time |
| `get_contact_faq` | FAQ index |
| `get_oss_contribution(id)` | single PR/issue/release with diff stats |
| `get_education_item(id)` | one degree or certification with curriculum |

### Level 3 — Sub-component drills (7 tools)

| Tool | Returns |
|---|---|
| `get_language_stat(language)` | LOC, projects, frameworks for one language |
| `get_role_achievement(roleId, achId)` | one quantified achievement |
| `get_role_decision(roleId, decId)` | one decision with rationale + outcome |
| `get_project_language_stat(project_id, language)` | per-project LOC / file count / hot modules for that language |
| `get_career_milestone(id)` | a single milestone with full story |
| `get_contact_faq_item(id)` | one FAQ entry |
| `search_content(query, section?)` | scoped full-text search |

### Level 4 — Primary sources (1 tool)

| Tool | Returns |
|---|---|
| `get_project_module(project_id, module_id)` | a single source-tree module with purpose + linked code excerpt |

### Cross-cutting / write-back (3 tools)

| Tool | Returns |
|---|---|
| `search_all(query, limit?)` | global search across every surface |
| `track_event(event, section?, metadata?)` | analytics write-back |
| `submit_contact_message(name, email, message)` | validated write-back → confirmation widget |

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
       "params":{"name":"get_hero","arguments":{}}}'
```

Full recipe library lives in **[USAGE_GUIDE.md](./USAGE_GUIDE.md)** and integration plans for migrating an existing portfolio site live in **[INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)**.

---

## Project Structure

```
portfolio-mcp-ui/
├── index.ts                     # 36 tools, fixtures, MCPServer init
├── api/
│   └── index.ts                 # Vercel handler — wraps server.app via hono/vercel
├── vercel.json                  # routes, headers, CORS, function config
├── resources/                   # 30 React widgets, fully responsive
│   ├── hero-section.tsx
│   ├── projects-showcase.tsx
│   ├── project-detail.tsx
│   ├── project-techstack.tsx
│   ├── project-language-stat.tsx
│   ├── project-module.tsx
│   ├── skill-detail.tsx
│   ├── … 22 more
│   └── contact-confirmation.tsx
├── public/                      # favicon, icon
├── README.md                    # you are here
├── USAGE_GUIDE.md               # 16-section integration handbook
├── INTEGRATION_GUIDE.md         # 5-sprint roadmap to wire khiw.console v3
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
# → 36
```

---

## Who this is for

| If you are… | This repo lets you… |
|---|---|
| **A senior engineer** | Showcase architecture decisions as drillable, evidence-backed tool calls instead of bullet points. |
| **A team that ships AI products** | Demonstrate MCP-native UX patterns: cross-widget drilling, `sendFollowUpMessage` flows, evidence provenance. |
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
| Edge runtime | **Vercel Node + `hono/vercel`** | One file deployment, free tier covers it |
| Type system | **TypeScript 5.9 strict** | Zod-inferred props, auto-generated tool registry |

---

## Roadmap

- [x] 36-tool hierarchy across 4 drill levels
- [x] 30 fully responsive widgets (mobile / tablet / desktop via `useViewport()`)
- [x] Fixture-backed universal portfolio — zero external dependencies
- [x] Vercel one-click deploy via `hono/vercel` adapter
- [x] Integration handbook + sprint roadmap docs
- [ ] Optional adapter pattern for live data sources (out of v1 scope)

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

**Built with `mcp-use` · Powered by `Hono` · Deployed on `Vercel`**

<sub>Have feedback? Open an issue or hit `submit_contact_message` — yes, that's a real tool.</sub>

</div>
