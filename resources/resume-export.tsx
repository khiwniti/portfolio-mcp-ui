import { McpUseProvider, useWidget, useWidgetTheme, type WidgetMetadata } from "mcp-use/react";
import { useState } from "react";
import { z } from "zod";

const sectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  score: z.number(),
  matched: z.array(z.string()),
  content: z.string(),
});

const propsSchema = z.object({
  candidateName: z.string(),
  email: z.string(),
  phone: z.string().optional(),
  location: z.string().optional(),
  website: z.string().optional(),
  linkedIn: z.string().optional(),
  github: z.string().optional(),
  jdSnippet: z.string(),
  matchScore: z.number(),
  matchedKeywords: z.array(z.string()),
  missedKeywords: z.array(z.string()),
  sections: z.array(sectionSchema),
  generatedAt: z.string(),
});

export const widgetMetadata: WidgetMetadata = {
  description: "JD-tailored print-ready resume with match score, matched keywords, and provenance footnotes",
  props: propsSchema,
  exposeAsTool: false,
};

type Props = z.infer<typeof propsSchema>;

function useViewport() {
  if (typeof window === "undefined") return { isMobile: false };
  return { isMobile: window.innerWidth < 640 };
}

function ScoreMeter({ score, theme }: { score: number; theme: string }) {
  const fill = score >= 80 ? "#22c55e" : score >= 55 ? "#f59e0b" : "#ef4444";
  const bg = theme === "dark" ? "#1e293b" : "#f1f5f9";
  const text = theme === "dark" ? "#e2e8f0" : "#1e293b";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <svg width={56} height={56} viewBox="0 0 56 56" style={{ flexShrink: 0 }}>
        <circle cx={28} cy={28} r={23} fill="none" stroke={bg} strokeWidth={6} />
        <circle
          cx={28} cy={28} r={23} fill="none" stroke={fill} strokeWidth={6}
          strokeDasharray={`${(score / 100) * 144.51} 144.51`}
          strokeLinecap="round"
          transform="rotate(-90 28 28)"
        />
        <text x={28} y={33} textAnchor="middle" fontSize={13} fontWeight="700" fill={fill}>{score}%</text>
      </svg>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: text }}>JD Match Score</div>
        <div style={{ fontSize: 11, color: theme === "dark" ? "#94a3b8" : "#64748b", marginTop: 2 }}>
          {score >= 80 ? "Strong match" : score >= 55 ? "Moderate match" : "Weak match"}
        </div>
      </div>
    </div>
  );
}

function KeywordPill({ word, hit, theme }: { word: string; hit: boolean; theme: string }) {
  const bg = hit
    ? (theme === "dark" ? "#14532d" : "#dcfce7")
    : (theme === "dark" ? "#3f1212" : "#fee2e2");
  const clr = hit
    ? (theme === "dark" ? "#86efac" : "#15803d")
    : (theme === "dark" ? "#fca5a5" : "#b91c1c");
  return (
    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 12, backgroundColor: bg, color: clr, fontSize: 11, fontWeight: 500, lineHeight: "18px" }}>
      {hit ? "✓" : "✗"} {word}
    </span>
  );
}

export default function ResumeExport() {
  const { props, isPending } = useWidget<Props>();
  const theme = useWidgetTheme();
  const { isMobile } = useViewport();
  const [showPanel, setShowPanel] = useState(true);

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div style={{ padding: 32, textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
          Building tailored resume...
        </div>
      </McpUseProvider>
    );
  }

  const bg = theme === "dark" ? "#0f172a" : "#ffffff";
  const text = theme === "dark" ? "#e2e8f0" : "#0f172a";
  const muted = theme === "dark" ? "#94a3b8" : "#64748b";
  const border = theme === "dark" ? "#1e293b" : "#e2e8f0";
  const toolbarBg = theme === "dark" ? "#1e293b" : "#f8fafc";
  const toolbarBorder = theme === "dark" ? "#334155" : "#e2e8f0";
  const sectionHl = theme === "dark" ? "#1e3a5f" : "#eff6ff";
  const sectionBorder = theme === "dark" ? "#1e40af" : "#bfdbfe";

  const handlePrint = () => {
    window.print();
  };

  return (
    <McpUseProvider autoSize>
      <style>{`
        @media print {
          .resume-toolbar { display: none !important; }
          .resume-analysis { display: none !important; }
          .resume-page { box-shadow: none !important; border: none !important; max-width: 100% !important; padding: 0 !important; }
          .resume-section { page-break-inside: avoid; }
          body { background: white !important; }
        }
      `}</style>

      <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", backgroundColor: bg, color: text, minHeight: "100vh" }}>

        {/* Toolbar */}
        <div className="resume-toolbar" style={{ position: "sticky", top: 0, zIndex: 10, backgroundColor: toolbarBg, borderBottom: `1px solid ${toolbarBorder}`, padding: "10px 20px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <ScoreMeter score={props.matchScore} theme={theme} />
          <div style={{ flex: 1 }} />
          <button
            onClick={() => setShowPanel(!showPanel)}
            style={{ padding: "6px 14px", fontSize: 13, borderRadius: 6, border: `1px solid ${toolbarBorder}`, backgroundColor: "transparent", color: text, cursor: "pointer" }}
          >
            {showPanel ? "Hide" : "Show"} Analysis
          </button>
          <button
            onClick={handlePrint}
            style={{ padding: "7px 18px", fontSize: 13, fontWeight: 600, borderRadius: 6, border: "none", backgroundColor: "#2563eb", color: "#fff", cursor: "pointer" }}
          >
            Print / Save PDF
          </button>
        </div>

        {/* Analysis panel */}
        {showPanel && (
          <div className="resume-analysis" style={{ padding: "16px 20px", backgroundColor: toolbarBg, borderBottom: `1px solid ${toolbarBorder}` }}>
            <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, color: muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Keyword Analysis</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {props.matchedKeywords.map((w) => <KeywordPill key={w} word={w} hit={true} theme={theme} />)}
              {props.missedKeywords.map((w) => <KeywordPill key={w} word={w} hit={false} theme={theme} />)}
            </div>
            {props.jdSnippet && (
              <details style={{ marginTop: 10 }}>
                <summary style={{ fontSize: 12, color: muted, cursor: "pointer" }}>Job description excerpt</summary>
                <p style={{ margin: "6px 0 0", fontSize: 12, color: muted, whiteSpace: "pre-wrap", maxHeight: 120, overflow: "auto", padding: 8, backgroundColor: bg, borderRadius: 4, border: `1px solid ${border}` }}>{props.jdSnippet}</p>
              </details>
            )}
          </div>
        )}

        {/* Resume document */}
        <div className="resume-page" style={{ maxWidth: 780, margin: "24px auto", padding: isMobile ? "16px" : "40px 48px", backgroundColor: bg, boxShadow: theme === "dark" ? "0 0 0 1px #1e293b" : "0 1px 3px rgba(0,0,0,.12)", borderRadius: 8 }}>

          {/* Header */}
          <div style={{ textAlign: "center", borderBottom: `2px solid ${border}`, paddingBottom: 18, marginBottom: 24 }}>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: "0.01em" }}>{props.candidateName}</h1>
            <div style={{ marginTop: 8, display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "4px 16px" }}>
              {props.email && <span style={{ fontSize: 13, color: muted }}>&#9993; {props.email}</span>}
              {props.phone && <span style={{ fontSize: 13, color: muted }}>&#9742; {props.phone}</span>}
              {props.location && <span style={{ fontSize: 13, color: muted }}>&#128205; {props.location}</span>}
              {props.website && <span style={{ fontSize: 13, color: muted }}>&#127760; {props.website}</span>}
              {props.linkedIn && <span style={{ fontSize: 13, color: muted }}>in {props.linkedIn}</span>}
              {props.github && <span style={{ fontSize: 13, color: muted }}>&#9733; {props.github}</span>}
            </div>
          </div>

          {/* Sections */}
          {props.sections.map((sec, idx) => (
            <div key={sec.id} className="resume-section" style={{ marginBottom: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: text }}>{sec.title}</h2>
                {sec.score > 0 && (
                  <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 10, backgroundColor: sectionHl, color: "#1d4ed8", border: `1px solid ${sectionBorder}` }}>
                    {sec.score}% match
                  </span>
                )}
                <div style={{ flex: 1, height: 1, backgroundColor: border }} />
              </div>
              {sec.matched.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                  {sec.matched.map((kw) => (
                    <span key={kw} style={{ fontSize: 10, padding: "1px 6px", borderRadius: 10, backgroundColor: "#dcfce7", color: "#15803d" }}>{kw}</span>
                  ))}
                </div>
              )}
              <div style={{ fontSize: 13, color: text, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{sec.content}</div>
              {idx < props.sections.length - 1 && <div style={{ marginTop: 6 }} />}
            </div>
          ))}

          {/* Footer provenance */}
          <div style={{ marginTop: 28, paddingTop: 12, borderTop: `1px solid ${border}`, fontSize: 10, color: muted, textAlign: "right" }}>
            Generated {new Date(props.generatedAt).toLocaleString()} · Tailored via Portfolio MCP UI · KG-enriched
          </div>
        </div>
      </div>
    </McpUseProvider>
  );
}
