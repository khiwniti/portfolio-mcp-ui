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

const sandboxRecord = z.object({
  id: z.string(),
  createdAt: z.string(),
  runtime: z.string().optional(),
  source: z.string().optional(),
  ports: z.array(z.number()),
  status: z.enum(["running", "stopped", "error"]),
  lastError: z.string().optional(),
  history: z.array(
    z.object({
      id: z.string(),
      command: z.string(),
      args: z.array(z.string()),
      exitCode: z.number().nullable(),
      durationMs: z.number(),
      startedAt: z.string(),
    })
  ),
});

const propsSchema = z.object({
  breadcrumb: z.array(z.string()),
  configured: z.boolean(),
  notConfiguredReason: z.string().optional(),
  total: z.number(),
  running: z.number(),
  stopped: z.number(),
  errored: z.number(),
  sandboxes: z.array(sandboxRecord),
});

type Props = z.infer<typeof propsSchema>;

export const widgetMetadata: WidgetMetadata = {
  description:
    "Vercel Sandbox console — lists every sandbox spawned by this MCP server with status, command history, and credential health.",
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
    ok: dark ? "#4ade80" : "#16a34a",
    warn: dark ? "#fbbf24" : "#d97706",
    err: dark ? "#f87171" : "#dc2626",
  };
}

export default function SandboxConsole() {
  const { props, isPending } = useWidget<Props>();
  const c = useColors();
  const { isMobile } = useViewport();

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div style={{ padding: "clamp(14px, 4vw, 20px)", color: c.sub }}>
          Loading sandbox console...
        </div>
      </McpUseProvider>
    );
  }

  const statusColor = (s: string) =>
    s === "running" ? c.ok : s === "stopped" ? c.sub : c.err;

  return (
    <McpUseProvider autoSize>
      <div
        style={{
          padding: isMobile ? 16 : 24,
          background: c.bg,
          color: c.text,
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          fontSize: isMobile ? 13 : 14,
        }}
      >
        <div style={{ fontSize: 12, color: c.sub, marginBottom: 8 }}>
          {props.breadcrumb.join(" › ")}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 14,
          }}
        >
          <h2 style={{ fontSize: isMobile ? 18 : 22, margin: 0, color: c.text }}>
            Vercel Sandbox Console
          </h2>
          <span
            style={{
              fontSize: 11,
              padding: "4px 10px",
              borderRadius: 999,
              background: props.configured ? `${c.ok}22` : `${c.err}22`,
              color: props.configured ? c.ok : c.err,
              border: `1px solid ${props.configured ? c.ok : c.err}`,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            {props.configured ? "Credentials OK" : "Not configured"}
          </span>
        </div>

        {!props.configured && props.notConfiguredReason && (
          <div
            style={{
              padding: 12,
              background: `${c.err}10`,
              border: `1px solid ${c.err}40`,
              borderRadius: 8,
              fontSize: 13,
              color: c.text,
              marginBottom: 16,
            }}
          >
            {props.notConfiguredReason}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
            gap: isMobile ? 8 : 12,
            marginBottom: 18,
          }}
        >
          {[
            { label: "Total", value: props.total, color: c.text },
            { label: "Running", value: props.running, color: c.ok },
            { label: "Stopped", value: props.stopped, color: c.sub },
            { label: "Errored", value: props.errored, color: c.err },
          ].map((kpi) => (
            <div
              key={kpi.label}
              style={{
                padding: isMobile ? 10 : 14,
                background: c.panel,
                border: `1px solid ${c.border}`,
                borderRadius: 8,
              }}
            >
              <div style={{ fontSize: 11, color: c.sub, marginBottom: 4 }}>
                {kpi.label}
              </div>
              <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: kpi.color }}>
                {kpi.value}
              </div>
            </div>
          ))}
        </div>

        {props.sandboxes.length === 0 ? (
          <div
            style={{
              padding: 20,
              background: c.panel,
              border: `1px dashed ${c.border}`,
              borderRadius: 8,
              color: c.sub,
              textAlign: "center",
              fontSize: 13,
            }}
          >
            {props.configured
              ? "No sandboxes yet. Call sandbox_create to spawn one."
              : "Wire VERCEL_TOKEN / VERCEL_TEAM_ID / VERCEL_PROJECT_ID, then call sandbox_create."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {props.sandboxes.map((s) => (
              <div
                key={s.id}
                style={{
                  padding: isMobile ? 12 : 14,
                  background: c.panel,
                  border: `1px solid ${c.border}`,
                  borderRadius: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <code
                    style={{
                      fontSize: 12,
                      fontFamily: "ui-monospace, Menlo, Consolas, monospace",
                      color: c.text,
                    }}
                  >
                    {s.id}
                  </code>
                  <span
                    style={{
                      fontSize: 11,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: `${statusColor(s.status)}22`,
                      color: statusColor(s.status),
                      border: `1px solid ${statusColor(s.status)}`,
                      textTransform: "uppercase",
                      letterSpacing: 0.4,
                    }}
                  >
                    {s.status}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: c.sub, marginBottom: 6 }}>
                  Created {new Date(s.createdAt).toLocaleString()}
                  {s.runtime && <> · runtime <code style={{ color: c.text }}>{s.runtime}</code></>}
                  {s.ports.length > 0 && (
                    <> · ports {s.ports.map((p) => p).join(", ")}</>
                  )}
                </div>
                {s.source && (
                  <div style={{ fontSize: 12, color: c.sub, marginBottom: 6 }}>
                    Source: <code style={{ color: c.text }}>{s.source}</code>
                  </div>
                )}
                {s.lastError && (
                  <div
                    style={{
                      fontSize: 12,
                      color: c.err,
                      padding: 6,
                      background: `${c.err}10`,
                      borderRadius: 4,
                      marginBottom: 6,
                    }}
                  >
                    {s.lastError}
                  </div>
                )}
                {s.history.length > 0 && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: 8,
                      background: c.bg,
                      borderRadius: 6,
                      border: `1px solid ${c.border}`,
                      fontFamily: "ui-monospace, Menlo, Consolas, monospace",
                      fontSize: 11,
                    }}
                  >
                    {s.history.slice(-3).map((cmd) => (
                      <div
                        key={cmd.id}
                        style={{
                          color: cmd.exitCode === 0 ? c.text : c.warn,
                          marginBottom: 2,
                        }}
                      >
                        <span style={{ color: c.accent }}>$</span> {cmd.command}{" "}
                        {cmd.args.join(" ")}
                        <span style={{ color: c.sub }}>
                          {"  "}({cmd.durationMs}ms, exit {cmd.exitCode ?? "—"})
                        </span>
                      </div>
                    ))}
                    {s.history.length > 3 && (
                      <div style={{ color: c.sub, fontSize: 10 }}>
                        +{s.history.length - 3} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </McpUseProvider>
  );
}
