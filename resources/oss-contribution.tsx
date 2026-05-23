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
  title: z.string(),
  repo: z.string(),
  type: z.string(),
  mergedAt: z.string().optional(),
  additions: z.number().optional(),
  deletions: z.number().optional(),
  description: z.string(),
  impact: z.string(),
  reviewers: z.array(z.string()),
  lessonsLearned: z.string(),
  siblings: z.array(z.object({ id: z.string(), title: z.string() })),
});

type Props = z.infer<typeof propsSchema>;

export const widgetMetadata: WidgetMetadata = {
  description:
    "Single open-source contribution detail — repo, additions/deletions, impact, reviewers, lessons learned.",
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
    add: "#22c55e",
    del: "#ef4444",
  };
}

export default function OssContribution() {
  const { props, isPending, sendFollowUpMessage } = useWidget<Props>();
  const c = useColors();
  const { isMobile } = useViewport();

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div style={{ padding: "clamp(16px, 4vw, 20px)", color: c.sub }}>Loading contribution...</div>
      </McpUseProvider>
    );
  }

  return (
    <McpUseProvider autoSize>
      <div style={{ padding: "clamp(16px, 4vw, 20px)", backgroundColor: c.bg, color: c.text, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div style={{ fontSize: 12, color: c.sub, marginBottom: 6 }}>
          {props.breadcrumb.join("  ›  ")}
        </div>
        <h2 style={{ margin: "0 0 4px 0", fontSize: "clamp(18px, 4vw, 24px)", fontWeight: 600, wordBreak: "break-word", overflowWrap: "anywhere" }}>{props.title}</h2>
        <div
          style={{
            fontFamily: "ui-monospace, SFMono-Regular, monospace",
            fontSize: 13,
            color: c.sub,
            marginBottom: 14,
            wordBreak: "break-all",
          }}
        >
          {props.repo}
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <span
            style={{
              padding: "4px 10px",
              border: `1px solid ${c.border}`,
              borderRadius: 999,
              fontSize: 12,
              backgroundColor: c.panel,
            }}
          >
            {props.type}
          </span>
          {props.mergedAt && (
            <span
              style={{
                padding: "4px 10px",
                border: `1px solid ${c.border}`,
                borderRadius: 999,
                fontSize: 12,
                backgroundColor: c.panel,
              }}
            >
              {props.mergedAt}
            </span>
          )}
          {props.additions !== undefined && (
            <span
              style={{
                padding: "4px 10px",
                border: `1px solid ${c.border}`,
                borderRadius: 999,
                fontSize: 12,
                backgroundColor: c.panel,
                fontFamily: "ui-monospace, SFMono-Regular, monospace",
              }}
            >
              <span style={{ color: c.add }}>+{props.additions}</span>
              {props.deletions !== undefined && (
                <span style={{ color: c.del, marginLeft: 6 }}>−{props.deletions}</span>
              )}
            </span>
          )}
        </div>

        <section style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub, marginBottom: 6 }}>
            Description
          </div>
          <p style={{ margin: 0, lineHeight: 1.6, wordBreak: "break-word", overflowWrap: "anywhere" }}>{props.description}</p>
        </section>

        <section style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub, marginBottom: 6 }}>
            Impact
          </div>
          <div
            style={{
              padding: "clamp(12px, 3vw, 20px)",
              borderLeft: `3px solid ${c.accent}`,
              backgroundColor: c.panel,
              borderRadius: 4,
              wordBreak: "break-word",
              overflowWrap: "anywhere",
            }}
          >
            {props.impact}
          </div>
        </section>

        {props.reviewers.length > 0 && (
          <section style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub, marginBottom: 6 }}>
              Reviewers
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {props.reviewers.map((r) => (
                <span
                  key={r}
                  style={{
                    padding: "3px 8px",
                    border: `1px solid ${c.border}`,
                    borderRadius: 4,
                    fontSize: 12,
                    backgroundColor: c.panel,
                    fontFamily: "ui-monospace, SFMono-Regular, monospace",
                    wordBreak: "break-all",
                  }}
                >
                  {r}
                </span>
              ))}
            </div>
          </section>
        )}

        <section style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub, marginBottom: 6 }}>
            Lessons learned
          </div>
          <p style={{ margin: 0, lineHeight: 1.6, fontSize: 13, wordBreak: "break-word", overflowWrap: "anywhere" }}>{props.lessonsLearned}</p>
        </section>

        {props.siblings.length > 0 && (
          <section style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub, marginBottom: 6 }}>
              Other contributions
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {props.siblings.map((s) => (
                <button
                  key={s.id}
                  onClick={() => sendFollowUpMessage(`Show open-source contribution ${s.id}`)}
                  style={{
                    padding: "4px 10px",
                    border: `1px solid ${c.border}`,
                    borderRadius: 999,
                    backgroundColor: c.panel,
                    color: c.text,
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                  title={s.title}
                >
                  {s.title.length > 40 ? s.title.slice(0, 40) + "…" : s.title}
                </button>
              ))}
            </div>
          </section>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button
            onClick={() => sendFollowUpMessage("Show the open source section")}
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
            ← Open source
          </button>
        </div>
      </div>
    </McpUseProvider>
  );
}
