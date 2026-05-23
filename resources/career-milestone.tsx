import { useEffect, useState } from "react";
import {
  McpUseProvider,
  useWidget,
  useWidgetTheme,
  type WidgetMetadata,
} from "mcp-use/react";
import { z } from "zod";

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
  breadcrumb: z.array(z.string()),
  id: z.string(),
  year: z.string(),
  title: z.string(),
  body: z.string(),
  lesson: z.string(),
  relatedSkills: z.array(z.string()),
  relatedRoles: z.array(
    z.object({ id: z.string(), company: z.string(), title: z.string() })
  ),
  relatedProjects: z.array(
    z.object({ id: z.string(), name: z.string(), summary: z.string() })
  ),
  siblings: z.array(
    z.object({ id: z.string(), year: z.string(), title: z.string() })
  ),
});

type Props = z.infer<typeof propsSchema>;

export const widgetMetadata: WidgetMetadata = {
  description: "Single career milestone deep-drill with related skills, roles, and projects.",
  props: propsSchema,
  exposeAsTool: false,
};

function useColors() {
  const theme = useWidgetTheme();
  const dark = theme === "dark";
  return {
    bg: dark ? "#0f1115" : "#ffffff",
    panel: dark ? "#161a22" : "#fafafa",
    text: dark ? "#e6e8ec" : "#0f1115",
    sub: dark ? "#9aa3b2" : "#5a6473",
    border: dark ? "#2a313d" : "#e6e8ec",
    accent: dark ? "#7aa2ff" : "#3460ff",
  };
}

export default function CareerMilestone() {
  const { props, isPending, sendFollowUpMessage } = useWidget<Props>();
  const c = useColors();
  const { isMobile } = useViewport();

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div style={{ padding: "clamp(14px, 4vw, 20px)", color: c.sub }}>Loading milestone...</div>
      </McpUseProvider>
    );
  }

  const chip = (label: string, onClick: () => void) => (
    <button
      key={label}
      onClick={onClick}
      style={{
        padding: "4px 10px",
        border: `1px solid ${c.border}`,
        borderRadius: 999,
        backgroundColor: c.panel,
        color: c.text,
        cursor: "pointer",
        fontSize: 12,
        textAlign: "left",
        wordBreak: "break-word",
        overflowWrap: "anywhere",
        maxWidth: "100%",
      }}
    >
      {label}
    </button>
  );

  return (
    <McpUseProvider autoSize>
      <div style={{ padding: isMobile ? 16 : 20, backgroundColor: c.bg, color: c.text, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div style={{ fontSize: 12, color: c.sub, marginBottom: 6, wordBreak: "break-word", overflowWrap: "anywhere" }}>
          {props.breadcrumb.join("  ›  ")}
        </div>
        <div style={{ fontSize: 13, color: c.accent, marginBottom: 4 }}>{props.year}</div>
        <h2 style={{ margin: "0 0 12px 0", fontSize: isMobile ? 18 : 22, fontWeight: 600, wordBreak: "break-word", overflowWrap: "anywhere" }}>{props.title}</h2>

        <p style={{ margin: "0 0 14px 0", fontSize: isMobile ? 13 : 14, lineHeight: 1.6, wordBreak: "break-word", overflowWrap: "anywhere" }}>{props.body}</p>

        <div
          style={{
            padding: isMobile ? 10 : 12,
            borderLeft: `3px solid ${c.accent}`,
            backgroundColor: c.panel,
            borderRadius: 4,
            marginBottom: 16,
            wordBreak: "break-word",
            overflowWrap: "anywhere",
          }}
        >
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub, marginBottom: 4 }}>
            Lesson learned
          </div>
          <div>{props.lesson}</div>
        </div>

        {props.relatedSkills.length > 0 && (
          <section style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub, marginBottom: 6 }}>
              Skills exercised
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {props.relatedSkills.map((s) =>
                chip(s, () => sendFollowUpMessage(`Tell me about my skill in ${s}`))
              )}
            </div>
          </section>
        )}

        {props.relatedRoles.length > 0 && (
          <section style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub, marginBottom: 6 }}>
              Related roles
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {props.relatedRoles.map((r) =>
                chip(`${r.company} — ${r.title}`, () =>
                  sendFollowUpMessage(`Show me the role detail for ${r.id}`)
                )
              )}
            </div>
          </section>
        )}

        {props.relatedProjects.length > 0 && (
          <section style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub, marginBottom: 6 }}>
              Related projects
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {props.relatedProjects.map((p) =>
                chip(p.name, () =>
                  sendFollowUpMessage(`Show me project detail for ${p.id}`)
                )
              )}
            </div>
          </section>
        )}

        {props.siblings.length > 0 && (
          <section style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub, marginBottom: 6 }}>
              Other milestones
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {props.siblings.map((s) =>
                chip(`${s.year} · ${s.title}`, () =>
                  sendFollowUpMessage(`Tell me about the career milestone ${s.id}`)
                )
              )}
            </div>
          </section>
        )}

        <button
          onClick={() => sendFollowUpMessage("Show the full career journey")}
          style={{
            padding: "6px 12px",
            background: "none",
            border: `1px solid ${c.border}`,
            borderRadius: 4,
            color: c.text,
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          ← Back to journey
        </button>
      </div>
    </McpUseProvider>
  );
}
