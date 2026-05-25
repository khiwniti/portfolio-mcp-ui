import { useEffect, useState } from "react";
import {
  McpUseProvider,
  useWidget,
  useWidgetTheme,
  useCallTool,
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
  connected: z.boolean(),
  database: z.string(),
  instanceName: z.string().optional(),
  uri: z.string().optional(),
  pingMs: z.number().optional(),
  totalNodes: z.number(),
  totalRelationships: z.number(),
  labels: z.array(z.object({ label: z.string(), count: z.number() })),
  relationshipTypes: z.array(z.object({ type: z.string(), count: z.number() })),
  reason: z.string().optional(),
  generatedAt: z.string(),
});

type Props = z.infer<typeof propsSchema>;

export const widgetMetadata: WidgetMetadata = {
  description:
    "Knowledge graph overview dashboard — live connection status, node/relationship counts by label, and per-type relationship totals from the Neo4j Aura instance backing this portfolio.",
  props: propsSchema,
  exposeAsTool: false,
};

function useColors() {
  const theme = useWidgetTheme();
  const dark = theme === "dark";
  return {
    bg: dark ? "#0f1115" : "#ffffff",
    panel: dark ? "#161a22" : "#fafafa",
    panelStrong: dark ? "#1c2230" : "#f1f4f9",
    text: dark ? "#e6e8ec" : "#0f1115",
    sub: dark ? "#9aa3b2" : "#5a6473",
    border: dark ? "#2a313d" : "#e6e8ec",
    accent: dark ? "#7aa2ff" : "#3460ff",
    accentBg: dark ? "rgba(122,162,255,0.12)" : "rgba(52,96,255,0.08)",
    good: dark ? "#52d18e" : "#0d9f5d",
    goodBg: dark ? "rgba(82,209,142,0.16)" : "rgba(13,159,93,0.10)",
    bad: dark ? "#ff7a7a" : "#c62828",
    badBg: dark ? "rgba(255,122,122,0.14)" : "rgba(198,40,40,0.10)",
    warn: dark ? "#f1c674" : "#b87b00",
  };
}

export default function KgOverview() {
  const { props, isPending, sendFollowUpMessage } = useWidget<Props>();
  const c = useColors();
  const { isMobile, isTablet } = useViewport();
  const { callTool: refresh, isPending: isRefreshing } = useCallTool("kg_health");

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div style={{ padding: "clamp(14px, 4vw, 20px)", color: c.sub }}>
          Loading knowledge graph status...
        </div>
      </McpUseProvider>
    );
  }

  const maxLabel = Math.max(1, ...props.labels.map((l) => l.count));
  const maxRel = Math.max(1, ...props.relationshipTypes.map((r) => r.count));

  const statusBadge = props.connected
    ? { label: "Connected", fg: c.good, bg: c.goodBg }
    : { label: "Offline", fg: c.bad, bg: c.badBg };

  return (
    <McpUseProvider autoSize>
      <div
        style={{
          padding: isMobile ? 16 : 20,
          backgroundColor: c.bg,
          color: c.text,
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Breadcrumb */}
        <div
          style={{
            fontSize: 12,
            color: c.sub,
            marginBottom: 10,
            wordBreak: "break-word",
            overflowWrap: "anywhere",
          }}
        >
          {props.breadcrumb.join("  ›  ")}
        </div>

        {/* Header */}
        <div
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            alignItems: isMobile ? "flex-start" : "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: isMobile ? 18 : 22,
                fontWeight: 700,
                letterSpacing: -0.2,
              }}
            >
              Knowledge Graph
            </h2>
            <div style={{ fontSize: 13, color: c.sub, marginTop: 4 }}>
              {props.instanceName ? (
                <>
                  Aura instance <strong style={{ color: c.text }}>{props.instanceName}</strong>{" "}
                  &middot; database <strong style={{ color: c.text }}>{props.database}</strong>
                </>
              ) : (
                <>Neo4j database {props.database}</>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                color: statusBadge.fg,
                backgroundColor: statusBadge.bg,
                border: `1px solid ${statusBadge.fg}33`,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: statusBadge.fg,
                  boxShadow: props.connected ? `0 0 0 4px ${statusBadge.bg}` : "none",
                }}
              />
              {statusBadge.label}
            </span>
            {props.pingMs != null && props.connected && (
              <span
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  fontSize: 12,
                  color: c.sub,
                  backgroundColor: c.panel,
                  border: `1px solid ${c.border}`,
                }}
              >
                {props.pingMs}ms ping
              </span>
            )}
            <button
              type="button"
              onClick={() => refresh({})}
              disabled={isRefreshing}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                border: `1px solid ${c.border}`,
                backgroundColor: isRefreshing ? c.panel : c.accentBg,
                color: c.accent,
                cursor: isRefreshing ? "wait" : "pointer",
                fontSize: 12,
                fontWeight: 600,
              }}
              aria-label="Refresh knowledge graph status"
            >
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* Disconnected state */}
        {!props.connected && (
          <div
            style={{
              padding: 14,
              borderRadius: 10,
              border: `1px solid ${c.bad}44`,
              backgroundColor: c.badBg,
              color: c.text,
              marginBottom: 16,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Graph not reachable</div>
            <div style={{ fontSize: 13, color: c.sub, wordBreak: "break-word" }}>
              {props.reason ||
                "Connection failed. Verify NEO4J_URI, NEO4J_USERNAME and NEO4J_PASSWORD."}
            </div>
            <div style={{ fontSize: 12, color: c.sub, marginTop: 6 }}>
              The portfolio fixture tools (<code>get_hero</code>, <code>get_skills</code>, ...) keep
              working regardless of graph state.
            </div>
          </div>
        )}

        {/* Headline counters */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
            gap: isMobile ? 8 : 12,
            marginBottom: 18,
          }}
        >
          {[
            { label: "Nodes", value: props.totalNodes.toLocaleString() },
            { label: "Relationships", value: props.totalRelationships.toLocaleString() },
            { label: "Node labels", value: props.labels.length },
            { label: "Rel. types", value: props.relationshipTypes.length },
          ].map((cell) => (
            <div
              key={cell.label}
              style={{
                padding: isMobile ? 12 : 14,
                border: `1px solid ${c.border}`,
                borderRadius: 10,
                backgroundColor: c.panel,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: 0.6,
                  textTransform: "uppercase",
                  color: c.sub,
                }}
              >
                {cell.label}
              </div>
              <div
                style={{
                  fontSize: isMobile ? 22 : 28,
                  fontWeight: 700,
                  color: c.accent,
                  marginTop: 4,
                }}
              >
                {cell.value}
              </div>
            </div>
          ))}
        </div>

        {/* Two-column: labels and relationship types */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile || isTablet ? "1fr" : "1fr 1fr",
            gap: isMobile ? 12 : 16,
          }}
        >
          <Panel title="Nodes by label" empty={!props.labels.length} c={c}>
            {props.labels.map((row) => (
              <BarRow
                key={row.label}
                label={row.label}
                value={row.count}
                ratio={row.count / maxLabel}
                c={c}
                onClick={() =>
                  sendFollowUpMessage(
                    `Show me sample nodes with the label "${row.label}" from the knowledge graph (use the kg_query tool).`
                  )
                }
              />
            ))}
          </Panel>

          <Panel
            title="Relationships by type"
            empty={!props.relationshipTypes.length}
            c={c}
          >
            {props.relationshipTypes.map((row) => (
              <BarRow
                key={row.type}
                label={row.type}
                value={row.count}
                ratio={row.count / maxRel}
                c={c}
                onClick={() =>
                  sendFollowUpMessage(
                    `Show me sample relationships of type "${row.type}" in the knowledge graph (use the kg_query tool).`
                  )
                }
              />
            ))}
          </Panel>
        </div>

        {/* Cross-links */}
        <div
          style={{
            marginTop: 20,
            padding: 14,
            border: `1px solid ${c.border}`,
            borderRadius: 10,
            backgroundColor: c.panel,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
            Drill into the graph
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[
              { label: "Inspect schema", prompt: "Call kg_schema to inspect the knowledge graph schema (labels, relationship types, property keys)." },
              { label: "Person overview", prompt: "Call kg_person_overview to get the Person node and all relationships from the knowledge graph." },
              { label: "Search by skill", prompt: "Search the knowledge graph for evidence of TypeScript using kg_skill_evidence." },
              { label: "Free-text search", prompt: "Use kg_search to find nodes containing the word 'kubernetes' in any text property." },
              { label: "Run custom Cypher", prompt: "Run a read-only Cypher query with kg_query: MATCH (n) RETURN labels(n) AS labels, count(*) AS count ORDER BY count DESC LIMIT 10" },
            ].map((cta) => (
              <button
                type="button"
                key={cta.label}
                onClick={() => sendFollowUpMessage(cta.prompt)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: `1px solid ${c.border}`,
                  backgroundColor: c.bg,
                  color: c.text,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {cta.label}
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            marginTop: 12,
            fontSize: 11,
            color: c.sub,
            textAlign: "right",
          }}
        >
          Generated {new Date(props.generatedAt).toLocaleString()}
        </div>
      </div>
    </McpUseProvider>
  );
}

function Panel({
  title,
  children,
  empty,
  c,
}: {
  title: string;
  children: React.ReactNode;
  empty: boolean;
  c: ReturnType<typeof useColors>;
}) {
  return (
    <div
      style={{
        padding: 14,
        border: `1px solid ${c.border}`,
        borderRadius: 10,
        backgroundColor: c.panel,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>{title}</div>
      {empty ? (
        <div style={{ fontSize: 12, color: c.sub, padding: "8px 0" }}>
          No data yet. Once the Python ingestion pipeline writes nodes, they will appear here.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
      )}
    </div>
  );
}

function BarRow({
  label,
  value,
  ratio,
  c,
  onClick,
}: {
  label: string;
  value: number;
  ratio: number;
  c: ReturnType<typeof useColors>;
  onClick?: () => void;
}) {
  const width = Math.max(2, Math.round(ratio * 100));
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: "left",
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: onClick ? "pointer" : "default",
        color: c.text,
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          marginBottom: 4,
        }}
      >
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span style={{ color: c.sub }}>{value.toLocaleString()}</span>
      </div>
      <div
        style={{
          width: "100%",
          height: 6,
          backgroundColor: c.panelStrong,
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${width}%`,
            height: "100%",
            backgroundColor: c.accent,
            transition: "width 200ms ease",
          }}
        />
      </div>
    </button>
  );
}
