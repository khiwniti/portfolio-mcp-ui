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
  status: z.enum(["available", "open", "booked", "unavailable"]),
  statusLabel: z.string(),
  detail: z.string(),
  responseTime: z.string(),
  preferredRoles: z.array(z.string()),
  contactHref: z.string(),
  updatedAt: z.string(),
});

type Props = z.infer<typeof propsSchema>;

export const widgetMetadata: WidgetMetadata = {
  description:
    "Sticky availability indicator that displays current hiring status, expected response time, preferred role types, and a direct contact CTA.",
  props: propsSchema,
  exposeAsTool: false,
};

function statusColors(status: Props["status"]) {
  switch (status) {
    case "available":
      return { fg: "#059669", bg: "rgba(5,150,105,0.12)", pulse: "#34d399" };
    case "open":
      return { fg: "#2563eb", bg: "rgba(37,99,235,0.12)", pulse: "#60a5fa" };
    case "booked":
      return { fg: "#d97706", bg: "rgba(217,119,6,0.12)", pulse: "#fbbf24" };
    case "unavailable":
      return { fg: "#dc2626", bg: "rgba(220,38,38,0.12)", pulse: "#f87171" };
  }
}

export default function AvailabilityStrip() {
  const { props, isPending } = useWidget<Props>();
  const theme = useWidgetTheme();
  const { isMobile } = useViewport();

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div style={{ padding: 16, fontSize: 13 }}>Loading availability...</div>
      </McpUseProvider>
    );
  }

  const c = statusColors(props.status);
  const surface = theme === "dark" ? "#13131a" : "#ffffff";
  const border = theme === "dark" ? "#27272a" : "#e4e4e7";
  const text = theme === "dark" ? "#f5f5f7" : "#0a0a0f";
  const muted = theme === "dark" ? "#9ca3af" : "#52525b";

  return (
    <McpUseProvider autoSize>
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.7; }
          70% { transform: scale(2.2); opacity: 0; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
      <div
        style={{
          padding: "clamp(10px, 3vw, 14px) clamp(12px, 4vw, 20px)",
          backgroundColor: surface,
          border: `1px solid ${border}`,
          borderRadius: 12,
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "flex-start" : "center",
          gap: isMobile ? 10 : 16,
          flexWrap: "wrap",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "1 1 240px" }}>
          <div style={{ position: "relative", width: 12, height: 12 }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                backgroundColor: c.pulse,
                animation: "pulse-ring 2s ease-out infinite",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                backgroundColor: c.fg,
              }}
            />
          </div>
          <div>
            <div
              style={{
                display: "inline-block",
                padding: "2px 10px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                color: c.fg,
                backgroundColor: c.bg,
                marginBottom: 4,
              }}
            >
              {props.statusLabel}
            </div>
            <div style={{ fontSize: isMobile ? 13 : 14, color: text, fontWeight: 500, wordBreak: "break-word", overflowWrap: "anywhere" }}>
              {props.detail}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: isMobile ? 12 : 18, flexWrap: "wrap", color: muted, fontSize: isMobile ? 12 : 13 }}>
          <div>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Response
            </div>
            <div style={{ color: text, fontWeight: 500 }}>{props.responseTime}</div>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Open to
            </div>
            <div style={{ color: text, fontWeight: 500 }}>
              {props.preferredRoles.join(" · ")}
            </div>
          </div>
        </div>

        <a
          href={props.contactHref}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            backgroundColor: c.fg,
            color: "#ffffff",
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
            whiteSpace: "nowrap",
            alignSelf: isMobile ? "stretch" : "auto",
            textAlign: "center",
          }}
        >
          Get in touch
        </a>
      </div>
      <div style={{ fontSize: 11, color: muted, marginTop: 6, paddingLeft: 4 }}>
        Updated {props.updatedAt}
      </div>
    </McpUseProvider>
  );
}
