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
  headline: z.string(),
  narrative: z.array(z.string()),
  philosophy: z.array(
    z.object({ title: z.string(), body: z.string() })
  ),
  workingStyle: z.array(z.string()),
  milestonePreviews: z.array(
    z.object({ id: z.string(), year: z.string(), title: z.string() })
  ),
});

type Props = z.infer<typeof propsSchema>;

export const widgetMetadata: WidgetMetadata = {
  description:
    "About section — narrative, engineering philosophy, working style, and an inline preview of the career journey.",
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

export default function AboutSection() {
  const { props, isPending, sendFollowUpMessage } = useWidget<Props>();
  const c = useColors();
  const { isMobile, isTablet } = useViewport();

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div style={{ padding: "clamp(14px, 4vw, 20px)", color: c.sub }}>Loading about...</div>
      </McpUseProvider>
    );
  }

  return (
    <McpUseProvider autoSize>
      <div style={{ padding: isMobile ? 16 : 20, backgroundColor: c.bg, color: c.text, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div style={{ fontSize: 12, color: c.sub, marginBottom: 6, wordBreak: "break-word", overflowWrap: "anywhere" }}>
          {props.breadcrumb.join("  ›  ")}
        </div>
        <h2 style={{ margin: "0 0 4px 0", fontSize: isMobile ? 18 : 22, fontWeight: 600, wordBreak: "break-word", overflowWrap: "anywhere" }}>{props.name}</h2>
        <p style={{ margin: "0 0 16px 0", fontSize: isMobile ? 14 : 16, color: c.sub, wordBreak: "break-word", overflowWrap: "anywhere" }}>{props.headline}</p>

        <section style={{ marginBottom: 20 }}>
          {props.narrative.map((p, i) => (
            <p key={i} style={{ margin: "0 0 10px 0", lineHeight: 1.6, wordBreak: "break-word", overflowWrap: "anywhere" }}>
              {p}
            </p>
          ))}
        </section>

        <section style={{ marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 10px 0", fontSize: 14, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub }}>
            Engineering philosophy
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(auto-fill, minmax(min(100%, 220px), 1fr))", gap: isMobile ? 8 : 10 }}>
            {props.philosophy.map((pri) => (
              <div
                key={pri.title}
                style={{
                  padding: isMobile ? 10 : 12,
                  border: `1px solid ${c.border}`,
                  borderRadius: 8,
                  backgroundColor: c.panel,
                  wordBreak: "break-word",
                  overflowWrap: "anywhere",
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{pri.title}</div>
                <div style={{ fontSize: isMobile ? 12 : 13, color: c.sub, lineHeight: 1.5 }}>{pri.body}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 8px 0", fontSize: 14, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub }}>
            Working style
          </h3>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {props.workingStyle.map((w, i) => (
              <li key={i} style={{ marginBottom: 4, wordBreak: "break-word", overflowWrap: "anywhere" }}>{w}</li>
            ))}
          </ul>
        </section>

        <section>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
            <h3 style={{ margin: 0, fontSize: 14, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub }}>
              Career journey (preview)
            </h3>
            <button
              onClick={() => sendFollowUpMessage("Show me the full career journey timeline")}
              style={{
                padding: "4px 10px",
                background: "none",
                border: `1px solid ${c.border}`,
                borderRadius: 4,
                color: c.accent,
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              Full timeline →
            </button>
          </div>
          <div style={{ display: "flex", gap: isMobile ? 6 : 8, flexWrap: "wrap" }}>
            {props.milestonePreviews.map((m) => (
              <button
                key={m.id}
                onClick={() => sendFollowUpMessage(`Tell me about the career milestone ${m.id}`)}
                style={{
                  padding: "6px 12px",
                  border: `1px solid ${c.border}`,
                  borderRadius: 999,
                  fontSize: isMobile ? 12 : 13,
                  backgroundColor: c.panel,
                  color: c.text,
                  cursor: "pointer",
                  textAlign: "left",
                  wordBreak: "break-word",
                  overflowWrap: "anywhere",
                }}
                title={m.title}
              >
                <span style={{ color: c.sub, marginRight: 6 }}>{m.year}</span>
                <span>{m.title}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </McpUseProvider>
  );
}
