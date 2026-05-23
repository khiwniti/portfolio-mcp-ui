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

const itemPreview = z.object({
  id: z.string(),
  institution: z.string(),
  title: z.string(),
  period: z.string(),
  signal: z.string(),
});

const propsSchema = z.object({
  breadcrumb: z.array(z.string()),
  summary: z.string(),
  degrees: z.array(itemPreview),
  certifications: z.array(itemPreview),
});

type Props = z.infer<typeof propsSchema>;

export const widgetMetadata: WidgetMetadata = {
  description:
    "Education & certifications overview — degrees and credentials with summary signals; drill in for course list, GPA, exam scores.",
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

export default function Education() {
  const { props, isPending, sendFollowUpMessage } = useWidget<Props>();
  const c = useColors();
  const { isMobile, isTablet } = useViewport();

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div style={{ padding: isMobile ? 16 : 20, color: c.sub }}>Loading education...</div>
      </McpUseProvider>
    );
  }

  const card = (it: z.infer<typeof itemPreview>) => (
    <button
      key={it.id}
      onClick={() => sendFollowUpMessage(`Show education item ${it.id}`)}
      style={{
        padding: isMobile ? 10 : 12,
        border: `1px solid ${c.border}`,
        borderRadius: 8,
        backgroundColor: c.panel,
        color: c.text,
        cursor: "pointer",
        textAlign: "left",
        wordBreak: "break-word",
        overflowWrap: "anywhere",
      }}
    >
      <div style={{ fontSize: 12, color: c.sub, marginBottom: 2 }}>{it.institution}</div>
      <div style={{ fontWeight: 600 }}>{it.title}</div>
      <div style={{ fontSize: 12, color: c.sub, marginTop: 2 }}>{it.period}</div>
      <div style={{ fontSize: 12, color: c.accent, marginTop: 6 }}>{it.signal}</div>
    </button>
  );

  return (
    <McpUseProvider autoSize>
      <div style={{ padding: isMobile ? 16 : 20, backgroundColor: c.bg, color: c.text, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div style={{ fontSize: 12, color: c.sub, marginBottom: 6, wordBreak: "break-word", overflowWrap: "anywhere" }}>
          {props.breadcrumb.join("  ›  ")}
        </div>
        <h2 style={{ margin: "0 0 4px 0", fontSize: isMobile ? 18 : 20, fontWeight: 600 }}>Education & certifications</h2>
        <p style={{ margin: "0 0 16px 0", fontSize: isMobile ? 13 : 14, color: c.sub, wordBreak: "break-word", overflowWrap: "anywhere" }}>{props.summary}</p>

        <section style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub, marginBottom: 8 }}>
            Degrees
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(auto-fill, minmax(min(100%, 240px), 1fr))", gap: isMobile ? 8 : 10 }}>
            {props.degrees.map(card)}
          </div>
        </section>

        <section>
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub, marginBottom: 8 }}>
            Certifications
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(auto-fill, minmax(min(100%, 240px), 1fr))", gap: isMobile ? 8 : 10 }}>
            {props.certifications.map(card)}
          </div>
        </section>
      </div>
    </McpUseProvider>
  );
}
