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
  decision: z.string(),
  rationale: z.string(),
  outcome: z.string(),
  alternativesConsidered: z.array(
    z.object({ alt: z.string(), whyNot: z.string() })
  ),
  risksMitigated: z.array(z.string()),
  lessonsLearned: z.array(z.string()),
  relatedSkills: z.array(z.string()),
  siblingDecisions: z.array(
    z.object({ index: z.number(), decision: z.string() })
  ),
});

type Props = z.infer<typeof propsSchema>;

export const widgetMetadata: WidgetMetadata = {
  description:
    "Single technical decision with rationale, outcome, alternatives considered, mitigated risks, and lessons learned.",
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

export default function RoleDecision() {
  const { props, isPending, sendFollowUpMessage } = useWidget<Props>();
  const c = useColors();
  const { isMobile, isTablet } = useViewport();

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div style={{ padding: 20, color: c.sub }}>Loading decision...</div>
      </McpUseProvider>
    );
  }

  const labeled = (label: string, body: string, accent?: boolean) => (
    <div
      key={label}
      style={{
        padding: "clamp(10px, 2.5vw, 12px)",
        border: `1px solid ${c.border}`,
        borderLeft: accent ? `3px solid ${c.accent}` : `1px solid ${c.border}`,
        borderRadius: 6,
        backgroundColor: c.panel,
      }}
    >
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ lineHeight: 1.6, wordBreak: "break-word", overflowWrap: "anywhere" }}>{body}</div>
    </div>
  );

  return (
    <McpUseProvider autoSize>
      <div style={{ padding: isMobile ? 14 : 20, backgroundColor: c.bg, color: c.text, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div style={{ fontSize: 12, color: c.sub, marginBottom: 6, wordBreak: "break-word", overflowWrap: "anywhere" }}>
          {props.breadcrumb.join("  ›  ")}
        </div>
        <h2 style={{ margin: "0 0 8px 0", fontSize: isMobile ? 16 : 20, fontWeight: 600, wordBreak: "break-word", overflowWrap: "anywhere" }}>{props.decision}</h2>
        <div style={{ fontSize: 12, color: c.sub, marginBottom: 14, wordBreak: "break-word", overflowWrap: "anywhere" }}>
          {props.roleCompany} · {props.roleTitle}
        </div>

        <div style={{ display: "grid", gap: isMobile ? 8 : 10, marginBottom: 14 }}>
          {labeled("Rationale", props.rationale)}
          {labeled("Outcome", props.outcome, true)}
        </div>

        {props.alternativesConsidered.length > 0 && (
          <section style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub, marginBottom: 6 }}>
              Alternatives considered
            </div>
            <div style={{ display: "grid", gap: isMobile ? 6 : 8 }}>
              {props.alternativesConsidered.map((a, i) => (
                <div
                  key={i}
                  style={{
                    padding: isMobile ? 8 : 10,
                    border: `1px solid ${c.border}`,
                    borderRadius: 6,
                    backgroundColor: c.panel,
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 2, wordBreak: "break-word", overflowWrap: "anywhere" }}>{a.alt}</div>
                  <div style={{ fontSize: 12, color: c.sub, wordBreak: "break-word", overflowWrap: "anywhere" }}>Why not: {a.whyNot}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {props.risksMitigated.length > 0 && (
          <section style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub, marginBottom: 6 }}>
              Risks mitigated
            </div>
            <ul style={{ margin: 0, paddingLeft: 20, wordBreak: "break-word", overflowWrap: "anywhere" }}>
              {props.risksMitigated.map((r, i) => (
                <li key={i} style={{ marginBottom: 4, fontSize: isMobile ? 12 : 13 }}>{r}</li>
              ))}
            </ul>
          </section>
        )}

        {props.lessonsLearned.length > 0 && (
          <section style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub, marginBottom: 6 }}>
              Lessons learned
            </div>
            <ul style={{ margin: 0, paddingLeft: 20, wordBreak: "break-word", overflowWrap: "anywhere" }}>
              {props.lessonsLearned.map((l, i) => (
                <li key={i} style={{ marginBottom: 4, fontSize: isMobile ? 12 : 13 }}>{l}</li>
              ))}
            </ul>
          </section>
        )}

        {props.relatedSkills.length > 0 && (
          <section style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub, marginBottom: 6 }}>
              Skills exercised
            </div>
            <div style={{ display: "flex", gap: isMobile ? 4 : 6, flexWrap: "wrap" }}>
              {props.relatedSkills.map((s) => (
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

        {props.siblingDecisions.length > 0 && (
          <section style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub, marginBottom: 6 }}>
              Other decisions at {props.roleCompany}
            </div>
            <div style={{ display: "flex", gap: isMobile ? 4 : 6, flexWrap: "wrap" }}>
              {props.siblingDecisions.map((s) => (
                <button
                  key={s.index}
                  onClick={() =>
                    sendFollowUpMessage(
                      `Show role decision #${s.index} at ${props.roleId}`
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
                  title={s.decision}
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
