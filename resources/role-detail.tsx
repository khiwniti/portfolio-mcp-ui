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
  company: z.string(),
  title: z.string(),
  start: z.string(),
  end: z.string(),
  current: z.boolean(),
  summary: z.string(),
  achievements: z.array(z.string()),
  stack: z.array(z.string()),
  location: z.string(),
  team: z.string(),
  reports: z.string(),
  links: z.array(z.object({ label: z.string(), href: z.string() })),
  metrics: z.array(z.object({ label: z.string(), value: z.string() })),
  keyDecisions: z.array(
    z.object({
      decision: z.string(),
      rationale: z.string(),
      outcome: z.string(),
    })
  ),
  relatedProjects: z.array(
    z.object({ id: z.string(), name: z.string(), summary: z.string() })
  ),
  breadcrumb: z.array(z.string()),
});

type Props = z.infer<typeof propsSchema>;

export const widgetMetadata: WidgetMetadata = {
  description:
    "Deep view of a single role: scope, metrics, key technical decisions, achievements, related projects, and the stack used.",
  props: propsSchema,
  exposeAsTool: false,
};

export default function RoleDetail() {
  const { props, isPending, sendFollowUpMessage } = useWidget<Props>();
  const theme = useWidgetTheme();
  const { isMobile, isTablet } = useViewport();

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div style={{ padding: 24 }}>Loading role...</div>
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
    good: dark ? "#34d399" : "#10b981",
  };

  return (
    <McpUseProvider autoSize>
      <div
        style={{
          padding: isMobile ? 16 : 24,
          backgroundColor: c.bg,
          color: c.text,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Inter', system-ui, sans-serif",
          lineHeight: 1.5,
        }}
      >
        <Crumbs crumbs={props.breadcrumb} c={c} />

        <div style={{ marginTop: 12, marginBottom: 4 }}>
          <h2 style={{ margin: 0, fontSize: isMobile ? 18 : 22, fontWeight: 700, wordBreak: "break-word", overflowWrap: "anywhere" }}>
            {props.title}
          </h2>
          <div
            style={{
              fontSize: isMobile ? 13 : 15,
              color: c.sub,
              marginTop: 4,
              display: "flex",
              gap: isMobile ? 8 : 10,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontWeight: 600, color: c.text }}>
              {props.company}
            </span>
            <span>•</span>
            <span>
              {props.start} — {props.current ? "Present" : props.end}
            </span>
            {props.current && (
              <span
                style={{
                  fontSize: 11,
                  padding: "2px 8px",
                  borderRadius: 999,
                  backgroundColor: c.good + "22",
                  color: c.good,
                  fontWeight: 700,
                  letterSpacing: 0.4,
                }}
              >
                CURRENT
              </span>
            )}
          </div>
        </div>

        <p style={{ margin: "16px 0", color: c.sub, fontSize: isMobile ? 13 : 15, wordBreak: "break-word", overflowWrap: "anywhere" }}>
          {props.summary}
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
            gap: isMobile ? 6 : 8,
            marginBottom: isMobile ? 16 : 22,
          }}
        >
          <Stat c={c} label="Location" value={props.location} />
          <Stat c={c} label="Team" value={props.team} />
          <Stat c={c} label="Reporting" value={props.reports} />
        </div>

        {props.metrics.length > 0 && (
          <Group title="Impact metrics" c={c}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
                gap: isMobile ? 6 : 8,
              }}
            >
              {props.metrics.map((m) => (
                <div
                  key={m.label}
                  style={{
                    padding: isMobile ? 10 : 12,
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
                      wordBreak: "break-word",
                    }}
                  >
                    {m.label}
                  </div>
                  <div
                    style={{
                      fontSize: isMobile ? 15 : 18,
                      fontWeight: 700,
                      color: c.accent,
                      marginTop: 4,
                      wordBreak: "break-word",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {m.value}
                  </div>
                </div>
              ))}
            </div>
          </Group>
        )}

        <Group title="Selected achievements" c={c}>
          <div style={{ display: "grid", gap: isMobile ? 6 : 8 }}>
            {props.achievements.map((a, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: isMobile ? 8 : 10,
                  padding: isMobile ? "8px 10px" : "10px 12px",
                  backgroundColor: c.panel,
                  border: `1px solid ${c.border}`,
                  borderRadius: 8,
                  fontSize: isMobile ? 13 : 14,
                }}
              >
                <span style={{ color: c.accent, fontWeight: 700, minWidth: 16 }}>
                  {i + 1}
                </span>
                <span style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>{a}</span>
              </div>
            ))}
          </div>
        </Group>

        {props.keyDecisions.length > 0 && (
          <Group title="Key technical decisions" c={c}>
            <div style={{ display: "grid", gap: isMobile ? 8 : 10 }}>
              {props.keyDecisions.map((d, i) => (
                <div
                  key={i}
                  style={{
                    padding: isMobile ? 12 : 14,
                    backgroundColor: c.panel,
                    border: `1px solid ${c.border}`,
                    borderRadius: 8,
                  }}
                >
                  <div
                    style={{
                      fontSize: isMobile ? 13 : 14,
                      fontWeight: 700,
                      marginBottom: 6,
                      wordBreak: "break-word",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {d.decision}
                  </div>
                  <Row c={c} label="Rationale" body={d.rationale} />
                  <Row c={c} label="Outcome" body={d.outcome} accent />
                </div>
              ))}
            </div>
          </Group>
        )}

        <Group title="Stack" c={c}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: isMobile ? 4 : 6 }}>
            {props.stack.map((s) => (
              <button
                key={s}
                onClick={() =>
                  sendFollowUpMessage(`Show me the skill detail for "${s}".`)
                }
                style={pillButton(c)}
              >
                {s} ›
              </button>
            ))}
          </div>
        </Group>

        {props.relatedProjects.length > 0 && (
          <Group title="Projects from this role" c={c}>
            <div style={{ display: "grid", gap: isMobile ? 6 : 8 }}>
              {props.relatedProjects.map((p) => (
                <button
                  key={p.id}
                  onClick={() =>
                    sendFollowUpMessage(
                      `Open the project detail for "${p.id}".`
                    )
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

        {props.links.length > 0 && (
          <Group title="Links" c={c}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: isMobile ? 6 : 8 }}>
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

        <div
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            alignItems: isMobile ? "stretch" : "center",
            flexWrap: "wrap",
            gap: isMobile ? 6 : 8,
            marginTop: 12,
            paddingTop: 16,
            borderTop: `1px solid ${c.border}`,
          }}
        >
          <button
            onClick={() => sendFollowUpMessage("Show the full experience timeline.")}
            style={pillButton(c)}
          >
            ← Back to timeline
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
        wordBreak: "break-word",
        overflowWrap: "anywhere",
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
          wordBreak: "break-word",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, wordBreak: "break-word", overflowWrap: "anywhere" }}>{value}</div>
    </div>
  );
}

function Row({
  c,
  label,
  body,
  accent,
}: {
  c: Theme;
  label: string;
  body: string;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        marginTop: 6,
        fontSize: 13,
        color: accent ? c.accent : c.sub,
        wordBreak: "break-word",
        overflowWrap: "anywhere",
      }}
    >
      <span style={{ fontWeight: 700, letterSpacing: 0.3 }}>{label}: </span>
      <span style={{ color: c.text, fontWeight: accent ? 600 : 400 }}>{body}</span>
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
    wordBreak: "break-word",
    overflowWrap: "anywhere",
  };
}
