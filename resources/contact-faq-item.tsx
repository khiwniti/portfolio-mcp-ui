import {
  McpUseProvider,
  useWidget,
  useWidgetTheme,
  type WidgetMetadata,
} from "mcp-use/react";
import { useEffect, useState } from "react";
import { z } from "zod";

const propsSchema = z.object({
  breadcrumb: z.array(z.string()),
  id: z.string(),
  question: z.string(),
  answer: z.string(),
  siblings: z.array(z.object({ id: z.string(), question: z.string() })),
});

type Props = z.infer<typeof propsSchema>;

export const widgetMetadata: WidgetMetadata = {
  description: "Single contact FAQ item with full answer and sibling links.",
  props: propsSchema,
  exposeAsTool: false,
};

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

export default function ContactFAQItem() {
  const { props, isPending, sendFollowUpMessage } = useWidget<Props>();
  const c = useColors();
  const { isMobile } = useViewport();

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div style={{ padding: "clamp(16px, 4vw, 20px)", color: c.sub }}>Loading...</div>
      </McpUseProvider>
    );
  }

  return (
    <McpUseProvider autoSize>
      <div style={{ padding: "clamp(16px, 4vw, 20px)", backgroundColor: c.bg, color: c.text, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div style={{ fontSize: 12, color: c.sub, marginBottom: 6 }}>
          {props.breadcrumb.join("  ›  ")}
        </div>
        <h2 style={{ margin: "0 0 12px 0", fontSize: "clamp(18px, 4vw, 24px)", fontWeight: 600, wordBreak: "break-word", overflowWrap: "anywhere" }}>{props.question}</h2>

        <div
          style={{
            padding: "clamp(12px, 3vw, 20px)",
            border: `1px solid ${c.border}`,
            borderLeft: `3px solid ${c.accent}`,
            borderRadius: 6,
            backgroundColor: c.panel,
            lineHeight: 1.7,
            marginBottom: 16,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            overflowWrap: "anywhere",
          }}
        >
          {props.answer}
        </div>

        {props.siblings.length > 0 && (
          <section style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub, marginBottom: 6 }}>
              Other questions
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {props.siblings.map((s) => (
                <button
                  key={s.id}
                  onClick={() => sendFollowUpMessage(`Show contact FAQ item ${s.id}`)}
                  style={{
                    padding: "4px 10px",
                    border: `1px solid ${c.border}`,
                    borderRadius: 999,
                    backgroundColor: c.panel,
                    color: c.text,
                    cursor: "pointer",
                    fontSize: 12,
                    wordBreak: "break-word",
                  }}
                >
                  {s.question}
                </button>
              ))}
            </div>
          </section>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button
            onClick={() => sendFollowUpMessage("Show the full contact FAQ")}
            style={{
              padding: "6px 12px",
              background: "none",
              border: `1px solid ${c.border}`,
              borderRadius: 4,
              color: c.text,
              cursor: "pointer",
              fontSize: 12,
              width: isMobile ? "100%" : undefined,
            }}
          >
            ← FAQ overview
          </button>
        </div>
      </div>
    </McpUseProvider>
  );
}
