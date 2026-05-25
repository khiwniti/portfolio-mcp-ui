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
  summary: z.string(),
  totalStars: z.number(),
  totalContributions: z.number(),
  maintainedRepos: z.number(),
  contributions: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      repo: z.string(),
      type: z.string(),
      mergedAt: z.string().optional(),
      description: z.string(),
    })
  ),
});

type Props = z.infer<typeof propsSchema>;

export const widgetMetadata: WidgetMetadata = {
  description:
    "Open-source overview — aggregate stats, maintained repos, and a list of notable contributions.",
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

export default function OpenSource() {
  const { props, isPending, sendFollowUpMessage } = useWidget<Props>();
  const c = useColors();
  useViewport();

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div style={{ padding: "clamp(16px, 4vw, 20px)", color: c.sub }}>Loading open source...</div>
      </McpUseProvider>
    );
  }

  const badgeColor = (type: string) => {
    if (type.includes("Maintain")) return c.accent;
    if (type.includes("PR")) return "#22c55e";
    if (type.includes("Issue")) return "#f59e0b";
    return c.sub;
  };

  return (
    <McpUseProvider autoSize>
      <div style={{ padding: "clamp(16px, 4vw, 20px)", backgroundColor: c.bg, color: c.text, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div style={{ fontSize: 12, color: c.sub, marginBottom: 6 }}>
          {props.breadcrumb.join("  ›  ")}
        </div>
        <h2 style={{ margin: "0 0 4px 0", fontSize: "clamp(18px, 4vw, 24px)", fontWeight: 600 }}>Open source</h2>
        <p style={{ margin: "0 0 16px 0", color: c.sub, wordBreak: "break-word", overflowWrap: "anywhere" }}>{props.summary}</p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 110px), 1fr))",
            gap: 8,
            marginBottom: 18,
          }}
        >
          {[
            { l: "Aggregate stars", v: props.totalStars.toLocaleString() },
            { l: "Contributions", v: props.totalContributions.toLocaleString() },
            { l: "Repos maintained", v: String(props.maintainedRepos) },
          ].map((s) => (
            <div
              key={s.l}
              style={{
                padding: "clamp(12px, 3vw, 20px)",
                border: `1px solid ${c.border}`,
                borderRadius: 8,
                backgroundColor: c.panel,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 11, color: c.sub, textTransform: "uppercase", letterSpacing: 0.5 }}>{s.l}</div>
              <div style={{ fontSize: "clamp(18px, 4vw, 22px)", fontWeight: 700, color: c.accent, marginTop: 4 }}>{s.v}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub, marginBottom: 8 }}>
          Notable contributions
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {props.contributions.map((ct) => (
            <button
              key={ct.id}
              onClick={() => sendFollowUpMessage(`Show open-source contribution ${ct.id}`)}
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 600, wordBreak: "break-word", overflowWrap: "anywhere" }}>{ct.title}</div>
                <span
                  style={{
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 999,
                    color: c.bg,
                    backgroundColor: badgeColor(ct.type),
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    flexShrink: 0,
                  }}
                >
                  {ct.type}
                </span>
              </div>
              <div style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 12, color: c.sub, marginTop: 2, wordBreak: "break-all" }}>
                {ct.repo}
              </div>
              <div style={{ fontSize: 13, color: c.sub, marginTop: 6, lineHeight: 1.5, wordBreak: "break-word", overflowWrap: "anywhere" }}>{ct.description}</div>
              {ct.mergedAt && (
                <div style={{ fontSize: 11, color: c.sub, marginTop: 4 }}>Merged {ct.mergedAt}</div>
              )}
            </button>
          ))}
        </div>
      </div>
    </McpUseProvider>
  );
}
