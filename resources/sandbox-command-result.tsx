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
  sandboxId: z.string(),
  command: z.string(),
  args: z.array(z.string()),
  exitCode: z.number().nullable(),
  durationMs: z.number(),
  stdout: z.string(),
  stderr: z.string(),
  startedAt: z.string(),
});

type Props = z.infer<typeof propsSchema>;

export const widgetMetadata: WidgetMetadata = {
  description:
    "Terminal-style display of a single command run inside a Vercel sandbox — stdout, stderr, exit code and duration.",
  props: propsSchema,
  exposeAsTool: false,
};

function useColors() {
  const theme = useWidgetTheme();
  const dark = theme === "dark";
  return {
    bg: dark ? "#0a0d11" : "#f5f7f9",
    panel: dark ? "#161a22" : "#ffffff",
    text: dark ? "#e6e8ec" : "#0f1115",
    sub: dark ? "#9aa3b2" : "#5a6473",
    border: dark ? "#2a313d" : "#e6e8ec",
    accent: dark ? "#7aa2ff" : "#3460ff",
    ok: dark ? "#4ade80" : "#16a34a",
    warn: dark ? "#fbbf24" : "#d97706",
    err: dark ? "#f87171" : "#dc2626",
  };
}

export default function SandboxCommandResult() {
  const { props, isPending } = useWidget<Props>();
  const c = useColors();
  const { isMobile } = useViewport();

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div style={{ padding: "clamp(14px, 4vw, 20px)", color: c.sub }}>Running...</div>
      </McpUseProvider>
    );
  }

  const ok = props.exitCode === 0;

  return (
    <McpUseProvider autoSize>
      <div
        style={{
          padding: isMobile ? 14 : 20,
          background: c.panel,
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
            marginBottom: 12,
          }}
        >
          <code
            style={{
              fontSize: 12,
              fontFamily: "ui-monospace, Menlo, Consolas, monospace",
              color: c.sub,
              wordBreak: "break-all",
            }}
          >
            {props.sandboxId}
          </code>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: 11,
                padding: "3px 10px",
                borderRadius: 999,
                background: ok ? `${c.ok}22` : `${c.err}22`,
                color: ok ? c.ok : c.err,
                border: `1px solid ${ok ? c.ok : c.err}`,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              exit {props.exitCode ?? "—"}
            </span>
            <span
              style={{
                fontSize: 11,
                padding: "3px 10px",
                borderRadius: 999,
                background: c.bg,
                color: c.sub,
                border: `1px solid ${c.border}`,
              }}
            >
              {props.durationMs}ms
            </span>
          </div>
        </div>

        <div
          style={{
            background: c.bg,
            border: `1px solid ${c.border}`,
            borderRadius: 6,
            padding: 10,
            fontFamily: "ui-monospace, Menlo, Consolas, monospace",
            fontSize: 12,
            color: c.accent,
            marginBottom: 10,
            wordBreak: "break-all",
          }}
        >
          $ {props.command} {props.args.join(" ")}
        </div>

        {props.stdout && (
          <div style={{ marginBottom: 8 }}>
            <div
              style={{
                fontSize: 10,
                color: c.sub,
                textTransform: "uppercase",
                letterSpacing: 0.6,
                marginBottom: 4,
              }}
            >
              stdout
            </div>
            <pre
              style={{
                margin: 0,
                padding: 10,
                background: c.bg,
                border: `1px solid ${c.border}`,
                borderRadius: 6,
                fontFamily: "ui-monospace, Menlo, Consolas, monospace",
                fontSize: 11,
                color: c.text,
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                maxHeight: 320,
                overflow: "auto",
              }}
            >
              {props.stdout}
            </pre>
          </div>
        )}

        {props.stderr && (
          <div>
            <div
              style={{
                fontSize: 10,
                color: c.err,
                textTransform: "uppercase",
                letterSpacing: 0.6,
                marginBottom: 4,
              }}
            >
              stderr
            </div>
            <pre
              style={{
                margin: 0,
                padding: 10,
                background: `${c.err}10`,
                border: `1px solid ${c.err}40`,
                borderRadius: 6,
                fontFamily: "ui-monospace, Menlo, Consolas, monospace",
                fontSize: 11,
                color: c.err,
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                maxHeight: 240,
                overflow: "auto",
              }}
            >
              {props.stderr}
            </pre>
          </div>
        )}

        {!props.stdout && !props.stderr && (
          <div
            style={{
              padding: 12,
              background: c.bg,
              border: `1px dashed ${c.border}`,
              borderRadius: 6,
              color: c.sub,
              fontSize: 12,
              textAlign: "center",
            }}
          >
            (no output)
          </div>
        )}

        <div style={{ fontSize: 11, color: c.sub, marginTop: 10 }}>
          {new Date(props.startedAt).toLocaleString()}
        </div>
      </div>
    </McpUseProvider>
  );
}
