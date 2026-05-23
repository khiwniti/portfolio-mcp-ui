import { useState, useEffect } from "react";
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
  name: z.string(),
  headline: z.string(),
  subhead: z.string(),
  location: z.string(),
  tagline: z.string(),
  ctas: z.array(
    z.object({
      label: z.string(),
      href: z.string(),
      primary: z.boolean(),
    })
  ),
  highlights: z.array(z.string()),
});

type Props = z.infer<typeof propsSchema>;

export const widgetMetadata: WidgetMetadata = {
  description:
    "Interactive hero section with animated headline, location, tagline rotation, and primary/secondary calls-to-action.",
  props: propsSchema,
  exposeAsTool: false,
};

function useColors() {
  const theme = useWidgetTheme();
  return {
    bg: theme === "dark" ? "#0a0a0f" : "#fafafa",
    surface: theme === "dark" ? "#13131a" : "#ffffff",
    text: theme === "dark" ? "#f5f5f7" : "#0a0a0f",
    muted: theme === "dark" ? "#9ca3af" : "#52525b",
    border: theme === "dark" ? "#27272a" : "#e4e4e7",
    accent: theme === "dark" ? "#60a5fa" : "#2563eb",
    accentSoft: theme === "dark" ? "rgba(96,165,250,0.15)" : "rgba(37,99,235,0.10)",
    success: theme === "dark" ? "#34d399" : "#059669",
  };
}

export default function HeroSection() {
  const { props, isPending } = useWidget<Props>();
  const colors = useColors();
  const [hovered, setHovered] = useState<string | null>(null);
  const { isMobile } = useViewport();

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div style={{ padding: "clamp(20px, 5vw, 40px)", backgroundColor: colors.bg, color: colors.muted }}>
          Loading hero...
        </div>
      </McpUseProvider>
    );
  }

  return (
    <McpUseProvider autoSize>
      <section
        style={{
          padding: "clamp(28px, 5vw, 48px) clamp(16px, 4vw, 32px)",
          backgroundColor: colors.bg,
          color: colors.text,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          borderRadius: 12,
        }}
      >
        <div style={{ maxWidth: 880, width: "100%", margin: "0 auto" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px",
              borderRadius: 999,
              backgroundColor: colors.accentSoft,
              color: colors.accent,
              fontSize: 13,
              fontWeight: 500,
              marginBottom: 24,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: colors.success,
                boxShadow: `0 0 0 4px ${colors.accentSoft}`,
              }}
            />
            {props.location}
          </div>

          <h1
            style={{
              fontSize: "clamp(36px, 6vw, 56px)",
              fontWeight: 700,
              lineHeight: 1.1,
              margin: "0 0 16px 0",
              letterSpacing: "-0.02em",
              wordBreak: "break-word",
              overflowWrap: "anywhere",
            }}
          >
            {props.headline}
          </h1>

          <p
            style={{
              fontSize: 20,
              color: colors.muted,
              lineHeight: 1.5,
              margin: "0 0 12px 0",
              maxWidth: 640,
              width: "100%",
              wordBreak: "break-word",
              overflowWrap: "anywhere",
            }}
          >
            {props.subhead}
          </p>

          <p
            style={{
              fontSize: 16,
              color: colors.accent,
              fontStyle: "italic",
              margin: "0 0 32px 0",
              wordBreak: "break-word",
              overflowWrap: "anywhere",
            }}
          >
            {props.tagline}
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 36 }}>
            {props.ctas.map((cta) => (
              <a
                key={cta.label}
                href={cta.href}
                onMouseEnter={() => setHovered(cta.label)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  padding: "12px 22px",
                  borderRadius: 8,
                  fontSize: 15,
                  fontWeight: 600,
                  textDecoration: "none",
                  textAlign: "center",
                  transition: "transform 0.15s, box-shadow 0.15s",
                  transform: hovered === cta.label ? "translateY(-2px)" : "translateY(0)",
                  backgroundColor: cta.primary ? colors.accent : "transparent",
                  color: cta.primary ? "#ffffff" : colors.text,
                  border: cta.primary ? "none" : `1px solid ${colors.border}`,
                  boxShadow:
                    cta.primary && hovered === cta.label
                      ? `0 8px 24px ${colors.accentSoft}`
                      : "none",
                  flex: isMobile ? "1 1 100%" : "0 0 auto",
                  width: isMobile ? "100%" : "auto",
                }}
              >
                {cta.label}
              </a>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
              gap: 12,
            }}
          >
            {props.highlights.map((h) => (
              <div
                key={h}
                style={{
                  padding: "clamp(12px, 3vw, 14px)",
                  borderRadius: 10,
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.surface,
                  fontSize: 13,
                  color: colors.muted,
                  fontWeight: 500,
                  wordBreak: "break-word",
                  overflowWrap: "anywhere",
                }}
              >
                {h}
              </div>
            ))}
          </div>
        </div>
      </section>
    </McpUseProvider>
  );
}
