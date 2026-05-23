import { useEffect, useState } from "react";
import { z } from "zod";
import {
  McpUseProvider,
  useWidget,
  useWidgetTheme,
  type WidgetMetadata,
} from "mcp-use/react";

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
  id: z.string(),
  name: z.string(),
  status: z.string(),
  headlineMetrics: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
      trend: z.enum(["up", "down", "flat"]),
      context: z.string(),
    })
  ),
  series: z.array(
    z.object({
      label: z.string(),
      points: z.array(
        z.object({
          period: z.string(),
          value: z.number(),
        })
      ),
      unit: z.string(),
    })
  ),
  breadcrumb: z.array(z.string()),
});

type Props = z.infer<typeof propsSchema>;

export const widgetMetadata: WidgetMetadata = {
  description:
    "Metrics dashboard for a single project: headline KPIs with trend/context and lightweight bar-chart time series.",
  props: propsSchema,
  exposeAsTool: false,
};

export default function ProjectMetrics() {
  const { props, isPending, sendFollowUpMessage } = useWidget<Props>();
  const theme = useWidgetTheme();
  const { isMobile } = useViewport();

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div style={{ padding: 24 }}>Loading metrics...</div>
      </McpUseProvider>
    );
  }

  const dark = theme === "dark";
  const c = {
    bg: dark ? "#0b0d10" : "#ffffff",
    panel: dark ? "#15181d" : "#f8fafc",
    text: dark ? "#e6e8eb" : "#111827",
    sub: dark ? "#9ba3ad" : "#525a66",
    border: dark ? "#262a31" : "#e5e7eb",
    accent: dark ? "#60a5fa" : "#2563eb",
    good: dark ? "#34d399" : "#10b981",
    warn: dark ? "#f87171" : "#dc2626",
    flat: dark ? "#9ca3af" : "#6b7280",
    bar: dark ? "#1e3a8a" : "#dbeafe",
    barTop: dark ? "#60a5fa" : "#2563eb",
  };

  return (
    <McpUseProvider autoSize>
      <div
        style={{
          padding: "clamp(16px, 4vw, 28px)",
          backgroundColor: c.bg,
          color: c.text,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Inter', system-ui, sans-serif",
          lineHeight: 1.5,
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: c.sub,
            letterSpacing: 0.3,
            textTransform: "uppercase",
            marginBottom: 10,
            display: "flex",
            flexWrap: "wrap",
            wordBreak: "break-word",
          }}
        >
          {props.breadcrumb.map((cr, i) => (
            <span key={i}>
              {i > 0 && <span style={{ margin: "0 6px" }}>›</span>}
              <span
                style={i === props.breadcrumb.length - 1 ? { color: c.accent } : {}}
              >
                {cr}
              </span>
            </span>
          ))}
        </div>

        <h2 style={{ margin: 0, fontSize: "clamp(18px, 4vw, 24px)", fontWeight: 700, wordBreak: "break-word", overflowWrap: "anywhere" }}>
          {props.name} · Metrics
        </h2>
        <p style={{ margin: "4px 0 22px 0", color: c.sub, fontSize: 14, wordBreak: "break-word", overflowWrap: "anywhere" }}>
          Snapshot of operational and product KPIs.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
            gap: 10,
            marginBottom: 24,
          }}
        >
          {props.headlineMetrics.map((m) => {
            const arrowColor =
              m.trend === "up" ? c.good : m.trend === "down" ? c.warn : c.flat;
            const arrow = m.trend === "up" ? "↑" : m.trend === "down" ? "↓" : "→";
            return (
              <div
                key={m.label}
                style={{
                  padding: 14,
                  backgroundColor: c.panel,
                  border: `1px solid ${c.border}`,
                  borderRadius: 10,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: 0.4,
                    textTransform: "uppercase",
                    color: c.sub,
                    marginBottom: 6,
                  }}
                >
                  {m.label}
                </div>
                <div
                  style={{
                    fontSize: "clamp(20px, 5vw, 24px)",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "baseline",
                    gap: 6,
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ wordBreak: "break-word" }}>{m.value}</span>
                  <span style={{ color: arrowColor, fontSize: 14 }}>{arrow}</span>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: c.sub,
                    marginTop: 6,
                    lineHeight: 1.4,
                    wordBreak: "break-word",
                    overflowWrap: "anywhere",
                  }}
                >
                  {m.context}
                </div>
              </div>
            );
          })}
        </div>

        {props.series.map((s) => {
          const max = Math.max(1, ...s.points.map((p) => p.value));
          return (
            <div
              key={s.label}
              style={{
                padding: "clamp(12px, 3vw, 20px)",
                backgroundColor: c.panel,
                border: `1px solid ${c.border}`,
                borderRadius: 10,
                marginBottom: 14,
                width: "100%",
                maxWidth: 600,
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  letterSpacing: 0.4,
                  textTransform: "uppercase",
                  color: c.sub,
                  marginBottom: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 6,
                }}
              >
                <span>{s.label}</span>
                <span>{s.unit}</span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${s.points.length}, 1fr)`,
                  gap: isMobile ? 3 : 6,
                  alignItems: "end",
                  height: 120,
                  width: "100%",
                }}
              >
                {s.points.map((p) => {
                  const h = Math.max(4, (p.value / max) * 100);
                  return (
                    <div
                      key={p.period}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        height: "100%",
                        justifyContent: "flex-end",
                      }}
                    >
                      <div
                        title={`${p.period}: ${p.value} ${s.unit}`}
                        style={{
                          width: "100%",
                          height: `${h}%`,
                          background: `linear-gradient(180deg, ${c.barTop}, ${c.bar})`,
                          borderRadius: 4,
                        }}
                      />
                      <div
                        style={{
                          fontSize: 10,
                          color: c.sub,
                          marginTop: 4,
                          textAlign: "center",
                          wordBreak: "break-word",
                          overflow: "hidden",
                        }}
                      >
                        {p.period}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 12,
            paddingTop: 16,
            borderTop: `1px solid ${c.border}`,
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() =>
              sendFollowUpMessage(`Open the project detail for "${props.id}".`)
            }
            style={{
              padding: "6px 12px",
              fontSize: 13,
              borderRadius: 999,
              border: `1px solid ${c.border}`,
              backgroundColor: c.accent,
              color: "#fff",
              cursor: "pointer",
              fontFamily: "inherit",
              fontWeight: 600,
            }}
          >
            ← Back to project
          </button>
          <button
            onClick={() => sendFollowUpMessage("Show the projects showcase.")}
            style={{
              padding: "6px 12px",
              fontSize: 13,
              borderRadius: 999,
              border: `1px solid ${c.border}`,
              backgroundColor: c.panel,
              color: c.text,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            All projects
          </button>
        </div>
      </div>
    </McpUseProvider>
  );
}
