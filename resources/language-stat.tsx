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
  name: z.string(),
  category: z.string(),
  yearsActive: z.number(),
  firstUsed: z.string(),
  proficiency: z.string(),
  proficiencyLabel: z.string(),
  totalLoc: z.string(),
  filesAuthored: z.number(),
  reposActive: z.number(),
  projectsUsing: z.array(
    z.object({ id: z.string(), name: z.string(), summary: z.string() })
  ),
  rolesUsing: z.array(
    z.object({ id: z.string(), company: z.string(), title: z.string() })
  ),
  topFrameworks: z.array(z.string()),
  signature: z.string(),
  sampleSnippet: z
    .object({ title: z.string(), language: z.string(), code: z.string() })
    .optional(),
  benchmarks: z.array(z.object({ label: z.string(), value: z.string() })),
});

type Props = z.infer<typeof propsSchema>;

export const widgetMetadata: WidgetMetadata = {
  description:
    "Programming-language stat card — proficiency, tenure, LOC, repos, frameworks, code sample, and corroborating roles/projects.",
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
  };
}

export default function LanguageStat() {
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

  const stat = (label: string, value: string | number) => (
    <div
      key={label}
      style={{
        padding: isMobile ? 8 : 10,
        border: `1px solid ${c.border}`,
        borderRadius: 6,
        backgroundColor: c.panel,
      }}
    >
      <div style={{ fontSize: 11, color: c.sub, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: isMobile ? 15 : 18, fontWeight: 700, color: c.accent, marginTop: 2 }}>{value}</div>
    </div>
  );

  return (
    <McpUseProvider autoSize>
      <div style={{ padding: isMobile ? 16 : 20, backgroundColor: c.bg, color: c.text, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div style={{ fontSize: 12, color: c.sub, marginBottom: 6 }}>
          {props.breadcrumb.join("  ›  ")}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4, flexWrap: "wrap", gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: isMobile ? 18 : 22, fontWeight: 600, wordBreak: "break-word" }}>{props.name}</h2>
          <div
            style={{
              padding: "3px 10px",
              borderRadius: 999,
              fontSize: 11,
              backgroundColor: c.accent,
              color: c.bg,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              fontWeight: 600,
            }}
          >
            {props.proficiencyLabel}
          </div>
        </div>
        <div style={{ fontSize: isMobile ? 12 : 13, color: c.sub, marginBottom: 14 }}>
          {props.category} · first used {props.firstUsed}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : isTablet ? "repeat(3, 1fr)" : "repeat(auto-fill, minmax(min(100%, 140px), 1fr))", gap: isMobile ? 6 : 8, marginBottom: 14 }}>
          {stat("Years active", `${props.yearsActive}y`)}
          {stat("Lines of code", props.totalLoc)}
          {stat("Files authored", props.filesAuthored.toLocaleString())}
          {stat("Active repos", props.reposActive)}
        </div>

        <section style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub, marginBottom: 6 }}>
            What I do with it
          </div>
          <p style={{ margin: 0, lineHeight: 1.6, wordBreak: "break-word", overflowWrap: "anywhere" }}>{props.signature}</p>
        </section>

        {props.topFrameworks.length > 0 && (
          <section style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub, marginBottom: 6 }}>
              Top frameworks & libraries
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {props.topFrameworks.map((f) => (
                <span
                  key={f}
                  style={{
                    padding: "4px 10px",
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

        {props.benchmarks.length > 0 && (
          <section style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub, marginBottom: 6 }}>
              Self-assessed competencies
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(auto-fill, minmax(min(100%, 180px), 1fr))", gap: 6 }}>
              {props.benchmarks.map((b) => (
                <div key={b.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", border: `1px solid ${c.border}`, borderRadius: 4 }}>
                  <span style={{ fontSize: 12, color: c.sub }}>{b.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{b.value}</span>
                </div>
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
              }}
            >
              <code>{props.sampleSnippet.code}</code>
            </pre>
          </section>
        )}

        {props.projectsUsing.length > 0 && (
          <section style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub, marginBottom: 6 }}>
              Projects using {props.name}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {props.projectsUsing.map((p) => (
                <button
                  key={p.id}
                  onClick={() => sendFollowUpMessage(`Show project detail for ${p.id}`)}
                  style={{
                    padding: "4px 10px",
                    border: `1px solid ${c.border}`,
                    borderRadius: 999,
                    backgroundColor: c.panel,
                    color: c.text,
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                  title={p.summary}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </section>
        )}

        {props.rolesUsing.length > 0 && (
          <section style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub, marginBottom: 6 }}>
              Roles using {props.name}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {props.rolesUsing.map((r) => (
                <button
                  key={r.id}
                  onClick={() => sendFollowUpMessage(`Show role detail for ${r.id}`)}
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
                  {r.company} — {r.title}
                </button>
              ))}
            </div>
          </section>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => sendFollowUpMessage(`Show skill detail for ${props.name}`)}
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
            ← Skill overview
          </button>
          <button
            onClick={() => sendFollowUpMessage(`Show the skills grid for ${props.category}`)}
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
            ← Skills grid
          </button>
        </div>
      </div>
    </McpUseProvider>
  );
}
