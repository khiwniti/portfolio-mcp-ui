# Portfolio MCP Integration Guide
## Sprint-by-Sprint Implementation for khiw.dev

**Status**: Ready for integration  
**MCP Server**: `portfolio-mcp-ui` (54 tools, 39 widgets)  
**Endpoint**: `https://fast-pulse-37yfv.run.mcp-use.com/mcp`  
**Timeline**: 5 sprints, 95 hours

---

> **Status update (2026-05-26):** The MCP server is live with **54 tools and 39 widgets** across five capability tiers:
> - **36 universal portfolio tools** — fixture-only, zero external dependencies, always available
> - **7 Knowledge Graph tools** — Neo4j Aura backed (222k nodes, 241k relationships), graceful degradation
> - **5 Sprint 4/5 advanced tools** — JD resume export, live GitHub ingestion, OAuth-gated drafts
> - **6 Vercel Sandbox tools** — opt-in cloud micro-VMs for live code demos and per-recruiter spin-ups
>
> Sprints 1–4 are fully implemented server-side. Sprint 5 UI integration requires work in the `khiw.console v3` repository.

## Overview: The 54 Tools

### Tier 1 — Section Renderers (6 tools, top-level)
All return interactive widgets that can be embedded directly:
- `get_hero` — headline, subhead, CTAs, highlights
- `get_availability` — sticky status strip
- `get_skills(category?)` — filterable skill grid
- `get_experience(tech?)` — experience timeline
- `get_projects(tag?)` — projects showcase
- `get_contact` — contact section + form

### Tier 2 — Deep-Drill Tools (24 tools, sub-sections)
Each tier-1 tool has 3–4 drill-down partners:
- Hero: `get_hero_highlight`, `get_hero_stats`
- Availability: `get_availability_detail`
- Skills: `get_skill_detail`, `get_language_stat`
- Experience: `get_role_detail`, `get_role_achievement`, `get_role_decision`
- Projects: `get_project_detail`, `get_project_metrics`, `get_project_techstack`, `get_project_language_stat`, `get_project_module`
- Contact: `get_contact_channel`, `submit_contact_message`, `get_contact_faq`, `get_contact_faq_item`
- About: `get_about`, `get_career_journey`, `get_career_milestone`
- Open Source: `get_open_source`, `get_oss_contribution`
- Education: `get_education`, `get_education_item`

### Tier 3 — Discovery & Analytics (6 new tools)
For search, domain lookups, analytics:
- `get_domains` — portfolio domain info + infrastructure
- `get_portfolio_stats` — aggregate career/code/project stats
- `list_posts` — blog posts (filterable by category/tag)
- `search_content(query, section?)` — search across sections
- `search_all(query, limit?)` — global search
- `track_event(eventName, section?, metadata?)` — analytics

### Tier 4 — Knowledge Graph Tools (7 live-graph tools)

These tools query the live Neo4j Aura instance (`resume-knowladge-graph`). All are optional — the server runs and the 36 universal portfolio tools respond with fixture data whether or not the graph is connected.

- `kg_health` — connectivity check with node/relationship counts and server version
- `kg_schema` — labels with counts, relationship types, list of indexes (BTREE / FULLTEXT / VECTOR)
- `kg_person_overview` — Person node summary (repos, deployments, languages)
- `kg_skill_evidence(skill_name)` — Technology node + repos using it
- `kg_search(query, label?, limit?)` — label-scoped substring search across Person / Repo / Technology / File nodes
- `kg_semantic_search(query, labels?, limit?)` — three-tier search: vector index → fulltext index → tokenised CONTAINS fallback
- `kg_query(cypher, params?, limit?)` — read-only Cypher execution (write clauses rejected at parser layer)

### Tier 5 — Sprint 4/5 Advanced Tools (5 tools)

- `get_resume_pdf(jobDescription, format?, sections?)` — JD-keyword scoring and tailored resume JSON
- `get_github_stats(username?)` — 15-minute cached GitHub repo/language stats
- `get_drafts(apiKey?)` — protected reads of saved drafts (Auth0 OAuth or `DRAFTS_API_KEY`)
- `save_draft(title, body, section?, tags?, apiKey?)` — protected write
- `get_oss_feed(limit?)` — live GitHub public events (PushEvent, PRs, issues, releases)

### Tier 6 — Vercel Sandbox Tools (6 opt-in cloud micro-VMs)

These tools come online when `VERCEL_TOKEN` / `VERCEL_TEAM_ID` / `VERCEL_PROJECT_ID` are configured. Without credentials, every sandbox tool returns a clean "not configured" widget — no other tier is affected.

- `sandbox_console` — registry dashboard (KPI cards, per-sandbox history, credential health)
- `sandbox_create(name?, gitUrl?, gitRevision?, tarballUrl?, ports?, runtime?, timeoutMs?, vcpus?)` — spawn a cloud VM with optional git clone source
- `sandbox_run(name, command, args?, env?, cwd?)` — execute shell commands inside a sandbox
- `sandbox_write_files(name, files)` — bulk file writes with optional POSIX mode
- `sandbox_stop(name)` — idempotent shutdown
- `sandbox_status(name)` — full command log with stdout/stderr and exposed-port public URLs

The in-memory sandbox registry is a `globalThis` singleton so it survives Vite HMR cycles in development and warm-instance reuse in serverless production.

**Live enrichment on existing tools** — 9 of the 36 portfolio tools now return a `live*` prop when the graph is reachable:

| Tool | Prop | Data |
|---|---|---|
| `get_hero_stats` | `liveSummary` | 230 repos, 22 deployments, top languages |
| `get_skills` | `liveTechRankings` | 60 technologies ranked by repo count |
| `get_skill_detail` | `liveEvidence` | Technology node + repos using it |
| `get_projects` | `liveStats` | 230 repos, 22 deployments |
| `get_project_detail` | `liveRepo` / `liveTechStack` | Repo node + tech relationships |
| `get_project_techstack` | `liveTechStack` | Tech stack from graph edges |
| `get_open_source` | `liveRepoCount` / `liveTopRepos` | 230 repos, top 10 by tech breadth |
| `get_portfolio_stats` | `liveGraphStats` | 222k nodes, 241k relationships |
| `get_language_stat` | `liveEvidence` | Repos using the language with GitHub URLs |

Set these environment variables to activate the optional tiers (Vercel dashboard → Settings → Environment Variables):

```env
# Tier 4 — Knowledge Graph (Neo4j Aura)
NEO4J_URI=neo4j+s://<instance>.databases.neo4j.io
NEO4J_USERNAME=<username>
NEO4J_PASSWORD=<password>
NEO4J_DATABASE=<database>
OPENAI_API_KEY=sk-...                # optional — turns kg_semantic_search vector tier on

# Tier 5 — Sprint 4/5 advanced tools
GITHUB_TOKEN=ghp_...                 # optional — raises GitHub rate limit from 60 to 5000 req/hour
GITHUB_USERNAME=<username>           # default user for get_oss_feed and get_github_stats
DRAFTS_API_KEY=<secret>              # shared-secret guard for get_drafts / save_draft
# — or use Auth0 OAuth proxy instead —
AUTH0_DOMAIN=<tenant>.auth0.com
AUTH0_CLIENT_ID=...
AUTH0_CLIENT_SECRET=...
AUTH0_AUDIENCE=https://your-portfolio-api/

# Tier 6 — Vercel Sandbox
VERCEL_TOKEN=vcp_...                 # https://vercel.com/account/tokens
VERCEL_TEAM_ID=team_...              # Settings → General → Team ID
VERCEL_PROJECT_ID=prj_...            # Project → Settings → General → Project ID
```

**None of these are required.** The 36 universal portfolio tools always work with zero environment configuration.

---

## Sprint 1: Data Migration & Core Wiring (16h)

### Goal
Remove all hardcoded data arrays from the portfolio codebase and replace with live MCP calls.

### Current State (What to Replace)
In your portfolio code (e.g., `khiw.console v3.jsx`), you likely have:
```javascript
// ❌ Hardcoded data — remove these
const PROFILE = { name: "...", headline: "..." };
const SKILLS = [{ name: "TypeScript", ... }, ...];
const CAREER = [{ company: "Lumen", ... }, ...];
const PROJECTS = [{ id: "mcp-portfolio-kit", ... }, ...];
const STATS = { yearsOfExperience: 8, ... };
```

### Task 1.1: Wire get_hero (2h)
Replace hardcoded hero data with live tool call.

**Before:**
```javascript
// khiw.console v3.jsx
const HeroSection = () => {
  const heroData = {
    name: "Alex Kim",
    headline: "Full-stack engineer building developer tools...",
    // 50+ more lines of hardcoded data
  };
  return <HeroWidget data={heroData} />;
};
```

**After:**
```javascript
import { useMCPTool } from './hooks/useMCPTool';

const HeroSection = () => {
  const { data: heroData, loading, error } = useMCPTool('get_hero');
  
  if (loading) return <HeroSkeleton />;
  if (error) return <ErrorState error={error} />;
  
  return <HeroWidget data={heroData} />;
};
```

**Helper Hook** (create `hooks/useMCPTool.ts`):
```typescript
import { MCPClient } from 'mcp-use/client';

const mcpClient = new MCPClient({
  serverUrl: 'https://fast-pulse-37yfv.run.mcp-use.com/mcp',
});

export function useMCPTool(toolName: string, input?: any) {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    setLoading(true);
    mcpClient.callTool(toolName, input || {})
      .then(result => {
        setData(result.structuredContent);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [toolName, JSON.stringify(input)]);

  return { data, loading, error };
}
```

### Task 1.2: Wire get_skills, get_experience, get_projects (3h)
Apply the same pattern to the three largest data arrays:

```javascript
// Skills Grid
const SkillsSection = () => {
  const { data: skillsData, loading } = useMCPTool('get_skills');
  if (loading) return <SkillsSkeleton />;
  return <SkillsGrid skills={skillsData?.skills} />;
};

// Experience Timeline
const ExperienceSection = () => {
  const { data: expData, loading } = useMCPTool('get_experience');
  if (loading) return <ExperienceSkeleton />;
  return <ExperienceTimeline roles={expData?.roles} />;
};

// Projects Showcase
const ProjectsSection = () => {
  const { data: projData, loading } = useMCPTool('get_projects');
  if (loading) return <ProjectsSkeleton />;
  return <ProjectsShowcase projects={projData?.projects} />;
};
```

### Task 1.3: Wire get_availability, get_contact (2h)
Sticky availability strip and contact form:

```javascript
// Sticky Availability Strip
export const AvailabilityStrip = () => {
  const { data: availData } = useMCPTool('get_availability');
  if (!availData) return null;
  return (
    <div className="sticky top-0 z-40 bg-white/80 border-b">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <StatusPulse status={availData.status} />
          <span>{availData.statusLabel}</span>
        </div>
        <a href={availData.contactHref}>Get in touch</a>
      </div>
    </div>
  );
};

// Contact Form with write-back
const ContactForm = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const { data: confirmData, error } = useMCPTool(
    'submit_contact_message',
    formData
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    // Trigger MCP call via hook
  };

  if (confirmData) {
    return <ConfirmationWidget referenceId={confirmData.referenceId} />;
  }

  return <ContactFormUI onSubmit={handleSubmit} />;
};
```

### Task 1.4: Add loading skeletons (2h)
Create skeleton components that match the real widget proportions:

```typescript
// Skeleton components
export const HeroSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-12 bg-gray-200 rounded w-3/4" />
    <div className="h-6 bg-gray-200 rounded w-2/3 mt-4" />
    {/* Repeat for all sections */}
  </div>
);

export const SkillsSkeleton = () => (
  <div className="grid gap-3 animate-pulse">
    {[...Array(12)].map((_, i) => (
      <div key={i} className="h-10 bg-gray-200 rounded" />
    ))}
  </div>
);
```

### Task 1.5: Add error boundaries & fallbacks (2h)
Every MCP call can fail; add graceful degradation:

```javascript
const ErrorState = ({ error, section }) => (
  <div className="bg-red-50 border border-red-200 p-4 rounded">
    <p className="text-sm font-medium text-red-800">
      {section} failed to load
    </p>
    <p className="text-xs text-red-600 mt-1">{error}</p>
    <button
      onClick={() => window.location.reload()}
      className="mt-2 text-xs text-red-700 underline"
    >
      Reload page
    </button>
  </div>
);
```

### Task 1.6: Verify data parity (2h)
Once all sections are live, compare rendered output with current static version:
- Do all skill names match?
- Are project descriptions identical?
- Are dates/timelines correct?
- Are achievement metrics the same?

**Acceptance**: The portfolio looks identical but all data is fetched live from MCP.

---

## Sprint 2: 6 New MCP Tools — COMPLETE ✓

**Status**: Done. All 6 tools built, tested, and verified.

| Tool | Use Case | Sprint 1 Dependency |
|---|---|---|
| `get_domains` | Infrastructure info for recruiter transparency | Optional (nice-to-have) |
| `get_portfolio_stats` | Aggregate stats card (tenure, OSS reach, etc.) | Optional (nice-to-have) |
| `list_posts` | Blog/writing list with category filters | Task 2.2 |
| `search_content` | Search within sections | Task 2.3 |
| `search_all` | Global search (used by Claude API) | Task 3.5 |
| `track_event` | Analytics tracking | Task 3.1 |

**Ready to use:** You can integrate `list_posts` into Sprint 1 if you have a blog section, or defer to Sprint 3.

---

## Sprint 4: Live Data Ingestion — COMPLETE ✓ (server-side)

**Status**: All tools built, tested, and verified. Integration into `khiw.console v3` is a Sprint 5 task.

| Tool | What it does | Live data source |
|---|---|---|
| `get_github_stats` | Repo count, language breakdown, star/fork totals | GitHub REST API (15-min cache) |
| `get_oss_feed` | Latest public GitHub events (push, PR, issues) | GitHub public events API (10-min cache) |
| `get_drafts` | List saved content drafts | In-memory store (protected by `DRAFTS_API_KEY`) |
| `save_draft` | Create or update a draft | In-memory store (protected by `DRAFTS_API_KEY`) |

**Environment variables needed:**

```env
GITHUB_TOKEN=ghp_...          # Optional but recommended — raises rate limit to 5000 req/h
GITHUB_USERNAME=khiwniti      # Account whose stats and events are fetched
DRAFTS_API_KEY=your-secret    # Required; requests without it receive a 401-style error response
```

---

## Sprint 5: AI-Powered Export & Semantic Search — COMPLETE ✓ (server-side)

**Status**: Both tools built, tested, and verified. Widget integration into `khiw.console v3` is pending.

| Tool | What it does | Notes |
|---|---|---|
| `get_resume_pdf` | JD keyword match scoring + tailored resume JSON | Pass a job description; receive match %, matched keywords, gaps, and a filtered resume payload |
| `kg_semantic_search` | 3-tier KG search: vector → fulltext → substring | Requires `OPENAI_API_KEY` for vector tier; gracefully degrades without it |

**Integration recipe — JD-tailored resume download:**

```typescript
const result = await session.callTool({
  name: "get_resume_pdf",
  arguments: {
    jobDescription: "Staff Engineer with TypeScript and Kubernetes experience",
    format: "json",
    sections: ["experience", "projects", "skills"],
  },
});

const { matchScore, matchedKeywords, missingKeywords, resume } = result.structuredContent;
// matchScore: 0.50, matchedKeywords: ["typescript","kubernetes","engineer"]
// resume: filtered subset of portfolio data ranked by relevance
```

**Integration recipe — semantic search:**

```typescript
const result = await session.callTool({
  name: "kg_semantic_search",
  arguments: { query: "TypeScript backend API", labels: ["Technology", "Repo"], limit: 10 },
});

const { results, vectorEnabled, searchTier } = result.structuredContent;
// searchTier: "substring" | "fulltext" | "vector"
// results: [{ type, name, properties }]
```

---

## Sprint 3: Modal Drills & Interactivity (20h)

### Goal
Turn flat sections into deep-drill experiences. When a recruiter clicks a skill, role, or project, a modal opens with the next level of detail.

### Task 3.1: Skill Detail Modal (4h)
When user clicks a skill chip, open a modal with deep context:

```javascript
const SkillChip = ({ skillName, onDrill }) => (
  <button
    className="px-3 py-1 bg-blue-100 text-blue-900 rounded-full"
    onClick={() => onDrill('get_skill_detail', { name: skillName })}
  >
    {skillName}
  </button>
);

const SkillDetailModal = ({ skillName, onClose }) => {
  const { data: skillDetail } = useMCPTool('get_skill_detail', { name: skillName });

  if (!skillDetail) return null;

  return (
    <Modal onClose={onClose}>
      <div className="p-6 max-w-2xl">
        <Breadcrumb path={['Skills', skillName]} />
        
        <h2 className="text-2xl font-bold mt-4">{skillDetail.name}</h2>
        <p className="text-gray-600">{skillDetail.level} · {skillDetail.years} years</p>

        <section className="mt-6">
          <h3 className="font-bold">Evidence</h3>
          <ul>
            {skillDetail.evidence.map((e, i) => (
              <li key={i} className="text-sm text-gray-700">• {e}</li>
            ))}
          </ul>
        </section>

        <section className="mt-4">
          <h3 className="font-bold">Used in roles</h3>
          <div className="flex gap-2 flex-wrap">
            {skillDetail.relatedRoleIds.map(roleId => (
              <button
                key={roleId}
                onClick={() => onDrill('get_role_detail', { id: roleId })}
                className="text-sm px-2 py-1 border rounded hover:bg-gray-50"
              >
                → Dive into {roleId}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-4">
          <h3 className="font-bold">Used in projects</h3>
          <div className="flex gap-2 flex-wrap">
            {skillDetail.relatedProjectIds.map(projId => (
              <button
                key={projId}
                onClick={() => onDrill('get_project_detail', { id: projId })}
                className="text-sm px-2 py-1 border rounded hover:bg-gray-50"
              >
                → See {projId}
              </button>
            ))}
          </div>
        </section>
      </div>
    </Modal>
  );
};
```

### Task 3.2: Role Detail Modal (4h)
Click a role card to expand achievements, decisions, and impact metrics:

```javascript
const RoleCard = ({ role, onDrill }) => (
  <div
    className="border rounded-lg p-4 cursor-pointer hover:shadow-lg"
    onClick={() => onDrill('get_role_detail', { id: role.id })}
  >
    <h3>{role.title}</h3>
    <p className="text-sm text-gray-600">{role.company}</p>
    <p className="text-xs text-gray-500">{role.start} – {role.end || 'Now'}</p>
  </div>
);

const RoleDetailModal = ({ roleId, onDrill }) => {
  const { data: roleDetail } = useMCPTool('get_role_detail', { id: roleId });

  if (!roleDetail) return null;

  return (
    <Modal>
      <div className="p-6 max-w-3xl">
        <Breadcrumb path={['Experience', roleDetail.company, roleDetail.title]} />

        <h2 className="text-2xl font-bold mt-4">{roleDetail.title}</h2>
        <p className="text-gray-600">{roleDetail.company}</p>

        {/* Achievements with drill-down */}
        <section className="mt-6">
          <h3 className="font-bold">Key Achievements</h3>
          {roleDetail.achievements.map((ach, i) => (
            <div
              key={i}
              className="p-3 mt-2 border rounded bg-gray-50 cursor-pointer hover:bg-gray-100"
              onClick={() => onDrill('get_role_achievement', { roleId, index: i })}
            >
              <p className="text-sm">{ach}</p>
              <span className="text-xs text-blue-600 mt-1 block">→ View breakdown</span>
            </div>
          ))}
        </section>

        {/* Technical decisions */}
        <section className="mt-6">
          <h3 className="font-bold">Key Technical Decisions</h3>
          {roleDetail.decisions?.map((dec, i) => (
            <button
              key={i}
              className="block w-full text-left p-3 mt-2 border rounded hover:bg-gray-50"
              onClick={() => onDrill('get_role_decision', { roleId, index: i })}
            >
              <p className="text-sm font-medium">{dec.title}</p>
              <p className="text-xs text-gray-600 mt-1">→ See rationale & outcome</p>
            </button>
          ))}
        </section>

        {/* Related projects */}
        <section className="mt-6">
          <h3 className="font-bold">Related Projects</h3>
          <div className="flex gap-2 flex-wrap">
            {roleDetail.relatedProjectIds?.map(projId => (
              <button
                key={projId}
                onClick={() => onDrill('get_project_detail', { id: projId })}
                className="text-sm px-2 py-1 border rounded hover:bg-gray-50"
              >
                {projId}
              </button>
            ))}
          </div>
        </section>
      </div>
    </Modal>
  );
};
```

### Task 3.3: Project Deep-Dive (4h)
Click a project to explore tech stack, modules, metrics:

```javascript
const ProjectDetailModal = ({ projectId, onDrill }) => {
  const { data: projDetail } = useMCPTool('get_project_detail', { id: projectId });
  const { data: metrics } = useMCPTool('get_project_metrics', { id: projectId });
  const { data: techstack } = useMCPTool('get_project_techstack', { id: projectId });

  return (
    <Modal>
      <div className="p-6 max-w-4xl">
        <Breadcrumb path={['Projects', projDetail?.name]} />

        <h2 className="text-2xl font-bold mt-4">{projDetail?.name}</h2>
        <p className="text-gray-600">{projDetail?.description}</p>

        {/* KPI tiles */}
        <section className="grid grid-cols-3 gap-4 mt-6">
          {metrics?.kpis.map((kpi, i) => (
            <div key={i} className="border rounded p-3 text-center">
              <p className="text-xs text-gray-600">{kpi.label}</p>
              <p className="text-2xl font-bold">{kpi.value}</p>
            </div>
          ))}
        </section>

        {/* Tech stack with drill-down */}
        <section className="mt-6">
          <h3 className="font-bold">Tech Stack</h3>
          <div className="flex flex-wrap gap-2 mt-2">
            {techstack?.languages.map(lang => (
              <button
                key={lang.name}
                className="px-3 py-1 border rounded hover:bg-gray-50"
                onClick={() => onDrill('get_project_language_stat', { id: projectId, language: lang.name })}
              >
                {lang.name} ({lang.locShare}%) → Drill
              </button>
            ))}
          </div>
        </section>

        {/* Modules */}
        <section className="mt-6">
          <h3 className="font-bold">Architecture</h3>
          {techstack?.modules.map(mod => (
            <button
              key={mod.id}
              className="block w-full text-left p-3 mt-2 border rounded hover:bg-gray-50"
              onClick={() => onDrill('get_project_module', { id: projectId, moduleId: mod.id })}
            >
              <p className="font-medium text-sm">{mod.name}</p>
              <p className="text-xs text-gray-600">{mod.description}</p>
            </button>
          ))}
        </section>
      </div>
    </Modal>
  );
};
```

### Task 3.4: Hover Evidence Highlighting (4h)
When hovering a skill, highlight all roles/projects where it was used:

```javascript
const SkillsGridWithHighlight = () => {
  const [hoveredSkill, setHoveredSkill] = useState(null);
  const { data: skillsData } = useMCPTool('get_skills');

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Skills */}
      <div className="col-span-1">
        {skillsData?.skills.map(skill => (
          <SkillChip
            key={skill.name}
            skill={skill}
            isHighlighted={hoveredSkill === skill.name}
            onHover={setHoveredSkill}
          />
        ))}
      </div>

      {/* Related roles/projects (right side) */}
      <div className="col-span-1 opacity-50 transition-opacity">
        {hoveredSkill && (
          <div>
            <p className="text-sm font-bold text-gray-700">Used in:</p>
            {/* Fetch and display related roles/projects for hoveredSkill */}
          </div>
        )}
      </div>
    </div>
  );
};
```

### Task 3.5: Ask AI per Section (4h)
Add a small "Ask AI" button on each section. When clicked, send section context to Claude:

```javascript
const SectionAskAI = ({ sectionName, sectionContext }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');

  const handleAsk = async (q) => {
    // Call Claude API with section context
    const response = await fetch('/api/ask-ai', {
      method: 'POST',
      body: JSON.stringify({
        section: sectionName,
        context: sectionContext,
        question: q,
      }),
    });
    const data = await response.json();
    setAnswer(data.answer);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-xs text-blue-600 hover:underline"
      >
        Ask AI about this section
      </button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <div className="p-6 max-w-2xl">
          <h3 className="font-bold text-lg">Ask about {sectionName}</h3>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g., 'What are your strongest skills for data infrastructure?'"
            className="w-full mt-3 p-2 border rounded"
          />
          <button
            onClick={() => handleAsk(question)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
          >
            Ask
          </button>

          {answer && (
            <div className="mt-4 p-3 bg-blue-50 rounded">
              <p className="text-sm">{answer}</p>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};
```

---

## Sprint 4: Claude API Integration (24h)

### Goal
Wire the MCP server into your Claude API `/api/chat` so the AI assistant can call tools and access context.

### Task 4.1: Register MCP in Anthropic SDK (4h)

```typescript
// api/chat.ts (or similar)
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Define MCP server endpoint
const mcpServers = {
  'portfolio-mcp-ui': {
    url: 'https://fast-pulse-37yfv.run.mcp-use.com/mcp',
  },
};

export async function handleChatRequest(messages, options) {
  const response = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2048,
    system: `You are an AI assistant helping recruiters explore a developer's portfolio.
You have access to MCP tools covering every section of the portfolio:
- Hero, Availability, Skills, Experience, Projects, Contact, About, Open Source, Education
- Deep-drill tools for each section
- Search tools to find relevant content

When the user asks questions about the portfolio:
1. Use search_all or search_content to find relevant information
2. Drill into specific sections as needed
3. Cite evidence from the portfolio in your response
4. Suggest related skills/projects/roles when appropriate

Current user context: They are evaluating the candidate for a [ROLE] position.`,
    messages,
    tools: [
      // Auto-generated from MCP server tools list
      // See Task 4.2
    ],
  });

  return response;
}
```

### Task 4.2: Auto-Generate Tool Definitions (4h)

```typescript
// lib/mcp-tools-schema.ts

export async function generateMCPToolDefinitions() {
  // Call portfolio-mcp-ui tools/list endpoint
  const response = await fetch('https://fast-pulse-37yfv.run.mcp-use.com/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {},
    }),
  });

  const data = await response.json();

  // Convert MCP tool definitions to Claude tool schema
  return data.result.tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: {
      type: 'object',
      properties: tool.inputSchema.properties || {},
      required: tool.inputSchema.required || [],
    },
  }));
}
```

### Task 4.3: Handle Tool Calls (8h)

```typescript
// api/chat.ts (continued)

export async function handleToolCall(toolName: string, toolInput: any) {
  const response = await fetch('https://fast-pulse-37yfv.run.mcp-use.com/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: toolInput,
      },
    }),
  });

  const result = await response.json();

  return {
    type: 'tool_result',
    tool_use_id: toolName, // from the request
    content: JSON.stringify(result.result.content[0]),
  };
}

// Streaming chat with tool use
export async function streamChatWithTools(messages, onChunk) {
  const allTools = await generateMCPToolDefinitions();

  const response = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2048,
    system: 'You are a portfolio assistant...',
    messages,
    tools: allTools,
    stream: true,
  });

  let currentMessage = [];
  let toolUses = [];

  for await (const event of response) {
    if (event.type === 'content_block_delta') {
      onChunk(event.delta);

      // Track tool use blocks
      if (event.delta.type === 'input_json_delta') {
        toolUses.push(event.delta);
      }
    }

    if (event.type === 'message_delta' && event.usage) {
      // Handle tool calls after message is complete
      // See Task 4.4
    }
  }

  return toolUses;
}
```

### Task 4.4: Agentic Loop (8h)

```typescript
// lib/agentic-chat.ts

export async function agenticChat(userMessage: string, conversationHistory: any[]) {
  let messages = [...conversationHistory, { role: 'user', content: userMessage }];
  let iterations = 0;
  const maxIterations = 5;

  while (iterations < maxIterations) {
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      system: 'You are a portfolio assistant...',
      messages,
      tools: await generateMCPToolDefinitions(),
    });

    iterations++;

    // Check if there's a stop reason of "tool_use"
    if (response.stop_reason !== 'tool_use') {
      // Final response, return it
      return {
        messages: [...messages, { role: 'assistant', content: response.content }],
        finalResponse: response.content.find((c) => c.type === 'text')?.text,
      };
    }

    // Process tool uses
    const toolUseBlocks = response.content.filter((c) => c.type === 'tool_use');
    let toolResults = [];

    for (const toolUse of toolUseBlocks) {
      const result = await handleToolCall(toolUse.name, toolUse.input);
      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: result.content,
      });
    }

    // Add assistant response and tool results to messages
    messages.push({
      role: 'assistant',
      content: response.content,
    });
    messages.push({
      role: 'user',
      content: toolResults,
    });
  }

  throw new Error(`Max iterations (${maxIterations}) exceeded`);
}
```

---

## Sprint 5: Polish & Deployment (23h)

### Task 5.1: Performance Optimization (6h)
- Add response caching: cache `get_hero`, `get_skills`, `get_projects` for 1h
- Pre-warm critical tools on page load
- Implement pagination for `list_posts`, large search results
- Lazy-load drill modals (don't fetch until opened)

```typescript
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 3600000; // 1 hour

function useMCPToolCached(toolName: string, input?: any) {
  const cacheKey = `${toolName}:${JSON.stringify(input || {})}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { data: cached.data, loading: false };
  }

  // Fetch fresh
  const { data, loading } = useMCPTool(toolName, input);

  if (data && !loading) {
    cache.set(cacheKey, { data, timestamp: Date.now() });
  }

  return { data, loading };
}
```

### Task 5.2: Accessibility & Core Web Vitals (5h)
- ARIA labels on all drill modals & buttons
- Keyboard navigation (Tab through skill chips, arrow keys in timeline)
- Test LCP, FID, CLS targets
- Ensure error states are announced to screen readers

### Task 5.3: Mobile Responsiveness (4h)
- Modal drill-down UX on mobile (might be bottom sheet instead of center modal)
- Sticky availability strip only on desktop (move to header on mobile)
- Single-column layout for projects on small screens

### Task 5.4: Analytics Integration (4h)
- Call `track_event` on every MCP tool invocation
- Track drill paths (e.g., skills → skill detail → related project)
- Track search queries
- Send anonymized event data to Posthog or similar

```typescript
function useMCPToolWithTracking(toolName: string, input?: any) {
  const { data, loading } = useMCPTool(toolName, input);

  React.useEffect(() => {
    if (data) {
      track_event({
        eventName: `tool_${toolName}`,
        section: toolName.split('_')[1] || 'general',
        metadata: { input, resultSize: JSON.stringify(data).length },
      });
    }
  }, [data]);

  return { data, loading };
}
```

### Task 5.5: Error Recovery & Fallbacks (2h)
- If MCP server is down, serve cached data (stale-while-revalidate)
- Graceful degradation: show static hardcoded fallback if cache is empty
- Retry logic with exponential backoff

### Task 5.6: Documentation & Launch (2h)
- Update portfolio README with "This is MCP-powered"
- Add `/tools` endpoint that lists all available MCP tools
- Add `/api/mcp` proxy endpoint for easy access
- Update `robots.txt` and social cards with live metadata

---

## Integration Checklist

### Before Sprint 1
- [ ] Read this guide end-to-end
- [ ] Set up `useMCPTool` hook in your codebase
- [ ] Create Sentry integration for error tracking
- [ ] Decide on caching strategy (in-memory vs Redis vs localStorage)

### During Sprint 1
- [ ] Replace each hardcoded data array with MCP call (one section per day)
- [ ] Test each section renders identically after migration
- [ ] Merge to main after all 6 sections are live

### After Sprint 1
- [ ] Celebrate: you now have a fully live portfolio
- [ ] Measure: how many sections are being viewed? (track_event)
- [ ] Iterate: any data that needs updating? Change it once on MCP server, live everywhere

### Before Sprint 3
- [ ] Design modal component library (Tailwind/Headless UI)
- [ ] Sketch drill-path user flows

### Before Sprint 4
- [ ] Apply for Claude API beta if not already approved
- [ ] Set up `/api/chat` endpoint
- [ ] Test agentic loop with dummy tools first

---

## Example: Full Chat Flow

**User**: "What projects used Kubernetes?"

**AI Assistant** (calls `search_all` with query="Kubernetes"):
```json
{
  "results": [
    { "type": "skill", "title": "Kubernetes", "body": "Infrastructure · proficient" },
    { "type": "project", "title": "khiw-dev", "snippet": "Portfolio + MCP..." },
    { "type": "role", "title": "Lumen", "snippet": "Senior + Tech Lead" }
  ]
}
```

**AI then calls** `get_project_detail(id="khiw-dev")`:
```json
{
  "description": "MCP-driven portfolio...",
  "stack": ["TypeScript", "React", "Next.js", "Kubernetes"],
  "relatedRoleIds": ["lumen", "northbeam"]
}
```

**AI Response**:
> Your portfolio includes two projects with Kubernetes:
> 1. **khiw.dev** — MCP-driven portfolio deployed on k8s via Vercel + custom infra
> 2. **Implied via roles**: Lumen (operated EKS, 120 pods) and Northbeam (k8s deployment)
>
> Want me to dive into the Kubernetes work at Lumen?

---

## Troubleshooting

### "Cannot connect to MCP server"
- Check endpoint URL: `https://fast-pulse-37yfv.run.mcp-use.com/mcp`
- Verify CORS headers in response
- Check if server is running: `curl https://fast-pulse-37yfv.run.mcp-use.com/mcp -X POST`

### "Tool returns unexpected schema"
- Regenerate tool definitions in Task 4.2
- Check `tools/list` response matches expected shape

### "Modal drills are slow"
- Implement caching (Task 5.1)
- Pre-fetch related data when opening parent modal
- Lazy-load images in project cards

### "Claude API failing on tool calls"
- Validate tool input schema (must match MCP server exactly)
- Check Anthropic SDK version (must be 1.0+)
- Log tool call requests/responses for debugging

---

## Next Steps

1. **Week 1**: Complete Sprint 1 (data migration)
2. **Week 2**: Deploy live + measure engagement
3. **Week 3-4**: Sprint 3 (drills & interactivity)
4. **Week 5-6**: Sprint 4 (Claude API)
5. **Week 7**: Sprint 5 (polish & launch)

**Total**: ~12 weeks, ~95 hours of focused engineering.

Good luck! Your portfolio will be unlike anything a recruiter has seen before.

---

**Questions?** Open an issue on the `portfolio-mcp-ui` repo or contact hello@khiw.dev.
