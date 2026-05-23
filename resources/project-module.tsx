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
  moduleId: z.string(),
  name: z.string(),
  purpose: z.string(),
  languages: z.array(z.string()),
  loc: z.number(),
  interfaces: z.array(z.string()),
  dependencies: z.array(z.string()),
  testingNote: z.string(),
  keyFiles: z.array(
    z.object({ path: z.string(), loc: z.number(), purpose: z.string() })
  ),
  siblingModules: z.array(z.object({ id: z.string(), name: z.string() })),
});

type Props = z.infer<typeof propsSchema>;

export const widgetMetadata: WidgetMetadata = {
  description:
    "Single architectural module — purpose, languages, LOC, public interfaces, dependencies, key files, testing approach.",
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
    mono: dark ? "#0a0d12" : "#f4f5f7",
  };
}

export default function ProjectModule() {
  const { props, isPending, sendFollowUpMessage } = useWidget<Props>();
  const c = useColors();
  const { isMobile } = useViewport();

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div style={{ padding: 20, color: c.sub }}>Loading module...</div>
      </McpUseProvider>
    );
  }

  return (
    <McpUseProvider autoSize>
      <div style={{ padding: isMobile ? 16 : 24, backgroundColor: c.bg, color: c.text, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div style={{ fontSize: 12, color: c.sub, marginBottom: 6, wordBreak: "break-word", overflowWrap: "anywhere" }}>
          {props.breadcrumb.join("  ›  ")}
        </div>
        <h2 style={{ margin: "0 0 4px 0", fontSize: isMobile ? 18 : 24, fontWeight: 600, wordBreak: "break-word", overflowWrap: "anywhere" }}>{props.name}</h2>
        <p style={{ margin: "0 0 12px 0", color: c.sub, fontSize: isMobile ? 13 : 14, wordBreak: "break-word", overflowWrap: "anywhere" }}>{props.purpose}</p>

        <div style={{ display: "flex", gap: isMobile ? 8 : 12, marginBottom: 16, flexWrap: "wrap" }}>
          <div
            style={{
              padding: "6px 12px",
              border: `1px solid ${c.border}`,
              borderRadius: 6,
              backgroundColor: c.panel,
              fontSize: 12,
            }}
          >
            <span style={{ color: c.sub }}>LOC:</span>{" "}
            <span style={{ fontWeight: 600 }}>{props.loc.toLocaleString()}</span>
          </div>
          {props.languages.map((l) => (
            <button
              key={l}
              onClick={() =>
                sendFollowUpMessage(`Show ${l} stats for project ${props.projectId}`)
              }
              style={{
                padding: "6px 12px",
                border: `1px solid ${c.border}`,
                borderRadius: 6,
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

        {props.interfaces.length > 0 && (
          <section style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub, marginBottom: 6 }}>
              Public interfaces
            </div>
            <pre
              style={{
                margin: 0,
                padding: 10,
                backgroundColor: c.mono,
                border: `1px solid ${c.border}`,
                borderRadius: 6,
                fontSize: 12,
                fontFamily: "ui-monospace, SFMono-Regular, monospace",
                overflowX: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                maxWidth: "100%",
              }}
            >
              <code>{props.interfaces.join("\n")}</code>
            </pre>
          </section>
        )}

        {props.dependencies.length > 0 && (
          <section style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub, marginBottom: 6 }}>
              Dependencies
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {props.dependencies.map((d) => (
                <span
                  key={d}
                  style={{
                    padding: "3px 8px",
                    border: `1px solid ${c.border}`,
                    borderRadius: 4,
                    fontSize: 11,
                    fontFamily: "ui-monospace, SFMono-Regular, monospace",
                    backgroundColor: c.panel,
                    wordBreak: "break-all",
                  }}
                >
                  {d}
                </span>
              ))}
            </div>
          </section>
        )}

        {props.keyFiles.length > 0 && (
          <section style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub, marginBottom: 6 }}>
              Key files
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {props.keyFiles.map((f) => (
                <div
                  key={f.path}
                  style={{
                    padding: "8px 10px",
                    border: `1px solid ${c.border}`,
                    borderRadius: 6,
                    backgroundColor: c.panel,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontFamily: "ui-monospace, SFMono-Regular, monospace",
                      fontSize: 12,
                      flexWrap: "wrap",
                      gap: 6,
                    }}
                  >
                    <span style={{ wordBreak: "break-all", overflowWrap: "anywhere" }}>{f.path}</span>
                    <span style={{ color: c.sub }}>{f.loc.toLocaleString()} LOC</span>
                  </div>
                  <div style={{ fontSize: 12, color: c.sub, marginTop: 2, wordBreak: "break-word", overflowWrap: "anywhere" }}>{f.purpose}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub, marginBottom: 6 }}>
            Testing
          </div>
          <p style={{ margin: 0, lineHeight: 1.6, fontSize: 13, wordBreak: "break-word", overflowWrap: "anywhere" }}>{props.testingNote}</p>
        </section>

        {props.siblingModules.length > 0 && (
          <section style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub, marginBottom: 6 }}>
              Other modules in {props.projectName}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {props.siblingModules.map((m) => (
                <button
                  key={m.id}
                  onClick={() =>
                    sendFollowUpMessage(
                      `Show module ${m.id} in project ${props.projectId}`
                    )
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
                  {m.name}
                </button>
              ))}
            </div>
          </section>
        )}

        <button
          onClick={() =>
            sendFollowUpMessage(`Show the full tech stack for project ${props.projectId}`)
          }
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
          ← Tech stack
        </button>
      </div>
    </McpUseProvider>
  );
}
