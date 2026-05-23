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
  projectId: z.string(),
  projectName: z.string(),
  summary: z.string(),
  languages: z.array(
    z.object({
      name: z.string(),
      percentage: z.number(),
      lines: z.number(),
      primary: z.boolean(),
    })
  ),
  layers: z.array(
    z.object({
      layer: z.string(),
      stack: z.array(z.string()),
      rationale: z.string(),
    })
  ),
  modules: z.array(
    z.object({ id: z.string(), name: z.string(), purpose: z.string() })
  ),
  notableLibs: z.array(z.object({ name: z.string(), purpose: z.string() })),
});

type Props = z.infer<typeof propsSchema>;

export const widgetMetadata: WidgetMetadata = {
  description:
    "Full tech-stack breakdown for one project — languages with LOC share, architectural layers, modules, and notable libraries.",
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
    barBg: dark ? "#1f2533" : "#eef0f5",
  };
}

const langColors = ["#3460ff", "#22c55e", "#f59e0b", "#ef4444", "#a855f7", "#06b6d4"];

export default function ProjectTechstack() {
  const { props, isPending, sendFollowUpMessage } = useWidget<Props>();
  const c = useColors();
  const { isMobile } = useViewport();

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div style={{ padding: 20, color: c.sub }}>Loading tech stack...</div>
      </McpUseProvider>
    );
  }

  return (
    <McpUseProvider autoSize>
      <div style={{ padding: "clamp(16px, 4vw, 28px)", backgroundColor: c.bg, color: c.text, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div style={{ fontSize: 12, color: c.sub, marginBottom: 6, wordBreak: "break-word", overflowWrap: "anywhere" }}>
          {props.breadcrumb.join("  ›  ")}
        </div>
        <h2 style={{ margin: "0 0 4px 0", fontSize: "clamp(18px, 4vw, 24px)", fontWeight: 600, wordBreak: "break-word", overflowWrap: "anywhere" }}>
          {props.projectName} — tech stack
        </h2>
        <p style={{ margin: "0 0 16px 0", color: c.sub, wordBreak: "break-word", overflowWrap: "anywhere" }}>{props.summary}</p>

        {/* Language bar chart */}
        <section style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub, marginBottom: 8 }}>
            Languages (by LOC share)
          </div>
          <div
            style={{
              display: "flex",
              height: 10,
              borderRadius: 999,
              overflow: "hidden",
              backgroundColor: c.barBg,
              marginBottom: 10,
              width: "100%",
            }}
          >
            {props.languages.map((lang, i) => (
              <div
                key={lang.name}
                style={{
                  width: `${lang.percentage}%`,
                  backgroundColor: langColors[i % langColors.length],
                }}
                title={`${lang.name}: ${lang.percentage}%`}
              />
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {props.languages.map((lang, i) => (
              <button
                key={lang.name}
                onClick={() =>
                  sendFollowUpMessage(
                    `Show ${lang.name} stats for project ${props.projectId}`
                  )
                }
                style={{
                  padding: "4px 10px",
                  border: `1px solid ${c.border}`,
                  borderRadius: 4,
                  backgroundColor: c.panel,
                  color: c.text,
                  cursor: "pointer",
                  fontSize: 12,
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    backgroundColor: langColors[i % langColors.length],
                  }}
                />
                <span style={{ fontWeight: 600 }}>{lang.name}</span>
                <span style={{ color: c.sub }}>
                  {lang.percentage}% · {lang.lines.toLocaleString()} LOC
                </span>
                {lang.primary && (
                  <span style={{ fontSize: 10, color: c.accent, marginLeft: 2 }}>★</span>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Layers */}
        <section style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub, marginBottom: 8 }}>
            Architectural layers
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: 10 }}>
            {props.layers.map((l) => (
              <div
                key={l.layer}
                style={{
                  padding: "clamp(12px, 3vw, 20px)",
                  border: `1px solid ${c.border}`,
                  borderRadius: 6,
                  backgroundColor: c.panel,
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 4, wordBreak: "break-word" }}>{l.layer}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                  {l.stack.map((s) => (
                    <span
                      key={s}
                      style={{
                        padding: "2px 8px",
                        border: `1px solid ${c.border}`,
                        borderRadius: 4,
                        fontSize: 11,
                        backgroundColor: c.bg,
                        wordBreak: "break-word",
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: c.sub, lineHeight: 1.5, wordBreak: "break-word", overflowWrap: "anywhere" }}>{l.rationale}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Modules */}
        {props.modules.length > 0 && (
          <section style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub, marginBottom: 8 }}>
              Modules
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(min(100%, 220px), 1fr))", gap: 10 }}>
              {props.modules.map((m) => (
                <button
                  key={m.id}
                  onClick={() =>
                    sendFollowUpMessage(
                      `Show module ${m.id} in project ${props.projectId}`
                    )
                  }
                  style={{
                    padding: "clamp(12px, 3vw, 20px)",
                    border: `1px solid ${c.border}`,
                    borderRadius: 6,
                    backgroundColor: c.panel,
                    color: c.text,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 2, wordBreak: "break-word" }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: c.sub, lineHeight: 1.5, wordBreak: "break-word", overflowWrap: "anywhere" }}>{m.purpose}</div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Notable libs */}
        {props.notableLibs.length > 0 && (
          <section style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub, marginBottom: 8 }}>
              Notable libraries
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {props.notableLibs.map((l) => (
                <div
                  key={l.name}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "8px 12px",
                    border: `1px solid ${c.border}`,
                    borderRadius: 6,
                    fontSize: 13,
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ fontWeight: 600, wordBreak: "break-word" }}>{l.name}</span>
                  <span style={{ color: c.sub, textAlign: "right", wordBreak: "break-word", overflowWrap: "anywhere" }}>{l.purpose}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <button
          onClick={() => sendFollowUpMessage(`Show project detail for ${props.projectId}`)}
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
          ← Back to project
        </button>
      </div>
    </McpUseProvider>
  );
}
