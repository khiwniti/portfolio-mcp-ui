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
  name: z.string(),
  category: z.string(),
  level: z.string(),
  years: z.number(),
  firstUsed: z.string(),
  signal: z.string(),
  evidence: z.array(z.string()),
  relatedRoles: z.array(
    z.object({ id: z.string(), company: z.string(), title: z.string() })
  ),
  relatedProjects: z.array(
    z.object({ id: z.string(), name: z.string(), summary: z.string() })
  ),
  siblingSkills: z.array(z.string()),
  breadcrumb: z.array(z.string()),
});

type Props = z.infer<typeof propsSchema>;

export const widgetMetadata: WidgetMetadata = {
  description:
    "Deep view of a single skill: evidence, corroborating projects and roles, and sibling skills in the same category.",
  props: propsSchema,
  exposeAsTool: false,
};

const LEVEL_LABELS: Record<string, string> = {
  expert: "Expert · daily, deep",
  proficient: "Proficient · production-grade",
  working: "Working · ship with help",
};

export default function SkillDetail() {
  const { props, isPending, sendFollowUpMessage } = useWidget<Props>();
  const theme = useWidgetTheme();
  const { isMobile, isTablet } = useViewport();

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div style={{ padding: 24 }}>Loading skill...</div>
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

        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: isMobile ? 8 : 12,
            marginTop: 12,
            marginBottom: 6,
            flexWrap: "wrap",
          }}
        >
          <h2 style={{ margin: 0, fontSize: isMobile ? 18 : 24, fontWeight: 700, wordBreak: "break-word" }}>
            {props.name}
          </h2>
          <span
            style={{
              fontSize: 12,
              padding: "3px 8px",
              borderRadius: 999,
              backgroundColor: c.pill,
              color: c.accent,
              fontWeight: 600,
            }}
          >
            {props.category}
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
            gap: isMobile ? 6 : 8,
            marginTop: 12,
            marginBottom: isMobile ? 16 : 22,
          }}
        >
          <Stat c={c} label="Level" value={LEVEL_LABELS[props.level] ?? props.level} />
          <Stat c={c} label="Years" value={`${props.years}`} />
          <Stat c={c} label="First used" value={props.firstUsed} />
          <Stat c={c} label="Signal" value={props.signal} />
        </div>

        <Group title="Evidence" c={c}>
          <div style={{ display: "grid", gap: isMobile ? 6 : 8 }}>
            {props.evidence.map((e, i) => (
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
                <span style={{ color: c.accent, fontWeight: 700 }}>{i + 1}</span>
                <span style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>{e}</span>
              </div>
            ))}
          </div>
        </Group>

        {props.relatedRoles.length > 0 && (
          <Group title="Roles where I used it" c={c}>
            <div style={{ display: "grid", gap: isMobile ? 6 : 8 }}>
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

        {props.relatedProjects.length > 0 && (
          <Group title="Projects that show it" c={c}>
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
                  <span style={{ color: c.sub, marginLeft: 8 }}>{p.summary}</span>
                  <span style={{ float: "right", color: c.accent }}>→</span>
                </button>
              ))}
            </div>
          </Group>
        )}

        {props.siblingSkills.length > 0 && (
          <Group title={`Other ${props.category} skills`} c={c}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: isMobile ? 4 : 6 }}>
              {props.siblingSkills.map((s) => (
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
        )}

        <div
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            alignItems: isMobile ? "stretch" : "center",
            gap: isMobile ? 6 : 8,
            marginTop: 12,
            paddingTop: 16,
            borderTop: `1px solid ${c.border}`,
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() =>
              sendFollowUpMessage(`Show all ${props.category} skills.`)
            }
            style={pillButton(c)}
          >
            ← Back to {props.category}
          </button>
          <button
            onClick={() => sendFollowUpMessage("Show the full skills grid.")}
            style={pillButton(c)}
          >
            All skills
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

function Stat({
  c,
  label,
  value,
}: {
  c: Theme;
  label: string;
  value: string;
}) {
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
