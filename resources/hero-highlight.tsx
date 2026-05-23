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
  label: z.string(),
  headline: z.string(),
  summary: z.string(),
  bullets: z.array(z.string()),
  relatedSkillNames: z.array(z.string()),
  relatedRoleIds: z.array(
    z.object({ id: z.string(), company: z.string(), title: z.string() })
  ),
  relatedProjects: z.array(
    z.object({ id: z.string(), name: z.string(), summary: z.string() })
  ),
  breadcrumb: z.array(z.string()),
});

type Props = z.infer<typeof propsSchema>;

export const widgetMetadata: WidgetMetadata = {
  description:
    "Deep view of a single hero capability highlight, with corroborating skills, roles, and projects.",
  props: propsSchema,
  exposeAsTool: false,
};

export default function HeroHighlight() {
  const { props, isPending, sendFollowUpMessage } = useWidget<Props>();
  const theme = useWidgetTheme();
  const { isMobile } = useViewport();

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div style={{ padding: 20 }}>Loading highlight...</div>
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
        <Breadcrumb crumbs={props.breadcrumb} c={c} />

        <h2
          style={{
            fontSize: isMobile ? 18 : 22,
            fontWeight: 700,
            margin: "12px 0 6px 0",
            letterSpacing: -0.2,
            wordBreak: "break-word",
            overflowWrap: "anywhere",
          }}
        >
          {props.headline}
        </h2>
        <p style={{ margin: "0 0 18px 0", color: c.sub, fontSize: isMobile ? 14 : 15, wordBreak: "break-word", overflowWrap: "anywhere" }}>
          {props.summary}
        </p>

        <div
          style={{
            display: "grid",
            gap: isMobile ? 6 : 8,
            marginBottom: 20,
          }}
        >
          {props.bullets.map((b, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: isMobile ? 8 : 10,
                padding: isMobile ? "8px 10px" : "10px 12px",
                backgroundColor: c.panel,
                border: `1px solid ${c.border}`,
                borderRadius: 8,
                fontSize: isMobile ? 13 : 14,
                wordBreak: "break-word",
                overflowWrap: "anywhere",
              }}
            >
              <span style={{ color: c.accent, fontWeight: 600 }}>›</span>
              <span style={{ flex: 1, minWidth: 0 }}>{b}</span>
            </div>
          ))}
        </div>

        {props.relatedSkillNames.length > 0 && (
          <Group title="Related skills" c={c}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {props.relatedSkillNames.map((s) => (
                <button
                  key={s}
                  onClick={() =>
                    sendFollowUpMessage(
                      `Show me the skill detail for "${s}".`
                    )
                  }
                  style={pillButton(c)}
                >
                  {s} ›
                </button>
              ))}
            </div>
          </Group>
        )}

        {props.relatedRoleIds.length > 0 && (
          <Group title="Where I used it" c={c}>
            <div style={{ display: "grid", gap: 8 }}>
              {props.relatedRoleIds.map((r) => (
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
                  <span style={{ color: c.sub, marginLeft: 8 }}>
                    {r.title}
                  </span>
                  <span style={{ float: "right", color: c.accent }}>→</span>
                </button>
              ))}
            </div>
          </Group>
        )}

        {props.relatedProjects.length > 0 && (
          <Group title="Projects that show this" c={c}>
            <div style={{ display: "grid", gap: 8 }}>
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

        <BackBar
          c={c}
          onBack={() => sendFollowUpMessage("Show the hero section again.")}
        />
      </div>
    </McpUseProvider>
  );
}

/* --------------------------- shared helpers --------------------------- */

type Theme = {
  bg: string;
  panel: string;
  text: string;
  sub: string;
  border: string;
  accent: string;
  pill: string;
};

function Breadcrumb({ crumbs, c }: { crumbs: string[]; c: Theme }) {
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
    padding: "clamp(8px, 2vw, 10px) clamp(10px, 3vw, 12px)",
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

function BackBar({ c, onBack }: { c: Theme; onBack: () => void }) {
  return (
    <div
      style={{
        marginTop: 16,
        paddingTop: 16,
        borderTop: `1px solid ${c.border}`,
        display: "flex",
        gap: 8,
      }}
    >
      <button onClick={onBack} style={pillButton(c)}>
        ← Back to hero
      </button>
    </div>
  );
}
