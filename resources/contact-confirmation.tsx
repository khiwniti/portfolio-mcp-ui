import { z } from "zod";
import { useEffect, useState } from "react";
import {
  McpUseProvider,
  useWidget,
  useWidgetTheme,
  type WidgetMetadata,
} from "mcp-use/react";

const propsSchema = z.object({
  status: z.enum(["sent", "rejected"]),
  reference: z.string(),
  receivedAt: z.string(),
  name: z.string(),
  email: z.string(),
  message: z.string(),
  responseTime: z.string(),
  nextSteps: z.array(z.string()),
  reason: z.string().optional(),
  breadcrumb: z.array(z.string()),
});

type Props = z.infer<typeof propsSchema>;

export const widgetMetadata: WidgetMetadata = {
  description:
    "Confirmation widget shown after a contact message is submitted: receipt details, what to expect next, and next-step CTAs.",
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

export default function ContactConfirmation() {
  const { props, isPending, sendFollowUpMessage } = useWidget<Props>();
  const theme = useWidgetTheme();
  const { isMobile } = useViewport();

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div style={{ padding: "clamp(16px, 4vw, 24px)" }}>Submitting...</div>
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
    pill: dark ? "#1f2937" : "#eff6ff",
  };

  const ok = props.status === "sent";
  const accentColor = ok ? c.good : c.warn;

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
            marginBottom: 14,
          }}
        >
          {props.breadcrumb.map((cr, i) => (
            <span key={i}>
              {i > 0 && <span style={{ margin: "0 6px" }}>›</span>}
              <span
                style={
                  i === props.breadcrumb.length - 1 ? { color: c.accent } : {}
                }
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
            gap: 12,
            marginBottom: 10,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 999,
              backgroundColor: accentColor + "22",
              color: accentColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {ok ? "✓" : "!"}
          </div>
          <h2 style={{ margin: 0, fontSize: "clamp(18px, 4vw, 24px)", fontWeight: 700, wordBreak: "break-word", overflowWrap: "anywhere" }}>
            {ok ? "Message received" : "Message could not be sent"}
          </h2>
        </div>

        <p
          style={{
            margin: "0 0 18px 0",
            color: c.sub,
            fontSize: 14,
            wordBreak: "break-word",
            overflowWrap: "anywhere",
          }}
        >
          {ok
            ? `Reference ${props.reference} — received ${props.receivedAt}. Replies arrive ${props.responseTime}.`
            : props.reason ?? "Please double-check the details and try again."}
        </p>

        <div
          style={{
            padding: "clamp(12px, 3vw, 20px)",
            backgroundColor: c.panel,
            border: `1px solid ${c.border}`,
            borderRadius: 10,
            marginBottom: 18,
          }}
        >
          <Row c={c} label="From" value={`${props.name} <${props.email}>`} breakAll />
          <Row c={c} label="Reference" value={props.reference} mono breakAll />
          <Row c={c} label="Received" value={props.receivedAt} />
          <div style={{ marginTop: 10 }}>
            <div
              style={{
                fontSize: 11,
                letterSpacing: 0.4,
                textTransform: "uppercase",
                color: c.sub,
                marginBottom: 4,
              }}
            >
              Message
            </div>
            <div
              style={{
                fontSize: 14,
                whiteSpace: "pre-wrap",
                color: c.text,
                wordBreak: "break-word",
                overflowWrap: "anywhere",
              }}
            >
              {props.message}
            </div>
          </div>
        </div>

        {ok && props.nextSteps.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div
              style={{
                fontSize: 11,
                letterSpacing: 0.5,
                textTransform: "uppercase",
                color: c.sub,
                marginBottom: 8,
              }}
            >
              What happens next
            </div>
            <ol style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.6, wordBreak: "break-word", overflowWrap: "anywhere" }}>
              {props.nextSteps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 8,
            paddingTop: 16,
            borderTop: `1px solid ${c.border}`,
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => sendFollowUpMessage("Show the full contact section.")}
            style={{
              padding: "8px 14px",
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
          <button
            onClick={() => sendFollowUpMessage("Show the availability detail.")}
            style={{
              padding: "8px 14px",
              fontSize: 13,
              borderRadius: 999,
              border: `1px solid ${c.border}`,
              backgroundColor: c.accent,
              color: "#fff",
              cursor: "pointer",
              fontFamily: "inherit",
              fontWeight: 600,
              width: isMobile ? "100%" : undefined,
            }}
          >
            See availability →
          </button>
        </div>
      </div>
    </McpUseProvider>
  );
}

function Row({
  c,
  label,
  value,
  mono,
  breakAll,
}: {
  c: { sub: string; text: string };
  label: string;
  value: string;
  mono?: boolean;
  breakAll?: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(80px, 100px) 1fr",
        gap: 8,
        fontSize: 13,
        marginBottom: 4,
      }}
    >
      <span style={{ color: c.sub }}>{label}</span>
      <span
        style={{
          color: c.text,
          fontFamily: mono ? "ui-monospace, monospace" : "inherit",
          wordBreak: breakAll ? "break-all" : "break-word",
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </span>
    </div>
  );
}
