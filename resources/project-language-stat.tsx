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
  language: z.string(),
  loc: z.number(),
  files: z.number(),
  percentage: z.number(),
  why: z.string(),
  keyModules: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      loc: z.number(),
      purpose: z.string(),
    })
  ),
  frameworks: z.array(z.string()),
  sampleSnippet: z
    .object({ title: z.string(), language: z.string(), code: z.string() })
    .optional(),
  siblingLanguages: z.array(z.string()),
});

type Props = z.infer<typeof propsSchema>;

export const widgetMetadata: WidgetMetadata = {
  description:
    "Per-project language stat card — LOC, files, % share, why this language was chosen, key modules using it, and a code sample.",
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
    code: dark ? "#0a0d12" : "#f4f5f7",
    barBg: dark ? "#1f2533" : "#eef0f5",
  };
}

export default function ProjectLanguageStat() {
  const { props, isPending, sendFollowUpMessage } = useWidget<Props>();
  const c = useColors();
  const { isMobile, isTablet } = useViewport();

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div style={{ padding: 20, color: c.sub }}>Loading language stat...</div>
      </McpUseProvider>
    );
  }

  const stat = (label: string, value: string) => (
    <div
      key={label}
      style={{
        padding: isMobile ? 8 : 10,
        border: `1px solid ${c.border}`,
        borderRadius: 6,
        backgroundColor: c.panel,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 11, color: c.sub, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </div>
      <div style={{ fontSize: isMobile ? 16 : 22, fontWeight: 700, color: c.accent, marginTop: 2, wordBreak: "break-word" }}>{value}</div>
    </div>
  );

  return (
    <McpUseProvider autoSize>
      <div style={{ padding: isMobile ? 16 : 24, backgroundColor: c.bg, color: c.text, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div style={{ fontSize: 12, color: c.sub, marginBottom: 6, wordBreak: "break-word", overflowWrap: "anywhere" }}>
          {props.breadcrumb.join("  ›  ")}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4, flexWrap: "wrap", gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: isMobile ? 18 : 24, fontWeight: 600, wordBreak: "break-word", overflowWrap: "anywhere" }}>
            {props.language} <span style={{ color: c.sub, fontWeight: 400 }}>in {props.projectName}</span>
          </h2>
        </div>

        {/* Stat grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : isTablet ? "repeat(4, 1fr)" : "repeat(auto-fill, minmax(min(100%, 110px), 1fr))",
            gap: isMobile ? 6 : 8,
            marginTop: 12,
            marginBottom: 14,
          }}
        >
          {stat("Lines of code", props.loc.toLocaleString())}
          {stat("Files", props.files.toLocaleString())}
          {stat("% of project", `${props.percentage}%`)}
          {stat("Frameworks", String(props.frameworks.length))}
        </div>

        {/* % bar */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: c.sub, marginBottom: 4 }}>
            Share of project codebase
          </div>
          <div
            style={{
              height: 8,
              borderRadius: 999,
              backgroundColor: c.barBg,
              overflow: "hidden",
              width: "100%",
            }}
          >
            <div
              style={{
                width: `${props.percentage}%`,
                height: "100%",
                backgroundColor: c.accent,
              }}
            />
          </div>
        </div>

        <section style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub, marginBottom: 6 }}>
            Why {props.language} here
          </div>
          <p style={{ margin: 0, lineHeight: 1.6, wordBreak: "break-word", overflowWrap: "anywhere" }}>{props.why}</p>
        </section>

        {props.frameworks.length > 0 && (
          <section style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub, marginBottom: 6 }}>
              Frameworks & libraries
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {props.frameworks.map((f) => (
                <span
                  key={f}
                  style={{
                    padding: "3px 8px",
                    border: `1px solid ${c.border}`,
                    borderRadius: 4,
                    fontSize: 12,
                    backgroundColor: c.panel,
                  }}
                >
                  {f}
                </span>
              ))}
            </div>
          </section>
        )}

        {props.keyModules.length > 0 && (
          <section style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub, marginBottom: 6 }}>
              Modules using {props.language}
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {props.keyModules.map((m) => (
                <button
                  key={m.id}
                  onClick={() =>
                    sendFollowUpMessage(
                      `Show module ${m.id} in project ${props.projectId}`
                    )
                  }
                  style={{
                    padding: 10,
                    border: `1px solid ${c.border}`,
                    borderRadius: 6,
                    backgroundColor: c.panel,
                    color: c.text,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                    <span style={{ fontWeight: 600, wordBreak: "break-word" }}>{m.name}</span>
                    <span style={{ fontSize: 12, color: c.sub }}>{m.loc.toLocaleString()} LOC</span>
                  </div>
                  <div style={{ fontSize: 12, color: c.sub, marginTop: 2, wordBreak: "break-word", overflowWrap: "anywhere" }}>{m.purpose}</div>
                </button>
              ))}
            </div>
          </section>
        )}

        {props.sampleSnippet && (
          <section style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub, marginBottom: 6 }}>
              Sample: {props.sampleSnippet.title}
            </div>
            <pre
              style={{
                margin: 0,
                padding: 12,
                backgroundColor: c.code,
                border: `1px solid ${c.border}`,
                borderRadius: 6,
                overflowX: "auto",
                fontSize: 12,
                lineHeight: 1.5,
                fontFamily: "ui-monospace, SFMono-Regular, monospace",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                maxWidth: "100%",
              }}
            >
              <code>{props.sampleSnippet.code}</code>
            </pre>
          </section>
        )}

        {props.siblingLanguages.length > 0 && (
          <section style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub, marginBottom: 6 }}>
              Other languages in this project
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {props.siblingLanguages.map((l) => (
                <button
                  key={l}
                  onClick={() =>
                    sendFollowUpMessage(`Show ${l} stats for project ${props.projectId}`)
                  }
                  style={{
                    padding: "4px 10px",
                    border: `1px solid ${c.border}`,
                    borderRadius: 999,
                    backgroundColor: c.panel,
                    color: c.text,
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
          </section>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() =>
              sendFollowUpMessage(`Show the full tech stack for project ${props.projectId}`)
            }
            style={{
              padding: "6px 12px",
              background: "none",
              border: `1px solid ${c.border}`,
              borderRadius: 4,
              color: c.accent,
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            ← Tech stack
          </button>
          <button
            onClick={() => sendFollowUpMessage(`Show skill detail for ${props.language}`)}
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
            Skill overview →
          </button>
        </div>
      </div>
    </McpUseProvider>
  );
}
