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
  id: z.string(),
  createdAt: z.string(),
  runtime: z.string().optional(),
  source: z.string().optional(),
  status: z.enum(["running", "stopped", "error"]),
  ports: z.array(z.number()),
  domains: z.array(z.object({ port: z.number(), url: z.string() })),
  lastError: z.string().optional(),
  history: z.array(
    z.object({
      id: z.string(),
      command: z.string(),
      args: z.array(z.string()),
      stdout: z.string(),
      stderr: z.string(),
      exitCode: z.number().nullable(),
      durationMs: z.number(),
      startedAt: z.string(),
    })
  ),
});

type Props = z.infer<typeof propsSchema>;

export const widgetMetadata: WidgetMetadata = {
  description:
    "Single Vercel sandbox view — exposes ports, public URLs, full command history with stdout/stderr, and one-click stop control.",
  props: propsSchema,
  exposeAsTool: false,
};

function useColors() {
  const theme = useWidgetTheme();
  const dark = theme === "dark";
  return {
    bg: dark ? "#0f1115" : "#ffffff",
    panel: dark ? "#161a22" : "#fafafa",
    term: dark ? "#0a0d11" : "#f5f7f9",
    text: dark ? "#e6e8ec" : "#0f1115",
    sub: dark ? "#9aa3b2" : "#5a6473",
    border: dark ? "#2a313d" : "#e6e8ec",
    accent: dark ? "#7aa2ff" : "#3460ff",
    ok: dark ? "#4ade80" : "#16a34a",
    warn: dark ? "#fbbf24" : "#d97706",
    err: dark ? "#f87171" : "#dc2626",
  };
}

export default function SandboxDetail() {
  const { props, isPending } = useWidget<Props>();
  const c = useColors();
  const { isMobile } = useViewport();
  const stop = useCallTool("sandbox_stop" as never) as {
    callTool: (args: { sandboxId: string }) => void;
    isPending: boolean;
  };

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div style={{ padding: "clamp(14px, 4vw, 20px)", color: c.sub }}>Loading sandbox...</div>
      </McpUseProvider>
    );
  }

  const statusColor =
    props.status === "running" ? c.ok : props.status === "stopped" ? c.sub : c.err;

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
          <code
            style={{
              fontSize: isMobile ? 13 : 16,
              fontFamily: "ui-monospace, Menlo, Consolas, monospace",
              color: c.text,
            }}
          >
            {props.id}
          </code>
          <span
            style={{
              fontSize: 11,
              padding: "4px 10px",
              borderRadius: 999,
              background: `${statusColor}22`,
              color: statusColor,
              border: `1px solid ${statusColor}`,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            {props.status}
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
            gap: 10,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              padding: 12,
              background: c.panel,
              border: `1px solid ${c.border}`,
              borderRadius: 8,
            }}
          >
            <div style={{ fontSize: 11, color: c.sub, marginBottom: 4 }}>Created</div>
            <div style={{ fontSize: 13 }}>
              {new Date(props.createdAt).toLocaleString()}
            </div>
          </div>
          {props.runtime && (
            <div
              style={{
                padding: 12,
                background: c.panel,
                border: `1px solid ${c.border}`,
                borderRadius: 8,
              }}
            >
              <div style={{ fontSize: 11, color: c.sub, marginBottom: 4 }}>Runtime</div>
              <code style={{ fontSize: 13 }}>{props.runtime}</code>
            </div>
          )}
          {props.source && (
            <div
              style={{
                padding: 12,
                background: c.panel,
                border: `1px solid ${c.border}`,
                borderRadius: 8,
                gridColumn: isMobile ? "auto" : "1 / -1",
              }}
            >
              <div style={{ fontSize: 11, color: c.sub, marginBottom: 4 }}>Source</div>
              <code style={{ fontSize: 12, wordBreak: "break-all" }}>{props.source}</code>
            </div>
          )}
        </div>

        {props.domains.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div
              style={{
                fontSize: 11,
                color: c.sub,
                textTransform: "uppercase",
                letterSpacing: 0.6,
                marginBottom: 6,
              }}
            >
              Public URLs
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {props.domains.map((d) => (
                <a
                  key={d.port}
                  href={d.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: "8px 10px",
                    background: c.panel,
                    border: `1px solid ${c.border}`,
                    borderRadius: 6,
                    color: c.accent,
                    textDecoration: "none",
                    fontSize: 12,
                    fontFamily: "ui-monospace, Menlo, Consolas, monospace",
                    wordBreak: "break-all",
                  }}
                >
                  :{d.port} → {d.url}
                </a>
              ))}
            </div>
          </div>
        )}

        {props.lastError && (
          <div
            style={{
              padding: 12,
              background: `${c.err}10`,
              border: `1px solid ${c.err}40`,
              borderRadius: 8,
              fontSize: 13,
              color: c.text,
              marginBottom: 14,
            }}
          >
            <strong style={{ color: c.err }}>Last error: </strong>
            {props.lastError}
          </div>
        )}

        <div
          style={{
            fontSize: 11,
            color: c.sub,
            textTransform: "uppercase",
            letterSpacing: 0.6,
            marginBottom: 6,
          }}
        >
          Command history ({props.history.length})
        </div>

        {props.history.length === 0 ? (
          <div
            style={{
              padding: 16,
              background: c.panel,
              border: `1px dashed ${c.border}`,
              borderRadius: 8,
              color: c.sub,
              textAlign: "center",
              fontSize: 13,
            }}
          >
            No commands run yet. Call sandbox_run.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {props.history
              .slice()
              .reverse()
              .map((cmd) => (
                <div
                  key={cmd.id}
                  style={{
                    background: c.term,
                    border: `1px solid ${c.border}`,
                    borderRadius: 6,
                    padding: 10,
                    fontFamily: "ui-monospace, Menlo, Consolas, monospace",
                    fontSize: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                      flexWrap: "wrap",
                      marginBottom: 6,
                    }}
                  >
                    <span style={{ color: c.accent, wordBreak: "break-all" }}>
                      $ {cmd.command} {cmd.args.join(" ")}
                    </span>
                    <span
                      style={{
                        color: cmd.exitCode === 0 ? c.ok : c.warn,
                        fontSize: 11,
                        whiteSpace: "nowrap",
                      }}
                    >
                      exit {cmd.exitCode ?? "—"} · {cmd.durationMs}ms
                    </span>
                  </div>
                  {cmd.stdout && (
                    <pre
                      style={{
                        margin: 0,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-all",
                        fontSize: 11,
                        color: c.text,
                        maxHeight: 240,
                        overflow: "auto",
                      }}
                    >
                      {cmd.stdout}
                    </pre>
                  )}
                  {cmd.stderr && (
                    <pre
                      style={{
                        margin: 0,
                        marginTop: 4,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-all",
                        fontSize: 11,
                        color: c.err,
                        maxHeight: 160,
                        overflow: "auto",
                      }}
                    >
                      {cmd.stderr}
                    </pre>
                  )}
                </div>
              ))}
          </div>
        )}

        {props.status === "running" && (
          <button
            onClick={() => stop.callTool({ sandboxId: props.id })}
            disabled={stop.isPending}
            style={{
              marginTop: 14,
              padding: "10px 16px",
              background: stop.isPending ? c.sub : c.err,
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: stop.isPending ? "wait" : "pointer",
              width: isMobile ? "100%" : "auto",
            }}
          >
            {stop.isPending ? "Stopping..." : "Stop sandbox"}
          </button>
        )}
      </div>
    </McpUseProvider>
  );
}
