import { McpUseProvider, useWidget, useWidgetTheme, type WidgetMetadata } from "mcp-use/react";
import { useState, useMemo } from "react";
import { z } from "zod";

const resultSchema = z.object({
  labels: z.array(z.string()),
  title: z.string(),
  snippet: z.string().optional(),
  score: z.number().optional(),
  elementId: z.string().optional(),
  url: z.string().optional(),
});

const propsSchema = z.object({
  query: z.string(),
  results: z.array(resultSchema),
  resultCount: z.number(),
  searchMode: z.enum(["fulltext", "vector", "substring"]),
  tookMs: z.number(),
  searchLabels: z.array(z.string()),
  vectorEnabled: z.boolean(),
  fulltextIndexUsed: z.string().optional(),
});

export const widgetMetadata: WidgetMetadata = {
  description: "Knowledge graph full-text search results — nodes with labels, titles, snippets, and relevance scores",
  props: propsSchema,
  exposeAsTool: false,
};

type Props = z.infer<typeof propsSchema>;
type Result = z.infer<typeof resultSchema>;

const LABEL_COLORS: Record<string, { bg: string; bgDark: string; text: string; textDark: string }> = {
  Technology: { bg: "#eff6ff", bgDark: "#1c2a3d", text: "#1d4ed8", textDark: "#93c5fd" },
  Repo:       { bg: "#f0fdf4", bgDark: "#052e16", text: "#15803d", textDark: "#86efac" },
  Person:     { bg: "#fdf4ff", bgDark: "#2d1054", text: "#7e22ce", textDark: "#d8b4fe" },
  default:    { bg: "#f8fafc", bgDark: "#1e293b", text: "#475569", textDark: "#94a3b8" },
};

function labelColor(label: string, theme: string) {
  const c = LABEL_COLORS[label] ?? LABEL_COLORS.default;
  return theme === "dark"
    ? { bg: c.bgDark, text: c.textDark }
    : { bg: c.bg, text: c.text };
}

function LabelBadge({ label, theme }: { label: string; theme: string }) {
  const { bg, text } = labelColor(label, theme);
  return (
    <span style={{ display: "inline-block", padding: "1px 7px", borderRadius: 10, backgroundColor: bg, color: text, fontSize: 10, fontWeight: 700, letterSpacing: "0.03em" }}>
      {label}
    </span>
  );
}

function ScoreBar({ score, theme }: { score: number; theme: string }) {
  const pct = Math.min(Math.round(score), 100);
  const fill = pct >= 70 ? "#22c55e" : pct >= 40 ? "#f59e0b" : "#94a3b8";
  const trackBg = theme === "dark" ? "#1e293b" : "#f1f5f9";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 60, height: 4, borderRadius: 2, backgroundColor: trackBg, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", backgroundColor: fill, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 10, color: fill, fontWeight: 600 }}>{pct}</span>
    </div>
  );
}

function ResultCard({ result, theme }: { result: Result; theme: string }) {
  const bg = theme === "dark" ? "#161b22" : "#f8fafc";
  const border = theme === "dark" ? "#30363d" : "#e2e8f0";
  const text = theme === "dark" ? "#e6edf3" : "#1e293b";
  const muted = theme === "dark" ? "#7d8590" : "#64748b";
  const linkColor = theme === "dark" ? "#58a6ff" : "#2563eb";

  return (
    <div style={{ padding: 14, backgroundColor: bg, border: `1px solid ${border}`, borderRadius: 8, display: "flex", flexDirection: "column", gap: 7 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, flex: 1, minWidth: 0 }}>
          {result.labels.map((l) => (
            <LabelBadge key={l} label={l} theme={theme} />
          ))}
        </div>
        {result.score != null && <ScoreBar score={result.score * 100} theme={theme} />}
      </div>

      {result.url ? (
        <a
          href={result.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 14, fontWeight: 600, color: linkColor, textDecoration: "none", wordBreak: "break-word" }}
        >
          {result.title}
        </a>
      ) : (
        <span style={{ fontSize: 14, fontWeight: 600, color: text, wordBreak: "break-word" }}>{result.title}</span>
      )}

      {result.snippet && (
        <p style={{ margin: 0, fontSize: 12, color: muted, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {result.snippet}
        </p>
      )}

      {result.elementId && (
        <span style={{ fontSize: 10, color: muted, fontFamily: "monospace" }}>id: {result.elementId.slice(0, 24)}…</span>
      )}
    </div>
  );
}

export default function KgSearchResults() {
  const { props, isPending } = useWidget<Props>();
  const theme = useWidgetTheme();
  const [labelFilter, setLabelFilter] = useState<string>("all");

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div style={{ padding: 32, textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
          Searching knowledge graph...
        </div>
      </McpUseProvider>
    );
  }

  const bg = theme === "dark" ? "#0d1117" : "#ffffff";
  const text = theme === "dark" ? "#e6edf3" : "#1e293b";
  const muted = theme === "dark" ? "#7d8590" : "#64748b";
  const border = theme === "dark" ? "#30363d" : "#e2e8f0";
  const toolbarBg = theme === "dark" ? "#161b22" : "#f8fafc";
  const modeBadgeBg = props.searchMode === "fulltext"
    ? (theme === "dark" ? "#1c2a3d" : "#eff6ff")
    : props.searchMode === "vector"
    ? (theme === "dark" ? "#2d1054" : "#fdf4ff")
    : (theme === "dark" ? "#1e293b" : "#f1f5f9");
  const modeBadgeText = props.searchMode === "fulltext"
    ? (theme === "dark" ? "#93c5fd" : "#1d4ed8")
    : props.searchMode === "vector"
    ? (theme === "dark" ? "#d8b4fe" : "#7e22ce")
    : muted;

  // Collect all unique labels across results
  const allLabels = useMemo(() => {
    const set = new Set<string>();
    props.results.forEach((r) => r.labels.forEach((l) => set.add(l)));
    return ["all", ...Array.from(set).sort()];
  }, [props.results]);

  const filtered = labelFilter === "all"
    ? props.results
    : props.results.filter((r) => r.labels.includes(labelFilter));

  return (
    <McpUseProvider autoSize>
      <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", backgroundColor: bg, color: text }}>

        {/* Header bar */}
        <div style={{ padding: "14px 20px", backgroundColor: toolbarBg, borderBottom: `1px solid ${border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            <div style={{ flex: 1, padding: "8px 12px", backgroundColor: bg, border: `1px solid ${border}`, borderRadius: 6, fontSize: 14, color: muted, fontStyle: "italic", minWidth: 0 }}>
              {props.query}
            </div>
            <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: 10, backgroundColor: modeBadgeBg, color: modeBadgeText, fontSize: 11, fontWeight: 700 }}>
              {props.searchMode === "fulltext" ? "Full-text index" : props.searchMode === "vector" ? "Vector search" : "Substring match"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {allLabels.map((l) => (
                <button
                  key={l}
                  onClick={() => setLabelFilter(l)}
                  style={{
                    padding: "4px 12px",
                    fontSize: 12,
                    borderRadius: 6,
                    border: `1px solid ${labelFilter === l ? "transparent" : border}`,
                    backgroundColor: labelFilter === l
                      ? (l === "all" ? "#2563eb" : labelColor(l, theme).bg)
                      : "transparent",
                    color: labelFilter === l
                      ? (l === "all" ? "#fff" : labelColor(l, theme).text)
                      : muted,
                    cursor: "pointer",
                    fontWeight: labelFilter === l ? 600 : 400,
                  }}
                >
                  {l === "all" ? `All (${props.resultCount})` : l}
                </button>
              ))}
            </div>
            <span style={{ fontSize: 12, color: muted }}>{props.tookMs}ms</span>
          </div>
        </div>

        {/* Results list */}
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: muted }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>&#128269;</div>
              <p style={{ margin: 0, fontSize: 14 }}>No results found for &ldquo;{props.query}&rdquo;.</p>
              {props.searchLabels.length > 0 && (
                <p style={{ margin: "8px 0 0", fontSize: 12, color: muted }}>
                  Filtered to: {props.searchLabels.join(", ")}
                </p>
              )}
            </div>
          ) : (
            filtered.map((r, i) => (
              <ResultCard key={r.elementId ?? `${r.title}-${i}`} result={r} theme={theme} />
            ))
          )}
        </div>

        {/* Footer */}
        {filtered.length > 0 && (
          <div style={{ padding: "0 20px 16px", fontSize: 11, color: muted, textAlign: "right" }}>
            {filtered.length} of {props.resultCount} result{props.resultCount !== 1 ? "s" : ""} shown
            {props.vectorEnabled && " · vector search enabled"}
          </div>
        )}
      </div>
    </McpUseProvider>
  );
}
