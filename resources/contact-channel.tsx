import { z } from "zod";
import { useEffect, useState } from "react";
import {
  McpUseProvider,
  useWidget,
  useWidgetTheme,
  type WidgetMetadata,
} from "mcp-use/react";

const propsSchema = z.object({
  id: z.string(),
  label: z.string(),
  handle: z.string(),
  href: z.string(),
  icon: z.string(),
  description: z.string(),
  bestFor: z.array(z.string()),
  responseTime: z.string(),
  activityNote: z.string(),
  siblingChannels: z.array(
    z.object({ id: z.string(), label: z.string(), handle: z.string() })
  ),
  breadcrumb: z.array(z.string()),
});

type Props = z.infer<typeof propsSchema>;

export const widgetMetadata: WidgetMetadata = {
  description:
    "Deep view of a single contact channel: handle, expected response time, what it's best for, and sibling channels.",
  props: propsSchema,
  exposeAsTool: false,
};

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

export default function ContactChannel() {
  const { props, isPending, sendFollowUpMessage } = useWidget<Props>();
  const theme = useWidgetTheme();
  const [copied, setCopied] = useState(false);
  const { isMobile } = useViewport();

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div style={{ padding: "clamp(16px, 4vw, 24px)" }}>Loading channel...</div>
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
    pill: dark ? "#1f2937" : "#eff6ff",
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(props.handle);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <McpUseProvider autoSize>
      <div
        style={{
          padding: "clamp(16px, 4vw, 24px)",
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
            marginBottom: 12,
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

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 8,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: c.pill,
              color: c.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 18,
              flexShrink: 0,
            }}
          >
            {props.icon}
          </div>
          <h2 style={{ margin: 0, fontSize: "clamp(18px, 4vw, 24px)", fontWeight: 700, wordBreak: "break-word", overflowWrap: "anywhere" }}>
            {props.label}
          </h2>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 18,
            flexWrap: "wrap",
          }}
        >
          <code
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: 14,
              padding: "6px 10px",
              backgroundColor: c.panel,
              border: `1px solid ${c.border}`,
              borderRadius: 6,
              wordBreak: "break-all",
              maxWidth: "100%",
            }}
          >
            {props.handle}
          </code>
          <button
            onClick={handleCopy}
            style={{
              padding: "6px 10px",
              fontSize: 12,
              borderRadius: 6,
              border: `1px solid ${c.border}`,
              backgroundColor: copied ? c.accent : c.panel,
              color: copied ? "#fff" : c.text,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          <a
            href={props.href}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "6px 10px",
              fontSize: 12,
              borderRadius: 6,
              border: `1px solid ${c.border}`,
              backgroundColor: c.panel,
              color: c.accent,
              cursor: "pointer",
              fontFamily: "inherit",
              textDecoration: "none",
            }}
          >
            Open ↗
          </a>
        </div>

        <p style={{ margin: "0 0 18px 0", color: c.sub, fontSize: 14, wordBreak: "break-word", overflowWrap: "anywhere" }}>
          {props.description}
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 160px), 1fr))",
            gap: 8,
            marginBottom: 20,
          }}
        >
          <Stat c={c} label="Response time" value={props.responseTime} />
          <Stat c={c} label="Activity" value={props.activityNote} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              color: c.sub,
              marginBottom: 8,
            }}
          >
            Best for
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.6, wordBreak: "break-word", overflowWrap: "anywhere" }}>
            {props.bestFor.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>

        {props.siblingChannels.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <div
              style={{
                fontSize: 11,
                letterSpacing: 0.5,
                textTransform: "uppercase",
                color: c.sub,
                marginBottom: 8,
              }}
            >
              Other channels
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {props.siblingChannels.map((s) => (
                <button
                  key={s.id}
                  onClick={() =>
                    sendFollowUpMessage(
                      `Show me the contact channel detail for "${s.id}".`
                    )
                  }
                  style={{
                    padding: "6px 12px",
                    fontSize: 13,
                    borderRadius: 999,
                    border: `1px solid ${c.border}`,
                    backgroundColor: c.pill,
                    color: c.text,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {s.label} ›
                </button>
              ))}
            </div>
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 16,
            paddingTop: 16,
            borderTop: `1px solid ${c.border}`,
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => sendFollowUpMessage("Show the full contact section.")}
            style={{
              padding: "6px 12px",
              fontSize: 13,
              borderRadius: 999,
              border: `1px solid ${c.border}`,
              backgroundColor: c.pill,
              color: c.text,
              cursor: "pointer",
              fontFamily: "inherit",
              width: isMobile ? "100%" : undefined,
            }}
          >
            ← Back to contact
          </button>
        </div>
      </div>
    </McpUseProvider>
  );
}

function Stat({
  c,
  label,
  value,
}: {
  c: { panel: string; border: string; sub: string };
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding: "clamp(12px, 3vw, 20px)",
        backgroundColor: c.panel,
        border: `1px solid ${c.border}`,
        borderRadius: 8,
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: 0.4,
          textTransform: "uppercase",
          color: c.sub,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, wordBreak: "break-word", overflowWrap: "anywhere" }}>{value}</div>
    </div>
  );
}
