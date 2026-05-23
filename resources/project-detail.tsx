import { useEffect, useState } from "react";
import { z } from "zod";
import {
  McpUseProvider,
  useWidget,
  useWidgetTheme,
  type WidgetMetadata,
} from "mcp-use/react";

function useViewport() {
  const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return { width, isMobile: width < 640, isTablet: width < 1024 };
}

const propsSchema = z.object({
  id: z.string(),
  name: z.string(),
  summary: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  status: z.string(),
  metrics: z.array(z.object({ label: z.string(), value: z.string() })),
  links: z.array(z.object({ label: z.string(), href: z.string() })),
  tech: z.array(z.string()),
  team: z.string(),
  timeline: z.string(),
  changelog: z.array(z.object({ date: z.string(), entry: z.string() })),
  relatedRoles: z.array(
    z.object({ id: z.string(), company: z.string(), title: z.string() })
  ),
  siblingProjects: z.array(
    z.object({ id: z.string(), name: z.string(), summary: z.string() })
  ),
  breadcrumb: z.array(z.string()),
});

type Props = z.infer<typeof propsSchema>;

export const widgetMetadata: WidgetMetadata = {
  description:
    "Deep view of a single project: full description, stack, changelog, related roles, and sibling projects.",
  props: propsSchema,
  exposeAsTool: false,
};

const STATUS_TONE: Record<string, { label: string; light: string; dark: string }> = {
  live: { label: "LIVE", light: "#10b981", dark: "#34d399" },
  beta: { label: "BETA", light: "#d97706", dark: "#fbbf24" },
  archived: { label: "ARCHIVED", light: "#6b7280", dark: "#9ca3af" },
};

export default function ProjectDetail() {
  const { props, isPending, sendFollowUpMessage } = useWidget<Props>();
  const theme = useWidgetTheme();
  const { isMobile } = useViewport();

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div style={{ padding: 24 }}>Loading project...</div>
      </McpUseProvider>
    );
  }

  const dark = theme === "dark";
  const c = {
    bg: dark ? "#0b0d10" : "#ffffff",
    panel: dark ? "#15181d" : "#f8fafc",
    text: dark ? "#e6e8eb" : "#111827",
    sub: dark ? "#9ba3ad" : "#525a66",
    border: dark ? "#262a31" : "#e5e7eb",
    accent: dark ? "#60a5fa" : "#2563eb",
    pill: dark ? "#1f2937" : "#eff6ff",
  };

  const statusTone = STATUS_TONE[props.status] ?? STATUS_TONE.live;
  const statusColor = dark ? statusTone.dark : statusTone.light;

  return (
    <McpUseProvider autoSize>
      <div
        style={{
          padding: "clamp(16px, 4vw, 28px)",
          backgroundColor: c.bg,
          color: c.text,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Inter', system-ui, sans-serif",
          lineHeight: 1.5,
        }}
      >
        <Crumbs crumbs={props.breadcrumb} c={c} />

        <div
          style={{
            marginTop: 12,
            display: "flex",
            alignItems: "baseline",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "clamp(18px, 4vw, 24px)", fontWeight: 700, wordBreak: "break-word", overflowWrap: "anywhere" }}>
            {props.name}
          </h2>
          <span
            style={{
              fontSize: 11,
              padding: "3px 8px",
              borderRadius: 999,
              backgroundColor: statusColor + "22",
              color: statusColor,
              fontWeight: 700,
              letterSpacing: 0.5,
            }}
          >
            {statusTone.label}
          </span>
        </div>

        <p style={{ margin: "6px 0 0 0", color: c.sub, fontSize: 15, wordBreak: "break-word", overflowWrap: "anywhere" }}>
          {props.summary}
        </p>

        <p
          style={{
            margin: "16px 0 20px 0",
            fontSize: 15,
            lineHeight: 1.65,
            wordBreak: "break-word",
            overflowWrap: "anywhere",
          }}
        >
          {props.description}
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 140px), 1fr))",
            gap: 8,
            marginBottom: 22,
          }}
        >
          <Stat c={c} label="Team" value={props.team} />
          <Stat c={c} label="Timeline" value={props.timeline} />
        </div>

        {props.metrics.length > 0 && (
          <Group title="At a glance" c={c}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 140px), 1fr))",
                gap: 8,
              }}
            >
              {props.metrics.map((m) => (
                <div
                  key={m.label}
                  style={{
                    padding: 12,
                    backgroundColor: c.panel,
                    border: `1px solid ${c.border}`,
                    borderRadius: 8,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      letterSpacing: 0.4,
                      textTransform: "uppercase",
                      color: c.sub,
                    }}
                  >
                    {m.label}
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: c.accent,
                      marginTop: 4,
                      wordBreak: "break-word",
                    }}
                  >
                    {m.value}
                  </div>
                </div>
              ))}
            </div>
          </Group>
        )}

        <Group title="Tech" c={c}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {props.tech.map((t) => (
              <button
                key={t}
                onClick={() =>
                  sendFollowUpMessage(`Show me the skill detail for "${t}".`)
                }
                style={pillButton(c)}
              >
                {t} ›
              </button>
            ))}
          </div>
        </Group>

        {props.changelog.length > 0 && (
          <Group title="Recent changelog" c={c}>
            <div style={{ display: "grid", gap: 6 }}>
              {props.changelog.map((entry, i) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "110px 1fr",
                    gap: isMobile ? 4 : 12,
                    padding: "8px 12px",
                    backgroundColor: c.panel,
                    border: `1px solid ${c.border}`,
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                >
                  <span style={{ color: c.accent, fontFamily: "ui-monospace, monospace" }}>
                    {entry.date}
                  </span>
                  <span style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>{entry.entry}</span>
                </div>
              ))}
            </div>
          </Group>
        )}

        {props.relatedRoles.length > 0 && (
          <Group title="Built during" c={c}>
            <div style={{ display: "grid", gap: 8 }}>
              {props.relatedRoles.map((r) => (
                <button
                  key={r.id}
                  onClick={() =>
                    sendFollowUpMessage(
                      `Open the role detail for ${r.company} (id "${r.id}").`
                    )
                  }
                  style={listButton(c)}
                >
                  <span style={{ fontWeight: 600 }}>{r.company}</span>
                  <span style={{ color: c.sub, marginLeft: 8 }}>{r.title}</span>
                  <span style={{ float: "right", color: c.accent }}>→</span>
                </button>
              ))}
            </div>
          </Group>
        )}

        {props.links.length > 0 && (
          <Group title="Links" c={c}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {props.links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    ...pillButton(c),
                    textDecoration: "none",
                    color: c.accent,
                    display: "inline-block",
                  }}
                >
                  {l.label} ↗
                </a>
              ))}
            </div>
          </Group>
        )}

        {props.siblingProjects.length > 0 && (
          <Group title="Other projects" c={c}>
            <div style={{ display: "grid", gap: 8 }}>
              {props.siblingProjects.map((p) => (
                <button
                  key={p.id}
                  onClick={() =>
                    sendFollowUpMessage(`Open the project detail for "${p.id}".`)
                  }
                  style={listButton(c)}
                >
                  <span style={{ fontWeight: 600 }}>{p.name}</span>
                  <span style={{ color: c.sub, marginLeft: 8 }}>
                    {p.summary}
                  </span>
                  <span style={{ float: "right", color: c.accent }}>→</span>
                </button>
              ))}
            </div>
          </Group>
        )}

        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 12,
            paddingTop: 16,
            borderTop: `1px solid ${c.border}`,
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() =>
              sendFollowUpMessage(`Show the metrics dashboard for project "${props.id}".`)
            }
            style={{
              ...pillButton(c),
              backgroundColor: c.accent,
              color: "#fff",
              border: `1px solid ${c.accent}`,
              fontWeight: 600,
            }}
          >
            Open metrics dashboard →
          </button>
          <button
            onClick={() => sendFollowUpMessage("Show the projects showcase.")}
            style={pillButton(c)}
          >
            ← Back to projects
          </button>
        </div>
      </div>
    </McpUseProvider>
  );
}

type Theme = {
  bg: string;
  panel: string;
  text: string;
  sub: string;
  border: string;
  accent: string;
  pill: string;
};

function Crumbs({ crumbs, c }: { crumbs: string[]; c: Theme }) {
  return (
    <div
      style={{
        fontSize: 12,
        color: c.sub,
        letterSpacing: 0.3,
        textTransform: "uppercase",
        display: "flex",
        flexWrap: "wrap",
        wordBreak: "break-word",
      }}
    >
      {crumbs.map((cr, i) => (
        <span key={i}>
          {i > 0 && <span style={{ margin: "0 6px" }}>›</span>}
          <span style={i === crumbs.length - 1 ? { color: c.accent } : {}}>
            {cr}
          </span>
        </span>
      ))}
    </div>
  );
}

function Group({
  title,
  c,
  children,
}: {
  title: string;
  c: Theme;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          fontSize: 11,
          letterSpacing: 0.5,
          textTransform: "uppercase",
          color: c.sub,
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function Stat({ c, label, value }: { c: Theme; label: string; value: string }) {
  return (
    <div
      style={{
        padding: 10,
        backgroundColor: c.panel,
        border: `1px solid ${c.border}`,
        borderRadius: 8,
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: 0.4,
          textTransform: "uppercase",
          color: c.sub,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function pillButton(c: Theme): React.CSSProperties {
  return {
    padding: "6px 12px",
    fontSize: 13,
    borderRadius: 999,
    border: `1px solid ${c.border}`,
    backgroundColor: c.pill,
    color: c.text,
    cursor: "pointer",
    fontFamily: "inherit",
  };
}

function listButton(c: Theme): React.CSSProperties {
  return {
    textAlign: "left",
    padding: "10px 12px",
    fontSize: 14,
    borderRadius: 8,
    border: `1px solid ${c.border}`,
    backgroundColor: c.panel,
    color: c.text,
    cursor: "pointer",
    fontFamily: "inherit",
    width: "100%",
  };
}
