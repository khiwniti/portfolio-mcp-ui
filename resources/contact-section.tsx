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
  heading: z.string(),
  intro: z.string(),
  email: z.string(),
  channels: z.array(
    z.object({
      label: z.string(),
      handle: z.string(),
      href: z.string(),
      icon: z.string(),
    })
  ),
  responseTime: z.string(),
  timezone: z.string(),
});

type Props = z.infer<typeof propsSchema>;

export const widgetMetadata: WidgetMetadata = {
  description:
    "Contact section with copyable email, channel links (GitHub, LinkedIn, etc.), response-time chip, and a quick-message form.",
  props: propsSchema,
  exposeAsTool: false,
};

function useColors() {
  const theme = useWidgetTheme();
  return {
    bg: theme === "dark" ? "#0a0a0f" : "#fafafa",
    surface: theme === "dark" ? "#13131a" : "#ffffff",
    surfaceAlt: theme === "dark" ? "#1c1c24" : "#f4f4f5",
    text: theme === "dark" ? "#f5f5f7" : "#0a0a0f",
    muted: theme === "dark" ? "#9ca3af" : "#52525b",
    border: theme === "dark" ? "#27272a" : "#e4e4e7",
    accent: theme === "dark" ? "#60a5fa" : "#2563eb",
    success: theme === "dark" ? "#34d399" : "#059669",
  };
}

export default function ContactSection() {
  const { props, isPending } = useWidget<Props>();
  const colors = useColors();
  const { isMobile } = useViewport();
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div style={{ padding: 24, color: colors.muted }}>Loading contact...</div>
      </McpUseProvider>
    );
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(props.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    const subject = encodeURIComponent("Hello from your portfolio");
    const body = encodeURIComponent(message);
    window.location.href = `mailto:${props.email}?subject=${subject}&body=${body}`;
    setSent(true);
    setTimeout(() => setSent(false), 3000);
  };

  return (
    <McpUseProvider autoSize>
      <section
        style={{
          padding: "clamp(16px, 4vw, 28px)",
          backgroundColor: colors.bg,
          color: colors.text,
          borderRadius: 12,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        <header style={{ marginBottom: 18 }}>
          <h2 style={{ margin: "0 0 6px 0", fontSize: "clamp(18px, 4vw, 24px)", fontWeight: 700 }}>
            {props.heading}
          </h2>
          <p style={{ margin: 0, color: colors.muted, fontSize: 14, lineHeight: 1.5, maxWidth: 580, width: "100%", wordBreak: "break-word", overflowWrap: "anywhere" }}>
            {props.intro}
          </p>
        </header>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
            gap: 18,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              padding: "clamp(12px, 3vw, 16px)",
              borderRadius: 12,
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.surface,
            }}
          >
            <div style={{ fontSize: 11, color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
              Email
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <a
                href={`mailto:${props.email}`}
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: colors.accent,
                  textDecoration: "none",
                  flex: "1 1 160px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  wordBreak: "break-all",
                  minWidth: 0,
                }}
              >
                {props.email}
              </a>
              <button
                onClick={handleCopy}
                style={{
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 500,
                  borderRadius: 6,
                  border: `1px solid ${colors.border}`,
                  backgroundColor: copied ? colors.success : "transparent",
                  color: copied ? "#fff" : colors.text,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div style={{ fontSize: 12, color: colors.muted, marginTop: 12 }}>
              Typical response · <strong style={{ color: colors.text }}>{props.responseTime}</strong>
              <span style={{ marginLeft: 8 }}>· {props.timezone}</span>
            </div>
          </div>

          <div
            style={{
              padding: "clamp(12px, 3vw, 16px)",
              borderRadius: 12,
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.surface,
            }}
          >
            <div style={{ fontSize: 11, color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
              Other channels
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {props.channels.map((c) => (
                <a
                  key={c.label}
                  href={c.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: 8,
                    borderRadius: 8,
                    backgroundColor: colors.surfaceAlt,
                    color: colors.text,
                    textDecoration: "none",
                    fontSize: 13,
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ fontSize: 18 }}>{c.icon}</span>
                  <span style={{ fontWeight: 500 }}>{c.label}</span>
                  <span style={{ marginLeft: "auto", color: colors.muted, fontSize: 12, wordBreak: "break-all", minWidth: 0 }}>
                    {c.handle}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            padding: "clamp(12px, 3vw, 16px)",
            borderRadius: 12,
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.surface,
          }}
        >
          <label
            htmlFor="contact-message"
            style={{
              display: "block",
              fontSize: 11,
              color: colors.muted,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 6,
            }}
          >
            Quick message
          </label>
          <textarea
            id="contact-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="A few sentences about the role, project, or question..."
            rows={3}
            style={{
              width: "100%",
              padding: 10,
              fontSize: 14,
              fontFamily: "inherit",
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              backgroundColor: colors.surfaceAlt,
              color: colors.text,
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "stretch" : "center", marginTop: 10, gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: colors.muted }}>
              {sent ? "Opening your email client..." : "Opens in your mail app."}
            </span>
            <button
              type="submit"
              disabled={!message.trim()}
              style={{
                padding: "8px 18px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                border: "none",
                backgroundColor: message.trim() ? colors.accent : colors.surfaceAlt,
                color: message.trim() ? "#fff" : colors.muted,
                cursor: message.trim() ? "pointer" : "not-allowed",
                width: isMobile ? "100%" : "auto",
              }}
            >
              Send
            </button>
          </div>
        </form>
      </section>
    </McpUseProvider>
  );
}
