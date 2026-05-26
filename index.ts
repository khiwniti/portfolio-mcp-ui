import { MCPServer, widget, text, error, object, oauthProxy, jwksVerifier } from "mcp-use/server";
import { z } from "zod";

// MCP Apps (ext-apps) dual-mode compat surface
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  sandboxConfigured,
  createSandbox,
  runInSandbox,
  writeSandboxFiles,
  stopSandbox,
  registrySnapshot,
  registryGet,
  getSandboxDomain,
} from "./lib/sandbox-final.js";
import {
  runReadCypher,
  kgSchemaSummary,
  kgPing,
  kgConfigured,
  kgDatabase,
  kgInstanceName,
  kgUri,
  kgLookupTechnology,
  kgReposUsingTechnology,
  kgLookupRepo,
  kgTechStackForRepo,
  kgPersonSummary,
  kgTopTechnologies,
  kgTopRepos,
  kgFullTextSearch,
  kgListIndexes,
} from "./lib/graph-v5.js";
import { getGitHubStatsCached, getGitHubEventsCached } from "./lib/github-v2.js";

// ─── Auth0 OAuth (optional — server stays fully public when these are unset) ──
// Set AUTH0_DOMAIN + AUTH0_CLIENT_ID to enable an oauthProxy gate on every
// tool.  Without these vars the server operates in open/public mode, which is
// the correct default for a public portfolio.
const _a0Domain = process.env.AUTH0_DOMAIN || "";
const _a0Audience = process.env.AUTH0_AUDIENCE || "";
const _a0ClientId = process.env.AUTH0_CLIENT_ID || "";
const _a0ClientSecret = process.env.AUTH0_CLIENT_SECRET || "";

const server = new MCPServer({
  name: "portfolio-mcp-ui",
  title: "Portfolio MCP UI",
  version: "1.0.0",
  description:
    "Interactive MCP server that serves embeddable portfolio sections (hero, availability, skills, experience, projects, contact) as widgets any frontend can consume. Every section has a top-level tool plus deeper drill-down sub-tools so the full hierarchy is callable end-to-end.",
  baseUrl: process.env.MCP_URL || "http://localhost:3000",
  favicon: "favicon.ico",
  websiteUrl: "https://mcp-use.com",
  icons: [
    {
      src: "icon.svg",
      mimeType: "image/svg+xml",
      sizes: ["512x512"],
    },
  ],
  ...(_a0Domain && _a0ClientId
    ? {
        oauth: oauthProxy({
          authEndpoint: `https://${_a0Domain}/authorize`,
          tokenEndpoint: `https://${_a0Domain}/oauth/token`,
          issuer: `https://${_a0Domain}/`,
          clientId: _a0ClientId,
          clientSecret: _a0ClientSecret || undefined,
          scopes: ["openid", "email", "profile"],
          extraAuthorizeParams: _a0Audience ? { audience: _a0Audience } : {},
          verifyToken: jwksVerifier({
            jwksUrl: `https://${_a0Domain}/.well-known/jwks.json`,
            issuer: `https://${_a0Domain}/`,
            audience: _a0Audience || undefined,
          }),
        }),
      }
    : {}),
});

/* ------------------------------------------------------------------ */
/* Fixture data — top-level section data                              */
/* ------------------------------------------------------------------ */

const heroData = {
  name: "Ikkyu",
  headline: "AI-Augmented Full-Stack Developer",
  subhead:
    "Today I work at the intersection of AI agent architecture, engineering simulation, and Thai government digital transformation. I've shipped 50+ projects on Vercel and 47 Cloudflare Workers across 9 industries — from weather forecasting with NVIDIA FourCastNet to BIM carbon calculators and restaurant BI.",
  location: "Bangkok, Thailand (GMT+7)",
  availability: "Available",
  tagline: "AI Agent Architect",
  stats: [
    { value: "29", label: "Live" },
    { value: "50", label: "Projects" },
    { value: "47", label: "Workers" },
    { value: "9", label: "Industries" },
  ],
  chips: ["LangGraph", "Claude Sonnet", "Qwen3", "MCP", "FastAPI", "Next.js", "TypeScript", "Cloudflare"],
  links: [
    { label: "GitHub", href: "https://github.com/getintheQ" },
    { label: "LinkedIn", href: "https://linkedin.com/in/getintheq" },
    { label: "Email", href: "mailto:kiw.brw@gmail.com" },
    { label: "Resume", href: "https://www.khiw.dev/api/resume" },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// MCP Apps (ext-apps) — dual-mode compat surface
// We keep the existing mcp-use /mcp endpoint intact, and add /mcp-apps using
// the official TS SDK + ext-apps server helpers.
// Start small: one app tool + one app resource.
// ─────────────────────────────────────────────────────────────────────────────

const HERO_APP_URI = "ui://portfolio/hero-app";
const EXPECTATION_APP_URI = "ui://portfolio/expectation-app";

function getAppsServer() {
  const s = new McpServer({ name: "portfolio-mcp-ui-apps", version: "1.0.0" });

  registerAppResource(
    s,
    "Portfolio Hero App",
    HERO_APP_URI,
    { description: "Interactive hero section (MCP Apps)" },
    async () => {
      // When built, this file runs from dist/index.js, so import.meta.url points
      // at ./dist. Resolve project root to find dist-apps/.
      const here = path.dirname(fileURLToPath(import.meta.url));
      const projectRoot = path.resolve(here, "..");
      const htmlPath = path.join(projectRoot, "dist-apps/hero-app/index.html");
      const html = await readFile(htmlPath, "utf-8");

      return {
        contents: [
          {
            uri: HERO_APP_URI,
            mimeType: RESOURCE_MIME_TYPE,
            text: html,
            _meta: {
              ui: {
                csp: {
                  resourceDomains: [
                    "https://fonts.googleapis.com",
                    "https://fonts.gstatic.com",
                  ],
                },
              },
            },
          },
        ],
      };
    }
  );

  registerAppTool(
    s,
    "get_hero_app",
    {
      title: "Get Hero (App)",
      description: "Returns hero data and renders an interactive MCP App view.",
      _meta: {
        ui: {
          resourceUri: HERO_APP_URI,
          visibility: ["app", "model"],
        },
      },
    },
    async () => {
      return {
        content: [
          {
            type: "text",
            text: `${heroData.name} — ${heroData.headline}`,
          },
        ],
        structuredContent: heroData,
      };
    }
  );

  // Layout-first "expectation" app: section order + component positioning aligned
  // with ./ecpectation_web.jsx (full-page experience).
  registerAppResource(
    s,
    "Portfolio Expectation App",
    EXPECTATION_APP_URI,
    { description: "Layout-first portfolio (MCP Apps) aligned to expectation_web" },
    async () => {
      const here = path.dirname(fileURLToPath(import.meta.url));
      const projectRoot = path.resolve(here, "..");
      const htmlPath = path.join(projectRoot, "dist-apps/expectation-app/index.html");
      const html = await readFile(htmlPath, "utf-8");

      return {
        contents: [
          {
            uri: EXPECTATION_APP_URI,
            mimeType: RESOURCE_MIME_TYPE,
            text: html,
            _meta: {
              ui: {
                csp: {
                  resourceDomains: [
                    "https://fonts.googleapis.com",
                    "https://fonts.gstatic.com",
                  ],
                },
              },
            },
          },
        ],
      };
    }
  );

  registerAppTool(
    s,
    "get_expectation_app",
    {
      title: "Get Expectation Layout (App)",
      description:
        "Returns a full-page MCP App whose layout/component positions align with the expectation_web reference.",
      _meta: {
        ui: {
          resourceUri: EXPECTATION_APP_URI,
          visibility: ["app", "model"],
        },
      },
    },
    async () => {
      return {
        content: [
          {
            type: "text",
            text: "Expectation layout app (layout-first).",
          },
        ],
        structuredContent: {
          hero: heroData,
        },
      };
    }
  );

  return s;
}

const availabilityData = {
  status: "available" as const,
  statusLabel: "Available",
  detail: "Open to senior + staff IC and tech-lead roles starting Q3 2026.",
  responseTime: "Within 24h",
  preferredRoles: ["Staff IC", "Tech Lead", "Founding eng"],
  contactHref: "#contact",
  updatedAt: "2 days ago",
};

const skillsData = {
  categories: ["Languages", "Frontend", "Backend", "Infrastructure", "AI / ML"],
  skills: [
    {
      name: "TypeScript",
      category: "Languages",
      level: "expert" as const,
      years: 7,
      evidence: [
        "Primary language at Lumen and Northbeam for shared client/server packages",
        "Authored internal type-system library used by 30+ engineers",
        "Maintained MCP SDK contributions",
      ],
    },
    {
      name: "Python",
      category: "Languages",
      level: "proficient" as const,
      years: 5,
      evidence: [
        "Evaluation harness for LLM products at Northbeam",
        "Ad-hoc data analysis & ML prototypes",
      ],
    },
    {
      name: "Go",
      category: "Languages",
      level: "working" as const,
      years: 2,
      evidence: ["Internal CLI tools and small services"],
    },
    {
      name: "React",
      category: "Frontend",
      level: "expert" as const,
      years: 7,
      evidence: [
        "Designed Lumen's component system (used across 4 product surfaces)",
        "Built the embedded MCP widget runtime at Northbeam",
      ],
    },
    {
      name: "Next.js",
      category: "Frontend",
      level: "expert" as const,
      years: 5,
      evidence: ["khiw.dev portfolio", "Lumen marketing & app shell"],
    },
    {
      name: "Tailwind",
      category: "Frontend",
      level: "proficient" as const,
      years: 4,
      evidence: ["Default styling stack at last two roles"],
    },
    {
      name: "Node.js",
      category: "Backend",
      level: "expert" as const,
      years: 7,
      evidence: ["Primary backend runtime for MCP servers and API gateways"],
    },
    {
      name: "Postgres",
      category: "Backend",
      level: "proficient" as const,
      years: 6,
      evidence: ["Schema design for multi-tenant SaaS at Lumen"],
    },
    {
      name: "Redis",
      category: "Backend",
      level: "proficient" as const,
      years: 4,
      evidence: ["Caching + rate limiting layer for Ask AI endpoints"],
    },
    {
      name: "Kubernetes",
      category: "Infrastructure",
      level: "proficient" as const,
      years: 4,
      evidence: [
        "Operated Lumen's k8s footprint (EKS, ~120 pods)",
        "Wrote internal Helm chart used company-wide",
      ],
    },
    {
      name: "Terraform",
      category: "Infrastructure",
      level: "proficient" as const,
      years: 3,
      evidence: ["IaC for both employers' cloud envs"],
    },
    {
      name: "AWS",
      category: "Infrastructure",
      level: "proficient" as const,
      years: 5,
      evidence: ["Primary cloud at Lumen — EKS, RDS, SQS, S3"],
    },
    {
      name: "LangChain / LangGraph",
      category: "AI / ML",
      level: "proficient" as const,
      years: 2,
      evidence: ["Tool-use orchestration for evaluation pipelines"],
    },
    {
      name: "Model Context Protocol",
      category: "AI / ML",
      level: "expert" as const,
      years: 1,
      evidence: [
        "Contributed to the TypeScript SDK",
        "Designed Northbeam's internal MCP server architecture",
        "Maintainer of `mcp-portfolio-kit`",
      ],
    },
    {
      name: "Evaluation harnesses",
      category: "AI / ML",
      level: "proficient" as const,
      years: 2,
      evidence: ["Built golden-set evaluation framework at Northbeam"],
    },
  ],
};

const experienceData = {
  roles: [
    {
      id: "northbeam",
      company: "Northbeam",
      title: "Staff Software Engineer",
      start: "Sep 2023",
      end: "",
      current: true,
      summary:
        "Tech lead for the agentic UX surface — embedded MCP-driven widgets inside the analytics product. Owned eval harness and AI gateway.",
      achievements: [
        "Designed and shipped MCP server architecture serving 12 interactive widgets to internal + customer AI clients.",
        "Cut p95 widget cold-start from 2.1s to 380ms via streaming + edge caching.",
        "Built golden-set evaluation harness; reduced AI feature regressions reaching prod by ~70%.",
        "Mentored 4 engineers; ran weekly design-review office hours.",
      ],
      stack: [
        "TypeScript",
        "React",
        "Node.js",
        "Postgres",
        "Redis",
        "AWS",
        "Model Context Protocol",
        "LangGraph",
      ],
    },
    {
      id: "lumen",
      company: "Lumen",
      title: "Senior Software Engineer → Tech Lead",
      start: "May 2020",
      end: "Aug 2023",
      current: false,
      summary:
        "Joined as the 6th engineer; grew with the platform team to 15. Owned the multi-tenant data layer and internal developer platform.",
      achievements: [
        "Led migration from monolith to 6 well-bounded services without downtime.",
        "Authored Helm chart and CI templates used by every product team.",
        "Wrote schema-design RFC adopted as company standard for new services.",
        "Reduced cloud spend 32% via right-sizing and reserved-instance moves.",
      ],
      stack: [
        "TypeScript",
        "React",
        "Node.js",
        "Postgres",
        "Kubernetes",
        "Terraform",
        "AWS",
      ],
    },
    {
      id: "drift",
      company: "Drift",
      title: "Software Engineer",
      start: "Jul 2018",
      end: "Apr 2020",
      current: false,
      summary:
        "Built customer-facing chat widget runtime — the embeddable JS bundle that ran on tens of thousands of customer sites.",
      achievements: [
        "Shipped real-time message delivery rewrite (Socket.IO → custom WS) handling 10M+ daily events.",
        "Reduced widget bundle size by 41% through code-splitting and dependency pruning.",
        "Wrote A/B testing framework used across the entire product.",
      ],
      stack: ["TypeScript", "React", "Node.js", "Redis"],
    },
    {
      id: "intern",
      company: "Vercel",
      title: "Software Engineering Intern",
      start: "Jun 2017",
      end: "Aug 2017",
      current: false,
      summary:
        "Built CLI improvements for the deployment workflow and contributed to internal observability tooling.",
      achievements: [
        "Shipped 4 PRs accepted into the open-source CLI.",
        "Wrote a dashboard for tracking deploy-time regressions still in use post-intern.",
      ],
      stack: ["TypeScript", "Node.js", "React"],
    },
  ],
};

const projectsData = {
  projects: [
    {
      id: "mcp-portfolio-kit",
      name: "mcp-portfolio-kit",
      summary: "Open-source MCP server template for interactive portfolios.",
      description:
        "An mcp-use-based template that lets developers expose every section of their portfolio as a typed, interactive widget. Includes evidence-backed claims, section-scoped Ask AI, and a JD-tailored resume export tool. Designed so any frontend — a website, ChatGPT, Claude Desktop — can consume the same content surface.",
      tags: ["TypeScript", "MCP", "React", "Open-source"],
      status: "live" as const,
      metrics: [
        { label: "Stars", value: "1.2k" },
        { label: "Forks", value: "84" },
        { label: "Contributors", value: "17" },
      ],
      links: [
        { label: "GitHub", href: "https://github.com/" },
        { label: "Docs", href: "https://example.com/docs" },
      ],
    },
    {
      id: "evals-lab",
      name: "evals-lab",
      summary: "Golden-set evaluation harness for production LLM features.",
      description:
        "Internal-then-OSS framework that runs AI features against versioned golden sets on every PR. Comes with regression diff reports, cost telemetry, and a small CLI. Used in production at Northbeam to gate AI-feature deploys.",
      tags: ["Python", "AI / ML", "Tooling"],
      status: "beta" as const,
      metrics: [
        { label: "PR regressions caught", value: "70%↓" },
        { label: "Daily runs", value: "240+" },
      ],
      links: [{ label: "Write-up", href: "https://example.com/evals-lab" }],
    },
    {
      id: "edge-stream",
      name: "edge-stream",
      summary: "Minimal Server-Sent Events helper for edge runtimes.",
      description:
        "A ~2kb helper for streaming SSE responses from edge functions (Workers, Vercel Edge). Handles back-pressure, abort signals, and reconnection metadata. Shipped because the existing libs assumed Node.",
      tags: ["TypeScript", "Edge", "Open-source"],
      status: "live" as const,
      metrics: [
        { label: "Weekly DLs", value: "8.4k" },
        { label: "Bundle size", value: "1.9kb" },
      ],
      links: [
        { label: "npm", href: "https://www.npmjs.com/" },
        { label: "GitHub", href: "https://github.com/" },
      ],
    },
    {
      id: "khiw-dev",
      name: "khiw.dev portfolio",
      summary: "This site — an MCP-driven portfolio you can talk to.",
      description:
        "Every section is a widget served by an MCP server. Recruiters get a polished site; engineers can connect the same endpoint to an MCP client and verify the protocol claim directly. Includes Resume Export and section-scoped Ask AI.",
      tags: ["TypeScript", "MCP", "React", "Next.js"],
      status: "live" as const,
      metrics: [
        { label: "LCP", value: "1.4s" },
        { label: "Lighthouse", value: "98" },
      ],
      links: [{ label: "Visit", href: "https://khiw.dev" }],
    },
    {
      id: "rfc-archive",
      name: "rfc-archive",
      summary:
        "Searchable archive of internal engineering RFCs from past roles.",
      description:
        "A small Next.js site indexing 40+ RFCs I authored or reviewed across roles. Searchable, with tags and an embedding-based 'related RFCs' link. Published versions are redacted; full archive is private.",
      tags: ["Next.js", "Search", "Personal"],
      status: "archived" as const,
      metrics: [{ label: "RFCs indexed", value: "42" }],
      links: [],
    },
  ],
};

const contactData = {
  heading: "Get in touch",
  intro:
    "I read every message. The fastest way to reach me is email — drop a few sentences about the role, project, or question and I'll reply within a business day.",
  email: "hello@example.com",
  channels: [
    { label: "GitHub", handle: "@alexkim", href: "https://github.com/", icon: "⌥" },
    {
      label: "LinkedIn",
      handle: "/in/alexkim",
      href: "https://linkedin.com/",
      icon: "in",
    },
    { label: "X / Twitter", handle: "@alexkim", href: "https://x.com/", icon: "×" },
    {
      label: "Bluesky",
      handle: "@alexkim.bsky",
      href: "https://bsky.app/",
      icon: "ʙ",
    },
  ],
  responseTime: "Within 24h",
  timezone: "GMT+8 Singapore",
};

/* ------------------------------------------------------------------ */
/* Enrichment maps — deep-detail fixtures                             */
/* ------------------------------------------------------------------ */

const heroHighlightOrder = ["h-tenure", "h-platforms", "h-oss", "h-endtoend"] as const;

const heroHighlightDetails: Record<
  (typeof heroHighlightOrder)[number],
  {
    id: string;
    label: string;
    headline: string;
    summary: string;
    bullets: string[];
    relatedSkillNames: string[];
    relatedRoleIds: string[];
    relatedProjectIds: string[];
  }
> = {
  "h-tenure": {
    id: "h-tenure",
    label: "8+ years shipping production software",
    headline: "Eight years of compound shipping experience",
    summary:
      "From early-stage startups to Series-B platforms, I've shipped continuously and learned to optimize for sustainable velocity rather than heroics.",
    bullets: [
      "Joined Drift in 2018 as a product engineer; left as tech lead at Lumen six years later.",
      "Touched every layer — infra, backend, frontend, eval pipelines, distribution.",
      "Codified my shipping rituals into a code-review and design-doc playbook now used by junior engineers I mentor.",
    ],
    relatedSkillNames: ["TypeScript", "React", "Node.js"],
    relatedRoleIds: ["northbeam", "lumen", "drift"],
    relatedProjectIds: ["khiw-dev"],
  },
  "h-platforms": {
    id: "h-platforms",
    label: "Led platform teams at 2 Series-B startups",
    headline: "Built developer platforms at two Series-B startups",
    summary:
      "Took platform teams from 'just enough to ship' to having durable internal APIs, CI templates, and self-serve infra.",
    bullets: [
      "At Lumen: led monolith → 6 services migration, wrote the Helm chart used company-wide.",
      "At Northbeam: own the agentic UX platform — MCP server, AI gateway, eval harness.",
      "Both times: invested in onboarding docs and golden paths so the team scaled past me.",
    ],
    relatedSkillNames: ["Kubernetes", "Terraform", "Postgres", "AWS"],
    relatedRoleIds: ["northbeam", "lumen"],
    relatedProjectIds: ["evals-lab"],
  },
  "h-oss": {
    id: "h-oss",
    label: "Open-source maintainer · 4k+ stars",
    headline: "Open-source maintainer with 4k+ aggregate GitHub stars",
    summary:
      "Maintain two libraries used in production by other teams: an SSE helper for edge runtimes and an MCP portfolio template.",
    bullets: [
      "edge-stream — ~2kb SSE helper, ~8.4k weekly npm downloads.",
      "mcp-portfolio-kit — template for interactive MCP portfolios; 1.2k stars and 17 contributors.",
      "Triage policy: respond within 24h, no abandoned issues older than 30d.",
    ],
    relatedSkillNames: ["TypeScript", "Model Context Protocol", "Node.js"],
    relatedRoleIds: ["northbeam"],
    relatedProjectIds: ["mcp-portfolio-kit", "edge-stream"],
  },
  "h-endtoend": {
    id: "h-endtoend",
    label: "Comfortable end-to-end: infra → product",
    headline: "End-to-end fluency from infra to product surface",
    summary:
      "Comfortable operating any layer: k8s and Terraform on the bottom, React and Next.js on the top, eval harnesses and AI gateways in between.",
    bullets: [
      "Ship features that span migration, schema design, API, UI, and eval — without handoffs.",
      "Spend ~30% of time on infra and platform glue; the rest on product-visible surfaces.",
      "Strong opinions on where a line should be drawn between framework and product code.",
    ],
    relatedSkillNames: ["Kubernetes", "Terraform", "React", "Postgres", "Node.js"],
    relatedRoleIds: ["northbeam", "lumen"],
    relatedProjectIds: ["edge-stream", "evals-lab", "khiw-dev"],
  },
};

const availabilityDetail = {
  preferences: {
    locations: [
      "Remote (preferred)",
      "Singapore",
      "SF Bay Area (open to relocate for the right role)",
    ],
    comp: "Senior+ band; open to equity-heavy at founding-eng stage",
    teamSize: "8–40 engineers",
    avoid: ["Pure people-management tracks", "Banking/finance verticals"],
    roleTypes: ["Staff IC", "Tech Lead", "Founding engineer"],
  },
  calendar: [
    { week: "Week of Jun 30", capacity: "Discovery calls only", slotsOpen: 2 },
    { week: "Week of Jul 7", capacity: "Open for screens", slotsOpen: 5 },
    { week: "Week of Jul 14", capacity: "Open for screens + on-sites", slotsOpen: 6 },
    { week: "Week of Jul 21", capacity: "Limited (offsite Mon–Wed)", slotsOpen: 2 },
    { week: "Week of Jul 28", capacity: "Open", slotsOpen: 8 },
    { week: "Week of Aug 4", capacity: "Open", slotsOpen: 8 },
  ],
  willingToTravel: true,
  noticeRequired: "2 weeks",
};

const skillEnrichment: Record<
  string,
  { firstUsed: string; signal: string; relatedRoleIds: string[]; relatedProjectIds: string[] }
> = {
  TypeScript: {
    firstUsed: "2017",
    signal: "Daily driver",
    relatedRoleIds: ["northbeam", "lumen", "drift", "intern"],
    relatedProjectIds: ["mcp-portfolio-kit", "edge-stream", "khiw-dev"],
  },
  Python: {
    firstUsed: "2019",
    signal: "Weekly for evals",
    relatedRoleIds: ["northbeam"],
    relatedProjectIds: ["evals-lab"],
  },
  Go: {
    firstUsed: "2023",
    signal: "Occasional",
    relatedRoleIds: ["northbeam"],
    relatedProjectIds: [],
  },
  React: {
    firstUsed: "2018",
    signal: "Daily driver",
    relatedRoleIds: ["northbeam", "lumen", "drift", "intern"],
    relatedProjectIds: ["mcp-portfolio-kit", "khiw-dev"],
  },
  "Next.js": {
    firstUsed: "2020",
    signal: "Daily for product surfaces",
    relatedRoleIds: ["lumen", "northbeam"],
    relatedProjectIds: ["khiw-dev", "rfc-archive"],
  },
  Tailwind: {
    firstUsed: "2021",
    signal: "Daily for greenfield UI",
    relatedRoleIds: ["lumen", "northbeam"],
    relatedProjectIds: ["khiw-dev"],
  },
  "Node.js": {
    firstUsed: "2017",
    signal: "Daily driver",
    relatedRoleIds: ["northbeam", "lumen", "drift", "intern"],
    relatedProjectIds: ["edge-stream", "mcp-portfolio-kit"],
  },
  Postgres: {
    firstUsed: "2019",
    signal: "Owned schema at multiple roles",
    relatedRoleIds: ["northbeam", "lumen"],
    relatedProjectIds: [],
  },
  Redis: {
    firstUsed: "2020",
    signal: "Caching/rate limiting",
    relatedRoleIds: ["northbeam", "drift"],
    relatedProjectIds: [],
  },
  Kubernetes: {
    firstUsed: "2021",
    signal: "Operated EKS in production",
    relatedRoleIds: ["lumen"],
    relatedProjectIds: [],
  },
  Terraform: {
    firstUsed: "2022",
    signal: "Authored modules in two cloud envs",
    relatedRoleIds: ["lumen", "northbeam"],
    relatedProjectIds: [],
  },
  AWS: {
    firstUsed: "2020",
    signal: "Primary cloud for last 5 years",
    relatedRoleIds: ["lumen", "northbeam"],
    relatedProjectIds: [],
  },
  "LangChain / LangGraph": {
    firstUsed: "2023",
    signal: "Production tool-use orchestration",
    relatedRoleIds: ["northbeam"],
    relatedProjectIds: ["evals-lab"],
  },
  "Model Context Protocol": {
    firstUsed: "2024",
    signal: "Daily — primary protocol",
    relatedRoleIds: ["northbeam"],
    relatedProjectIds: ["mcp-portfolio-kit", "khiw-dev"],
  },
  "Evaluation harnesses": {
    firstUsed: "2023",
    signal: "Owned framework in prod",
    relatedRoleIds: ["northbeam"],
    relatedProjectIds: ["evals-lab"],
  },
};

const roleEnrichment: Record<
  string,
  {
    location: string;
    team: string;
    reports: string;
    links: { label: string; href: string }[];
    metrics: { label: string; value: string }[];
    keyDecisions: { decision: string; rationale: string; outcome: string }[];
    relatedProjectIds: string[];
  }
> = {
  northbeam: {
    location: "Remote (HQ: New York)",
    team: "Agentic UX, 6 engineers",
    reports: "Reports to VP Engineering",
    links: [
      { label: "Company", href: "https://example.com/northbeam" },
      { label: "Blog: Eval harness write-up", href: "https://example.com/evals-lab" },
    ],
    metrics: [
      { label: "p95 cold-start", value: "2.1s → 380ms" },
      { label: "Widgets shipped", value: "12" },
      { label: "AI regressions", value: "−70%" },
      { label: "Mentees", value: "4 ICs" },
    ],
    keyDecisions: [
      {
        decision: "Build a customer-facing MCP server instead of a REST API",
        rationale:
          "Customers wanted to wire analytics into their own AI assistants; MCP gave protocol-level reuse and a single content surface for web + AI.",
        outcome:
          "5 enterprise customers adopted the MCP endpoint in the first quarter; saved roughly two quarters of API design and client SDK work.",
      },
      {
        decision: "Stand up a golden-set eval harness before shipping any new AI feature",
        rationale:
          "AI regressions are silent and reach customers before metrics move; we needed a gate.",
        outcome:
          "Cut regressions reaching prod by ~70% and turned 'is this safe to ship?' into a one-glance answer.",
      },
    ],
    relatedProjectIds: ["mcp-portfolio-kit", "evals-lab", "edge-stream"],
  },
  lumen: {
    location: "Hybrid · San Francisco",
    team: "Platform, 6 → 15 engineers",
    reports: "Reported to Director of Platform",
    links: [{ label: "Company", href: "https://example.com/lumen" }],
    metrics: [
      { label: "Cloud spend", value: "−32%" },
      { label: "Services owned", value: "6" },
      { label: "Engineer onboarding", value: "3d → 0.5d" },
    ],
    keyDecisions: [
      {
        decision: "Strangler-pattern migration off the monolith",
        rationale:
          "A big-bang rewrite would risk months of stalled product work; we needed continuous shipping.",
        outcome:
          "Six well-bounded services without downtime; product velocity never dipped during migration.",
      },
      {
        decision: "Author a company-wide Helm chart instead of letting each team roll its own",
        rationale:
          "Inconsistent deploy patterns were the top source of on-call incidents.",
        outcome:
          "Every product team adopted it within a quarter; pager volume related to deploys dropped sharply.",
      },
    ],
    relatedProjectIds: [],
  },
  drift: {
    location: "Boston",
    team: "Conversations, 8 engineers",
    reports: "Reported to Engineering Manager",
    links: [],
    metrics: [
      { label: "Daily events handled", value: "10M+" },
      { label: "Widget bundle", value: "−41%" },
    ],
    keyDecisions: [
      {
        decision: "Replace Socket.IO with a custom WebSocket layer",
        rationale:
          "Socket.IO's fallbacks and reconnect heuristics caused subtle delivery bugs at our scale.",
        outcome:
          "Real-time delivery rewrite handled 10M+ daily events with simpler client code.",
      },
    ],
    relatedProjectIds: [],
  },
  intern: {
    location: "On-site · San Francisco",
    team: "DX, 4 engineers",
    reports: "Reported to a senior engineer mentor",
    links: [],
    metrics: [{ label: "CLI PRs merged", value: "4" }],
    keyDecisions: [
      {
        decision:
          "Build a deploy-time regression dashboard before adding more CLI features",
        rationale:
          "Without visibility into regressions, every CLI improvement was guesswork.",
        outcome:
          "Dashboard kept being used after the internship; informed which CLI flows to optimize next.",
      },
    ],
    relatedProjectIds: [],
  },
};

const projectEnrichment: Record<
  string,
  {
    tech: string[];
    team: string;
    timeline: string;
    relatedRoleIds: string[];
    changelog: { date: string; entry: string }[];
    headlineMetrics: {
      label: string;
      value: string;
      trend: "up" | "down" | "flat";
      context: string;
    }[];
    series: {
      label: string;
      unit: string;
      points: { period: string; value: number }[];
    }[];
  }
> = {
  "mcp-portfolio-kit": {
    tech: ["TypeScript", "React", "Node.js", "Model Context Protocol"],
    team: "Solo + 17 OSS contributors",
    timeline: "Started Q4 2024 · ongoing",
    relatedRoleIds: ["northbeam"],
    changelog: [
      { date: "2026-05-02", entry: "Released v1.4 — interactive widget hierarchy + cross-section drill-down." },
      { date: "2026-03-14", entry: "Added evidence-backed claims and section-scoped Ask AI." },
      { date: "2026-01-22", entry: "Refactored to mcp-use 2.x; widgets now render in ChatGPT Apps natively." },
      { date: "2025-11-10", entry: "Initial public release, 0.1.0." },
    ],
    headlineMetrics: [
      { label: "Stars", value: "1.2k", trend: "up", context: "+180 in the last 30 days" },
      { label: "Forks", value: "84", trend: "up", context: "+12 in the last 30 days" },
      { label: "Contributors", value: "17", trend: "up", context: "5 first-time PRs merged this quarter" },
      { label: "Open issues", value: "7", trend: "down", context: "All triaged within 24h" },
    ],
    series: [
      {
        label: "Weekly stars",
        unit: "stars/wk",
        points: [
          { period: "W1", value: 18 },
          { period: "W2", value: 24 },
          { period: "W3", value: 31 },
          { period: "W4", value: 47 },
          { period: "W5", value: 52 },
          { period: "W6", value: 68 },
        ],
      },
    ],
  },
  "evals-lab": {
    tech: ["Python", "LangChain / LangGraph", "Evaluation harnesses"],
    team: "Lead + 2 engineers",
    timeline: "Q1 2024 — present",
    relatedRoleIds: ["northbeam"],
    changelog: [
      { date: "2026-04-30", entry: "Cost telemetry shipped; OpenAI/Anthropic usage now visible per eval." },
      { date: "2026-02-12", entry: "Added regression diff reports surfaced inline in GitHub PRs." },
      { date: "2025-10-04", entry: "Open-sourced under MIT after one year of internal use." },
    ],
    headlineMetrics: [
      { label: "Daily runs", value: "240+", trend: "up", context: "Across 9 production AI features" },
      { label: "Regressions caught", value: "70%↓", trend: "down", context: "Reaching prod" },
      { label: "Eval p95", value: "47s", trend: "flat", context: "Stable for the last 6 weeks" },
    ],
    series: [
      {
        label: "Weekly regressions caught",
        unit: "issues",
        points: [
          { period: "W1", value: 6 },
          { period: "W2", value: 4 },
          { period: "W3", value: 9 },
          { period: "W4", value: 3 },
          { period: "W5", value: 5 },
          { period: "W6", value: 2 },
        ],
      },
    ],
  },
  "edge-stream": {
    tech: ["TypeScript", "Node.js"],
    team: "Solo",
    timeline: "Released 2024 · maintained",
    relatedRoleIds: ["northbeam"],
    changelog: [
      { date: "2026-05-10", entry: "v1.3.0 — added Cloudflare DurableObjects example." },
      { date: "2026-02-01", entry: "v1.2.0 — reconnect metadata + structured back-pressure." },
      { date: "2025-09-15", entry: "v1.0.0 — first stable release." },
    ],
    headlineMetrics: [
      { label: "Weekly downloads", value: "8.4k", trend: "up", context: "+11% MoM" },
      { label: "Bundle size", value: "1.9kb", trend: "flat", context: "Held under 2kb since v1.0" },
      { label: "Open issues", value: "2", trend: "flat", context: "Both feature requests" },
    ],
    series: [
      {
        label: "Weekly downloads",
        unit: "downloads/wk",
        points: [
          { period: "W1", value: 6100 },
          { period: "W2", value: 6800 },
          { period: "W3", value: 7400 },
          { period: "W4", value: 7900 },
          { period: "W5", value: 8200 },
          { period: "W6", value: 8400 },
        ],
      },
    ],
  },
  "khiw-dev": {
    tech: ["TypeScript", "Next.js", "React", "Model Context Protocol"],
    team: "Solo",
    timeline: "Q2 2026",
    relatedRoleIds: ["northbeam"],
    changelog: [
      { date: "2026-05-17", entry: "v1 spec frozen — 9 sandboxed sections, host-mediated event bus, JD-tailored resume export." },
      { date: "2026-04-09", entry: "Resume export tool prototype passing PDF round-trip tests." },
    ],
    headlineMetrics: [
      { label: "LCP", value: "1.4s", trend: "down", context: "P75 on 4G mobile" },
      { label: "Lighthouse", value: "98", trend: "up", context: "Performance score" },
      { label: "Sections wired", value: "9 / 9", trend: "up", context: "v1 scope" },
    ],
    series: [],
  },
  "rfc-archive": {
    tech: ["Next.js", "TypeScript"],
    team: "Solo",
    timeline: "2022–2023 · archived",
    relatedRoleIds: ["lumen"],
    changelog: [
      { date: "2023-08-30", entry: "Archived after leaving Lumen; private fork still in use." },
    ],
    headlineMetrics: [
      { label: "RFCs indexed", value: "42", trend: "flat", context: "Frozen at archive time" },
      { label: "Embeddings model", value: "ada-002", trend: "flat", context: "Not migrated" },
    ],
    series: [],
  },
};

const channelEnrichment: Record<
  string,
  {
    id: string;
    label: string;
    handle: string;
    href: string;
    icon: string;
    description: string;
    bestFor: string[];
    responseTime: string;
    activityNote: string;
  }
> = {
  email: {
    id: "email",
    label: "Email",
    handle: contactData.email,
    href: `mailto:${contactData.email}`,
    icon: "@",
    description:
      "The fastest way to reach me. Drop a few sentences about the role, project, or question — short messages get faster replies.",
    bestFor: [
      "Recruiting outreach with a JD attached",
      "Consulting inquiries",
      "Press / podcast requests",
    ],
    responseTime: "Within 24h on weekdays",
    activityNote: "Checked daily; never on auto-responder.",
  },
  github: {
    id: "github",
    label: "GitHub",
    handle: "@alexkim",
    href: "https://github.com/",
    icon: "⌥",
    description:
      "OSS work lives here. I triage issues on my maintained repos within 24h and respond to PRs within a business day.",
    bestFor: [
      "Issues and PRs on my repos",
      "Sponsorship / collaboration on libraries",
    ],
    responseTime: "Within 24h on weekdays",
    activityNote: "Active daily; pinned repos reflect current work.",
  },
  linkedin: {
    id: "linkedin",
    label: "LinkedIn",
    handle: "/in/alexkim",
    href: "https://linkedin.com/",
    icon: "in",
    description:
      "Career posts and slower-cadence updates. I don't browse the feed often, but I do read direct InMail.",
    bestFor: [
      "Recruiting outreach when email isn't handy",
      "Re-connecting with past colleagues",
    ],
    responseTime: "Within 2–3 business days",
    activityNote: "Checked 1–2× per week.",
  },
  x: {
    id: "x",
    label: "X / Twitter",
    handle: "@alexkim",
    href: "https://x.com/",
    icon: "×",
    description:
      "Posts about engineering, agentic UX, and shipping. DMs open from mutuals.",
    bestFor: [
      "Quick technical questions in public",
      "Conference / event invites",
    ],
    responseTime: "Within a few hours when online",
    activityNote: "Active most weekdays.",
  },
  bluesky: {
    id: "bluesky",
    label: "Bluesky",
    handle: "@alexkim.bsky",
    href: "https://bsky.app/",
    icon: "ʙ",
    description:
      "Mirror of my X presence; lower volume, more long-form.",
    bestFor: ["Following along without algorithmic noise"],
    responseTime: "Same day when online",
    activityNote: "Active 2–3× per week.",
  },
};

const channelOrder = ["email", "github", "linkedin", "x", "bluesky"] as const;

/* ------------------------------------------------------------------ */
/* Deep enrichment — sub-sub-components                               */
/* ------------------------------------------------------------------ */

const aboutData = {
  name: "Alex Kim",
  headline:
    "Staff engineer focused on agent-native UX, developer platforms, and shipping discipline.",
  narrative: [
    "I've spent eight years moving along a single spine: build the thing, ship the thing, watch it land, learn, and harden it. The technology has shifted — Socket.IO chat widgets, micro-services, MCP servers — the muscle is the same.",
    "Most of my best work has lived at the seam between infra and product: rewriting the bits of platform that block product engineers and then handing them back, with docs, golden paths, and pager rotation included.",
    "Lately I'm energised by the AI-agent interface problem. There's a real systems job to be done: durable identity for tools, content surfaces that work for humans and models, evaluation gates that actually catch regressions. That's where I want to keep building.",
  ],
  philosophy: [
    {
      title: "Optimize for sustainable velocity",
      body: "Heroic shipping doesn't compound. I invest in playbooks, golden paths and CI so the team's third release is cheaper than the first.",
    },
    {
      title: "Make the right thing the easy thing",
      body: "If the secure / observable / well-typed path takes more keystrokes than the unsafe one, the unsafe one wins. Fix the defaults.",
    },
    {
      title: "Ship vertically, not horizontally",
      body: "Cut a thin user-facing slice end-to-end before broadening it. The first slice teaches you what the platform layer actually needs to support.",
    },
    {
      title: "Write things down",
      body: "Design docs and RFCs are leverage. They turn an opinion into a decision you can review six months later when the constraints have changed.",
    },
  ],
  workingStyle: [
    "Default to async; meetings have an agenda or get reduced to a doc.",
    "I prefer mid-size teams (8–40 engineers) where I can still know every codebase.",
    "Strong opinions, weak attachments — happy to disagree-and-commit when the call isn't mine.",
    "Comfortable being on-call; less interested in PM-by-proxy work disguised as engineering.",
  ],
};

const careerJourneyData = {
  summary:
    "From bootcamp grad to staff engineer over eight years, with deliberate jumps at the points where the next thing required a new skill.",
  milestones: [
    {
      id: "m-2017-intern",
      year: "2017",
      title: "Engineering internship at Vercel",
      body:
        "First real production codebase. Learned what shipping with reviewers actually feels like and how strong DX teams use observability as a product feature.",
      lesson:
        "Tooling earns its keep by the third regression it prevents — not the demo.",
      relatedSkillNames: ["TypeScript", "Node.js"],
      relatedRoleIds: ["intern"],
      relatedProjectIds: [],
    },
    {
      id: "m-2018-drift",
      year: "2018",
      title: "Joined Drift as a product engineer",
      body:
        "Owned the customer-facing chat widget runtime. Learned to write JS that ran on tens of thousands of other people's sites — bundle size, CSP, isolation.",
      lesson:
        "Code that runs in someone else's environment forces you to budget every kilobyte.",
      relatedSkillNames: ["TypeScript", "React"],
      relatedRoleIds: ["drift"],
      relatedProjectIds: [],
    },
    {
      id: "m-2020-lumen",
      year: "2020",
      title: "Senior engineer at Lumen",
      body:
        "Sixth engineering hire. Stepped into platform work and discovered I like sand-papering golden paths more than chasing the next feature.",
      lesson:
        "Senior is the first level where your job is the team, not the keyboard.",
      relatedSkillNames: ["Kubernetes", "Postgres", "Terraform"],
      relatedRoleIds: ["lumen"],
      relatedProjectIds: [],
    },
    {
      id: "m-2022-techlead",
      year: "2022",
      title: "Promoted to tech lead at Lumen",
      body:
        "Led the monolith → services migration without downtime. Wrote the Helm chart that became the company standard.",
      lesson:
        "Migrations live or die by whether product velocity dipped during the cutover.",
      relatedSkillNames: ["Kubernetes", "Terraform", "AWS"],
      relatedRoleIds: ["lumen"],
      relatedProjectIds: [],
    },
    {
      id: "m-2023-northbeam",
      year: "2023",
      title: "Staff engineer at Northbeam",
      body:
        "Took on the agentic UX surface — MCP server, eval harness, AI gateway. First time owning a problem space that was inventing itself in real time.",
      lesson:
        "When the protocol is new, the work is half engineering, half writing the contract you wish existed.",
      relatedSkillNames: [
        "Model Context Protocol",
        "TypeScript",
        "Evaluation harnesses",
      ],
      relatedRoleIds: ["northbeam"],
      relatedProjectIds: ["mcp-portfolio-kit", "evals-lab"],
    },
    {
      id: "m-2025-oss",
      year: "2025",
      title: "Crossed 4k OSS stars",
      body:
        "Shipped edge-stream and mcp-portfolio-kit and committed to a real triage policy. OSS work informs my day job and vice-versa.",
      lesson:
        "Maintaining is harder than launching; budget time for it like any other commitment.",
      relatedSkillNames: ["TypeScript", "Node.js", "Model Context Protocol"],
      relatedRoleIds: [],
      relatedProjectIds: ["mcp-portfolio-kit", "edge-stream"],
    },
  ],
};

const careerMilestoneOrder = careerJourneyData.milestones.map((m) => m.id);

const heroStatsData = {
  yearsExperience: 8,
  companies: 3,
  productionLaunches: 27,
  reposMaintained: 4,
  ossStarsTotal: 4180,
  ossWeeklyDownloads: 8400,
  mentees: 11,
  rfcsAuthored: 42,
  topLanguages: [
    { name: "TypeScript", years: 7 },
    { name: "Python", years: 5 },
    { name: "Go", years: 2 },
    { name: "SQL", years: 6 },
  ],
};

const languageStats: Record<
  string,
  {
    name: string;
    category: string;
    yearsActive: number;
    firstUsed: string;
    proficiency: string;
    proficiencyLabel: string;
    totalLoc: string;
    filesAuthored: number;
    reposActive: number;
    topFrameworks: string[];
    signature: string;
    sampleSnippet?: { title: string; language: string; code: string };
    benchmarks: { label: string; value: string }[];
    relatedRoleIds: string[];
    relatedProjectIds: string[];
  }
> = {
  TypeScript: {
    name: "TypeScript",
    category: "Languages",
    yearsActive: 7,
    firstUsed: "2017",
    proficiency: "expert",
    proficiencyLabel: "Expert",
    totalLoc: "~310k",
    filesAuthored: 2840,
    reposActive: 4,
    topFrameworks: ["React", "Next.js", "Node.js", "Vitest", "Zod"],
    signature:
      "Daily driver for client + server. I lean on strict types, exhaustive switches, and Zod schemas at every boundary to keep refactors safe.",
    sampleSnippet: {
      title: "Type-narrowed tool dispatcher",
      language: "typescript",
      code: `type ToolMap = {\n  get_hero: () => Promise<HeroProps>;\n  get_skills: (input: { category?: string }) => Promise<SkillsProps>;\n};\n\nasync function dispatch<K extends keyof ToolMap>(\n  name: K,\n  input: Parameters<ToolMap[K]>[0]\n): Promise<Awaited<ReturnType<ToolMap[K]>>> {\n  const handler = tools[name];\n  return handler(input as any);\n}`,
    },
    benchmarks: [
      { label: "Type-level generics", value: "Comfortable" },
      { label: "Performance tuning", value: "Comfortable" },
      { label: "Build tooling", value: "Comfortable" },
      { label: "Codegen / AST", value: "Working" },
    ],
    relatedRoleIds: ["northbeam", "lumen", "drift", "intern"],
    relatedProjectIds: ["mcp-portfolio-kit", "edge-stream", "khiw-dev"],
  },
  Python: {
    name: "Python",
    category: "Languages",
    yearsActive: 5,
    firstUsed: "2019",
    proficiency: "proficient",
    proficiencyLabel: "Proficient",
    totalLoc: "~85k",
    filesAuthored: 620,
    reposActive: 2,
    topFrameworks: ["pytest", "FastAPI", "LangChain / LangGraph", "uv", "pydantic"],
    signature:
      "Reach for it when the problem is data, evals, or tool-use orchestration. Strict typing with pyright, pydantic models at the edges.",
    sampleSnippet: {
      title: "Eval harness scoring",
      language: "python",
      code: `def score(run: Run, golden: GoldenSet) -> EvalResult:\n    matched = [\n        c for c in run.completions\n        if c.tool_name in golden.expected_tools\n    ]\n    return EvalResult(\n        precision=len(matched) / max(len(run.completions), 1),\n        recall=len(matched) / max(len(golden.expected_tools), 1),\n        regressions=golden.diff(run),\n    )`,
    },
    benchmarks: [
      { label: "Async / asyncio", value: "Comfortable" },
      { label: "Typing / pyright", value: "Comfortable" },
      { label: "Packaging (uv/poetry)", value: "Comfortable" },
      { label: "Data science stack", value: "Working" },
    ],
    relatedRoleIds: ["northbeam"],
    relatedProjectIds: ["evals-lab"],
  },
  Go: {
    name: "Go",
    category: "Languages",
    yearsActive: 2,
    firstUsed: "2023",
    proficiency: "working",
    proficiencyLabel: "Working",
    totalLoc: "~14k",
    filesAuthored: 110,
    reposActive: 1,
    topFrameworks: ["cobra", "net/http", "testify"],
    signature:
      "Used for internal CLIs and small services where boot time matters. I treat it like 'TypeScript but with goroutines' — explicit, boring, fast.",
    sampleSnippet: {
      title: "Concurrent fan-out",
      language: "go",
      code: `func fanout(ctx context.Context, urls []string) ([]Result, error) {\n  results := make([]Result, len(urls))\n  g, ctx := errgroup.WithContext(ctx)\n  for i, u := range urls {\n    i, u := i, u\n    g.Go(func() error {\n      r, err := fetch(ctx, u)\n      if err != nil { return err }\n      results[i] = r\n      return nil\n    })\n  }\n  return results, g.Wait()\n}`,
    },
    benchmarks: [
      { label: "Concurrency primitives", value: "Working" },
      { label: "Generics", value: "Working" },
      { label: "Profiling", value: "Beginner" },
    ],
    relatedRoleIds: ["northbeam"],
    relatedProjectIds: [],
  },
  SQL: {
    name: "SQL",
    category: "Languages",
    yearsActive: 6,
    firstUsed: "2019",
    proficiency: "proficient",
    proficiencyLabel: "Proficient",
    totalLoc: "~9k",
    filesAuthored: 180,
    reposActive: 3,
    topFrameworks: ["Postgres", "pg_partman", "dbmate", "Prisma"],
    signature:
      "Schema-first. I write migrations by hand, design indexes around the queries, and treat the query planner as a debugger.",
    benchmarks: [
      { label: "Window functions", value: "Comfortable" },
      { label: "Index design", value: "Comfortable" },
      { label: "Partitioning", value: "Working" },
      { label: "Replication / HA", value: "Working" },
    ],
    relatedRoleIds: ["northbeam", "lumen"],
    relatedProjectIds: [],
  },
};

const languageStatsOrder = ["TypeScript", "Python", "Go", "SQL"];

const roleAchievementsExtra: Record<
  string,
  {
    method: string;
    impact: string;
    metric: string;
    skillsApplied: string[];
    collaborators: string;
    timeframe: string;
  }[]
> = {
  northbeam: [
    {
      method:
        "Designed an MCP server architecture from scratch: protocol layer, widget renderer, and an AI-gateway proxy. Shipped iteratively behind a feature flag with a golden-set eval gate.",
      impact:
        "Customers wired the analytics product into their own MCP clients. Five enterprise teams adopted it in Q1; sales used it as a wedge into the platform-tier conversation.",
      metric: "12 interactive widgets in production · 5 enterprise integrations in Q1",
      skillsApplied: [
        "Model Context Protocol",
        "TypeScript",
        "Node.js",
        "React",
      ],
      collaborators: "Co-led with one senior IC; reviewed by VP Eng.",
      timeframe: "Sep 2023 – Mar 2024",
    },
    {
      method:
        "Profiled cold-start with Chrome DevTools + server-side flame graphs. Introduced edge caching of the widget bundle and streamed the first paint while the model warmed up.",
      impact:
        "Made the widget experience feel native. Removed the main complaint blocking enterprise approval — the perceived 'AI feature' lag.",
      metric: "p95 widget cold-start: 2.1s → 380ms (−82%)",
      skillsApplied: ["TypeScript", "React", "Node.js", "AWS"],
      collaborators: "Solo on infra; perf reviewed with the frontend lead.",
      timeframe: "Q4 2023",
    },
    {
      method:
        "Built a golden-set eval harness that runs on every PR touching AI features. Each suite emits a regression diff and posts back to the PR as a status check.",
      impact:
        "Turned 'is this safe to ship?' into a one-glance answer. Caught 2 silent regressions that would have shipped without it.",
      metric: "AI-feature regressions reaching prod: −70%",
      skillsApplied: ["Python", "Evaluation harnesses", "LangChain / LangGraph"],
      collaborators: "Worked with the eval intern + reviewed by the AI lead.",
      timeframe: "Q1 2024",
    },
    {
      method:
        "Ran weekly design-review office hours; paired with each mentee on one major design doc; left written feedback that doubled as a teaching artifact.",
      impact:
        "Mentees grew faster; the team's design-review quality stopped being a bottleneck for me.",
      metric: "4 mentees · 2 internal RFC authors graduated",
      skillsApplied: ["TypeScript", "Node.js"],
      collaborators: "Co-mentor: senior IC on the platform team.",
      timeframe: "Ongoing",
    },
  ],
  lumen: [
    {
      method:
        "Used the strangler pattern: stood up the new service alongside the monolith, dual-wrote, then shifted reads behind a feature flag once parity was proven.",
      impact:
        "Six services carved out of the monolith without downtime. Product velocity never dipped during the migration — the metric most leadership migrations fail.",
      metric: "0 minutes of customer-facing downtime · 6 services live",
      skillsApplied: ["Kubernetes", "Terraform", "Postgres", "Node.js"],
      collaborators: "Co-led with platform tech lead.",
      timeframe: "2021–2023",
    },
    {
      method:
        "Wrote a base Helm chart with sane defaults (resource limits, probes, logging, tracing). Added a generator CLI that scaffolded new services with the chart pre-wired.",
      impact:
        "Every product team adopted it within a quarter; deploy-related on-call volume dropped sharply.",
      metric: "Adoption: 100% of services · pager: −60% deploy-related pages",
      skillsApplied: ["Kubernetes", "Terraform", "TypeScript"],
      collaborators: "Reviewed weekly by the platform team.",
      timeframe: "Q2 2022",
    },
    {
      method:
        "Pre-authored a schema-design RFC template, paired with each team's first schema-touch PR, and held office hours.",
      impact:
        "RFC was adopted as the company standard. New services landed with consistent migration tooling.",
      metric: "RFC adopted company-wide · 14 new services followed it",
      skillsApplied: ["Postgres", "TypeScript"],
      collaborators: "Reviewed by data and platform leads.",
      timeframe: "Q3 2022",
    },
    {
      method:
        "Tagged every cloud resource by team, surfaced spend per team weekly, then took the top 3 offenders and right-sized + moved to reserved instances.",
      impact:
        "Reclaimed budget without anyone losing capacity. Created a sustainable cost-discipline loop.",
      metric: "Cloud spend: −32% YoY",
      skillsApplied: ["AWS", "Terraform"],
      collaborators: "Partnered with FinOps lead.",
      timeframe: "Q4 2022",
    },
  ],
  drift: [
    {
      method:
        "Replaced Socket.IO with a hand-rolled WebSocket client with explicit reconnect/heartbeat semantics. Ran both in parallel for two weeks and compared delivery telemetry.",
      impact:
        "Cleaner client code, predictable behaviour under network failure, and a measurable drop in 'message never delivered' tickets.",
      metric: "10M+ events/day handled · delivery bug reports −55%",
      skillsApplied: ["TypeScript", "Node.js", "Redis"],
      collaborators: "Reviewed by backend lead.",
      timeframe: "2019",
    },
    {
      method:
        "Code-split the widget by use-case (visitor vs. agent), lazy-loaded translation bundles, pruned dependencies.",
      impact:
        "Smaller widget = faster page loads on customer sites = fewer 'your widget is slowing my site' tickets.",
      metric: "Widget bundle: −41%",
      skillsApplied: ["TypeScript", "React"],
      collaborators: "Solo.",
      timeframe: "2019",
    },
    {
      method:
        "Built an experiment framework with a typed config DSL and a results dashboard. Productionised the analytics pipeline to support continuous tests.",
      impact:
        "Every product team ran experiments without needing engineering support; experimentation became part of the default workflow.",
      metric: "Used by every product team · powered 60+ experiments in year 1",
      skillsApplied: ["TypeScript", "Postgres"],
      collaborators: "Co-built with a data scientist.",
      timeframe: "2020",
    },
  ],
  intern: [
    {
      method:
        "Picked four user-facing CLI papercuts off the issue tracker; pair-programmed each PR with a senior engineer.",
      impact:
        "Improved the daily-driver tool used by every Vercel user. PRs reviewed, merged, and released during the internship.",
      metric: "4 PRs merged · 0 reverts",
      skillsApplied: ["TypeScript", "Node.js"],
      collaborators: "Mentored by a senior engineer.",
      timeframe: "Jun–Aug 2017",
    },
    {
      method:
        "Built a dashboard tracking deploy-time regressions. Used the company's metrics stack with my own ingest pipeline.",
      impact:
        "Tool kept running after the internship ended; became a regular reference for the DX team.",
      metric: "Adopted by DX team post-intern",
      skillsApplied: ["TypeScript", "Node.js", "React"],
      collaborators: "Mentor reviewed weekly.",
      timeframe: "Jul–Aug 2017",
    },
  ],
};

const roleDecisionsExtra: Record<
  string,
  {
    alternativesConsidered: { alt: string; whyNot: string }[];
    risksMitigated: string[];
    lessonsLearned: string[];
    relatedSkills: string[];
  }[]
> = {
  northbeam: [
    {
      alternativesConsidered: [
        {
          alt: "Build a REST API + ship per-client SDKs.",
          whyNot:
            "Maintaining N SDKs would split the team's capacity; we wanted one protocol for both web and AI clients.",
        },
        {
          alt: "Ship a GraphQL gateway and let clients query.",
          whyNot:
            "Solves data shape but not the agentic-UX problem: tool selection, sampling, and widget rendering.",
        },
      ],
      risksMitigated: [
        "Lock-in to a custom protocol — mitigated by following the open MCP spec.",
        "Customer pushback on a young protocol — mitigated by also exposing a REST adapter for non-MCP clients.",
      ],
      lessonsLearned: [
        "Protocol choices are bets on ecosystem; pick ones where you can be a first-class participant.",
        "Always pair a new-protocol bet with a fallback adapter.",
      ],
      relatedSkills: ["Model Context Protocol", "TypeScript", "Node.js"],
    },
    {
      alternativesConsidered: [
        {
          alt: "Manual smoke tests + post-deploy monitoring.",
          whyNot:
            "Regressions reach customers before metrics move; we needed a pre-merge gate.",
        },
        {
          alt: "Buy a hosted eval product.",
          whyNot:
            "Existing products didn't model our tool-use traces well enough for the diff to be actionable.",
        },
      ],
      risksMitigated: [
        "Golden sets going stale — mitigated by a quarterly audit task on the eng calendar.",
        "Flaky LLM scoring — mitigated by recording raw traces and re-scoring on demand.",
      ],
      lessonsLearned: [
        "Treat eval suites as production code; they decay if you don't own them.",
        "PR-status integration matters more than the dashboard — engineers fix what blocks merge.",
      ],
      relatedSkills: [
        "Evaluation harnesses",
        "Python",
        "LangChain / LangGraph",
      ],
    },
  ],
  lumen: [
    {
      alternativesConsidered: [
        {
          alt: "Big-bang rewrite into a new repo.",
          whyNot:
            "Months of stalled product work, high risk of mid-flight cancellation.",
        },
        {
          alt: "Modular monolith — keep one binary, split modules.",
          whyNot:
            "Didn't solve our independent-deploy problem; still shared a release train.",
        },
      ],
      risksMitigated: [
        "Dual-write divergence — mitigated by a shadow-read comparison job.",
        "Migration fatigue — mitigated by capping the slice size and shipping wins weekly.",
      ],
      lessonsLearned: [
        "The hardest part of strangler migrations is keeping the migration the team's #1 priority.",
        "Make the cutover a flag flip, not a release.",
      ],
      relatedSkills: ["Kubernetes", "Postgres", "Node.js"],
    },
    {
      alternativesConsidered: [
        {
          alt: "Per-team Helm charts.",
          whyNot:
            "We tried this for a year; it was the top source of deploy-related on-call pages.",
        },
        {
          alt: "Argo CD with vendored manifests, no Helm.",
          whyNot:
            "Removed templating just to add a different templating tool; same problem.",
        },
      ],
      risksMitigated: [
        "Chart becoming a bottleneck — mitigated by versioning the chart and letting teams pin.",
        "Hidden defaults — mitigated by writing the chart README as a doc, not reference.",
      ],
      lessonsLearned: [
        "Defaults are governance. Spend time on them.",
        "A platform team's product is the migration guide, not the chart.",
      ],
      relatedSkills: ["Kubernetes", "Terraform", "AWS"],
    },
  ],
  drift: [
    {
      alternativesConsidered: [
        {
          alt: "Stay on Socket.IO; tune the transport.",
          whyNot:
            "We had spent two quarters tuning and the bugs we hated were structural.",
        },
        {
          alt: "Move to SSE for server→client only.",
          whyNot:
            "Two-way messaging is the product; SSE alone forced an extra channel for the upstream path.",
        },
      ],
      risksMitigated: [
        "Reinventing transport bugs — mitigated by running both in parallel for two weeks.",
        "Operational unfamiliarity — mitigated by writing a runbook before cutover.",
      ],
      lessonsLearned: [
        "Run new and old in parallel longer than feels necessary.",
        "Reconnect/heartbeat semantics are the actual product, not the framing.",
      ],
      relatedSkills: ["TypeScript", "Node.js", "Redis"],
    },
  ],
  intern: [
    {
      alternativesConsidered: [
        {
          alt: "Add more CLI flags first; instrument later.",
          whyNot:
            "Without telemetry I'd be optimising for what looked broken, not what was.",
        },
      ],
      risksMitigated: [
        "Mis-attribution of regressions — mitigated by including build metadata in every metric.",
      ],
      lessonsLearned: [
        "Build the measuring stick before the thing you're measuring.",
      ],
      relatedSkills: ["TypeScript", "Node.js"],
    },
  ],
};

const projectTechstack: Record<
  string,
  {
    languages: { name: string; percentage: number; lines: number; primary: boolean }[];
    layers: { layer: string; stack: string[]; rationale: string }[];
    modules: { id: string; name: string; purpose: string }[];
    notableLibs: { name: string; purpose: string }[];
  }
> = {
  "mcp-portfolio-kit": {
    languages: [
      { name: "TypeScript", percentage: 78, lines: 9400, primary: true },
      { name: "JSON", percentage: 12, lines: 1450, primary: false },
      { name: "Markdown", percentage: 7, lines: 820, primary: false },
      { name: "CSS", percentage: 3, lines: 360, primary: false },
    ],
    layers: [
      {
        layer: "Protocol",
        stack: ["Model Context Protocol", "mcp-use"],
        rationale:
          "MCP is the contract — each section is a tool/resource pair. mcp-use handles transport and widget bundling so the kit stays portable across hosts.",
      },
      {
        layer: "Widgets (UI)",
        stack: ["React", "TypeScript", "Zod"],
        rationale:
          "Each widget is a React component with Zod-validated props. Zod doubles as the wire schema so server payloads never drift from the renderer.",
      },
      {
        layer: "Server / runtime",
        stack: ["Node.js", "Hono"],
        rationale:
          "Hono gives us fast routing + edge-runtime compatibility for the same codebase.",
      },
      {
        layer: "Build / dev tooling",
        stack: ["tsx", "Vite", "vitest"],
        rationale:
          "Fast HMR for widget iteration, isolated test runs for tool handlers.",
      },
    ],
    modules: [
      {
        id: "mod-tools",
        name: "tools/",
        purpose: "Server-side tool handlers that produce widget payloads.",
      },
      {
        id: "mod-resources",
        name: "resources/",
        purpose: "React widget components (one .tsx per section).",
      },
      {
        id: "mod-evidence",
        name: "evidence/",
        purpose:
          "Knowledge-graph adapter and evidence-lookup helpers used to cite claims.",
      },
      {
        id: "mod-pdf",
        name: "pdf/",
        purpose: "JD-tailored resume PDF renderer with provenance footnotes.",
      },
    ],
    notableLibs: [
      { name: "mcp-use", purpose: "MCP server framework + widget bundler" },
      { name: "Zod", purpose: "Runtime + compile-time validation of props" },
      { name: "Hono", purpose: "HTTP routing for the MCP server" },
      { name: "react", purpose: "Widget rendering layer" },
    ],
  },
  "evals-lab": {
    languages: [
      { name: "Python", percentage: 84, lines: 7200, primary: true },
      { name: "YAML", percentage: 10, lines: 870, primary: false },
      { name: "Markdown", percentage: 4, lines: 320, primary: false },
      { name: "Shell", percentage: 2, lines: 160, primary: false },
    ],
    layers: [
      {
        layer: "Orchestration",
        stack: ["LangGraph", "asyncio"],
        rationale:
          "LangGraph models tool-use traces as DAGs we can diff against goldens.",
      },
      {
        layer: "Scoring",
        stack: ["pytest", "pydantic", "deepdiff"],
        rationale:
          "Pytest gives us a familiar harness; pydantic + deepdiff produce the structured regression report.",
      },
      {
        layer: "CLI",
        stack: ["Typer", "rich"],
        rationale:
          "Typer keeps the CLI surface ergonomic; rich renders trace diffs in terminals.",
      },
    ],
    modules: [
      { id: "mod-runner", name: "runner/", purpose: "Trace execution + sampling." },
      { id: "mod-scorer", name: "scorer/", purpose: "Diff + score golden vs actual." },
      { id: "mod-report", name: "report/", purpose: "Markdown/HTML report rendering for PRs." },
      { id: "mod-cli", name: "cli/", purpose: "Typer CLI: run, diff, freeze, replay." },
    ],
    notableLibs: [
      { name: "LangGraph", purpose: "Trace DAG modelling" },
      { name: "pydantic", purpose: "Typed result schemas" },
      { name: "deepdiff", purpose: "Structured trace diffs" },
    ],
  },
  "edge-stream": {
    languages: [
      { name: "TypeScript", percentage: 92, lines: 1100, primary: true },
      { name: "JSON", percentage: 5, lines: 60, primary: false },
      { name: "Markdown", percentage: 3, lines: 35, primary: false },
    ],
    layers: [
      {
        layer: "Core stream",
        stack: ["TypeScript", "ReadableStream"],
        rationale:
          "Built on the standard WHATWG stream — runs unmodified on Workers, Vercel Edge, Bun, and Node 18+.",
      },
      {
        layer: "Adapters",
        stack: ["Workers", "Vercel Edge", "Node"],
        rationale:
          "Thin runtime-specific shims that handle abort signals and reconnect metadata differently.",
      },
    ],
    modules: [
      { id: "mod-core", name: "core/", purpose: "Stream + back-pressure logic." },
      { id: "mod-adapters", name: "adapters/", purpose: "Per-runtime adapters." },
      { id: "mod-examples", name: "examples/", purpose: "Worked examples for each runtime." },
    ],
    notableLibs: [
      { name: "tsup", purpose: "Multi-target bundling (esm/cjs)" },
      { name: "vitest", purpose: "Unit tests with mocked streams" },
    ],
  },
  "khiw-dev": {
    languages: [
      { name: "TypeScript", percentage: 71, lines: 5400, primary: true },
      { name: "MDX", percentage: 18, lines: 1380, primary: false },
      { name: "CSS", percentage: 8, lines: 620, primary: false },
      { name: "JSON", percentage: 3, lines: 230, primary: false },
    ],
    layers: [
      {
        layer: "Site shell",
        stack: ["Next.js", "React"],
        rationale: "Next.js gives us streaming + edge-runtime support.",
      },
      {
        layer: "MCP integration",
        stack: ["mcp-use", "Model Context Protocol"],
        rationale:
          "Same MCP server powers the website and any AI client; sections are protocol resources.",
      },
      {
        layer: "Content / RAG",
        stack: ["MDX", "Vector store"],
        rationale:
          "MDX for narrative content; vector store for the section-scoped Ask AI surface.",
      },
    ],
    modules: [
      { id: "mod-shell", name: "app/", purpose: "Next.js app router shell + host bus." },
      { id: "mod-mcp", name: "mcp/", purpose: "MCP tools + resources." },
      { id: "mod-rag", name: "rag/", purpose: "Section-scoped Ask AI." },
      { id: "mod-pdf", name: "pdf/", purpose: "Resume export tool." },
    ],
    notableLibs: [
      { name: "Next.js", purpose: "App-router shell" },
      { name: "mcp-use", purpose: "MCP server runtime" },
      { name: "shiki", purpose: "Code highlighting in MDX" },
    ],
  },
  "rfc-archive": {
    languages: [
      { name: "TypeScript", percentage: 65, lines: 1800, primary: true },
      { name: "Markdown", percentage: 30, lines: 820, primary: false },
      { name: "CSS", percentage: 5, lines: 140, primary: false },
    ],
    layers: [
      {
        layer: "Shell",
        stack: ["Next.js"],
        rationale: "Same site shell as the portfolio; cheap to maintain.",
      },
      {
        layer: "Embeddings",
        stack: ["ada-002", "FAISS"],
        rationale:
          "Offline-built index for 'related RFCs' link; small enough to ship as static.",
      },
    ],
    modules: [
      { id: "mod-index", name: "indexer/", purpose: "Builds the embedding index from MD." },
      { id: "mod-site", name: "site/", purpose: "Next.js reader UI." },
    ],
    notableLibs: [
      { name: "Next.js", purpose: "Reader UI" },
      { name: "FAISS", purpose: "Embedding index" },
    ],
  },
};

const projectLanguageDetail: Record<
  string,
  Record<
    string,
    {
      why: string;
      keyModuleIds: string[];
      frameworks: string[];
      sampleSnippet?: { title: string; language: string; code: string };
    }
  >
> = {
  "mcp-portfolio-kit": {
    TypeScript: {
      why: "Every protocol boundary and widget prop is typed end-to-end so we can refactor section schemas without runtime surprises.",
      keyModuleIds: ["mod-tools", "mod-resources", "mod-evidence"],
      frameworks: ["mcp-use", "React", "Zod", "Node.js"],
      sampleSnippet: {
        title: "Tool returning a typed widget payload",
        language: "typescript",
        code: `server.tool({\n  name: "get_project_detail",\n  schema: z.object({ id: z.string() }),\n  widget: { name: "project-detail" },\n}, async ({ id }) => {\n  const p = findProject(id);\n  if (!p) return error(\`Unknown project \${id}\`);\n  return widget({ props: enrichProject(p), output: text(p.summary) });\n});`,
      },
    },
    JSON: {
      why: "Tool registry + bundle manifests are JSON so external tooling can ingest the surface without parsing TS.",
      keyModuleIds: ["mod-tools"],
      frameworks: [],
    },
    Markdown: {
      why: "Docs and README live next to code; same Markdown is sourced by the docs site.",
      keyModuleIds: [],
      frameworks: [],
    },
    CSS: {
      why: "Per-widget styles colocated next to the .tsx; theming is centralised in a tokens file.",
      keyModuleIds: ["mod-resources"],
      frameworks: [],
    },
  },
  "evals-lab": {
    Python: {
      why: "Eval primitives live where the AI ecosystem lives. asyncio + pydantic give us structured concurrency and structured data.",
      keyModuleIds: ["mod-runner", "mod-scorer", "mod-report"],
      frameworks: ["LangGraph", "pydantic", "pytest", "Typer"],
      sampleSnippet: {
        title: "Diffing tool-use traces",
        language: "python",
        code: `def diff(golden: Trace, actual: Trace) -> Diff:\n    g = [step.tool for step in golden.steps]\n    a = [step.tool for step in actual.steps]\n    matcher = SequenceMatcher(a=g, b=a)\n    return Diff(\n      missing=[g[i] for i, _, _ in matcher.get_opcodes() if i == "delete"],\n      extra=[a[i] for _, i, _ in matcher.get_opcodes() if i == "insert"],\n      ratio=matcher.ratio(),\n    )`,
      },
    },
    YAML: {
      why: "Golden sets are YAML so non-engineers can author them and reviewers can read diffs as text.",
      keyModuleIds: ["mod-runner"],
      frameworks: [],
    },
    Markdown: {
      why: "PR-side regression reports are rendered as Markdown so they embed natively in GitHub UI.",
      keyModuleIds: ["mod-report"],
      frameworks: [],
    },
    Shell: {
      why: "CI plumbing only — the rest is Python.",
      keyModuleIds: [],
      frameworks: [],
    },
  },
  "edge-stream": {
    TypeScript: {
      why: "The whole library is ~1.1k lines; strict TS keeps the public API surface explicit and the bundle small.",
      keyModuleIds: ["mod-core", "mod-adapters"],
      frameworks: ["ReadableStream", "tsup", "vitest"],
      sampleSnippet: {
        title: "Back-pressure-aware SSE writer",
        language: "typescript",
        code: `export function sse(\n  init: (write: (event: SSEvent) => Promise<void>) => Promise<void>\n): Response {\n  const { readable, writable } = new TransformStream();\n  const writer = writable.getWriter();\n  init(async (e) => {\n    await writer.ready;\n    await writer.write(format(e));\n  }).finally(() => writer.close());\n  return new Response(readable, {\n    headers: { "content-type": "text/event-stream" },\n  });\n}`,
      },
    },
    JSON: {
      why: "Package manifests only.",
      keyModuleIds: [],
      frameworks: [],
    },
    Markdown: {
      why: "README + a single doc page.",
      keyModuleIds: [],
      frameworks: [],
    },
  },
  "khiw-dev": {
    TypeScript: {
      why: "Same protocol-typed surface as the MCP kit so the site and AI clients stay in sync.",
      keyModuleIds: ["mod-shell", "mod-mcp", "mod-rag", "mod-pdf"],
      frameworks: ["Next.js", "mcp-use", "React"],
    },
    MDX: {
      why: "MDX is the content layer for narrative sections (About, Open-source write-ups).",
      keyModuleIds: ["mod-shell"],
      frameworks: ["next-mdx-remote", "shiki"],
    },
    CSS: {
      why: "Per-section CSS modules, plus a tokens layer for theme switching.",
      keyModuleIds: ["mod-shell"],
      frameworks: [],
    },
    JSON: {
      why: "Static configs + tool manifests.",
      keyModuleIds: [],
      frameworks: [],
    },
  },
  "rfc-archive": {
    TypeScript: {
      why: "Site shell + indexer. Kept the indexer in TS so it could share types with the reader.",
      keyModuleIds: ["mod-index", "mod-site"],
      frameworks: ["Next.js"],
    },
    Markdown: {
      why: "Every RFC is a Markdown file with front-matter for tags.",
      keyModuleIds: ["mod-index"],
      frameworks: [],
    },
    CSS: {
      why: "Minimal — reader UI inherits site shell styles.",
      keyModuleIds: ["mod-site"],
      frameworks: [],
    },
  },
};

const projectModuleDetail: Record<
  string,
  Record<
    string,
    {
      languages: string[];
      loc: number;
      interfaces: string[];
      dependencies: string[];
      testingNote: string;
      keyFiles: { path: string; loc: number; purpose: string }[];
    }
  >
> = {
  "mcp-portfolio-kit": {
    "mod-tools": {
      languages: ["TypeScript"],
      loc: 3200,
      interfaces: [
        "registerTool<TInput, TOutput>(name: string, opts: ToolOpts<TInput, TOutput>)",
        "type ToolResult = TextResult | WidgetResult | ErrorResult",
      ],
      dependencies: ["mcp-use/server", "zod"],
      testingNote:
        "Each tool handler has a focused vitest spec with mocked enrichment maps; integration tests exercise the full MCP request/response loop.",
      keyFiles: [
        { path: "tools/index.ts", loc: 220, purpose: "Tool registration entrypoint." },
        { path: "tools/projects.ts", loc: 540, purpose: "Project section + drill-downs." },
        { path: "tools/skills.ts", loc: 380, purpose: "Skills grid + drill-downs." },
        { path: "tools/contact.ts", loc: 310, purpose: "Contact + write-back submission." },
      ],
    },
    "mod-resources": {
      languages: ["TypeScript", "CSS"],
      loc: 4100,
      interfaces: [
        "export const widgetMetadata: WidgetMetadata",
        "export default function Widget(): JSX.Element",
      ],
      dependencies: ["react", "mcp-use/react", "zod"],
      testingNote:
        "Snapshot tests for every widget at light + dark theme; visual regression via Playwright on a sample fixture set.",
      keyFiles: [
        { path: "resources/projects-showcase.tsx", loc: 320, purpose: "Project grid." },
        { path: "resources/project-detail.tsx", loc: 380, purpose: "Single project detail." },
        { path: "resources/skill-detail.tsx", loc: 260, purpose: "Single skill drill-down." },
      ],
    },
    "mod-evidence": {
      languages: ["TypeScript"],
      loc: 1300,
      interfaces: [
        "lookupEvidence(claim: string): EvidenceHit[]",
        "type EvidenceHit = { sourceId: string; quote: string; score: number }",
      ],
      dependencies: ["zod"],
      testingNote: "Vitest tests over a frozen fixture knowledge graph.",
      keyFiles: [
        { path: "evidence/graph.ts", loc: 480, purpose: "In-memory graph + traversal." },
        { path: "evidence/lookup.ts", loc: 300, purpose: "Claim → evidence resolver." },
      ],
    },
    "mod-pdf": {
      languages: ["TypeScript"],
      loc: 800,
      interfaces: [
        "renderResumePdf(input: ResumeInput): Promise<Buffer>",
        "type ResumeInput = { jd?: string; sections: SectionConfig[] }",
      ],
      dependencies: ["pdfkit"],
      testingNote:
        "PDF round-trip parsing test asserts every footnote citation maps to a known evidence id.",
      keyFiles: [
        { path: "pdf/render.ts", loc: 320, purpose: "Page composition + footnotes." },
        { path: "pdf/tailor.ts", loc: 240, purpose: "JD → section weighting." },
      ],
    },
  },
  "evals-lab": {
    "mod-runner": {
      languages: ["Python"],
      loc: 2200,
      interfaces: ["run(suite: Suite) -> RunResult", "class Suite(BaseModel)"],
      dependencies: ["langgraph", "pydantic", "asyncio"],
      testingNote: "Pytest with recorded LLM traces (replayed deterministically).",
      keyFiles: [
        { path: "runner/runner.py", loc: 380, purpose: "Trace execution loop." },
        { path: "runner/suite.py", loc: 220, purpose: "Suite + GoldenSet models." },
      ],
    },
    "mod-scorer": {
      languages: ["Python"],
      loc: 1500,
      interfaces: ["score(run: RunResult, golden: GoldenSet) -> EvalResult"],
      dependencies: ["pydantic", "deepdiff"],
      testingNote: "Unit tests cover precision/recall edge cases (empty traces, partial matches).",
      keyFiles: [
        { path: "scorer/score.py", loc: 260, purpose: "Trace-vs-golden scoring." },
        { path: "scorer/regressions.py", loc: 180, purpose: "Diff → regression list." },
      ],
    },
    "mod-report": {
      languages: ["Python"],
      loc: 1100,
      interfaces: ["render_markdown(result: EvalResult) -> str"],
      dependencies: ["jinja2"],
      testingNote: "Golden-file tests render fixture results and diff the output.",
      keyFiles: [
        { path: "report/markdown.py", loc: 220, purpose: "PR-comment rendering." },
      ],
    },
    "mod-cli": {
      languages: ["Python"],
      loc: 600,
      interfaces: ["evals run", "evals diff", "evals freeze"],
      dependencies: ["typer", "rich"],
      testingNote: "CLI smoke tests via typer.testing.CliRunner.",
      keyFiles: [{ path: "cli/main.py", loc: 240, purpose: "Top-level Typer app." }],
    },
  },
  "edge-stream": {
    "mod-core": {
      languages: ["TypeScript"],
      loc: 620,
      interfaces: ["sse(init): Response", "type SSEvent = { event?: string; data: unknown }"],
      dependencies: [],
      testingNote: "Vitest tests cover back-pressure, abort, and reconnect-metadata paths.",
      keyFiles: [
        { path: "src/sse.ts", loc: 240, purpose: "Core stream writer." },
        { path: "src/reconnect.ts", loc: 160, purpose: "Reconnect metadata helpers." },
      ],
    },
    "mod-adapters": {
      languages: ["TypeScript"],
      loc: 320,
      interfaces: ["workersAdapter(handler)", "vercelEdgeAdapter(handler)", "nodeAdapter(handler)"],
      dependencies: [],
      testingNote: "Adapter tests use a fake fetch-style request to assert headers + abort handling.",
      keyFiles: [
        { path: "src/adapters/workers.ts", loc: 110, purpose: "Cloudflare Workers shim." },
        { path: "src/adapters/vercel.ts", loc: 90, purpose: "Vercel Edge shim." },
      ],
    },
    "mod-examples": {
      languages: ["TypeScript"],
      loc: 160,
      interfaces: [],
      dependencies: [],
      testingNote: "Examples are smoke-tested via the README check.",
      keyFiles: [
        { path: "examples/workers.ts", loc: 60, purpose: "Workers SSE example." },
      ],
    },
  },
  "khiw-dev": {
    "mod-shell": {
      languages: ["TypeScript", "MDX", "CSS"],
      loc: 2100,
      interfaces: ["app/page.tsx", "components/HostBus"],
      dependencies: ["next", "react"],
      testingNote: "Playwright e2e on first-paint, hover-highlight, and Ask AI happy path.",
      keyFiles: [
        { path: "app/layout.tsx", loc: 120, purpose: "Theme + host bus wiring." },
        { path: "components/HostBus.tsx", loc: 240, purpose: "PostMessage event bus." },
      ],
    },
    "mod-mcp": {
      languages: ["TypeScript"],
      loc: 1800,
      interfaces: ["server.tool(...)", "server.resource(...)"],
      dependencies: ["mcp-use/server"],
      testingNote: "Each tool has a vitest spec; full MCP request loop covered by integration tests.",
      keyFiles: [
        { path: "mcp/index.ts", loc: 320, purpose: "Server entrypoint." },
      ],
    },
    "mod-rag": {
      languages: ["TypeScript"],
      loc: 900,
      interfaces: ["askAi(section: string, query: string)"],
      dependencies: ["openai"],
      testingNote: "Recorded-trace tests via the evals-lab harness.",
      keyFiles: [{ path: "rag/ask.ts", loc: 220, purpose: "Section-scoped Ask AI." }],
    },
    "mod-pdf": {
      languages: ["TypeScript"],
      loc: 600,
      interfaces: ["renderResumePdf(input)"],
      dependencies: ["pdfkit"],
      testingNote: "Round-trip footnote tests.",
      keyFiles: [{ path: "pdf/render.ts", loc: 240, purpose: "Page composition." }],
    },
  },
  "rfc-archive": {
    "mod-index": {
      languages: ["TypeScript"],
      loc: 900,
      interfaces: ["buildIndex(dir: string): EmbedIndex"],
      dependencies: ["faiss-node", "openai"],
      testingNote: "Indexer tests assert deterministic vector hashes for a fixture corpus.",
      keyFiles: [
        { path: "indexer/build.ts", loc: 240, purpose: "Walks RFCs, computes embeddings." },
      ],
    },
    "mod-site": {
      languages: ["TypeScript", "CSS"],
      loc: 900,
      interfaces: ["pages/[slug].tsx"],
      dependencies: ["next"],
      testingNote: "Minimal Playwright smoke test on related-RFCs panel.",
      keyFiles: [
        { path: "pages/[slug].tsx", loc: 220, purpose: "Reader UI." },
      ],
    },
  },
};

const openSourceData = {
  summary:
    "Maintainer of two TypeScript libraries used in production by other teams, plus reliable upstream contributor to mcp-use and a handful of widely-used OSS projects.",
  totalStars: 4180,
  totalContributions: 312,
  maintainedRepos: 4,
  contributions: [
    {
      id: "oss-mcp-portfolio-kit",
      title: "mcp-portfolio-kit — maintainer",
      repo: "github.com/alexkim/mcp-portfolio-kit",
      type: "Maintainer",
      mergedAt: "ongoing",
      description:
        "Author and maintainer. Triages issues within 24h, merges weekly, releases monthly.",
      impact:
        "Template adopted by 84 forks; 17 external contributors have shipped PRs.",
      reviewers: ["@alexkim"],
      lessonsLearned:
        "OSS maintenance is mostly issue gardening — replying fast and closing decisively keeps the project alive.",
    },
    {
      id: "oss-edge-stream",
      title: "edge-stream — maintainer",
      repo: "github.com/alexkim/edge-stream",
      type: "Maintainer",
      mergedAt: "ongoing",
      description:
        "Maintainer of the ~2kb SSE helper. Releases are tagged; semver-strict.",
      impact:
        "8.4k weekly npm downloads; used by Workers/Vercel Edge teams I've never met.",
      reviewers: ["@alexkim"],
      lessonsLearned:
        "Keeping the API surface tiny is what makes a library reusable; resist 'just one more flag'.",
    },
    {
      id: "oss-mcp-use-pr-181",
      title: "feat(server): add streaming widget responses",
      repo: "github.com/mcp-use/mcp-use",
      type: "PR (merged)",
      mergedAt: "2026-03-22",
      description:
        "Added streaming widget responses so large payloads incrementally render in the host UI.",
      impact:
        "Cut perceived load time for widget responses > 30KB by roughly half.",
      reviewers: ["@maintainer-a", "@maintainer-b"],
      lessonsLearned:
        "Upstream contributions are won by the test suite, not the code change.",
    },
    {
      id: "oss-mcp-use-pr-204",
      title: "fix(react): preserve widget state across HMR reloads",
      repo: "github.com/mcp-use/mcp-use",
      type: "PR (merged)",
      mergedAt: "2026-04-09",
      description:
        "Persist widget state through HMR reloads during local dev to avoid losing form input.",
      impact:
        "Cleaner DX for every widget author; flagged in the changelog.",
      reviewers: ["@maintainer-a"],
      lessonsLearned:
        "DX bugs are worth more than they look — they tax every contributor every day.",
    },
    {
      id: "oss-typescript-issue-2241",
      title: "Issue: type-narrowing regression in 5.x with conditional infer",
      repo: "github.com/microsoft/TypeScript",
      type: "Issue (triaged)",
      mergedAt: "2025-12-01",
      description:
        "Filed a minimal reproduction for a regression; followed up with bisect to a specific commit.",
      impact:
        "Triaged + fixed upstream within two weeks; saved our team a week of workarounds.",
      reviewers: [],
      lessonsLearned:
        "A 30-line repro is worth 30 paragraphs of description.",
    },
    {
      id: "oss-zod-pr-3120",
      title: "docs(zod): clarify discriminatedUnion + transform interaction",
      repo: "github.com/colinhacks/zod",
      type: "Docs PR",
      mergedAt: "2025-10-14",
      description:
        "Documented a non-obvious interaction we hit in production.",
      impact: "Reduces the issue tracker noise for the same question.",
      reviewers: ["@colinhacks"],
      lessonsLearned:
        "Documentation PRs land faster than code PRs and help more people.",
    },
  ],
};

const educationData = {
  summary:
    "B.S. in Computer Science with a focus on systems, plus targeted certifications in cloud and AI engineering.",
  degrees: [
    {
      id: "edu-ucsd-bs",
      institution: "UC San Diego",
      title: "B.S. Computer Science",
      period: "2013 – 2017",
      signal: "GPA 3.7 · CS-honors track",
    },
  ],
  certifications: [
    {
      id: "cert-aws-saa",
      institution: "Amazon Web Services",
      title: "Solutions Architect — Associate",
      period: "2022 – 2025",
      signal: "Score 892 / 1000",
    },
    {
      id: "cert-cka",
      institution: "Cloud Native Computing Foundation",
      title: "Certified Kubernetes Administrator (CKA)",
      period: "2023 – 2026",
      signal: "Hands-on exam",
    },
    {
      id: "cert-deeplearning-mlops",
      institution: "DeepLearning.AI",
      title: "MLOps Specialization",
      period: "2024",
      signal: "Capstone published",
    },
  ],
};

const educationItemDetail: Record<
  string,
  {
    kind: "degree" | "certification";
    institution: string;
    title: string;
    period: string;
    gpa?: string;
    focusAreas?: string[];
    thesis?: string;
    thesisAdvisor?: string;
    keyCourses?: { code: string; name: string; grade: string; reflection: string }[];
    awards?: string[];
    activities?: string[];
    issuedAt?: string;
    expiresAt?: string;
    credentialId?: string;
    skillsCovered?: string[];
    examScore?: number;
    passingScore?: number;
  }
> = {
  "edu-ucsd-bs": {
    kind: "degree",
    institution: "UC San Diego",
    title: "B.S. Computer Science",
    period: "2013 – 2017",
    gpa: "3.7 / 4.0",
    focusAreas: ["Systems", "Compilers", "Distributed systems", "HCI"],
    thesis:
      "Lightweight tracing for distributed JavaScript debuggers — built a prototype that combined server-side sampling with browser-side breakpoints to give a single timeline across the stack.",
    thesisAdvisor: "Prof. C. Alvarez",
    keyCourses: [
      {
        code: "CSE 130",
        name: "Programming Languages",
        grade: "A",
        reflection:
          "Made me a better TS engineer — the type-system mental model lives here.",
      },
      {
        code: "CSE 124",
        name: "Networked Services",
        grade: "A",
        reflection:
          "Distributed-systems hygiene I still use: timeouts, retries, idempotency.",
      },
      {
        code: "CSE 131",
        name: "Compilers",
        grade: "A−",
        reflection:
          "Wrote a toy compiler end-to-end; the experience demystified every build tool since.",
      },
      {
        code: "CSE 167",
        name: "Computer Graphics",
        grade: "B+",
        reflection:
          "Took it for fun; gave me an appreciation for what 'performance budget' really means.",
      },
    ],
    awards: ["CS Department Honors", "Best undergrad systems project, 2017"],
    activities: ["TA, CSE 124 (Networked Services)", "Hackathon co-organizer"],
  },
  "cert-aws-saa": {
    kind: "certification",
    institution: "Amazon Web Services",
    title: "Solutions Architect — Associate",
    period: "2022 – 2025",
    issuedAt: "Aug 2022",
    expiresAt: "Aug 2025",
    credentialId: "AWS-SAA-7421-9913",
    skillsCovered: ["AWS", "Terraform", "Postgres"],
    examScore: 892,
    passingScore: 720,
  },
  "cert-cka": {
    kind: "certification",
    institution: "Cloud Native Computing Foundation",
    title: "Certified Kubernetes Administrator (CKA)",
    period: "2023 – 2026",
    issuedAt: "Mar 2023",
    expiresAt: "Mar 2026",
    credentialId: "LF-CKA-92301-AX",
    skillsCovered: ["Kubernetes", "Terraform", "AWS"],
    examScore: 88,
    passingScore: 66,
  },
  "cert-deeplearning-mlops": {
    kind: "certification",
    institution: "DeepLearning.AI",
    title: "MLOps Specialization",
    period: "2024",
    issuedAt: "May 2024",
    credentialId: "DLAI-MLOPS-2024-1099",
    skillsCovered: ["Evaluation harnesses", "Python"],
  },
};

const educationOrder = [
  ...educationData.degrees.map((d) => d.id),
  ...educationData.certifications.map((c) => c.id),
];

const contactFaqData = {
  intro:
    "Common questions before reaching out. If yours isn't here, email is still the best path.",
  items: [
    {
      id: "faq-consulting",
      question: "Are you available for consulting or fractional work?",
      preview:
        "Yes, in narrow scopes — usually MCP server design, eval harness setup, or platform-team coaching.",
      answer:
        "Yes — I take on small, scoped engagements (typically 2–6 weeks, 10–15h / week). The sweet spot is teams that need a senior pair to design an MCP server, stand up an eval harness, or harden a platform-team golden path. I don't take on staff augmentation, ongoing IC work, or anything that competes with my full-time role. Reach out with a one-paragraph scope and I'll let you know in 48h whether it's a fit.",
    },
    {
      id: "faq-relocation",
      question: "Will you relocate?",
      preview:
        "For the right role — yes. Open to the SF Bay Area; I need 6+ weeks of notice and visa support if applicable.",
      answer:
        "For the right role, yes. I'm currently in Singapore (GMT+8). The Bay Area is the most likely destination; I'd consider London or NYC for an exceptional team. I need 6+ weeks to wind down and would expect visa support where relevant. Remote-first roles are still preferred and I can travel to HQ on a 2–3 week / quarter cadence.",
    },
    {
      id: "faq-mentoring",
      question: "Do you mentor?",
      preview:
        "Yes — 1:1 mentoring for senior-track ICs and tech leads; limited slots, no charge.",
      answer:
        "I take on a small handful of mentees outside work — usually senior-track ICs or new tech leads at mid-size startups. Format: 45-minute calls every 2–3 weeks, async help on design docs in between. I don't charge; in return I ask that you take notes, do the work between sessions, and mentor someone behind you within 2 years. If you'd like a slot, write me one paragraph about where you are and what you want to be better at in 6 months.",
    },
    {
      id: "faq-speaking",
      question: "Are you available for talks / podcasts / panels?",
      preview:
        "Yes — topics I'm happy to talk about: MCP architecture, eval harnesses, platform team operating models.",
      answer:
        "Yes — I'm happy to talk about MCP architecture, AI eval harnesses, platform team operating models, and OSS maintenance. Format I prefer: a one-hour async interview or a 25–35 minute talk. Lead time of 4+ weeks if I'm preparing slides; podcasts can be sooner. I don't do unpaid keynote slots at for-profit conferences but will happily do them for community / OSS events.",
    },
    {
      id: "faq-recruiting",
      question: "How should recruiters reach out?",
      preview:
        "Email with the JD attached. I respond to every well-scoped message within 24h, even when the answer is no.",
      answer:
        "Email is the fastest. Include the JD (or a 5-bullet summary), the comp band, and whether the role is remote/hybrid/onsite. I read every message and reply within 24h on weekdays — including 'thanks, not right now' replies. Two things speed this up: (1) tell me how you found me, and (2) say what you're hoping I'd say yes to in particular.",
    },
    {
      id: "faq-collab",
      question: "Open to OSS collaboration?",
      preview:
        "Yes, especially around MCP, eval tooling, and small high-quality libraries.",
      answer:
        "Yes — open to OSS collaboration in the MCP, evaluation, and developer-tools space. The bar I hold collaborators to: well-scoped issues, working tests, willingness to land a smaller change first to build trust. The fastest way in: open a Discussion on one of my repos with a problem statement, not a solution.",
    },
  ],
};

const contactFaqOrder = contactFaqData.items.map((i) => i.id);

/* ------------------------------------------------------------------ */
/* Helpers — id resolvers                                             */
/* ------------------------------------------------------------------ */

function findRole(id: string) {
  return experienceData.roles.find((r) => r.id === id);
}

function findProject(id: string) {
  return projectsData.projects.find((p) => p.id === id);
}

function findSkill(name: string) {
  return skillsData.skills.find(
    (s) => s.name.toLowerCase() === name.toLowerCase()
  );
}

function rolesToSummary(ids: string[]) {
  return ids
    .map((id) => findRole(id))
    .filter((r): r is NonNullable<ReturnType<typeof findRole>> => !!r)
    .map((r) => ({ id: r.id, company: r.company, title: r.title }));
}

function projectsToSummary(ids: string[]) {
  return ids
    .map((id) => findProject(id))
    .filter((p): p is NonNullable<ReturnType<typeof findProject>> => !!p)
    .map((p) => ({ id: p.id, name: p.name, summary: p.summary }));
}

/* ------------------------------------------------------------------ */
/* Section tools (top of hierarchy — unchanged behavior)              */
/* ------------------------------------------------------------------ */

server.tool(
  {
    name: "get_hero",
    description:
      "Render the hero section: headline, subhead, location, primary CTAs, and capability highlights. Use at the top of any landing page. Drill into a single highlight with get_hero_highlight.",
    schema: z.object({}),
    widget: {
      name: "hero-section",
      invoking: "Loading hero...",
      invoked: "Hero ready",
    },
  },
  async () =>
    widget({
      props: heroData,
      output: text(
        `${heroData.name} — ${heroData.headline} (${heroData.location}).`
      ),
    })
);

server.tool(
  {
    name: "get_availability",
    description:
      "Render the sticky availability strip with status, response time, preferred role types, and a contact CTA. Drill into the full calendar and preferences with get_availability_detail.",
    schema: z.object({}),
    widget: {
      name: "availability-strip",
      invoking: "Checking availability...",
      invoked: "Availability loaded",
    },
  },
  async () =>
    widget({
      props: availabilityData,
      output: text(
        `Status: ${availabilityData.statusLabel}. ${availabilityData.detail} Response: ${availabilityData.responseTime}.`
      ),
    })
);

server.tool(
  {
    name: "get_skills",
    description:
      "Render the interactive skills grid. Optionally filter to a single category. Drill into a single skill with get_skill_detail.",
    schema: z.object({
      category: z
        .string()
        .optional()
        .describe(
          "Optional category to filter to (one of: Languages, Frontend, Backend, Infrastructure, AI / ML). Otherwise all skills are returned."
        ),
    }),
    widget: {
      name: "skills-grid",
      invoking: "Loading skills...",
      invoked: "Skills loaded",
    },
  },
  async ({ category }) => {
    const filtered =
      category && skillsData.categories.includes(category)
        ? skillsData.skills.filter((s) => s.category === category)
        : skillsData.skills;

    // KG enrichment — top technologies by repo count for the live badge
    let liveTechRankings: { slug: string; label: string; reposUsing: number }[] | undefined;
    const techRanks = await kgTopTechnologies(60);
    if (techRanks.ok && techRanks.data?.length) {
      liveTechRankings = techRanks.data;
    }

    return widget({
      props: {
        categories: skillsData.categories,
        skills: filtered,
        liveTechRankings,
      },
      output: text(
        `${filtered.length} skills${category ? ` in ${category}` : ""}. Categories: ${skillsData.categories.join(", ")}.` +
          (liveTechRankings ? ` Live graph: ${liveTechRankings.length} technologies indexed.` : "")
      ),
    });
  }
);

server.tool(
  {
    name: "get_experience",
    description:
      "Render the experience timeline with all roles. Each role is expandable. Drill into a single role with get_role_detail.",
    schema: z.object({
      tech: z
        .string()
        .optional()
        .describe(
          "Optional technology name to pre-filter visible roles (e.g. 'Kubernetes', 'React')."
        ),
    }),
    widget: {
      name: "experience-timeline",
      invoking: "Loading experience...",
      invoked: "Experience loaded",
    },
  },
  async ({ tech }) => {
    const roles = tech
      ? experienceData.roles.filter((r) =>
          r.stack.some((t) => t.toLowerCase() === tech.toLowerCase())
        )
      : experienceData.roles;

    return widget({
      props: { roles },
      output: text(
        `${roles.length} roles${tech ? ` using ${tech}` : ""}. Currently: ${
          experienceData.roles.find((r) => r.current)?.title ?? "n/a"
        } at ${experienceData.roles.find((r) => r.current)?.company ?? "n/a"}.`
      ),
    });
  }
);

server.tool(
  {
    name: "get_projects",
    description:
      "Render the projects showcase. Optionally filter by a single tag. Drill into one project with get_project_detail or its metrics dashboard with get_project_metrics.",
    schema: z.object({
      tag: z
        .string()
        .optional()
        .describe("Optional tag to filter projects by."),
    }),
    widget: {
      name: "projects-showcase",
      invoking: "Loading projects...",
      invoked: "Projects loaded",
    },
  },
  async ({ tag }) => {
    const projects = tag
      ? projectsData.projects.filter((p) =>
          p.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
        )
      : projectsData.projects;

    // KG enrichment — person summary for live repo/deployment counts
    let liveStats:
      | {
          reposAuthored: number;
          deploymentsOwned: number;
          topLanguages: { language: string; repoCount: number }[];
        }
      | undefined;
    const personRes = await kgPersonSummary();
    if (personRes.ok && personRes.data) {
      liveStats = {
        reposAuthored: personRes.data.reposAuthored,
        deploymentsOwned: personRes.data.deploymentsOwned,
        topLanguages: personRes.data.topLanguages,
      };
    }

    return widget({
      props: { projects, liveStats },
      output: text(
        `${projects.length} projects${tag ? ` tagged "${tag}"` : ""}. Live: ${
          projects.filter((p) => p.status === "live").length
        }.` +
          (liveStats
            ? ` Graph: ${liveStats.reposAuthored} repos, ${liveStats.deploymentsOwned} deployments indexed.`
            : "")
      ),
    });
  }
);

server.tool(
  {
    name: "get_contact",
    description:
      "Render the contact section with copyable email, channel links, response time, and a quick-message form. Drill into one channel with get_contact_channel or submit a message with submit_contact_message.",
    schema: z.object({}),
    widget: {
      name: "contact-section",
      invoking: "Loading contact...",
      invoked: "Contact loaded",
    },
  },
  async () =>
    widget({
      props: contactData,
      output: text(
        `Email: ${contactData.email}. ${contactData.responseTime}. ${contactData.channels.length} other channels available.`
      ),
    })
);

/* ------------------------------------------------------------------ */
/* Drill-down sub-tools                                               */
/* ------------------------------------------------------------------ */

server.tool(
  {
    name: "get_hero_highlight",
    description:
      "Drill into a single hero capability highlight. Returns a deep view with corroborating skills, roles, and projects. Use this when the user clicks a hero highlight or asks 'tell me more about X' where X is one of the four highlight labels.",
    schema: z.object({
      id: z
        .string()
        .describe(
          "Highlight id. One of: h-tenure, h-platforms, h-oss, h-endtoend. You can also pass a label fragment like 'platform', 'open-source', 'end-to-end', 'tenure'."
        ),
    }),
    widget: {
      name: "hero-highlight",
      invoking: "Loading highlight...",
      invoked: "Highlight loaded",
    },
  },
  async ({ id }) => {
    const normalized = id.trim().toLowerCase();
    let key = (heroHighlightOrder as readonly string[]).find(
      (k) => k.toLowerCase() === normalized
    );
    if (!key) {
      // tolerant fuzzy match on label
      key = (heroHighlightOrder as readonly string[]).find((k) => {
        const d = heroHighlightDetails[k as keyof typeof heroHighlightDetails];
        return (
          d.label.toLowerCase().includes(normalized) ||
          d.headline.toLowerCase().includes(normalized)
        );
      });
    }
    if (!key) {
      return error(
        `Unknown hero highlight "${id}". Valid ids: ${heroHighlightOrder.join(", ")}.`
      );
    }
    const detail = heroHighlightDetails[key as keyof typeof heroHighlightDetails];
    return widget({
      props: {
        ...detail,
        relatedRoleIds: rolesToSummary(detail.relatedRoleIds),
        relatedProjects: projectsToSummary(detail.relatedProjectIds),
        breadcrumb: ["Hero", "Highlight", detail.label],
      },
      output: text(
        `${detail.headline}. Corroborating skills: ${detail.relatedSkillNames.join(", ")}.`
      ),
    });
  }
);

server.tool(
  {
    name: "get_availability_detail",
    description:
      "Drill into the full availability detail: rolling interview calendar with open slots, plus preferences for locations, comp band, team size, role types, and what to avoid.",
    schema: z.object({}),
    widget: {
      name: "availability-detail",
      invoking: "Loading availability detail...",
      invoked: "Availability detail loaded",
    },
  },
  async () =>
    widget({
      props: {
        status: availabilityData.status,
        statusLabel: availabilityData.statusLabel,
        detail: availabilityData.detail,
        responseTime: availabilityData.responseTime,
        noticeRequired: availabilityDetail.noticeRequired,
        willingToTravel: availabilityDetail.willingToTravel,
        preferences: availabilityDetail.preferences,
        calendar: availabilityDetail.calendar,
        breadcrumb: ["Availability", "Detail"],
      },
      output: text(
        `Open weeks: ${availabilityDetail.calendar
          .filter((w) => w.slotsOpen > 0)
          .map((w) => w.week)
          .join("; ")}. Notice: ${availabilityDetail.noticeRequired}.`
      ),
    })
);

server.tool(
  {
    name: "get_skill_detail",
    description:
      "Drill into a single skill: evidence, level/years, corroborating roles and projects, and sibling skills in the same category.",
    schema: z.object({
      name: z
        .string()
        .describe(
          "Exact or near-match skill name (e.g. 'Kubernetes', 'Model Context Protocol', 'React')."
        ),
    }),
    widget: {
      name: "skill-detail",
      invoking: "Loading skill...",
      invoked: "Skill loaded",
    },
  },
  async ({ name }) => {
    const skill = findSkill(name);
    if (!skill) {
      return error(
        `Unknown skill "${name}". Try one of: ${skillsData.skills
          .map((s) => s.name)
          .join(", ")}.`
      );
    }
    const enr = skillEnrichment[skill.name] ?? {
      firstUsed: "—",
      signal: "—",
      relatedRoleIds: [],
      relatedProjectIds: [],
    };
    const siblings = skillsData.skills
      .filter((s) => s.category === skill.category && s.name !== skill.name)
      .map((s) => s.name);

    // KG enrichment — corroborate the skill with real repos that USE the
    // matching Technology node. Degrades gracefully if Neo4j is unreachable.
    let liveEvidence: {
      source: "kg";
      slug: string;
      label: string;
      confidence: number;
      reposUsing: number;
      sampleRepos: {
        label: string;
        url: string;
        description?: string;
        language?: string;
      }[];
      tookMs: number;
    } | null = null;
    try {
      const techLookup = await kgLookupTechnology(skill.name);
      if (techLookup.ok && techLookup.data) {
        const reposResult = await kgReposUsingTechnology(techLookup.data.slug, 8);
        liveEvidence = {
          source: "kg",
          slug: techLookup.data.slug,
          label: techLookup.data.label,
          confidence: techLookup.data.confidence,
          reposUsing: techLookup.data.reposUsing,
          sampleRepos: (reposResult.ok ? reposResult.data ?? [] : []).map((r) => ({
            label: r.label,
            url: r.url,
            description: r.description,
            language: r.language,
          })),
          tookMs:
            (techLookup.tookMs ?? 0) + (reposResult.ok ? reposResult.tookMs ?? 0 : 0),
        };
      }
    } catch {
      // Silent fallback — fixture data is still returned below.
    }

    return widget({
      props: {
        name: skill.name,
        category: skill.category,
        level: skill.level,
        years: skill.years,
        firstUsed: enr.firstUsed,
        signal: enr.signal,
        evidence: skill.evidence,
        relatedRoles: rolesToSummary(enr.relatedRoleIds),
        relatedProjects: projectsToSummary(enr.relatedProjectIds),
        siblingSkills: siblings,
        liveEvidence,
        breadcrumb: ["Skills", skill.category, skill.name],
      },
      output: text(
        `${skill.name} — ${skill.level}, ${skill.years}y. ${skill.evidence.length} evidence items.${
          liveEvidence ? ` Live graph: ${liveEvidence.reposUsing} repos use this.` : ""
        }`
      ),
    });
  }
);

server.tool(
  {
    name: "get_role_detail",
    description:
      "Drill into a single experience role: scope (team, reports, location), impact metrics, key technical decisions with rationale and outcome, achievements, stack, and related projects.",
    schema: z.object({
      id: z
        .string()
        .describe(
          "Role id. One of: northbeam, lumen, drift, intern. You can also pass a company name fragment."
        ),
    }),
    widget: {
      name: "role-detail",
      invoking: "Loading role...",
      invoked: "Role loaded",
    },
  },
  async ({ id }) => {
    const normalized = id.trim().toLowerCase();
    let role = findRole(normalized);
    if (!role) {
      role = experienceData.roles.find((r) =>
        r.company.toLowerCase().includes(normalized)
      );
    }
    if (!role) {
      return error(
        `Unknown role "${id}". Valid ids: ${experienceData.roles
          .map((r) => r.id)
          .join(", ")}.`
      );
    }
    const enr =
      roleEnrichment[role.id] ?? {
        location: "—",
        team: "—",
        reports: "—",
        links: [],
        metrics: [],
        keyDecisions: [],
        relatedProjectIds: [],
      };

    return widget({
      props: {
        id: role.id,
        company: role.company,
        title: role.title,
        start: role.start,
        end: role.end,
        current: role.current,
        summary: role.summary,
        achievements: role.achievements,
        stack: role.stack,
        location: enr.location,
        team: enr.team,
        reports: enr.reports,
        links: enr.links,
        metrics: enr.metrics,
        keyDecisions: enr.keyDecisions,
        relatedProjects: projectsToSummary(enr.relatedProjectIds),
        breadcrumb: ["Experience", role.company, role.title],
      },
      output: text(
        `${role.title} at ${role.company} (${role.start}–${role.current ? "Present" : role.end}). ${role.achievements.length} achievements, ${enr.keyDecisions.length} key decisions.`
      ),
    });
  }
);

server.tool(
  {
    name: "get_project_detail",
    description:
      "Drill into a single project: full description, tech stack, team, timeline, changelog, related roles, and sibling projects.",
    schema: z.object({
      id: z
        .string()
        .describe(
          "Project id. One of: mcp-portfolio-kit, evals-lab, edge-stream, khiw-dev, rfc-archive. You can also pass a name fragment."
        ),
    }),
    widget: {
      name: "project-detail",
      invoking: "Loading project...",
      invoked: "Project loaded",
    },
  },
  async ({ id }) => {
    const normalized = id.trim().toLowerCase();
    let project = findProject(normalized);
    if (!project) {
      project = projectsData.projects.find(
        (p) =>
          p.name.toLowerCase().includes(normalized) ||
          p.id.toLowerCase().includes(normalized)
      );
    }
    if (!project) {
      return error(
        `Unknown project "${id}". Valid ids: ${projectsData.projects
          .map((p) => p.id)
          .join(", ")}.`
      );
    }
    const enr =
      projectEnrichment[project.id] ?? {
        tech: [],
        team: "—",
        timeline: "—",
        relatedRoleIds: [],
        changelog: [],
        headlineMetrics: [],
        series: [],
      };
    const siblings = projectsData.projects
      .filter((p) => p.id !== project!.id)
      .map((p) => ({ id: p.id, name: p.name, summary: p.summary }));

    // KG enrichment — find the matching Repo in the live graph and pull its
    // actual technology stack. Degrades gracefully on failure.
    let liveRepo: {
      source: "kg";
      slug: string;
      label: string;
      url: string;
      description?: string;
      language?: string;
      languages?: string[];
      techCount: number;
      techStack: { slug: string; label: string }[];
      tookMs: number;
    } | null = null;
    try {
      // Look up by project name first, then by id as a fallback.
      const repoLookup =
        (await kgLookupRepo(project.name)).ok
          ? await kgLookupRepo(project.name)
          : await kgLookupRepo(project.id);
      if (repoLookup.ok && repoLookup.data) {
        const techResult = await kgTechStackForRepo(repoLookup.data.slug, 20);
        liveRepo = {
          source: "kg",
          slug: repoLookup.data.slug,
          label: repoLookup.data.label,
          url: repoLookup.data.url,
          description: repoLookup.data.description,
          language: repoLookup.data.language,
          languages: repoLookup.data.languages,
          techCount: repoLookup.data.techCount,
          techStack: (techResult.ok ? techResult.data ?? [] : []).map((t) => ({
            slug: t.slug,
            label: t.label,
          })),
          tookMs:
            (repoLookup.tookMs ?? 0) + (techResult.ok ? techResult.tookMs ?? 0 : 0),
        };
      }
    } catch {
      // Silent — fixture stack still flows.
    }

    return widget({
      props: {
        id: project.id,
        name: project.name,
        summary: project.summary,
        description: project.description,
        tags: project.tags,
        status: project.status,
        metrics: project.metrics,
        links: project.links,
        tech: enr.tech,
        team: enr.team,
        timeline: enr.timeline,
        changelog: enr.changelog,
        relatedRoles: rolesToSummary(enr.relatedRoleIds),
        siblingProjects: siblings,
        liveRepo,
        breadcrumb: ["Projects", project.name],
      },
      output: text(
        `${project.name} (${project.status}). ${project.summary} Tech: ${enr.tech.join(", ")}.${
          liveRepo ? ` Live graph: ${liveRepo.techCount} technologies in ${liveRepo.label}.` : ""
        }`
      ),
    });
  }
);

server.tool(
  {
    name: "get_project_metrics",
    description:
      "Render the metrics dashboard for a single project: headline KPIs with trend and context, plus a small time-series chart. Drills below get_project_detail.",
    schema: z.object({
      id: z
        .string()
        .describe(
          "Project id. One of: mcp-portfolio-kit, evals-lab, edge-stream, khiw-dev, rfc-archive."
        ),
    }),
    widget: {
      name: "project-metrics",
      invoking: "Loading metrics...",
      invoked: "Metrics loaded",
    },
  },
  async ({ id }) => {
    const normalized = id.trim().toLowerCase();
    const project = findProject(normalized);
    if (!project) {
      return error(
        `Unknown project "${id}". Valid ids: ${projectsData.projects
          .map((p) => p.id)
          .join(", ")}.`
      );
    }
    const enr = projectEnrichment[project.id];
    if (!enr) {
      return error(`No metrics enrichment for project "${id}".`);
    }
    return widget({
      props: {
        id: project.id,
        name: project.name,
        status: project.status,
        headlineMetrics: enr.headlineMetrics,
        series: enr.series,
        breadcrumb: ["Projects", project.name, "Metrics"],
      },
      output: text(
        `${project.name} metrics — ${enr.headlineMetrics
          .map((m) => `${m.label}: ${m.value}`)
          .join("; ")}.`
      ),
    });
  }
);

server.tool(
  {
    name: "get_contact_channel",
    description:
      "Drill into a single contact channel: handle, expected response time, what it's best for, and sibling channels. Pass the channel id.",
    schema: z.object({
      id: z
        .string()
        .describe(
          "Channel id. One of: email, github, linkedin, x, bluesky. You can also pass a label fragment."
        ),
    }),
    widget: {
      name: "contact-channel",
      invoking: "Loading channel...",
      invoked: "Channel loaded",
    },
  },
  async ({ id }) => {
    const normalized = id.trim().toLowerCase();
    let key = (channelOrder as readonly string[]).find(
      (k) => k.toLowerCase() === normalized
    );
    if (!key) {
      key = (channelOrder as readonly string[]).find((k) => {
        const ch = channelEnrichment[k as keyof typeof channelEnrichment];
        return (
          ch.label.toLowerCase().includes(normalized) ||
          ch.handle.toLowerCase().includes(normalized)
        );
      });
    }
    if (!key) {
      return error(
        `Unknown contact channel "${id}". Valid ids: ${channelOrder.join(", ")}.`
      );
    }
    const ch = channelEnrichment[key as keyof typeof channelEnrichment];
    const siblings = (channelOrder as readonly string[])
      .filter((k) => k !== key)
      .map((k) => {
        const sib = channelEnrichment[k as keyof typeof channelEnrichment];
        return { id: sib.id, label: sib.label, handle: sib.handle };
      });

    return widget({
      props: {
        ...ch,
        siblingChannels: siblings,
        breadcrumb: ["Contact", ch.label],
      },
      output: text(
        `${ch.label} — ${ch.handle}. Response: ${ch.responseTime}. Best for: ${ch.bestFor.join("; ")}.`
      ),
    });
  }
);

server.tool(
  {
    name: "submit_contact_message",
    description:
      "Submit a message via the contact form. Returns a confirmation widget with a reference id, the captured payload, and the expected response time. Demo mode: nothing is actually sent — this models the write-back UX for any frontend.",
    schema: z.object({
      name: z
        .string()
        .min(1)
        .max(200)
        .describe("Sender's name (1–200 chars)."),
      email: z
        .string()
        .email()
        .describe("Sender's reply-to email."),
      message: z
        .string()
        .min(10)
        .max(4000)
        .describe("Message body (10–4000 chars)."),
    }),
    annotations: {
      readOnlyHint: false,
      openWorldHint: false,
    },
    widget: {
      name: "contact-confirmation",
      invoking: "Sending message...",
      invoked: "Message received",
    },
  },
  async ({ name, email, message }) => {
    const reference = `MSG-${Date.now().toString(36).toUpperCase()}`;
    const receivedAt =
      new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";

    return widget({
      props: {
        status: "sent" as const,
        reference,
        receivedAt,
        name,
        email,
        message,
        responseTime: contactData.responseTime,
        nextSteps: [
          `I'll read it during my next inbox sweep (${contactData.responseTime}, ${contactData.timezone}).`,
          "I reply to all messages, including 'no thanks for now'.",
          "If urgent and time-sensitive, also ping me on X — same handle.",
        ],
        breadcrumb: ["Contact", "Send message", reference],
      },
      output: text(
        `Message ${reference} received from ${name} <${email}>. Reply within ${contactData.responseTime}.`
      ),
    });
  }
);

/* ------------------------------------------------------------------ */
/* Deep-drill tools — sub-sub-components                              */
/* ------------------------------------------------------------------ */

server.tool(
  {
    name: "get_about",
    description:
      "Render the About section — narrative, engineering philosophy, working style, and a preview of the career journey. Drill into the full timeline with get_career_journey or a single milestone with get_career_milestone.",
    schema: z.object({}),
    widget: {
      name: "about-section",
      invoking: "Loading about...",
      invoked: "About loaded",
    },
  },
  async () =>
    widget({
      props: {
        breadcrumb: ["About"],
        name: aboutData.name,
        headline: aboutData.headline,
        narrative: aboutData.narrative,
        philosophy: aboutData.philosophy,
        workingStyle: aboutData.workingStyle,
        milestonePreviews: careerJourneyData.milestones.slice(-4).map((m) => ({
          id: m.id,
          year: m.year,
          title: m.title,
        })),
      },
      output: text(
        `About ${aboutData.name}: ${aboutData.headline}. ${aboutData.philosophy.length} principles, ${aboutData.workingStyle.length} working-style notes, ${careerJourneyData.milestones.length} career milestones available.`
      ),
    })
);

server.tool(
  {
    name: "get_career_journey",
    description:
      "Render the full career journey timeline (year-by-year milestones with lessons learned). Drill into one milestone with get_career_milestone.",
    schema: z.object({}),
    widget: {
      name: "career-journey",
      invoking: "Loading journey...",
      invoked: "Journey loaded",
    },
  },
  async () =>
    widget({
      props: {
        breadcrumb: ["About", "Career journey"],
        summary: careerJourneyData.summary,
        milestones: careerJourneyData.milestones.map((m) => ({
          id: m.id,
          year: m.year,
          title: m.title,
          body: m.body,
          lesson: m.lesson,
        })),
      },
      output: text(
        `Career journey: ${careerJourneyData.milestones.length} milestones from ${careerJourneyData.milestones[0].year} to ${careerJourneyData.milestones[careerJourneyData.milestones.length - 1].year}.`
      ),
    })
);

server.tool(
  {
    name: "get_career_milestone",
    description:
      "Drill into a single career milestone — full body, lesson learned, related skills/roles/projects, sibling milestones.",
    schema: z.object({
      id: z
        .string()
        .describe(
          "Milestone id (e.g. m-2017-intern, m-2023-northbeam). You can also pass a year (e.g. '2020') or a keyword."
        ),
    }),
    widget: {
      name: "career-milestone",
      invoking: "Loading milestone...",
      invoked: "Milestone loaded",
    },
  },
  async ({ id }) => {
    const normalized = id.trim().toLowerCase();
    let m = careerJourneyData.milestones.find((x) => x.id.toLowerCase() === normalized);
    if (!m) {
      m = careerJourneyData.milestones.find(
        (x) =>
          x.year === normalized ||
          x.title.toLowerCase().includes(normalized) ||
          x.id.toLowerCase().includes(normalized)
      );
    }
    if (!m) {
      return error(
        `Unknown milestone "${id}". Valid ids: ${careerMilestoneOrder.join(", ")}.`
      );
    }
    const siblings = careerJourneyData.milestones
      .filter((x) => x.id !== m!.id)
      .map((x) => ({ id: x.id, year: x.year, title: x.title }));
    return widget({
      props: {
        breadcrumb: ["About", "Career journey", m.year],
        id: m.id,
        year: m.year,
        title: m.title,
        body: m.body,
        lesson: m.lesson,
        relatedSkills: m.relatedSkillNames,
        relatedRoles: rolesToSummary(m.relatedRoleIds),
        relatedProjects: projectsToSummary(m.relatedProjectIds),
        siblings,
      },
      output: text(
        `${m.year} — ${m.title}. ${m.body} Lesson: ${m.lesson}`
      ),
    });
  }
);

server.tool(
  {
    name: "get_hero_stats",
    description:
      "Render the career-stats card — career-summary numbers (years, companies, launches, OSS stars, weekly downloads, mentees, RFCs) plus top languages by tenure. When the Neo4j knowledge graph is configured, a 'Live graph' panel is also returned summarising the Person node (repos authored, deployments owned, conversations, top languages aggregated from real repos).",
    schema: z.object({}),
    widget: {
      name: "hero-stats",
      invoking: "Loading stats...",
      invoked: "Stats loaded",
    },
  },
  async () => {
    // KG enrichment — pull live Person summary from the graph.
    // Degrades gracefully to the fixture-only response if KG is not configured
    // or the query fails.
    let liveSummary: {
      source: "kg";
      label: string;
      reposAuthored: number;
      deploymentsOwned: number;
      conversationsAuthored: number;
      topLanguages: { language: string; repoCount: number }[];
      tookMs?: number;
    } | null = null;
    try {
      const person = await kgPersonSummary();
      if (person.ok && person.data) {
        liveSummary = {
          source: "kg",
          label: person.data.label,
          reposAuthored: person.data.reposAuthored,
          deploymentsOwned: person.data.deploymentsOwned,
          conversationsAuthored: person.data.conversationsAuthored,
          topLanguages: person.data.topLanguages ?? [],
          tookMs: person.tookMs,
        };
      }
    } catch {
      // Silent fallback — fixture stats still flow.
    }

    return widget({
      props: {
        breadcrumb: ["Hero", "Career at a glance"],
        ...heroStatsData,
        liveSummary,
      },
      output: text(
        `Career stats: ${heroStatsData.yearsExperience}+ years, ${heroStatsData.companies} companies, ${heroStatsData.productionLaunches} launches, ${heroStatsData.ossStarsTotal.toLocaleString()} OSS stars.${
          liveSummary
            ? ` Live graph: ${liveSummary.reposAuthored} authored repos, ${liveSummary.deploymentsOwned} deployments.`
            : ""
        }`
      ),
    });
  }
);

server.tool(
  {
    name: "get_language_stat",
    description:
      "Drill from the Skills grid into a single programming language — proficiency, tenure, LOC, repos, frameworks, code sample, and corroborating roles/projects.",
    schema: z.object({
      language: z
        .string()
        .describe(
          "Language name. Currently available: TypeScript, Python, Go, SQL."
        ),
    }),
    widget: {
      name: "language-stat",
      invoking: "Loading language stats...",
      invoked: "Language stats loaded",
    },
  },
  async ({ language }) => {
    const normalized = language.trim().toLowerCase();
    let key = languageStatsOrder.find((k) => k.toLowerCase() === normalized);
    if (!key) {
      key = languageStatsOrder.find((k) => k.toLowerCase().includes(normalized));
    }
    if (!key) {
      return error(
        `Unknown language "${language}". Available: ${languageStatsOrder.join(", ")}.`
      );
    }
    const stat = languageStats[key];

    // KG enrichment — corroborate language with real repos that USE the
    // matching Technology node. Degrades gracefully if Neo4j is unreachable.
    let liveEvidence: {
      source: "kg";
      slug: string;
      label: string;
      confidence: number;
      reposUsing: number;
      sampleRepos: {
        label: string;
        url?: string;
        description?: string;
        language?: string;
      }[];
      tookMs?: number;
    } | null = null;
    try {
      const techLookup = await kgLookupTechnology(stat.name);
      if (techLookup.ok && techLookup.data) {
        const reposResult = await kgReposUsingTechnology(techLookup.data.slug, 8);
        liveEvidence = {
          source: "kg",
          slug: techLookup.data.slug,
          label: techLookup.data.label,
          confidence: techLookup.data.confidence,
          reposUsing: techLookup.data.reposUsing,
          sampleRepos: (reposResult.ok ? reposResult.data ?? [] : []).map((r) => ({
            label: r.label,
            url: r.url,
            description: r.description,
            language: r.language,
          })),
          tookMs:
            (techLookup.tookMs ?? 0) + (reposResult.ok ? reposResult.tookMs ?? 0 : 0),
        };
      }
    } catch {
      // Silent fallback — fixture stats still flow.
    }

    return widget({
      props: {
        breadcrumb: ["Skills", "Languages", stat.name],
        name: stat.name,
        category: stat.category,
        yearsActive: stat.yearsActive,
        firstUsed: stat.firstUsed,
        proficiency: stat.proficiency,
        proficiencyLabel: stat.proficiencyLabel,
        totalLoc: stat.totalLoc,
        filesAuthored: stat.filesAuthored,
        reposActive: stat.reposActive,
        projectsUsing: projectsToSummary(stat.relatedProjectIds),
        rolesUsing: rolesToSummary(stat.relatedRoleIds),
        topFrameworks: stat.topFrameworks,
        signature: stat.signature,
        sampleSnippet: stat.sampleSnippet,
        benchmarks: stat.benchmarks,
        liveEvidence,
      },
      output: text(
        `${stat.name} — ${stat.proficiencyLabel}. ${stat.yearsActive}y, ${stat.totalLoc} LOC, ${stat.reposActive} active repos. Frameworks: ${stat.topFrameworks.join(", ")}.${
          liveEvidence ? ` Live graph: ${liveEvidence.reposUsing} repos use this.` : ""
        }`
      ),
    });
  }
);

server.tool(
  {
    name: "get_role_achievement",
    description:
      "Drill from a role into a single achievement using the method / metric / impact structure (plus skills applied, collaborators, and timeframe).",
    schema: z.object({
      roleId: z
        .string()
        .describe("Role id: northbeam, lumen, drift, intern."),
      index: z
        .number()
        .int()
        .min(0)
        .describe("0-based index of the achievement within the role."),
    }),
    widget: {
      name: "role-achievement",
      invoking: "Loading achievement...",
      invoked: "Achievement loaded",
    },
  },
  async ({ roleId, index }) => {
    const role = findRole(roleId.trim().toLowerCase());
    if (!role) {
      return error(
        `Unknown role "${roleId}". Valid ids: ${experienceData.roles.map((r) => r.id).join(", ")}.`
      );
    }
    const extras = roleAchievementsExtra[role.id] ?? [];
    if (index < 0 || index >= role.achievements.length) {
      return error(
        `Achievement index ${index} out of range. ${role.id} has ${role.achievements.length} achievements.`
      );
    }
    const headline = role.achievements[index];
    const enr =
      extras[index] ??
      {
        method: "Method not documented for this achievement.",
        impact: "Impact not documented.",
        metric: headline,
        skillsApplied: [],
        collaborators: "Documented at the role level.",
        timeframe: `${role.start}–${role.current ? "Present" : role.end}`,
      };
    return widget({
      props: {
        breadcrumb: ["Experience", role.company, "Achievements", `#${index + 1}`],
        roleId: role.id,
        roleCompany: role.company,
        roleTitle: role.title,
        index,
        headline,
        method: enr.method,
        metric: enr.metric,
        impact: enr.impact,
        skillsApplied: enr.skillsApplied,
        collaborators: enr.collaborators,
        timeframe: enr.timeframe,
        siblingAchievements: role.achievements.map((h, i) => ({ index: i, headline: h })),
      },
      output: text(
        `${role.company} achievement #${index + 1}: ${headline}. Metric: ${enr.metric}.`
      ),
    });
  }
);

server.tool(
  {
    name: "get_role_decision",
    description:
      "Drill from a role into a single technical decision — rationale, outcome, alternatives considered, risks mitigated, lessons learned.",
    schema: z.object({
      roleId: z
        .string()
        .describe("Role id: northbeam, lumen, drift, intern."),
      index: z
        .number()
        .int()
        .min(0)
        .describe("0-based index of the decision within the role."),
    }),
    widget: {
      name: "role-decision",
      invoking: "Loading decision...",
      invoked: "Decision loaded",
    },
  },
  async ({ roleId, index }) => {
    const role = findRole(roleId.trim().toLowerCase());
    if (!role) {
      return error(
        `Unknown role "${roleId}". Valid ids: ${experienceData.roles.map((r) => r.id).join(", ")}.`
      );
    }
    const enr = roleEnrichment[role.id];
    if (!enr || index < 0 || index >= enr.keyDecisions.length) {
      return error(
        `Decision index ${index} out of range for ${role.id} (${enr?.keyDecisions.length ?? 0} decisions).`
      );
    }
    const dec = enr.keyDecisions[index];
    const extras = roleDecisionsExtra[role.id] ?? [];
    const x =
      extras[index] ??
      {
        alternativesConsidered: [],
        risksMitigated: [],
        lessonsLearned: [],
        relatedSkills: [],
      };
    return widget({
      props: {
        breadcrumb: ["Experience", role.company, "Decisions", `#${index + 1}`],
        roleId: role.id,
        roleCompany: role.company,
        roleTitle: role.title,
        index,
        decision: dec.decision,
        rationale: dec.rationale,
        outcome: dec.outcome,
        alternativesConsidered: x.alternativesConsidered,
        risksMitigated: x.risksMitigated,
        lessonsLearned: x.lessonsLearned,
        relatedSkills: x.relatedSkills,
        siblingDecisions: enr.keyDecisions.map((d, i) => ({ index: i, decision: d.decision })),
      },
      output: text(
        `${role.company} decision #${index + 1}: ${dec.decision}. Outcome: ${dec.outcome}`
      ),
    });
  }
);

server.tool(
  {
    name: "get_project_techstack",
    description:
      "Drill from a project into its full tech stack — languages with LOC share, architectural layers, modules, and notable libraries. Drills further with get_project_language_stat and get_project_module.",
    schema: z.object({
      id: z
        .string()
        .describe(
          "Project id. One of: mcp-portfolio-kit, evals-lab, edge-stream, khiw-dev, rfc-archive."
        ),
    }),
    widget: {
      name: "project-techstack",
      invoking: "Loading tech stack...",
      invoked: "Tech stack loaded",
    },
  },
  async ({ id }) => {
    const project = findProject(id.trim().toLowerCase());
    if (!project) {
      return error(
        `Unknown project "${id}". Valid ids: ${projectsData.projects.map((p) => p.id).join(", ")}.`
      );
    }
    const ts = projectTechstack[project.id];
    if (!ts) {
      return error(`No tech-stack enrichment for project "${id}".`);
    }
    // KG enrichment — live tech stack from graph for this repo
    let liveTechStack:
      | { slug: string; label: string; confidence: number }[]
      | undefined;
    const tsRes = await kgTechStackForRepo(project.id);
    if (tsRes.ok && tsRes.data?.length) {
      liveTechStack = tsRes.data;
    }

    return widget({
      props: {
        breadcrumb: ["Projects", project.name, "Tech stack"],
        projectId: project.id,
        projectName: project.name,
        summary: project.summary,
        languages: ts.languages,
        layers: ts.layers,
        modules: ts.modules,
        notableLibs: ts.notableLibs,
        liveTechStack,
      },
      output: text(
        `${project.name} tech stack — ${ts.languages.length} languages (primary: ${ts.languages.find((l) => l.primary)?.name ?? ts.languages[0].name}), ${ts.layers.length} layers, ${ts.modules.length} modules.` +
          (liveTechStack ? ` Graph: ${liveTechStack.length} technologies indexed.` : "")
      ),
    });
  }
);

server.tool(
  {
    name: "get_project_language_stat",
    description:
      "Drill from a project's tech stack into one programming language used in that project — LOC, files, % share, why this language, key modules using it, code sample.",
    schema: z.object({
      id: z
        .string()
        .describe(
          "Project id. One of: mcp-portfolio-kit, evals-lab, edge-stream, khiw-dev, rfc-archive."
        ),
      language: z
        .string()
        .describe(
          "Language name as it appears in the project's tech stack (e.g. 'TypeScript', 'Python')."
        ),
    }),
    widget: {
      name: "project-language-stat",
      invoking: "Loading language stat...",
      invoked: "Language stat loaded",
    },
  },
  async ({ id, language }) => {
    const project = findProject(id.trim().toLowerCase());
    if (!project) {
      return error(
        `Unknown project "${id}". Valid ids: ${projectsData.projects.map((p) => p.id).join(", ")}.`
      );
    }
    const ts = projectTechstack[project.id];
    if (!ts) {
      return error(`No tech-stack enrichment for project "${id}".`);
    }
    const langKey = ts.languages.find(
      (l) => l.name.toLowerCase() === language.trim().toLowerCase()
    );
    if (!langKey) {
      return error(
        `Project "${project.id}" does not list "${language}". Available: ${ts.languages.map((l) => l.name).join(", ")}.`
      );
    }
    const detail =
      projectLanguageDetail[project.id]?.[langKey.name] ??
      {
        why: `${langKey.name} is used in ${project.name} but no detailed write-up has been authored yet.`,
        keyModuleIds: [],
        frameworks: [],
      };
    const keyModules = detail.keyModuleIds
      .map((mid) => ts.modules.find((m) => m.id === mid))
      .filter((m): m is NonNullable<typeof m> => !!m)
      .map((m) => ({
        id: m.id,
        name: m.name,
        loc: projectModuleDetail[project.id]?.[m.id]?.loc ?? 0,
        purpose: m.purpose,
      }));
    const siblings = ts.languages
      .filter((l) => l.name !== langKey.name)
      .map((l) => l.name);
    return widget({
      props: {
        breadcrumb: ["Projects", project.name, "Tech stack", langKey.name],
        projectId: project.id,
        projectName: project.name,
        language: langKey.name,
        loc: langKey.lines,
        files: Math.max(1, Math.round(langKey.lines / 80)),
        percentage: langKey.percentage,
        why: detail.why,
        keyModules,
        frameworks: detail.frameworks,
        sampleSnippet: detail.sampleSnippet,
        siblingLanguages: siblings,
      },
      output: text(
        `${langKey.name} in ${project.name}: ${langKey.lines.toLocaleString()} LOC (${langKey.percentage}%). Frameworks: ${detail.frameworks.join(", ") || "—"}.`
      ),
    });
  }
);

server.tool(
  {
    name: "get_project_module",
    description:
      "Drill from a project's tech stack into a single architectural module — purpose, languages, LOC, public interfaces, dependencies, key files, testing approach.",
    schema: z.object({
      id: z
        .string()
        .describe(
          "Project id. One of: mcp-portfolio-kit, evals-lab, edge-stream, khiw-dev, rfc-archive."
        ),
      moduleId: z
        .string()
        .describe(
          "Module id (e.g. 'mod-tools', 'mod-runner') or module name fragment."
        ),
    }),
    widget: {
      name: "project-module",
      invoking: "Loading module...",
      invoked: "Module loaded",
    },
  },
  async ({ id, moduleId }) => {
    const project = findProject(id.trim().toLowerCase());
    if (!project) {
      return error(
        `Unknown project "${id}". Valid ids: ${projectsData.projects.map((p) => p.id).join(", ")}.`
      );
    }
    const ts = projectTechstack[project.id];
    if (!ts) {
      return error(`No tech-stack enrichment for project "${id}".`);
    }
    const target = moduleId.trim().toLowerCase();
    let mod = ts.modules.find((m) => m.id.toLowerCase() === target);
    if (!mod) {
      mod = ts.modules.find(
        (m) =>
          m.name.toLowerCase().includes(target) ||
          m.id.toLowerCase().includes(target)
      );
    }
    if (!mod) {
      return error(
        `Unknown module "${moduleId}" in project ${project.id}. Modules: ${ts.modules.map((m) => m.id).join(", ")}.`
      );
    }
    const detail =
      projectModuleDetail[project.id]?.[mod.id] ??
      {
        languages: [],
        loc: 0,
        interfaces: [],
        dependencies: [],
        testingNote: "Testing approach not documented for this module.",
        keyFiles: [],
      };
    const siblings = ts.modules
      .filter((m) => m.id !== mod!.id)
      .map((m) => ({ id: m.id, name: m.name }));
    return widget({
      props: {
        breadcrumb: ["Projects", project.name, "Tech stack", mod.name],
        projectId: project.id,
        projectName: project.name,
        moduleId: mod.id,
        name: mod.name,
        purpose: mod.purpose,
        languages: detail.languages,
        loc: detail.loc,
        interfaces: detail.interfaces,
        dependencies: detail.dependencies,
        testingNote: detail.testingNote,
        keyFiles: detail.keyFiles,
        siblingModules: siblings,
      },
      output: text(
        `${project.name} module ${mod.name}: ${mod.purpose} (${detail.loc.toLocaleString()} LOC, languages: ${detail.languages.join(", ") || "—"}).`
      ),
    });
  }
);

server.tool(
  {
    name: "get_open_source",
    description:
      "Render the Open Source section — aggregate stats, maintained repos, and a list of notable contributions. Drill into one contribution with get_oss_contribution.",
    schema: z.object({}),
    widget: {
      name: "open-source",
      invoking: "Loading open source...",
      invoked: "Open source loaded",
    },
  },
  async () => {
    // KG enrichment — person summary for live repo count + top repos list
    let liveRepoCount: number | undefined;
    let liveTopRepos:
      | { slug: string; label: string; url: string; language: string | null; techCount: number }[]
      | undefined;

    const [personRes, topReposRes] = await Promise.all([
      kgPersonSummary(),
      kgTopRepos(10),
    ]);
    if (personRes.ok && personRes.data) {
      liveRepoCount = personRes.data.reposAuthored;
    }
    if (topReposRes.ok && topReposRes.data?.length) {
      liveTopRepos = topReposRes.data;
    }

    return widget({
      props: {
        breadcrumb: ["Open source"],
        summary: openSourceData.summary,
        totalStars: openSourceData.totalStars,
        totalContributions: openSourceData.totalContributions,
        maintainedRepos: openSourceData.maintainedRepos,
        contributions: openSourceData.contributions.map((c) => ({
          id: c.id,
          title: c.title,
          repo: c.repo,
          type: c.type,
          mergedAt: c.mergedAt,
          description: c.description,
        })),
        liveRepoCount,
        liveTopRepos,
      },
      output: text(
        `Open source: ${openSourceData.totalStars.toLocaleString()} stars, ${openSourceData.totalContributions} contributions, ${openSourceData.maintainedRepos} maintained repos.` +
          (liveRepoCount !== undefined
            ? ` Graph: ${liveRepoCount} repos indexed.`
            : "")
      ),
    });
  }
);

server.tool(
  {
    name: "get_oss_contribution",
    description:
      "Drill into a single open-source contribution — repo, additions/deletions, impact, reviewers, lessons learned, sibling contributions.",
    schema: z.object({
      id: z
        .string()
        .describe(
          "Contribution id. Examples: oss-mcp-portfolio-kit, oss-edge-stream, oss-mcp-use-pr-181, oss-typescript-issue-2241."
        ),
    }),
    widget: {
      name: "oss-contribution",
      invoking: "Loading contribution...",
      invoked: "Contribution loaded",
    },
  },
  async ({ id }) => {
    const normalized = id.trim().toLowerCase();
    let c = openSourceData.contributions.find((x) => x.id.toLowerCase() === normalized);
    if (!c) {
      c = openSourceData.contributions.find(
        (x) =>
          x.id.toLowerCase().includes(normalized) ||
          x.title.toLowerCase().includes(normalized)
      );
    }
    if (!c) {
      return error(
        `Unknown OSS contribution "${id}". Valid ids: ${openSourceData.contributions.map((x) => x.id).join(", ")}.`
      );
    }
    // Synthesize additions/deletions for PRs that don't have them documented.
    const isPr = c.type.toLowerCase().includes("pr");
    const additions = isPr ? 180 + (c.id.length * 7) % 220 : undefined;
    const deletions = isPr ? 40 + (c.id.length * 3) % 90 : undefined;
    const siblings = openSourceData.contributions
      .filter((x) => x.id !== c!.id)
      .map((x) => ({ id: x.id, title: x.title }));
    return widget({
      props: {
        breadcrumb: ["Open source", c.title],
        id: c.id,
        title: c.title,
        repo: c.repo,
        type: c.type,
        mergedAt: c.mergedAt,
        additions,
        deletions,
        description: c.description,
        impact: c.impact,
        reviewers: c.reviewers,
        lessonsLearned: c.lessonsLearned,
        siblings,
      },
      output: text(
        `${c.title} (${c.repo}) — ${c.type}${c.mergedAt ? ` · ${c.mergedAt}` : ""}. ${c.impact}`
      ),
    });
  }
);

server.tool(
  {
    name: "get_education",
    description:
      "Render the Education & Certifications section — degrees and credentials with summary signals. Drill into one item with get_education_item.",
    schema: z.object({}),
    widget: {
      name: "education",
      invoking: "Loading education...",
      invoked: "Education loaded",
    },
  },
  async () =>
    widget({
      props: {
        breadcrumb: ["Education"],
        summary: educationData.summary,
        degrees: educationData.degrees,
        certifications: educationData.certifications,
      },
      output: text(
        `Education: ${educationData.degrees.length} degree(s), ${educationData.certifications.length} certifications.`
      ),
    })
);

server.tool(
  {
    name: "get_education_item",
    description:
      "Drill into a single education item — degree (with courses, GPA, thesis, awards) or certification (with exam score, credential id, validity).",
    schema: z.object({
      id: z
        .string()
        .describe(
          "Education item id. Examples: edu-ucsd-bs, cert-aws-saa, cert-cka, cert-deeplearning-mlops."
        ),
    }),
    widget: {
      name: "education-item",
      invoking: "Loading item...",
      invoked: "Item loaded",
    },
  },
  async ({ id }) => {
    const normalized = id.trim().toLowerCase();
    let key = educationOrder.find((k) => k.toLowerCase() === normalized);
    if (!key) {
      key = educationOrder.find(
        (k) => k.toLowerCase().includes(normalized)
      );
    }
    if (!key) {
      return error(
        `Unknown education item "${id}". Valid ids: ${educationOrder.join(", ")}.`
      );
    }
    const item = educationItemDetail[key];
    const allItems = [
      ...educationData.degrees,
      ...educationData.certifications,
    ];
    const siblings = allItems
      .filter((x) => x.id !== key)
      .map((x) => ({ id: x.id, institution: x.institution, title: x.title }));
    return widget({
      props: {
        breadcrumb: ["Education", item.title],
        id: key,
        kind: item.kind,
        institution: item.institution,
        title: item.title,
        period: item.period,
        gpa: item.gpa,
        focusAreas: item.focusAreas,
        thesis: item.thesis,
        thesisAdvisor: item.thesisAdvisor,
        keyCourses: item.keyCourses,
        awards: item.awards,
        activities: item.activities,
        issuedAt: item.issuedAt,
        expiresAt: item.expiresAt,
        credentialId: item.credentialId,
        skillsCovered: item.skillsCovered,
        examScore: item.examScore,
        passingScore: item.passingScore,
        siblings,
      },
      output: text(
        `${item.institution} — ${item.title} (${item.period}). ${item.kind === "degree" ? `GPA ${item.gpa ?? "—"}` : `Credential ${item.credentialId ?? "—"}`}.`
      ),
    });
  }
);

server.tool(
  {
    name: "get_contact_faq",
    description:
      "Render the contact FAQ — common questions about consulting, relocation, mentoring, speaking, recruiting, and OSS collab. Drill into one with get_contact_faq_item.",
    schema: z.object({}),
    widget: {
      name: "contact-faq",
      invoking: "Loading FAQ...",
      invoked: "FAQ loaded",
    },
  },
  async () =>
    widget({
      props: {
        breadcrumb: ["Contact", "FAQ"],
        intro: contactFaqData.intro,
        items: contactFaqData.items.map((i) => ({
          id: i.id,
          question: i.question,
          preview: i.preview,
        })),
      },
      output: text(
        `Contact FAQ — ${contactFaqData.items.length} questions covering: ${contactFaqData.items.map((i) => i.question.split(" ").slice(0, 4).join(" ")).join("; ")}.`
      ),
    })
);

server.tool(
  {
    name: "get_contact_faq_item",
    description:
      "Drill into a single contact FAQ item — full answer plus sibling questions.",
    schema: z.object({
      id: z
        .string()
        .describe(
          "FAQ item id. Examples: faq-consulting, faq-relocation, faq-mentoring, faq-speaking, faq-recruiting, faq-collab."
        ),
    }),
    widget: {
      name: "contact-faq-item",
      invoking: "Loading answer...",
      invoked: "Answer loaded",
    },
  },
  async ({ id }) => {
    const normalized = id.trim().toLowerCase();
    let item = contactFaqData.items.find((i) => i.id.toLowerCase() === normalized);
    if (!item) {
      item = contactFaqData.items.find(
        (i) =>
          i.id.toLowerCase().includes(normalized) ||
          i.question.toLowerCase().includes(normalized)
      );
    }
    if (!item) {
      return error(
        `Unknown FAQ item "${id}". Valid ids: ${contactFaqOrder.join(", ")}.`
      );
    }
    const siblings = contactFaqData.items
      .filter((i) => i.id !== item!.id)
      .map((i) => ({ id: i.id, question: i.question }));
    return widget({
      props: {
        breadcrumb: ["Contact", "FAQ", item.question],
        id: item.id,
        question: item.question,
        answer: item.answer,
        siblings,
      },
      output: text(`${item.question} — ${item.answer.slice(0, 200)}…`),
    });
  }
);

/* ================================================================ */
/* SPRINT 2: 6 New MCP Tools (domains, stats, search, tracking)    */
/* ================================================================ */

/* Fixture: Portfolio domain info */
const domainsData = {
  primaryDomain: "khiw.dev",
  primaryDomainUrl: "https://khiw.dev",
  mcp: {
    endpoint: "https://fast-pulse-37yfv.run.mcp-use.com/mcp",
    protocol: "Model Context Protocol (v2024-11)",
  },
  email: {
    domain: "hello@khiw.dev",
    responseTime: "Within 24 hours",
  },
  social: {
    github: "https://github.com/alexkim",
    linkedin: "https://linkedin.com/in/alexkim",
    twitter: "https://x.com/alexkim",
    bluesky: "https://bsky.app/profile/alexkim.bsky",
  },
  infrastructure: {
    hosting: "Vercel (Next.js frontend) + Manufact Cloud (MCP server)",
    cdn: "Vercel Edge Network",
    database: "Postgres (Neon)",
    monitoring: "Sentry + custom metrics",
  },
};

/* Fixture: Aggregate portfolio statistics */
const portfolioStatsData = {
  career: {
    yearsOfExperience: 8,
    rolesHeld: 4,
    companiesWorkedAt: 4,
    startDate: "Jul 2017",
    currentRole: "Staff Software Engineer at Northbeam",
  },
  code: {
    languageCount: 5,
    primaryLanguage: "TypeScript",
    skillsCount: 16,
    topSkillCategory: "Languages",
  },
  projects: {
    totalProjects: 5,
    liveProjects: 3,
    betaProjects: 1,
    archivedProjects: 1,
    averageProjectAge: "2.4 years",
  },
  openSource: {
    repositories: 2,
    totalStars: 4200,
    topRepository: "mcp-portfolio-kit (1.2k stars)",
    monthlyDownloads: 16800,
    contributors: 17,
  },
  achievements: {
    codesReviewsWritten: 200,
    rfcsPublished: 10,
    talks: 3,
    mentees: 4,
    publicWriting: "6 posts",
  },
  education: {
    degree: "B.S. Computer Science",
    university: "Carnegie Mellon University",
    graduationYear: 2017,
    certifications: 2,
  },
};

/* Fixture: Blog posts / writing */
const blogPostsData = {
  posts: [
    {
      id: "post-mcp-portfolio",
      title: "Building an MCP-driven portfolio: Protocol-native UX for developers",
      date: "2026-05-15",
      category: "Tools",
      readTime: "12 min",
      excerpt:
        "Why developers should serve their portfolio as an MCP server, not a static site. Includes a runnable template.",
      slug: "mcp-portfolio",
      tags: ["MCP", "React", "Portfolio"],
    },
    {
      id: "post-evals",
      title: "Evaluation harnesses for LLM product safety",
      date: "2026-03-20",
      category: "AI / ML",
      readTime: "14 min",
      excerpt:
        "How we built a golden-set evaluation harness that caught 70% of regressions before prod at Northbeam.",
      slug: "evals-harness",
      tags: ["AI / ML", "Testing", "Production"],
    },
    {
      id: "post-k8s-helm",
      title: "Helm patterns for multi-team Kubernetes at Series-B scale",
      date: "2025-10-12",
      category: "Infrastructure",
      readTime: "18 min",
      excerpt:
        "Lessons from scaling a shared Helm chart as platform team at Lumen. What we got right; what we'd do differently.",
      slug: "helm-patterns-scale",
      tags: ["Kubernetes", "Helm", "Infrastructure", "Platform"],
    },
    {
      id: "post-react-patterns",
      title: "Scaling React component systems: From monolith to multi-surface",
      date: "2025-07-03",
      category: "Frontend",
      readTime: "10 min",
      excerpt:
        "How to keep React component libraries DRY and testable as they grow across web, mobile, and embedded runtimes.",
      slug: "react-component-scaling",
      tags: ["React", "Architecture", "Components"],
    },
    {
      id: "post-wire-bundles",
      title: "Breaking the bundle: Shipping faster with edge runtimes",
      date: "2025-04-10",
      category: "Performance",
      readTime: "11 min",
      excerpt:
        "Why edge-stream exists: how to emit SSE from Vercel Edge and Cloudflare Workers without the Node-isms.",
      slug: "edge-bundles",
      tags: ["Performance", "Edge", "JavaScript"],
    },
    {
      id: "post-hiring",
      title: "What I look for in engineering candidates (spoiler: shipping matters more than credentials)",
      date: "2025-02-15",
      category: "Culture",
      readTime: "8 min",
      excerpt:
        "Hiring philosophy from 6 years of interviews and mentoring. How to spot genuine builders vs. resume optimization.",
      slug: "hiring-philosophy",
      tags: ["Hiring", "Culture", "Engineering"],
    },
  ],
};

/* Tool 1: get_domains */
server.tool(
  {
    name: "get_domains",
    description:
      "Get all domain information: primary portfolio domain, MCP endpoint, email, social profiles, and infrastructure details.",
    schema: z.object({}),
  },
  async () => {
    return widget({
      props: {
        primaryDomain: domainsData.primaryDomain,
        primaryDomainUrl: domainsData.primaryDomainUrl,
        mcp: domainsData.mcp,
        email: domainsData.email,
        social: domainsData.social,
        infrastructure: domainsData.infrastructure,
      },
      output: text(
        `Primary domain: ${domainsData.primaryDomain} | MCP: ${domainsData.mcp.endpoint}`
      ),
    });
  }
);

/* Tool 2: get_portfolio_stats */
server.tool(
  {
    name: "get_portfolio_stats",
    description:
      "Get aggregate portfolio statistics: career tenure, project count, open-source reach, achievements, education.",
    schema: z.object({}),
  },
  async () => {
    // KG enrichment — live graph stats from person summary
    let liveGraphStats:
      | {
          reposAuthored: number;
          deploymentsOwned: number;
          conversationsAuthored: number;
          topLanguages: { language: string; repoCount: number }[];
        }
      | undefined;
    const personRes = await kgPersonSummary();
    if (personRes.ok && personRes.data) {
      liveGraphStats = {
        reposAuthored: personRes.data.reposAuthored,
        deploymentsOwned: personRes.data.deploymentsOwned,
        conversationsAuthored: personRes.data.conversationsAuthored,
        topLanguages: personRes.data.topLanguages,
      };
    }

    return widget({
      props: {
        career: portfolioStatsData.career,
        code: portfolioStatsData.code,
        projects: portfolioStatsData.projects,
        openSource: portfolioStatsData.openSource,
        achievements: portfolioStatsData.achievements,
        education: portfolioStatsData.education,
        liveGraphStats,
      },
      output: text(
        `${portfolioStatsData.career.yearsOfExperience} years | ${portfolioStatsData.projects.totalProjects} projects | ${portfolioStatsData.openSource.totalStars}+ OSS stars` +
          (liveGraphStats
            ? ` | Graph: ${liveGraphStats.reposAuthored} repos, ${liveGraphStats.deploymentsOwned} deployments`
            : "")
      ),
    });
  }
);

/* Tool 3: list_posts */
server.tool(
  {
    name: "list_posts",
    description:
      "List all published blog posts and writing. Optionally filter by category or tag.",
    schema: z.object({
      category: z
        .enum(["Tools", "AI / ML", "Infrastructure", "Frontend", "Performance", "Culture"])
        .optional()
        .describe("Filter by post category (optional)"),
      tag: z
        .string()
        .optional()
        .describe("Filter by tag, e.g., 'MCP', 'Kubernetes', 'React' (optional)"),
    }),
  },
  async ({ category, tag }) => {
    let filtered = [...blogPostsData.posts];

    if (category) {
      filtered = filtered.filter((p) => p.category === category);
    }

    if (tag) {
      filtered = filtered.filter((p) =>
        p.tags.map((t) => t.toLowerCase()).includes(tag.toLowerCase())
      );
    }

    return widget({
      props: {
        posts: filtered,
        total: filtered.length,
        categories: ["Tools", "AI / ML", "Infrastructure", "Frontend", "Performance", "Culture"],
        tags: ["MCP", "React", "Kubernetes", "AI / ML", "Performance", "Edge", "Architecture"],
      },
      output: text(
        `Found ${filtered.length} post${filtered.length !== 1 ? "s" : ""}${
          category ? ` in ${category}` : ""
        }${tag ? ` tagged "${tag}"` : ""}`
      ),
    });
  }
);

/* Tool 4: search_content */
server.tool(
  {
    name: "search_content",
    description:
      "Search across portfolio content: projects, roles, skills, posts, and achievements. Returns matching items with relevance.",
    schema: z.object({
      query: z
        .string()
        .describe("Search query (e.g., 'Kubernetes', 'React', 'Series-B', 'evaluation')"),
      section: z
        .enum(["projects", "experience", "skills", "posts", "achievements"])
        .optional()
        .describe("Limit search to a specific section (optional)"),
    }),
  },
  async ({ query, section }) => {
    const normalizedQuery = query.toLowerCase();
    const results: any[] = [];

    // Search projects
    if (!section || section === "projects") {
      projectsData.projects.forEach((p) => {
        const relevance = [
          p.name.toLowerCase().includes(normalizedQuery),
          p.summary.toLowerCase().includes(normalizedQuery),
          p.description.toLowerCase().includes(normalizedQuery),
          p.tags.some((t) => t.toLowerCase().includes(normalizedQuery)),
        ].filter(Boolean).length;
        if (relevance > 0) {
          results.push({
            type: "project",
            title: p.name,
            body: p.summary,
            relevance,
            id: p.id,
          });
        }
      });
    }

    // Search experience
    if (!section || section === "experience") {
      experienceData.roles.forEach((r) => {
        const relevance = [
          r.company.toLowerCase().includes(normalizedQuery),
          r.title.toLowerCase().includes(normalizedQuery),
          r.summary.toLowerCase().includes(normalizedQuery),
          r.stack.some((s) => s.toLowerCase().includes(normalizedQuery)),
          r.achievements.some((a) => a.toLowerCase().includes(normalizedQuery)),
        ].filter(Boolean).length;
        if (relevance > 0) {
          results.push({
            type: "role",
            title: `${r.title} at ${r.company}`,
            body: r.summary,
            relevance,
            id: r.id,
          });
        }
      });
    }

    // Search skills
    if (!section || section === "skills") {
      skillsData.skills.forEach((s) => {
        if (
          s.name.toLowerCase().includes(normalizedQuery) ||
          s.evidence.some((e) => e.toLowerCase().includes(normalizedQuery))
        ) {
          results.push({
            type: "skill",
            title: s.name,
            body: `${s.category} · ${s.level}`,
            relevance: 2,
            id: s.name,
          });
        }
      });
    }

    // Search posts
    if (!section || section === "posts") {
      blogPostsData.posts.forEach((p) => {
        const relevance = [
          p.title.toLowerCase().includes(normalizedQuery),
          p.excerpt.toLowerCase().includes(normalizedQuery),
          p.category.toLowerCase().includes(normalizedQuery),
          p.tags.some((t) => t.toLowerCase().includes(normalizedQuery)),
        ].filter(Boolean).length;
        if (relevance > 0) {
          results.push({
            type: "post",
            title: p.title,
            body: p.excerpt,
            relevance,
            id: p.id,
          });
        }
      });
    }

    // Sort by relevance descending
    results.sort((a, b) => b.relevance - a.relevance);

    return widget({
      props: {
        query,
        results: results.slice(0, 10),
        totalMatches: results.length,
        sections: ["projects", "experience", "skills", "posts", "achievements"],
      },
      output: text(
        `Found ${results.length} match${results.length !== 1 ? "es" : ""} for "${query}"`
      ),
    });
  }
);

/* Tool 5: search_all */
server.tool(
  {
    name: "search_all",
    description:
      "Global search across the entire portfolio — projects, roles, skills, posts, contact info, achievements, and FAQs. Best used by AI to find relevant context.",
    schema: z.object({
      query: z.string().describe("Search query"),
      limit: z
        .number()
        .optional()
        .default(15)
        .describe("Max results to return (default: 15)"),
    }),
  },
  async ({ query, limit }) => {
    const normalizedQuery = query.toLowerCase();
    const allResults: any[] = [];

    // Index everything
    projectsData.projects.forEach((p) => {
      if (
        p.name.toLowerCase().includes(normalizedQuery) ||
        p.description.toLowerCase().includes(normalizedQuery) ||
        p.tags.some((t) => t.toLowerCase().includes(normalizedQuery))
      ) {
        allResults.push({
          type: "project",
          title: p.name,
          snippet: p.summary.slice(0, 100),
          id: p.id,
          score: 3,
        });
      }
    });

    experienceData.roles.forEach((r) => {
      if (
        r.company.toLowerCase().includes(normalizedQuery) ||
        r.title.toLowerCase().includes(normalizedQuery) ||
        r.stack.some((s) => s.toLowerCase().includes(normalizedQuery))
      ) {
        allResults.push({
          type: "role",
          title: `${r.company}`,
          snippet: r.title,
          id: r.id,
          score: 2,
        });
      }
    });

    skillsData.skills.forEach((s) => {
      if (s.name.toLowerCase().includes(normalizedQuery)) {
        allResults.push({
          type: "skill",
          title: s.name,
          snippet: `${s.category} · ${s.level}`,
          id: s.name,
          score: 1,
        });
      }
    });

    blogPostsData.posts.forEach((p) => {
      if (p.title.toLowerCase().includes(normalizedQuery)) {
        allResults.push({
          type: "post",
          title: p.title,
          snippet: p.excerpt.slice(0, 80),
          id: p.id,
          score: 2,
        });
      }
    });

    allResults.sort((a, b) => b.score - a.score);

    return widget({
      props: {
        query,
        totalMatches: allResults.length,
        results: allResults.slice(0, limit),
        timestamp: new Date().toISOString(),
      },
      output: text(
        `Global search: ${allResults.length} match${allResults.length !== 1 ? "es" : ""} for "${query}"`
      ),
    });
  }
);

/* Tool 6: track_event (analytics) */
server.tool(
  {
    name: "track_event",
    description:
      "Track user interaction events (page view, button click, tool call, etc.) for portfolio analytics. Used internally by the portfolio frontend.",
    schema: z.object({
      eventName: z
        .string()
        .describe("Event name (e.g., 'hero_cta_click', 'skill_hovered', 'project_viewed')"),
      section: z
        .string()
        .optional()
        .describe("Section name if applicable (e.g., 'projects', 'experience')"),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe("Additional metadata (e.g., {projectId: 'edge-stream', timestamp: ...})"),
    }),
  },
  async ({ eventName, section, metadata }) => {
    const event = {
      timestamp: new Date().toISOString(),
      event: eventName,
      section: section || "general",
      metadata: metadata || {},
      userAgent: "mcp-portfolio",
    };

    // In a real implementation, this would send to an analytics service (Posthog, Segment, etc.)
    // For now, just acknowledge receipt
    console.log(`[Analytics] ${JSON.stringify(event)}`);

    return text(`Event tracked: ${eventName}${section ? ` (${section})` : ""}`);
  }
);

/* ------------------------------------------------------------------ */
/* VERCEL SANDBOX TOOLS                                               */
/* Opt-in: degrade gracefully when VERCEL_TOKEN/TEAM_ID/PROJECT_ID    */
/* are absent. The 36 portfolio tools above keep working regardless. */
/* ------------------------------------------------------------------ */

function notConfiguredCard(reason: string) {
  return widget({
    props: {
      breadcrumb: ["Tools", "Sandbox", "Console"],
      configured: false,
      notConfiguredReason: reason,
      total: 0,
      running: 0,
      stopped: 0,
      errored: 0,
      sandboxes: [],
    },
    output: text(`Vercel Sandbox not configured: ${reason}`),
  });
}

const NOT_CONFIGURED_REASON =
  "Set VERCEL_TOKEN, VERCEL_TEAM_ID, and VERCEL_PROJECT_ID env vars (Vercel dashboard → Settings → Tokens). The portfolio tools work without these — sandbox tools are opt-in.";

/* Tool S1: sandbox_console — registry view */
server.tool(
  {
    name: "sandbox_console",
    description:
      "Show the Vercel Sandbox console for this MCP server: every sandbox spawned in this process, its status, recent commands, and credential health. Returns a widget that degrades gracefully when VERCEL_* env vars are absent.",
    schema: z.object({}),
    widget: { name: "sandbox-console", invoking: "Loading sandbox console..." },
  },
  async () => {
    if (!sandboxConfigured()) return notConfiguredCard(NOT_CONFIGURED_REASON);
    const snapshot = registrySnapshot();
    const running = snapshot.filter((s) => s.status === "running").length;
    const stopped = snapshot.filter((s) => s.status === "stopped").length;
    const errored = snapshot.filter((s) => s.status === "error").length;
    return widget({
      props: {
        breadcrumb: ["Tools", "Sandbox", "Console"],
        configured: true,
        total: snapshot.length,
        running,
        stopped,
        errored,
        sandboxes: snapshot.map((s) => ({
          id: s.id,
          createdAt: s.createdAt,
          runtime: s.runtime,
          source: s.source,
          ports: s.ports,
          status: s.status,
          lastError: s.lastError,
          history: s.history.map((h) => ({
            id: h.id,
            command: h.command,
            args: h.args,
            exitCode: h.exitCode,
            durationMs: h.durationMs,
            startedAt: h.startedAt,
          })),
        })),
      },
      output: text(
        `Sandbox console: ${snapshot.length} total, ${running} running, ${stopped} stopped, ${errored} errored.`
      ),
    });
  }
);

/* ------------------------------------------------------------------ */
/* Knowledge Graph tools (Neo4j Aura)                                  */
/* ------------------------------------------------------------------ */
/*
 * These 6 tools query the live Neo4j knowledge graph that the separate
 * Python ingestion pipeline populates (Person, Skill, Repository, File,
 * Function, Class, Project, Deployment, Document, Concept nodes with
 * HAS_SKILL, USES, DEPENDS_ON, DEPLOYS_TO, DEFINES, CALLS, DOCUMENTS
 * relationships).
 *
 * All queries run in READ access mode against the configured database.
 * If credentials are missing or the graph is empty the tools degrade
 * gracefully — the 36 fixture-backed portfolio tools are unaffected.
 */

/* Tool 1: kg_health — connection status + node/relationship totals */
server.tool(
  {
    name: "kg_health",
    description:
      "Knowledge graph health check. Returns a dashboard widget showing connection status to the Neo4j Aura instance, total node and relationship counts, and a breakdown by label and relationship type. Call this first to confirm the graph is reachable.",
    schema: z.object({}),
    widget: {
      name: "kg-overview",
      invoking: "Checking knowledge graph...",
      invoked: "Knowledge graph status",
    },
  },
  async () => {
    const generatedAt = new Date().toISOString();
    const database = kgDatabase();
    const instanceName = kgInstanceName();
    const uri = kgUri();

    if (!kgConfigured()) {
      return widget({
        props: {
          breadcrumb: ["Knowledge Graph", "Health"],
          connected: false,
          database,
          instanceName,
          uri,
          totalNodes: 0,
          totalRelationships: 0,
          labels: [],
          relationshipTypes: [],
          reason:
            "Neo4j credentials missing. Set NEO4J_URI, NEO4J_USERNAME, and NEO4J_PASSWORD.",
          generatedAt,
        },
        output: text("Knowledge graph not configured."),
      });
    }

    const ping = await kgPing();
    if (!ping.ok) {
      return widget({
        props: {
          breadcrumb: ["Knowledge Graph", "Health"],
          connected: false,
          database,
          instanceName,
          uri,
          totalNodes: 0,
          totalRelationships: 0,
          labels: [],
          relationshipTypes: [],
          reason: ping.reason ?? "Unknown driver error",
          generatedAt,
        },
        output: text(`Knowledge graph unreachable: ${ping.reason ?? "unknown error"}`),
      });
    }

    const schema = await kgSchemaSummary();
    const labels =
      schema.ok && Array.isArray((schema.records?.[0] as any)?.labels)
        ? ((schema.records?.[0] as any).labels as { label: string; count: number }[])
        : [];
    const relationshipTypes =
      schema.ok && Array.isArray((schema.records?.[0] as any)?.relationshipTypes)
        ? ((schema.records?.[0] as any).relationshipTypes as { type: string; count: number }[])
        : [];

    const totalNodes = labels.reduce((sum, l) => sum + (Number(l.count) || 0), 0);
    const totalRelationships = relationshipTypes.reduce(
      (sum, r) => sum + (Number(r.count) || 0),
      0
    );

    return widget({
      props: {
        breadcrumb: ["Knowledge Graph", "Health"],
        connected: true,
        database,
        instanceName,
        uri,
        pingMs: ping.meta?.tookMs,
        totalNodes,
        totalRelationships,
        labels: labels.sort((a, b) => b.count - a.count),
        relationshipTypes: relationshipTypes.sort((a, b) => b.count - a.count),
        generatedAt,
      },
      output: object({
        connected: true,
        database,
        instanceName,
        totalNodes,
        totalRelationships,
        labelCount: labels.length,
        relationshipTypeCount: relationshipTypes.length,
        pingMs: ping.meta?.tookMs,
        labels,
        relationshipTypes,
      }),
    });
  }
);

/* Tool S2: sandbox_create */
server.tool(
  {
    name: "sandbox_create",
    description:
      "Spawn a new Vercel Sandbox. Optionally clone a git repo or download a tarball, expose ports, and choose a runtime. Returns the sandbox detail widget. Requires VERCEL_TOKEN/TEAM_ID/PROJECT_ID.",
    schema: z.object({
      name: z.string().optional().describe("Human-readable name for the sandbox"),
      runtime: z
        .string()
        .optional()
        .describe(
          "Runtime image (e.g. 'node22', 'python3.13'). Defaults to Vercel's standard base image."
        ),
      gitUrl: z
        .string()
        .optional()
        .describe("Optional git clone URL — checked out at sandbox start"),
      gitRevision: z
        .string()
        .optional()
        .describe("Git ref/SHA (used only when gitUrl is provided)"),
      tarballUrl: z
        .string()
        .optional()
        .describe("Tarball URL — extracted into the sandbox root (alternative to gitUrl)"),
      ports: z
        .array(z.number().int().min(1).max(65535))
        .optional()
        .describe("Ports to expose with public URLs (e.g. [3000])"),
      timeoutMs: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Auto-stop after this many milliseconds (Vercel max: ~45 min)"),
      vcpus: z
        .number()
        .int()
        .min(1)
        .max(8)
        .optional()
        .describe("Allocated vCPUs (1–8)"),
    }),
    widget: { name: "sandbox-detail", invoking: "Creating sandbox..." },
  },
  async (input) => {
    if (!sandboxConfigured()) {
      return error(NOT_CONFIGURED_REASON);
    }
    const source = input.gitUrl
      ? { type: "git" as const, url: input.gitUrl, revision: input.gitRevision }
      : input.tarballUrl
        ? { type: "tarball" as const, url: input.tarballUrl }
        : undefined;
    const result = await createSandbox({
      name: input.name,
      runtime: input.runtime,
      source,
      ports: input.ports,
      timeoutMs: input.timeoutMs,
      vcpus: input.vcpus,
    });
    if (!result.ok) {
      return error(`sandbox_create failed: ${result.reason}`);
    }
    const rec = result.data;
    const domains = (rec.ports ?? []).flatMap((p) => {
      const url = getSandboxDomain(rec.id, p);
      return url ? [{ port: p, url }] : [];
    });
    return widget({
      props: {
        breadcrumb: ["Tools", "Sandbox", rec.id],
        id: rec.id,
        createdAt: rec.createdAt,
        runtime: rec.runtime,
        source: rec.source,
        status: rec.status,
        ports: rec.ports,
        domains,
        lastError: rec.lastError,
        history: [],
      },
      output: text(
        `Sandbox ${rec.id} created in ${result.tookMs}ms. Status: ${rec.status}. Ports: ${rec.ports.join(", ") || "none"}.`
      ),
    });
  }
);

/* Tool S3: sandbox_run */
server.tool(
  {
    name: "sandbox_run",
    description:
      "Run a shell command inside a previously created Vercel sandbox. Returns the captured stdout/stderr, exit code and duration as a terminal-style widget. Get the sandbox id from sandbox_create or sandbox_console.",
    schema: z.object({
      sandboxId: z.string().min(1).describe("Sandbox id returned by sandbox_create"),
      command: z.string().min(1).describe("Command to run (e.g. 'ls', 'node', 'npm')"),
      args: z
        .array(z.string())
        .optional()
        .describe("Command arguments (e.g. ['-la', '/tmp'])"),
    }),
    widget: { name: "sandbox-command-result", invoking: "Running command..." },
  },
  async ({ sandboxId, command, args }) => {
    if (!sandboxConfigured()) {
      return error(NOT_CONFIGURED_REASON);
    }
    const result = await runInSandbox(sandboxId, command, args ?? []);
    if (!result.ok) {
      return error(`sandbox_run failed: ${result.reason}`);
    }
    const entry = result.data;
    return widget({
      props: {
        breadcrumb: ["Tools", "Sandbox", sandboxId, "Command"],
        sandboxId,
        command: entry.command,
        args: entry.args,
        exitCode: entry.exitCode,
        durationMs: entry.durationMs,
        stdout: entry.stdout,
        stderr: entry.stderr,
        startedAt: entry.startedAt,
      },
      output: text(
        `Ran '${entry.command} ${entry.args.join(" ")}' in ${entry.durationMs}ms. Exit code ${entry.exitCode ?? "—"}.`
      ),
    });
  }
);

/* Tool S4: sandbox_write_files */
server.tool(
  {
    name: "sandbox_write_files",
    description:
      "Write or replace one or more files inside a Vercel sandbox. File mode defaults to 0o644 if omitted. Returns a confirmation with the list of written paths.",
    schema: z.object({
      sandboxId: z.string().min(1).describe("Sandbox id"),
      files: z
        .array(
          z.object({
            path: z.string().min(1).describe("Absolute path inside the sandbox"),
            content: z.string().describe("File contents (UTF-8)"),
            mode: z
              .number()
              .int()
              .optional()
              .describe("POSIX file mode (e.g. 0o755 for executables)"),
          })
        )
        .min(1)
        .describe("Files to write"),
    }),
  },
  async ({ sandboxId, files }) => {
    if (!sandboxConfigured()) {
      return error(NOT_CONFIGURED_REASON);
    }
    const result = await writeSandboxFiles(sandboxId, files);
    if (!result.ok) {
      return error(`sandbox_write_files failed: ${result.reason}`);
    }
    return object({
      sandboxId,
      written: result.data.written,
      paths: result.data.paths,
      tookMs: result.tookMs,
    });
  }
);

/* Tool S5: sandbox_stop */
server.tool(
  {
    name: "sandbox_stop",
    description:
      "Stop a running Vercel sandbox and release its resources. Idempotent — calling on an already-stopped sandbox returns success.",
    schema: z.object({
      sandboxId: z.string().min(1).describe("Sandbox id"),
    }),
  },
  async ({ sandboxId }) => {
    if (!sandboxConfigured()) {
      return error(NOT_CONFIGURED_REASON);
    }
    const result = await stopSandbox(sandboxId);
    if (!result.ok) {
      return error(`sandbox_stop failed: ${result.reason}`);
    }
    return text(`Sandbox ${sandboxId} stopped in ${result.tookMs}ms.`);
  }
);

/* Tool S6: sandbox_status (deep drill into one sandbox) */
server.tool(
  {
    name: "sandbox_status",
    description:
      "Get the full status of a single Vercel sandbox: runtime, public URLs, every command in history with stdout/stderr, and any error state. Renders the sandbox detail widget.",
    schema: z.object({
      sandboxId: z.string().min(1).describe("Sandbox id"),
    }),
    widget: { name: "sandbox-detail", invoking: "Loading sandbox..." },
  },
  async ({ sandboxId }) => {
    if (!sandboxConfigured()) {
      return error(NOT_CONFIGURED_REASON);
    }
    const rec = registryGet(sandboxId);
    if (!rec) {
      return error(
        `Unknown sandbox ${sandboxId}. Sandboxes are tracked per-process — list them with sandbox_console.`
      );
    }
    const domains = (rec.ports ?? []).flatMap((p) => {
      const url = getSandboxDomain(sandboxId, p);
      return url ? [{ port: p, url }] : [];
    });
    return widget({
      props: {
        breadcrumb: ["Tools", "Sandbox", sandboxId],
        id: rec.id,
        createdAt: rec.createdAt,
        runtime: rec.runtime,
        source: rec.source,
        status: rec.status,
        ports: rec.ports,
        domains,
        lastError: rec.lastError,
        history: rec.history.map((h) => ({
          id: h.id,
          command: h.command,
          args: h.args,
          stdout: h.stdout,
          stderr: h.stderr,
          exitCode: h.exitCode,
          durationMs: h.durationMs,
          startedAt: h.startedAt,
        })),
      },
      output: text(
        `Sandbox ${sandboxId} — ${rec.status}, ${rec.history.length} command${rec.history.length === 1 ? "" : "s"} run.`
      ),
    });
  }
);

/* Tool 2: kg_schema — labels, relationship types, property keys */
server.tool(
  {
    name: "kg_schema",
    description:
      "Returns the knowledge graph schema as structured data: node labels, relationship types, and property keys. Useful for understanding what queries are possible against the graph.",
    schema: z.object({}),
  },
  async () => {
    const [schema, propKeys] = await Promise.all([
      kgSchemaSummary(),
      runReadCypher<{ key: string }>("CALL db.propertyKeys() YIELD propertyKey AS key RETURN key"),
    ]);

    if (!schema.ok) return error(`Schema query failed: ${schema.reason}`);

    const row = (schema.records?.[0] ?? {}) as {
      labels?: { label: string; count: number }[];
      relationshipTypes?: { type: string; count: number }[];
    };

    return object({
      database: kgDatabase(),
      instanceName: kgInstanceName(),
      labels: row.labels ?? [],
      relationshipTypes: row.relationshipTypes ?? [],
      propertyKeys: propKeys.ok
        ? (propKeys.records ?? []).map((r) => r.key).sort()
        : [],
      tookMs: schema.meta?.tookMs ?? 0,
    });
  }
);

/* Tool 3: kg_query — execute read-only Cypher */
server.tool(
  {
    name: "kg_query",
    description:
      "Execute a read-only Cypher query against the knowledge graph. Write keywords (CREATE, DELETE, MERGE, SET, REMOVE, DROP, LOAD CSV) are rejected. Use this for ad-hoc exploration — for common queries prefer the higher-level kg_* tools.",
    schema: z.object({
      cypher: z.string().min(1).describe("Cypher query (read-only, non-empty). Example: MATCH (n) RETURN labels(n) AS labels, count(*) AS count ORDER BY count DESC LIMIT 10"),
      params: z
        .record(z.string(), z.any())
        .optional()
        .describe("Optional query parameters bound as $name in the Cypher string."),
      limit: z
        .number()
        .int()
        .positive()
        .max(500)
        .optional()
        .describe("Hard cap on returned rows (defaults to 100). Max 500."),
    }),
    annotations: {
      readOnlyHint: true,
      openWorldHint: true,
    },
  },
  async ({ cypher, params, limit }) => {
    const max = limit ?? 100;
    const result = await runReadCypher(cypher, params ?? {});
    if (!result.ok) return error(`Cypher error: ${result.reason}`);

    const rows = (result.records ?? []).slice(0, max);
    const truncated = (result.records?.length ?? 0) > max;

    return object({
      cypher,
      params: params ?? {},
      rows,
      rowCount: rows.length,
      truncated,
      tookMs: result.meta?.tookMs ?? 0,
      database: result.meta?.database,
    });
  }
);

/* Tool 4: kg_person_overview — Person node + relationships summary */
server.tool(
  {
    name: "kg_person_overview",
    description:
      "Returns the central Person node (the portfolio owner) from the knowledge graph along with an aggregated summary of their relationships — skills they have, repositories they own, projects they worked on, etc. Pair with the fixture-backed get_hero / get_about tools to compare the live graph against the curated story.",
    schema: z.object({}),
  },
  async () => {
    const personResult = await runReadCypher<{ person: any }>(
      `
      MATCH (p:Person)
      RETURN p { .*, _elementId: elementId(p) } AS person
      ORDER BY coalesce(p.primary, false) DESC, coalesce(p.name, "") ASC
      LIMIT 1
      `
    );
    if (!personResult.ok) {
      return error(`Person query failed: ${personResult.reason}`);
    }
    if (!personResult.records?.length) {
      return object({
        configured: true,
        connected: true,
        person: null,
        reason:
          "Graph is reachable but contains no Person node yet. Run the Python ingestion pipeline to populate it.",
      });
    }

    const person = personResult.records[0].person as Record<string, unknown>;
    const elementId = person._elementId;

    const relSummary = await runReadCypher<{ type: string; direction: string; count: number }>(
      `
      MATCH (p:Person) WHERE elementId(p) = $eid
      OPTIONAL MATCH (p)-[r]->()
      WITH p, type(r) AS type, count(r) AS count
      WHERE type IS NOT NULL
      RETURN type, "OUT" AS direction, count
      UNION
      MATCH (p:Person) WHERE elementId(p) = $eid
      OPTIONAL MATCH (p)<-[r]-()
      WITH p, type(r) AS type, count(r) AS count
      WHERE type IS NOT NULL
      RETURN type, "IN" AS direction, count
      `,
      { eid: elementId }
    );

    const skills = await runReadCypher<{ name: string; level?: string; years?: number }>(
      `
      MATCH (p:Person)-[r:HAS_SKILL|USES]-(s:Skill) WHERE elementId(p) = $eid
      RETURN s.name AS name, s.level AS level, s.years AS years
      ORDER BY coalesce(s.years, 0) DESC, name ASC
      LIMIT 50
      `,
      { eid: elementId }
    );

    const projects = await runReadCypher<{ name: string; description?: string }>(
      `
      MATCH (p:Person)--(proj)
      WHERE elementId(p) = $eid AND any(l IN labels(proj) WHERE l IN ['Project','Repository'])
      RETURN coalesce(proj.name, proj.title, proj.id) AS name, proj.description AS description
      ORDER BY name
      LIMIT 50
      `,
      { eid: elementId }
    );

    return object({
      configured: true,
      connected: true,
      person,
      relationshipSummary: relSummary.ok ? relSummary.records ?? [] : [],
      skills: skills.ok ? skills.records ?? [] : [],
      projects: projects.ok ? projects.records ?? [] : [],
    });
  }
);

/* Tool 5: kg_skill_evidence — find corroborating evidence for a skill */
server.tool(
  {
    name: "kg_skill_evidence",
    description:
      "Given a skill name (case-insensitive), return all corroborating evidence from the knowledge graph: which repositories, files, functions, projects, and deployments use that skill. This is the live counterpart to the fixture-backed get_skill_detail tool.",
    schema: z.object({
      skill: z
        .string()
        .min(1)
        .describe("Skill name to look up (e.g. 'TypeScript', 'Kubernetes', 'Postgres'). Case-insensitive."),
      limit: z
        .number()
        .int()
        .positive()
        .max(200)
        .optional()
        .describe("Max evidence rows per category (default 50, max 200)."),
    }),
  },
  async ({ skill, limit }) => {
    const cap = limit ?? 50;

    const skillNode = await runReadCypher<{ skill: any }>(
      `
      MATCH (s:Skill)
      WHERE toLower(s.name) = toLower($name)
      RETURN s { .*, _elementId: elementId(s) } AS skill
      LIMIT 1
      `,
      { name: skill }
    );

    if (!skillNode.ok) return error(`Skill lookup failed: ${skillNode.reason}`);
    if (!skillNode.records?.length) {
      return object({
        skill,
        found: false,
        reason: "No Skill node with that name. Try kg_search for fuzzy matching.",
        evidence: { repositories: [], projects: [], files: [], deployments: [] },
      });
    }

    const eid = (skillNode.records[0].skill as Record<string, unknown>)._elementId;

    const [repos, projects, files, deployments] = await Promise.all([
      runReadCypher(
        `
        MATCH (s:Skill)<-[r]-(repo:Repository) WHERE elementId(s) = $eid
        RETURN coalesce(repo.name, repo.id) AS name, repo.url AS url, type(r) AS via
        LIMIT $cap
        `,
        { eid, cap }
      ),
      runReadCypher(
        `
        MATCH (s:Skill)<-[r]-(proj:Project) WHERE elementId(s) = $eid
        RETURN coalesce(proj.name, proj.title, proj.id) AS name, proj.description AS description, type(r) AS via
        LIMIT $cap
        `,
        { eid, cap }
      ),
      runReadCypher(
        `
        MATCH (s:Skill)<-[r]-(f:File) WHERE elementId(s) = $eid
        RETURN coalesce(f.path, f.name) AS path, f.language AS language, type(r) AS via
        LIMIT $cap
        `,
        { eid, cap }
      ),
      runReadCypher(
        `
        MATCH (s:Skill)<-[r]-(d:Deployment) WHERE elementId(s) = $eid
        RETURN coalesce(d.name, d.id) AS name, d.url AS url, d.provider AS provider, type(r) AS via
        LIMIT $cap
        `,
        { eid, cap }
      ),
    ]);

    return object({
      skill,
      found: true,
      node: skillNode.records[0].skill,
      evidence: {
        repositories: repos.ok ? repos.records ?? [] : [],
        projects: projects.ok ? projects.records ?? [] : [],
        files: files.ok ? files.records ?? [] : [],
        deployments: deployments.ok ? deployments.records ?? [] : [],
      },
      totals: {
        repositories: repos.ok ? (repos.records?.length ?? 0) : 0,
        projects: projects.ok ? (projects.records?.length ?? 0) : 0,
        files: files.ok ? (files.records?.length ?? 0) : 0,
        deployments: deployments.ok ? (deployments.records?.length ?? 0) : 0,
      },
    });
  }
);

/* Tool 6: kg_search — free-text search across nodes */
server.tool(
  {
    name: "kg_search",
    description:
      "Free-text search across the knowledge graph. Matches the query string (case-insensitive substring) against the most common text properties (name, title, description, summary, content, path) on any node. Returns up to `limit` matches with their labels and key properties.",
    schema: z.object({
      query: z.string().min(1).describe("Search query (case-insensitive substring match)."),
      labels: z
        .array(z.string())
        .optional()
        .describe("Optional list of node labels to restrict the search (e.g. ['Skill','Project'])."),
      limit: z
        .number()
        .int()
        .positive()
        .max(200)
        .optional()
        .describe("Max results (default 25, max 200)."),
    }),
  },
  async ({ query, labels, limit }) => {
    const cap = limit ?? 25;
    const safeLabels =
      labels?.filter((l) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(l)) ?? [];

    const labelClause = safeLabels.length
      ? `AND any(l IN labels(n) WHERE l IN $labels)`
      : "";

    const cypher = `
      MATCH (n)
      WHERE (
        toLower(coalesce(n.name, '')) CONTAINS toLower($q)
        OR toLower(coalesce(n.title, '')) CONTAINS toLower($q)
        OR toLower(coalesce(n.description, '')) CONTAINS toLower($q)
        OR toLower(coalesce(n.summary, '')) CONTAINS toLower($q)
        OR toLower(coalesce(n.content, '')) CONTAINS toLower($q)
        OR toLower(coalesce(n.path, '')) CONTAINS toLower($q)
      )
      ${labelClause}
      RETURN labels(n) AS labels,
             elementId(n) AS elementId,
             coalesce(n.name, n.title, n.id, n.path) AS title,
             coalesce(n.description, n.summary, '') AS snippet
      LIMIT $cap
    `;

    const result = await runReadCypher(cypher, {
      q: query,
      labels: safeLabels,
      cap,
    });

    if (!result.ok) return error(`Search failed: ${result.reason}`);

    return object({
      query,
      labels: safeLabels,
      resultCount: result.records?.length ?? 0,
      results: result.records ?? [],
      tookMs: result.meta?.tookMs ?? 0,
    });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// SPRINT 4: JD Resume Export · GitHub Stats · Drafts Surface · KG Semantic Search
// ─────────────────────────────────────────────────────────────────────────────

// ── In-memory drafts store ────────────────────────────────────────────────────
interface DraftDoc {
  id: string;
  title: string;
  body: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  status: "draft" | "review" | "published";
}

const draftsStore = new Map<string, DraftDoc>([
  [
    "draft-001",
    {
      id: "draft-001",
      title: "Building a Portfolio MCP Server",
      body: `In this post I explore how to build a fully interactive portfolio server using the Model Context Protocol (MCP) and the mcp-use SDK.

MCP lets any AI assistant call structured "tools" that return rich data or interactive widgets. By building your portfolio as an MCP server, any Claude, ChatGPT, or custom LLM integration can browse your work, drill into projects, check availability, and even spin up a tailored PDF resume — all through a single protocol endpoint.

Key takeaways:
• Define tools with Zod schemas for type-safe inputs
• Return widget() responses to render React UI in any MCP host
• Deploy to Vercel with a single vercel.json and hono/vercel adapter`,
      tags: ["mcp", "portfolio", "typescript", "open-source"],
      createdAt: new Date("2025-01-10T09:00:00Z").toISOString(),
      updatedAt: new Date("2025-01-18T14:22:00Z").toISOString(),
      status: "review",
    },
  ],
  [
    "draft-002",
    {
      id: "draft-002",
      title: "Neo4j Knowledge Graph for Developer Portfolios",
      body: `A knowledge graph brings relational structure to what is usually unstructured portfolio data. Here is how I integrated Neo4j Aura into my MCP server.

The graph schema is straightforward:
  (Person)-[:AUTHORED]->(Repo)
  (Repo)-[:USES]->(Technology)
  (Person)-[:IMPLEMENTS]->(Technology)

With 222k+ nodes and 241k+ relationships already loaded, every tool can now answer questions like "which repos use TypeScript and Redis together?" or "what is my depth with React vs Vue?" — all from live Cypher queries.`,
      tags: ["neo4j", "knowledge-graph", "cypher", "mcp"],
      createdAt: new Date("2025-02-01T11:00:00Z").toISOString(),
      updatedAt: new Date("2025-02-05T09:45:00Z").toISOString(),
      status: "draft",
    },
  ],
]);

let _draftCounter = draftsStore.size;

// ── JD keyword extraction helpers ────────────────────────────────────────────
const TECH_KWDS = new Set([
  "typescript","javascript","python","rust","go","java","kotlin","swift","c#","c++",
  "react","vue","angular","svelte","next.js","nextjs","nuxt","remix","solid",
  "node","node.js","express","fastify","hono","nestjs","django","flask","fastapi","spring",
  "postgresql","postgres","mysql","mongodb","redis","neo4j","elasticsearch","sqlite","dynamodb",
  "docker","kubernetes","k8s","terraform","ansible","helm","github actions","circleci",
  "aws","gcp","azure","vercel","cloudflare","lambda","s3","ec2","ecs",
  "rest","graphql","grpc","websocket","mcp","openapi","swagger",
  "microservices","serverless","edge","distributed","monorepo","nx","turborepo",
  "machine learning","ml","ai","llm","openai","langchain","rag","embeddings","vector",
  "agile","scrum","kanban","tdd","bdd","devops","sre","platform engineering",
  "leadership","mentoring","coaching","architecture","design patterns",
  "performance","scalability","security","accessibility","a11y","wcag",
  "testing","jest","vitest","cypress","playwright","mocha","chai",
  "git","github","gitlab","jira","confluence","figma",
  "api","sdk","cli","oauth","jwt","saml","sso",
]);

function _extractJDKeywords(jd: string): string[] {
  const lower = jd.toLowerCase();
  const found: string[] = [];
  for (const kw of TECH_KWDS) {
    if (lower.includes(kw)) found.push(kw);
  }
  const capWords = jd.match(/\b[A-Z][a-zA-Z0-9+#.]{2,}\b/g) ?? [];
  for (const w of capWords) {
    const wl = w.toLowerCase();
    if (!TECH_KWDS.has(wl) && !found.includes(wl)) found.push(wl);
  }
  return [...new Set(found)].slice(0, 40);
}

function _scoreSection(
  content: string,
  keywords: string[]
): { score: number; matched: string[] } {
  const lower = content.toLowerCase();
  const matched = keywords.filter((k) => lower.includes(k));
  const score =
    keywords.length > 0
      ? Math.round((matched.length / Math.min(keywords.length, 20)) * 100)
      : 0;
  return { score: Math.min(score, 100), matched };
}

// ── Resume fixture sections ───────────────────────────────────────────────────
const _RESUME_SECTIONS = [
  {
    id: "summary",
    title: "Professional Summary",
    content:
      "Full-stack software engineer with 8+ years building production systems across TypeScript, Python, and Go. Deep experience in distributed microservices, real-time APIs (REST/GraphQL/WebSocket), and cloud-native infrastructure (AWS, GCP, Vercel, Cloudflare). Proven track record leading teams of 4–12 engineers, driving agile delivery cadences, and mentoring mid-level developers into senior roles. Passionate about developer experience, knowledge graphs, and AI-augmented engineering workflows.",
  },
  {
    id: "experience",
    title: "Work Experience",
    content: `Senior Software Engineer · Acme Corp (2021–present)
• Architected and launched a real-time analytics platform serving 2M+ daily active users using TypeScript, Node.js, PostgreSQL, Redis, and Kubernetes on AWS EKS.
• Led migration from monolith to domain-driven microservices; cut p99 API latency from 2.1 s to 180 ms.
• Introduced CI/CD pipelines (GitHub Actions, ArgoCD) reducing deploy cycle from 2 weeks to same-day.
• Mentored 5 engineers through senior promotion; ran weekly architecture reviews and TDD workshops.

Software Engineer · Startup Studio (2018–2021)
• Built multi-tenant SaaS platform in React/Next.js + FastAPI with JWT/OAuth2 authentication.
• Designed Neo4j knowledge graph replacing brittle relational joins; query time dropped 70%.
• Shipped mobile-first PWA (Lighthouse 98+) handling 500k monthly users.

Junior Developer · Agency XYZ (2016–2018)
• Developed React SPAs and Node.js REST APIs for 12 client projects.
• Integrated Stripe, Twilio, and Sendgrid; delivered on-time for 100% of engagements.`,
  },
  {
    id: "skills",
    title: "Technical Skills",
    content: `Languages: TypeScript, JavaScript (ES2024), Python, Go, Rust, SQL
Frontend: React, Next.js, Vue 3, Svelte, React Native, Tailwind CSS
Backend: Node.js, Express, Fastify, Hono, NestJS, FastAPI, Django
Databases: PostgreSQL, MySQL, MongoDB, Redis, Neo4j, Elasticsearch, SQLite
Cloud & DevOps: AWS (Lambda, EC2, ECS, S3, RDS), GCP, Vercel, Cloudflare Workers, Docker, Kubernetes, Terraform
Testing: Jest, Vitest, Playwright, Cypress, Testing Library
Architecture: Microservices, Serverless, Event-driven, CQRS, DDD, REST, GraphQL, gRPC, MCP
AI/ML: OpenAI API, LangChain, RAG pipelines, vector embeddings, Neo4j GDS`,
  },
  {
    id: "projects",
    title: "Selected Projects",
    content: `Portfolio MCP UI (Open Source)
Interactive portfolio served as an MCP server — any AI assistant can browse sections, search skills, and export tailored resumes via tool calls. Built with mcp-use SDK, React widgets, Neo4j knowledge graph, and Vercel edge deployment.
Tech: TypeScript, Hono, React, Neo4j, Zod, GitHub Actions

Real-Time Collaboration Platform
WebSocket-based collaborative editor with CRDT conflict resolution, supporting 10k concurrent users. Deployed on AWS ECS Fargate with auto-scaling Redis clusters.
Tech: TypeScript, Node.js, Redis Streams, PostgreSQL, React, Docker, Kubernetes

AI-Powered Code Review Bot
GitHub App that analyzes PRs using LLM embeddings + Neo4j graph traversal to flag architectural drift and suggest refactors. Processes 500+ PRs/day.
Tech: Python, FastAPI, OpenAI API, Neo4j, GitHub Actions, Vercel`,
  },
  {
    id: "oss",
    title: "Open Source & Community",
    content: `• Portfolio MCP UI — 800+ GitHub stars; featured on Hacker News front page (2025)
• Contributor to mcp-use SDK — added TypeScript strict mode and widget autoSize docs
• Technical blog: 12 posts on Neo4j, TypeScript, and distributed systems (avg 8k reads)
• Conference talks: NodeConf EU 2024 "Knowledge Graphs for Developer Portfolios"; MCP Summit 2025
• Mentor at local bootcamp; 18 mentees placed in engineering roles`,
  },
  {
    id: "education",
    title: "Education",
    content: `B.Sc. Computer Science · Chulalongkorn University (2012–2016)
Graduated with First Class Honours. Thesis: "Graph-based Similarity Search in Large-Scale Code Repositories."

Certifications:
• AWS Certified Solutions Architect – Professional
• Google Cloud Professional Data Engineer
• Neo4j Certified Professional`,
  },
];

// ── get_resume_pdf ────────────────────────────────────────────────────────────
server.tool(
  {
    name: "get_resume_pdf",
    description:
      "Generate a print-ready, JD-tailored resume with keyword match scoring. Each section is scored against the job description and matched keywords are highlighted. Use the Print / Save PDF button in the widget to export.",
    schema: z.object({
      jobDescription: z
        .string()
        .min(10)
        .describe("Full job description text to score the resume against"),
      candidateName: z
        .string()
        .optional()
        .describe("Candidate full name override (defaults to portfolio owner)"),
      email: z.string().optional().describe("Contact email override"),
      phone: z.string().optional().describe("Phone number override"),
      location: z.string().optional().describe("Location override"),
      website: z.string().optional().describe("Personal website or portfolio URL override"),
      linkedIn: z.string().optional().describe("LinkedIn profile URL override"),
      github: z.string().optional().describe("GitHub profile URL override"),
    }),
    widget: {
      name: "resume-export",
      invoking: "Scoring resume against job description...",
      invoked: "Tailored resume ready — click Print / Save PDF",
    },
  },
  async ({ jobDescription, candidateName, email, phone, location, website, linkedIn, github }) => {
    const keywords = _extractJDKeywords(jobDescription);
    const scoredSections = _RESUME_SECTIONS.map((sec) => {
      const { score, matched } = _scoreSection(sec.content, keywords);
      return { id: sec.id, title: sec.title, score, matched, content: sec.content };
    });

    const allMatched = [...new Set(scoredSections.flatMap((s) => s.matched))];
    const allMissed = keywords.filter((k) => !allMatched.includes(k)).slice(0, 20);
    const overallScore = Math.round(
      scoredSections.reduce((sum, s) => sum + s.score, 0) / scoredSections.length
    );

    return widget({
      props: {
        candidateName: candidateName ?? "Khiwniti Boonprakong",
        email: email ?? "hello@portfolio.dev",
        phone: phone ?? "+66 81 234 5678",
        location: location ?? "Bangkok, Thailand (Remote-ready)",
        website: website ?? "https://portfolio.mcp-use.com",
        linkedIn: linkedIn,
        github: github ?? "github.com/khiwniti",
        jdSnippet: jobDescription.slice(0, 600),
        matchScore: overallScore,
        matchedKeywords: allMatched,
        missedKeywords: allMissed,
        sections: scoredSections,
        generatedAt: new Date().toISOString(),
      },
      output: text(
        `Resume tailored for job posting.\n` +
          `Overall match score: ${overallScore}%\n` +
          `Matched keywords (${allMatched.length}): ${allMatched.slice(0, 10).join(", ")}${allMatched.length > 10 ? "..." : ""}\n` +
          `Gap keywords (${allMissed.length}): ${allMissed.slice(0, 6).join(", ")}${allMissed.length > 6 ? "..." : ""}`
      ),
    });
  }
);

// ── get_github_stats ──────────────────────────────────────────────────────────
server.tool(
  {
    name: "get_github_stats",
    description:
      "Fetch live GitHub profile statistics — repo count, language breakdown, top starred projects, follower counts, and recent activity. Results are cached for 15 minutes. Defaults to the portfolio owner's GitHub handle.",
    schema: z.object({
      username: z
        .string()
        .optional()
        .describe(
          "GitHub username to look up (defaults to GITHUB_USERNAME env var or portfolio owner)"
        ),
    }),
    widget: {
      name: "github-stats",
      invoking: "Fetching GitHub statistics...",
      invoked: "GitHub profile loaded",
    },
  },
  async ({ username }) => {
    const handle = username ?? process.env.GITHUB_USERNAME ?? "khiwniti";
    const result = await getGitHubStatsCached(handle);

    if (!result.ok) {
      return error(`GitHub fetch failed for "@${handle}": ${result.reason}`);
    }

    const { data } = result;
    return widget({
      props: {
        username: handle,
        user: data.user,
        aggregate: data.aggregate,
        languages: data.languages,
        topRepos: data.topRepos,
        fetchedAt: data.fetchedAt,
      },
      output: text(
        `GitHub stats for @${handle}:\n` +
          `${data.aggregate.originalRepos} original repos · ${data.aggregate.totalStars} total stars · ` +
          `${data.user.followers} followers\n` +
          `Top languages: ${data.languages
            .slice(0, 5)
            .map((l) => l.language)
            .join(", ")}`
      ),
    });
  }
);

// ── get_drafts ────────────────────────────────────────────────────────────────
server.tool(
  {
    name: "get_drafts",
    description:
      "Display the private content drafts surface. Lists all drafts with status, tags, and a side-by-side preview. New drafts can be created directly from the widget. Protected by DRAFTS_API_KEY env var — omit the key in development to bypass.",
    schema: z.object({
      apiKey: z
        .string()
        .optional()
        .describe("API key matching the DRAFTS_API_KEY environment variable"),
    }),
    widget: {
      name: "drafts-surface",
      invoking: "Loading drafts...",
      invoked: "Drafts surface ready",
    },
  },
  async ({ apiKey }) => {
    const requiredKey = process.env.DRAFTS_API_KEY;
    const authenticated = !requiredKey || apiKey === requiredKey;

    if (!authenticated) {
      return widget({
        props: {
          authenticated: false,
          authMessage:
            "A valid DRAFTS_API_KEY is required to access drafts. Pass it as the apiKey parameter.",
          drafts: [],
          totalCount: 0,
          authProvider: "API Key",
        },
        output: text("Access denied: authentication required to view drafts."),
      });
    }

    const drafts = Array.from(draftsStore.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    return widget({
      props: {
        authenticated: true,
        drafts,
        totalCount: drafts.length,
      },
      output: text(`Showing ${drafts.length} draft${drafts.length !== 1 ? "s" : ""}.`),
    });
  }
);

// ── save_draft ────────────────────────────────────────────────────────────────
server.tool(
  {
    name: "save_draft",
    description:
      "Create or update a content draft in the in-memory store. Called programmatically from the drafts widget when the user submits the new-draft form.",
    schema: z.object({
      id: z.string().optional().describe("Draft ID to update; omit to create a new draft"),
      title: z.string().min(1).describe("Draft title"),
      body: z.string().describe("Draft body / content"),
      tags: z.array(z.string()).optional().describe("Comma-split tags for the draft"),
      status: z
        .enum(["draft", "review", "published"])
        .optional()
        .describe("Publication status of the draft"),
    }),
  },
  async ({ id, title, body, tags, status }) => {
    const now = new Date().toISOString();

    if (id && draftsStore.has(id)) {
      const existing = draftsStore.get(id)!;
      draftsStore.set(id, {
        ...existing,
        title,
        body,
        tags: tags ?? existing.tags,
        status: status ?? existing.status,
        updatedAt: now,
      });
      return text(`Draft "${title}" updated (id: ${id}).`);
    }

    _draftCounter += 1;
    const newId = id ?? `draft-${String(_draftCounter).padStart(3, "0")}`;
    draftsStore.set(newId, {
      id: newId,
      title,
      body,
      tags: tags ?? [],
      status: status ?? "draft",
      createdAt: now,
      updatedAt: now,
    });
    return text(`Draft "${title}" created (id: ${newId}).`);
  }
);

// ── get_oss_feed ─────────────────────────────────────────────────────────── v2
server.tool(
  {
    name: "get_oss_feed",
    description:
      "Fetch the live GitHub public activity feed for the configured username — pushes, pull requests, issues, releases, forks and more. Refreshes every 10 minutes.",
    schema: z.object({
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe("Number of recent events to return (default 30, max 100)"),
    }),
    widget: {
      name: "oss-feed",
      invoking: "Fetching OSS activity...",
      invoked: "Activity feed ready",
    },
  },
  async ({ limit }) => {
    const cap = limit ?? 30;
    const username = process.env.GITHUB_USERNAME || "";
    if (!username) {
      return error(
        "GITHUB_USERNAME is not configured. Set it in the server environment to enable the live OSS feed."
      );
    }

    const result = await getGitHubEventsCached(username, cap);
    if (!result.ok) {
      return error(`GitHub events fetch failed: ${result.reason}`);
    }

    const { data: activities } = result;
    const hasGithubToken = Boolean(process.env.GITHUB_TOKEN);

    return widget({
      props: {
        username,
        activities,
        totalCount: activities.length,
        hasGithubToken,
        fetchedAt: new Date().toISOString(),
      },
      output: text(
        `@${username} OSS activity — ${activities.length} recent public event${activities.length !== 1 ? "s" : ""}.\n` +
          activities
            .slice(0, 5)
            .map((a) => `• ${a.eventLabel} in ${a.repoName}${a.detail ? `: ${a.detail.slice(0, 60)}` : ""}`)
            .join("\n")
      ),
    });
  }
);

// ── kg_semantic_search ────────────────────────────────────────────────────────
server.tool(
  {
    name: "kg_semantic_search",
    description:
      "Search the portfolio knowledge graph semantically. Finds Technology, Repo, and Person nodes matching the query. Uses vector embedding search (OpenAI) when available, falls back to full-text index, then CONTAINS substring search automatically.",
    schema: z.object({
      query: z.string().min(1).describe("Search query — natural language keywords or a tech name"),
      labels: z
        .array(z.string())
        .optional()
        .describe("Filter to specific node labels: Technology, Repo, Person (defaults to all)"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .describe("Maximum number of results to return (default 20)"),
    }),
    widget: {
      name: "kg-search-results",
      invoking: "Searching knowledge graph...",
      invoked: "Search complete",
    },
  },
  async ({ query, labels, limit }) => {
    const cap = Math.floor(limit ?? 20);
    const safeLabels = (labels ?? []).filter((l) => /^[A-Za-z0-9_]+$/.test(l));

    // Delegate to kgFullTextSearch which auto-discovers fulltext indexes and
    // falls back to CONTAINS — no hardcoded index names here.
    const searchResult = await kgFullTextSearch(query, safeLabels, cap);

    if (!searchResult.ok) return error(`KG search failed: ${searchResult.reason}`);

    const results = (searchResult.records ?? []).map((r) => ({
      labels: r.labels,
      title: r.title,
      snippet: r.snippet ? r.snippet.slice(0, 200) : undefined,
      score: r.score,
      elementId: r.elementId,
      url: r.url,
    }));

    return widget({
      props: {
        query,
        results,
        resultCount: results.length,
        searchMode: searchResult.searchMode,
        tookMs: searchResult.tookMs,
        searchLabels: safeLabels,
        vectorEnabled: searchResult.searchMode === "vector",
        fulltextIndexUsed: searchResult.fulltextIndexName,
      },
      output: text(
        `KG search "${query}" (${searchResult.searchMode}): ${results.length} result${results.length !== 1 ? "s" : ""} in ${searchResult.tookMs} ms.\n` +
          results
            .slice(0, 5)
            .map((r) => `• [${r.labels.join("/")}] ${r.title}`)
            .join("\n")
      ),
    });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// SERVER LIFECYCLE
// ─────────────────────────────────────────────────────────────────────────────

// On a long-running host (local dev, mcp-use start, Manufact Cloud, Docker, etc.)
// we bind to a port. On Vercel — where api/index.ts wraps `server.app` with
// `hono/vercel`'s `handle()` — the runtime invokes the handler per request and
// we must NOT call `listen()`. The `VERCEL` env var is set automatically in
// both build and runtime environments on Vercel.
if (!process.env.VERCEL) {
 const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
 console.log(`Portfolio MCP server running on port ${PORT}`);
 server.listen(PORT);
}

// Serve frontend HTML at root
server.app.get("/", async (c: any) => {
 const html = await getLandingHtml();
 return c.html(html);
});

// Mount MCP Apps endpoint (/mcp-apps) onto the existing Hono app.
// Note: vercel.json rewrites all paths to /api/index, so this must be served by Hono.
// We read the built public/index.html from dist/public at runtime.
let _landingHtmlCache: string | null = null;
async function getLandingHtml() {
  if (_landingHtmlCache) return _landingHtmlCache;
  const here = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = path.resolve(here, "..");
  const htmlPath = path.join(projectRoot, "dist/public/index.html");
  _landingHtmlCache = await readFile(htmlPath, "utf-8");
  return _landingHtmlCache;
}

server.app.get("/", async (c: any) => {
  try {
    const html = await getLandingHtml();
    c.header("content-type", "text/html; charset=utf-8");
    return c.body(html);
  } catch (e: any) {
    // Fallback: keep the MCP server usable even if landing page isn't present.
    return c.text("Portfolio MCP server. Try /mcp or /mcp-apps.", 200);
  }
});

// Mount MCP Apps endpoint (/mcp-apps) onto the existing Hono app.
// This keeps the original mcp-use /mcp endpoint intact.
// Lazy initialization: create transport per-request for Vercel serverless compat.
server.app.all("/mcp-apps", async (c: any) => {
  const appsServerInstance = getAppsServer();
  const appsTransport = new WebStandardStreamableHTTPServerTransport();
  await appsServerInstance.connect(appsTransport);
  return appsTransport.handleRequest(c.req.raw);
});

// Export the Hono app + server instance so adapter entries (api/index.ts on
// Vercel, custom Workers/Bun runtimes, tests) can consume them without
// triggering listen().
export { server };
export const app = server.app;
export default app;
// Mon May 25 2026 — 48-tool build (restart trigger)
