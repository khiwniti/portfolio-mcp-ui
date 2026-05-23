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
  summary: z.string(),
  milestones: z.array(
    z.object({
      id: z.string(),
      year: z.string(),
      title: z.string(),
      body: z.string(),
      lesson: z.string(),
    })
  ),
});

type Props = z.infer<typeof propsSchema>;

export const widgetMetadata: WidgetMetadata = {
  description: "Career journey timeline with year-by-year milestones and lessons.",
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

export default function CareerJourney() {
  const { props, isPending, sendFollowUpMessage } = useWidget<Props>();
  const c = useColors();
  const { isMobile } = useViewport();

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div style={{ padding: "clamp(14px, 4vw, 20px)", color: c.sub }}>Loading career journey...</div>
      </McpUseProvider>
    );
  }

  return (
    <McpUseProvider autoSize>
      <div style={{ padding: isMobile ? 16 : 20, backgroundColor: c.bg, color: c.text, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div style={{ fontSize: 12, color: c.sub, marginBottom: 6, wordBreak: "break-word", overflowWrap: "anywhere" }}>
          {props.breadcrumb.join("  ›  ")}
        </div>
        <h2 style={{ margin: "0 0 6px 0", fontSize: isMobile ? 18 : 20, fontWeight: 600 }}>Career journey</h2>
        <p style={{ margin: "0 0 20px 0", fontSize: isMobile ? 13 : 14, color: c.sub, wordBreak: "break-word", overflowWrap: "anywhere" }}>{props.summary}</p>

        <div style={{ position: "relative", paddingLeft: 24 }}>
          <div
            style={{
              position: "absolute",
              left: 8,
              top: 4,
              bottom: 4,
              width: 2,
              backgroundColor: c.border,
            }}
          />
          {props.milestones.map((m) => (
            <div key={m.id} style={{ position: "relative", marginBottom: 16 }}>
              <div
                style={{
                  position: "absolute",
                  left: -22,
                  top: 6,
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  backgroundColor: c.accent,
                  border: `2px solid ${c.bg}`,
                }}
              />
              <div
                style={{
                  padding: isMobile ? 10 : 12,
                  border: `1px solid ${c.border}`,
                  borderRadius: 8,
                  backgroundColor: c.panel,
                  wordBreak: "break-word",
                  overflowWrap: "anywhere",
                }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "baseline", gap: isMobile ? 6 : 8 }}>
                  <div style={{ fontWeight: 600, wordBreak: "break-word", overflowWrap: "anywhere" }}>{m.title}</div>
                  <div style={{ fontSize: 12, color: c.sub }}>{m.year}</div>
                </div>
                <div style={{ fontSize: isMobile ? 12 : 13, color: c.sub, marginTop: 4, lineHeight: 1.5, wordBreak: "break-word", overflowWrap: "anywhere" }}>{m.body}</div>
                <div
                  style={{
                    fontSize: 12,
                    color: c.accent,
                    marginTop: 8,
                    paddingLeft: 8,
                    borderLeft: `2px solid ${c.accent}`,
                    wordBreak: "break-word",
                    overflowWrap: "anywhere",
                  }}
                >
                  Lesson: {m.lesson}
                </div>
                <button
                  onClick={() => sendFollowUpMessage(`Tell me about the career milestone ${m.id}`)}
                  style={{
                    marginTop: 8,
                    padding: "4px 10px",
                    background: "none",
                    border: `1px solid ${c.border}`,
                    borderRadius: 4,
                    color: c.accent,
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  Drill in →
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => sendFollowUpMessage("Back to the about section")}
          style={{
            marginTop: 12,
            padding: "6px 12px",
            background: "none",
            border: `1px solid ${c.border}`,
            borderRadius: 4,
            color: c.text,
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          ← Back to About
        </button>
      </div>
    </McpUseProvider>
  );
}
