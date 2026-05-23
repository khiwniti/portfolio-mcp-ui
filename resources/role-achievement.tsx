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
  roleId: z.string(),
  roleCompany: z.string(),
  roleTitle: z.string(),
  index: z.number(),
  headline: z.string(),
  method: z.string(),
  metric: z.string(),
  impact: z.string(),
  skillsApplied: z.array(z.string()),
  collaborators: z.string(),
  timeframe: z.string(),
  siblingAchievements: z.array(
    z.object({ index: z.number(), headline: z.string() })
  ),
});

type Props = z.infer<typeof propsSchema>;

export const widgetMetadata: WidgetMetadata = {
  description:
    "Single achievement breakdown using the method/metric/impact structure that recruiters use to verify outcomes.",
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
    metricBg: dark ? "#162033" : "#eef2ff",
  };
}

export default function RoleAchievement() {
  const { props, isPending, sendFollowUpMessage } = useWidget<Props>();
  const c = useColors();
  const { isMobile } = useViewport();

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div style={{ padding: 20, color: c.sub }}>Loading achievement...</div>
      </McpUseProvider>
    );
  }

  const block = (label: string, body: string) => (
    <div
      key={label}
      style={{
        padding: isMobile ? 10 : 12,
        border: `1px solid ${c.border}`,
        borderRadius: 8,
        backgroundColor: c.panel,
      }}
    >
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ lineHeight: 1.6, fontSize: isMobile ? 13 : 14, wordBreak: "break-word", overflowWrap: "anywhere" }}>{body}</div>
    </div>
  );

  return (
    <McpUseProvider autoSize>
      <div style={{ padding: isMobile ? 16 : 20, backgroundColor: c.bg, color: c.text, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div style={{ fontSize: 12, color: c.sub, marginBottom: 6, wordBreak: "break-word", overflowWrap: "anywhere" }}>
          {props.breadcrumb.join("  ›  ")}
        </div>
        <h2 style={{ margin: "0 0 8px 0", fontSize: isMobile ? 16 : 20, fontWeight: 600, wordBreak: "break-word", overflowWrap: "anywhere" }}>{props.headline}</h2>
        <div style={{ fontSize: 12, color: c.sub, marginBottom: 14, wordBreak: "break-word", overflowWrap: "anywhere" }}>
          {props.roleCompany} · {props.roleTitle} · {props.timeframe}
        </div>

        <div
          style={{
            padding: isMobile ? 12 : 14,
            borderRadius: 8,
            backgroundColor: c.metricBg,
            marginBottom: 14,
            border: `1px solid ${c.border}`,
          }}
        >
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, color: c.accent, marginBottom: 4 }}>
            Quantified outcome
          </div>
          <div style={{ fontSize: isMobile ? 15 : 18, fontWeight: 700, wordBreak: "break-word", overflowWrap: "anywhere" }}>{props.metric}</div>
        </div>

        <div style={{ display: "grid", gap: isMobile ? 8 : 10, marginBottom: 14 }}>
          {block("Method", props.method)}
          {block("Impact", props.impact)}
          {block("Collaborators", props.collaborators)}
        </div>

        {props.skillsApplied.length > 0 && (
          <section style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub, marginBottom: 6 }}>
              Skills applied
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {props.skillsApplied.map((s) => (
                <button
                  key={s}
                  onClick={() => sendFollowUpMessage(`Show skill detail for ${s}`)}
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
                  {s}
                </button>
              ))}
            </div>
          </section>
        )}

        {props.siblingAchievements.length > 0 && (
          <section style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub, marginBottom: 6 }}>
              Other achievements at {props.roleCompany}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {props.siblingAchievements.map((s) => (
                <button
                  key={s.index}
                  onClick={() =>
                    sendFollowUpMessage(
                      `Show role achievement #${s.index} at ${props.roleId}`
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
                  title={s.headline}
                >
                  #{s.index + 1}
                </button>
              ))}
            </div>
          </section>
        )}

        <button
          onClick={() => sendFollowUpMessage(`Show role detail for ${props.roleId}`)}
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
          ← Back to role
        </button>
      </div>
    </McpUseProvider>
  );
}
