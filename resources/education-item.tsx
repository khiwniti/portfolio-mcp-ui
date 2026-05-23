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
  id: z.string(),
  kind: z.enum(["degree", "certification"]),
  institution: z.string(),
  title: z.string(),
  period: z.string(),
  // degree fields
  gpa: z.string().optional(),
  focusAreas: z.array(z.string()).optional(),
  thesis: z.string().optional(),
  thesisAdvisor: z.string().optional(),
  keyCourses: z
    .array(
      z.object({
        code: z.string(),
        name: z.string(),
        grade: z.string(),
        reflection: z.string(),
      })
    )
    .optional(),
  awards: z.array(z.string()).optional(),
  activities: z.array(z.string()).optional(),
  // certification fields
  issuedAt: z.string().optional(),
  expiresAt: z.string().optional(),
  credentialId: z.string().optional(),
  skillsCovered: z.array(z.string()).optional(),
  examScore: z.number().optional(),
  passingScore: z.number().optional(),
  // shared
  siblings: z.array(
    z.object({ id: z.string(), institution: z.string(), title: z.string() })
  ),
});

type Props = z.infer<typeof propsSchema>;

export const widgetMetadata: WidgetMetadata = {
  description:
    "Single education item — degree (with courses, GPA, thesis) or certification (with exam score, credential id, validity).",
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

export default function EducationItem() {
  const { props, isPending, sendFollowUpMessage } = useWidget<Props>();
  const c = useColors();
  const { isMobile } = useViewport();

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div style={{ padding: 20, color: c.sub }}>Loading education item...</div>
      </McpUseProvider>
    );
  }

  const isDegree = props.kind === "degree";

  return (
    <McpUseProvider autoSize>
      <div style={{ padding: "clamp(14px, 4vw, 20px)", backgroundColor: c.bg, color: c.text, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div style={{ fontSize: 12, color: c.sub, marginBottom: 6, wordBreak: "break-word", overflowWrap: "anywhere" }}>
          {props.breadcrumb.join("  ›  ")}
        </div>
        <div style={{ fontSize: 12, color: c.sub, wordBreak: "break-word", overflowWrap: "anywhere" }}>{props.institution}</div>
        <h2 style={{ margin: "4px 0 4px 0", fontSize: "clamp(18px, 4vw, 20px)", fontWeight: 600, wordBreak: "break-word", overflowWrap: "anywhere" }}>{props.title}</h2>
        <div style={{ fontSize: 13, color: c.sub, marginBottom: 14 }}>{props.period}</div>

        {/* Header stats */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {isDegree && props.gpa && (
            <span style={{ padding: "4px 10px", border: `1px solid ${c.border}`, borderRadius: 999, fontSize: 12, backgroundColor: c.panel }}>
              GPA: {props.gpa}
            </span>
          )}
          {!isDegree && props.examScore !== undefined && (
            <span style={{ padding: "4px 10px", border: `1px solid ${c.border}`, borderRadius: 999, fontSize: 12, backgroundColor: c.panel }}>
              Score: {props.examScore}
              {props.passingScore ? ` / pass ${props.passingScore}` : ""}
            </span>
          )}
          {!isDegree && props.issuedAt && (
            <span style={{ padding: "4px 10px", border: `1px solid ${c.border}`, borderRadius: 999, fontSize: 12, backgroundColor: c.panel }}>
              Issued: {props.issuedAt}
            </span>
          )}
          {!isDegree && props.expiresAt && (
            <span style={{ padding: "4px 10px", border: `1px solid ${c.border}`, borderRadius: 999, fontSize: 12, backgroundColor: c.panel }}>
              Expires: {props.expiresAt}
            </span>
          )}
          {!isDegree && props.credentialId && (
            <span style={{ padding: "4px 10px", border: `1px solid ${c.border}`, borderRadius: 999, fontSize: 12, backgroundColor: c.panel, fontFamily: "ui-monospace, SFMono-Regular, monospace" }}>
              {props.credentialId}
            </span>
          )}
        </div>

        {isDegree && props.focusAreas && props.focusAreas.length > 0 && (
          <section style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub, marginBottom: 6 }}>
              Focus areas
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {props.focusAreas.map((f) => (
                <span key={f} style={{ padding: "3px 8px", border: `1px solid ${c.border}`, borderRadius: 4, fontSize: 12, backgroundColor: c.panel }}>
                  {f}
                </span>
              ))}
            </div>
          </section>
        )}

        {isDegree && props.thesis && (
          <section style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub, marginBottom: 6 }}>
              Thesis
            </div>
            <div style={{ lineHeight: 1.6, fontSize: 14, wordBreak: "break-word", overflowWrap: "anywhere" }}>{props.thesis}</div>
            {props.thesisAdvisor && (
              <div style={{ fontSize: 12, color: c.sub, marginTop: 4, wordBreak: "break-word", overflowWrap: "anywhere" }}>Advisor: {props.thesisAdvisor}</div>
            )}
          </section>
        )}

        {isDegree && props.keyCourses && props.keyCourses.length > 0 && (
          <section style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub, marginBottom: 6 }}>
              Key courses
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {props.keyCourses.map((cr) => (
                <div
                  key={cr.code}
                  style={{
                    padding: "8px 10px",
                    border: `1px solid ${c.border}`,
                    borderRadius: 6,
                    backgroundColor: c.panel,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: isMobile ? "column" : "row",
                      justifyContent: "space-between",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>
                      <span style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 12, color: c.sub, marginRight: 8 }}>
                        {cr.code}
                      </span>
                      <span style={{ fontWeight: 600 }}>{cr.name}</span>
                    </span>
                    <span style={{ fontWeight: 600, color: c.accent }}>{cr.grade}</span>
                  </div>
                  <div style={{ fontSize: 12, color: c.sub, marginTop: 2, wordBreak: "break-word", overflowWrap: "anywhere" }}>{cr.reflection}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {isDegree && props.awards && props.awards.length > 0 && (
          <section style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub, marginBottom: 6 }}>
              Awards
            </div>
            <ul style={{ margin: 0, paddingLeft: 20, wordBreak: "break-word", overflowWrap: "anywhere" }}>
              {props.awards.map((a, i) => (
                <li key={i} style={{ marginBottom: 2, fontSize: 13 }}>{a}</li>
              ))}
            </ul>
          </section>
        )}

        {isDegree && props.activities && props.activities.length > 0 && (
          <section style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub, marginBottom: 6 }}>
              Activities
            </div>
            <ul style={{ margin: 0, paddingLeft: 20, wordBreak: "break-word", overflowWrap: "anywhere" }}>
              {props.activities.map((a, i) => (
                <li key={i} style={{ marginBottom: 2, fontSize: 13 }}>{a}</li>
              ))}
            </ul>
          </section>
        )}

        {!isDegree && props.skillsCovered && props.skillsCovered.length > 0 && (
          <section style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub, marginBottom: 6 }}>
              Skills covered
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {props.skillsCovered.map((s) => (
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

        {props.siblings.length > 0 && (
          <section style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: c.sub, marginBottom: 6 }}>
              Other credentials
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {props.siblings.map((s) => (
                <button
                  key={s.id}
                  onClick={() => sendFollowUpMessage(`Show education item ${s.id}`)}
                  style={{
                    padding: "4px 10px",
                    border: `1px solid ${c.border}`,
                    borderRadius: 999,
                    backgroundColor: c.panel,
                    color: c.text,
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                  title={`${s.institution} — ${s.title}`}
                >
                  {s.title.length > 40 ? s.title.slice(0, 40) + "…" : s.title}
                </button>
              ))}
            </div>
          </section>
        )}

        <button
          onClick={() => sendFollowUpMessage("Show the education section")}
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
          ← Education
        </button>
      </div>
    </McpUseProvider>
  );
}
