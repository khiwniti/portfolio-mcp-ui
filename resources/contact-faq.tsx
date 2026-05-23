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
  intro: z.string(),
  items: z.array(
    z.object({ id: z.string(), question: z.string(), preview: z.string() })
  ),
});

type Props = z.infer<typeof propsSchema>;

export const widgetMetadata: WidgetMetadata = {
  description:
    "Contact FAQ overview — common questions about consulting, relocation, mentoring, speaking, and outreach.",
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

export default function ContactFAQ() {
  const { props, isPending, sendFollowUpMessage } = useWidget<Props>();
  const c = useColors();
  const { isMobile } = useViewport();

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div style={{ padding: "clamp(16px, 4vw, 20px)", color: c.sub }}>Loading FAQ...</div>
      </McpUseProvider>
    );
  }

  return (
    <McpUseProvider autoSize>
      <div style={{ padding: "clamp(16px, 4vw, 20px)", backgroundColor: c.bg, color: c.text, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div style={{ fontSize: 12, color: c.sub, marginBottom: 6 }}>
          {props.breadcrumb.join("  ›  ")}
        </div>
        <h2 style={{ margin: "0 0 4px 0", fontSize: "clamp(18px, 4vw, 24px)", fontWeight: 600 }}>Frequently asked</h2>
        <p style={{ margin: "0 0 16px 0", color: c.sub, wordBreak: "break-word", overflowWrap: "anywhere" }}>{props.intro}</p>

        <div style={{ display: "grid", gap: 10 }}>
          {props.items.map((it) => (
            <button
              key={it.id}
              onClick={() => sendFollowUpMessage(`Show contact FAQ item ${it.id}`)}
              style={{
                padding: "clamp(12px, 3vw, 20px)",
                border: `1px solid ${c.border}`,
                borderRadius: 8,
                backgroundColor: c.panel,
                color: c.text,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4, wordBreak: "break-word", overflowWrap: "anywhere" }}>{it.question}</div>
              <div style={{ fontSize: 13, color: c.sub, lineHeight: 1.5, wordBreak: "break-word", overflowWrap: "anywhere" }}>{it.preview}</div>
            </button>
          ))}
        </div>

        <button
          onClick={() => sendFollowUpMessage("Show the contact section")}
          style={{
            marginTop: 14,
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
          ← Contact
        </button>
      </div>
    </McpUseProvider>
  );
}
