# Portfolio MCP Integration Guide
## Sprint-by-Sprint Implementation for khiw.dev

**Status**: Ready for integration  
**MCP Server**: `portfolio-mcp-ui` (36 tools, 30 widgets)  
**Endpoint**: `https://fast-pulse-37yfv.run.mcp-use.com/mcp`  
**Timeline**: 5 sprints, 90 hours

---

> **Status update (2026-05-25):** Universal MCP UI — no external dependencies. The MCP server is live with 36 tools and 30 widgets, fully fixture-backed with zero external services. Sprint 2 is complete server-side; Sprints 1, 3, 4, and 5 are frontend/backend work in the `khiw.console v3` repository.

## Overview: The 36 Tools

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

### Tier 3 — Discovery & Analytics (6 tools)
For search, domain lookups, analytics:
- `get_domains` — portfolio domain info + infrastructure
- `get_portfolio_stats` — aggregate career/code/project stats
- `list_posts` — blog posts (filterable by category/tag)
- `search_content(query, section?)` — search across sections
- `search_all(query, limit?)` — global search
- `track_event(eventName, section?, metadata?)` — analytics

---

## Environment Variables

No environment variables required to run.

---

## Sprint Plan

### Sprint 1: Portfolio data migration (16h) — pending (frontend work)

Replace hardcoded `PROJECTS`, `CAREER`, `SKILLS`, `PROFILE`, `STATS` in khiw.console v3 with MCP calls + loading skeletons.

#### Current State (What to Replace)
In your portfolio code (e.g., `khiw.console v3.jsx`), you likely have:
```javascript
// Hardcoded data — remove these
const PROFILE = { name: "...", headline: "..." };
const SKILLS = [{ name: "TypeScript", ... }, ...];
const CAREER = [{ company: "Lumen", ... }, ...];
const PROJECTS = [{ id: "mcp-portfolio-kit", ... }, ...];
const STATS = { yearsOfExperience: 8, ... };
```

#### Task 1.1: Wire get_hero (2h)
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

#### Task 1.2: Wire get_skills, get_experience, get_projects (3h)
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

#### Task 1.3: Wire get_availability, get_contact (2h)
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

#### Task 1.4: Add loading skeletons (2h)
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

#### Task 1.5: Add error boundaries & fallbacks (2h)
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

#### Task 1.6: Verify data parity (2h)
Once all sections are live, compare rendered output with current static version:
- Do all skill names match?
- Are project descriptions identical?
- Are dates/timelines correct?
- Are achievement metrics the same?

**Acceptance**: The portfolio looks identical but all data is fetched live from MCP.

---

### Sprint 2: Missing API tools — COMPLETE

**Status**: Done. All 6 tools built, tested, and verified.

| Tool | Use Case | Sprint 1 Dependency |
|---|---|---|
| `get_domains` | Infrastructure info for recruiter transparency | Optional (nice-to-have) |
| `get_portfolio_stats` | Aggregate stats card (tenure, OSS reach, etc.) | Optional (nice-to-have) |
| `list_posts` | Blog/writing list with category filters | Sprint 4 |
| `search_content` | Search within sections | Sprint 4 |
| `search_all` | Global search (used by Claude API) | Sprint 5 |
| `track_event` | Analytics tracking | Sprint 3 |

**Ready to use:** You can integrate `list_posts` into Sprint 1 if you have a blog section, or defer to Sprint 4.

---

### Sprint 3: Drill-down modals (24h) — pending (frontend work)

Wire every skill pill, role card, project tile to call the appropriate `get_*_detail` tool and open a modal.

#### Task 3.1: Skill Detail Modal (4h)
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

#### Task 3.2: Role Detail Modal (4h)
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

#### Task 3.3: Project Deep-Dive (4h)
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

#### Task 3.4: Hover Evidence Highlighting (4h)
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

#### Task 3.5: Ask AI per Section (4h)
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

### Sprint 4: Native sections (22h) — pending (frontend work)

Surface the Availability strip, Contact section, FAQ list, blog list, and global search bar as first-class navigation entries in khiw.console v3.

#### Task 4.1: Availability strip (3h)
Sticky availability strip on every page using `get_availability` + `get_availability_detail`.

#### Task 4.2: Contact section (5h)
Full contact section that combines `get_contact`, `get_contact_channel`, and `submit_contact_message` for write-back.

#### Task 4.3: FAQ list (4h)
Use `get_contact_faq` and `get_contact_faq_item` to render a collapsible FAQ panel.

#### Task 4.4: Blog list (5h)
Wire `list_posts` (with category/tag filters) into a dedicated `/writing` route.

#### Task 4.5: Global search bar (5h)
Top-bar search powered by `search_all` and `search_content`, with section facets and keyboard shortcuts (cmd-K).

---

### Sprint 5: Claude API mcp_servers integration (12h) — pending (backend work)

Replace the static system prompt with live MCP tool routing via Claude API's `mcp_servers` field. The chat gets the 36-tool surface — that alone is the value.

#### Task 5.1: Register MCP server in Anthropic SDK (4h)

```typescript
// api/chat.ts (or similar)
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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
4. Suggest related skills/projects/roles when appropriate`,
    messages,
    mcp_servers: [
      {
        type: 'url',
        url: 'https://fast-pulse-37yfv.run.mcp-use.com/mcp',
        name: 'portfolio-mcp-ui',
      },
    ],
  });

  return response;
}
```

#### Task 5.2: Streaming + tool result rendering (4h)
Surface MCP tool results inline in the chat UI as cards (one card per tool call), with a fallback to text-only when streaming a non-MCP turn.

#### Task 5.3: Analytics + safety (4h)
- Call `track_event` for each user turn and each MCP tool invocation
- Add a rate limit per session
- Cap conversation length

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

### Before Sprint 5
- [ ] Apply for Claude API access if not already approved
- [ ] Set up `/api/chat` endpoint
- [ ] Verify the MCP endpoint is reachable from your serverless region

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
- Regenerate tool definitions from `tools/list`
- Check `tools/list` response matches expected shape

### "Modal drills are slow"
- Implement caching (1h TTL for `get_hero`, `get_skills`, `get_projects`)
- Pre-fetch related data when opening parent modal
- Lazy-load images in project cards

### "Claude API failing on tool calls"
- Validate tool input schema (must match MCP server exactly)
- Check Anthropic SDK version (must be 1.0+)
- Log tool call requests/responses for debugging

---

## Roadmap / Future Work

- Optional adapter pattern for live data sources (CMS, REST, GraphQL) — out of scope for v1
- Additional widget themes (dark mode, print)
- Multi-tenant fixture packs for re-use beyond khiw.dev

---

## Next Steps

1. **Week 1**: Complete Sprint 1 (data migration)
2. **Week 2**: Deploy live + measure engagement
3. **Week 3-4**: Sprint 3 (drills & interactivity)
4. **Week 5**: Sprint 4 (native sections)
5. **Week 6**: Sprint 5 (Claude API mcp_servers)

**Total**: ~6 weeks, ~90 hours of focused engineering.

---

**Questions?** Open an issue on the `portfolio-mcp-ui` repo or contact hello@khiw.dev.
