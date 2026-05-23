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
  status: z.string(),
  statusLabel: z.string(),
  detail: z.string(),
  responseTime: z.string(),
  noticeRequired: z.string(),
  willingToTravel: z.boolean(),
  preferences: z.object({
    locations: z.array(z.string()),
    comp: z.string(),
    teamSize: z.string(),
    avoid: z.array(z.string()),
    roleTypes: z.array(z.string()),
  }),
  calendar: z.array(
    z.object({
      week: z.string(),
      capacity: z.string(),
      slotsOpen: z.number(),
    })
  ),
  breadcrumb: z.array(z.string()),
});

type Props = z.infer<typeof propsSchema>;

export const widgetMetadata: WidgetMetadata = {
  description:
    "Deep view of availability: rolling calendar of interview windows and preferences for location, comp, team size, role types.",
  props: propsSchema,
  exposeAsTool: false,
};

export default function AvailabilityDetail() {
  const { props, isPending, sendFollowUpMessage } = useWidget<Props>();
  const theme = useWidgetTheme();
  const { isMobile } = useViewport();

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div style={{ padding: 24 }}>Loading availability detail...</div>
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
    warn: dark ? "#fbbf24" : "#d97706",
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
            gap: 12,
            marginBottom: 18,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              backgroundColor: c.good,
              boxShadow: `0 0 0 4px ${c.good}33`,
            }}
          />
          <h2 style={{ margin: 0, fontSize: "clamp(18px, 4vw, 22px)", fontWeight: 700 }}>
            {props.statusLabel}
          </h2>
          <span style={{ color: c.sub, fontSize: 14 }}>
            • {props.responseTime} reply
          </span>
        </div>

        <p style={{ margin: "0 0 22px 0", color: c.sub, fontSize: 15, wordBreak: "break-word", overflowWrap: "anywhere" }}>
          {props.detail}
        </p>

        <Section title="Interview calendar" c={c}>
          <div style={{ display: "grid", gap: 8 }}>
            {props.calendar.map((row) => (
              <div
                key={row.week}
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr auto" : "1.2fr 2fr auto",
                  gap: isMobile ? 4 : 8,
                  alignItems: "center",
                  padding: "10px 12px",
                  backgroundColor: c.panel,
                  border: `1px solid ${c.border}`,
                  borderRadius: 8,
                  fontSize: 14,
                }}
              >
                <span style={{ fontWeight: 600 }}>{row.week}</span>
                <span style={{ color: c.sub, gridColumn: isMobile ? "1 / -1" : "auto", wordBreak: "break-word" }}>{row.capacity}</span>
                <span
                  style={{
                    fontSize: 12,
                    color: row.slotsOpen > 0 ? c.good : c.warn,
                    fontWeight: 600,
                  }}
                >
                  {row.slotsOpen > 0 ? `${row.slotsOpen} slots` : "Full"}
                </span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Preferences" c={c}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
              gap: 12,
            }}
          >
            <Card c={c} label="Locations">
              <ul style={ulStyle()}>
                {props.preferences.locations.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </Card>
            <Card c={c} label="Role types">
              <ul style={ulStyle()}>
                {props.preferences.roleTypes.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </Card>
            <Card c={c} label="Team size">
              <p style={{ margin: 0, fontSize: 14 }}>{props.preferences.teamSize}</p>
            </Card>
            <Card c={c} label="Comp">
              <p style={{ margin: 0, fontSize: 14 }}>{props.preferences.comp}</p>
            </Card>
            <Card c={c} label="Notice required">
              <p style={{ margin: 0, fontSize: 14 }}>{props.noticeRequired}</p>
            </Card>
            <Card c={c} label="Travel">
              <p style={{ margin: 0, fontSize: 14 }}>
                {props.willingToTravel ? "Open to occasional travel" : "Remote only"}
              </p>
            </Card>
            <Card c={c} label="Avoid">
              <ul style={ulStyle()}>
                {props.preferences.avoid.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </Card>
          </div>
        </Section>

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
            onClick={() =>
              sendFollowUpMessage("Open the contact section so I can reach out.")
            }
            style={{
              padding: "8px 14px",
              fontSize: 13,
              borderRadius: 8,
              border: "none",
              backgroundColor: c.accent,
              color: "#fff",
              cursor: "pointer",
              fontFamily: "inherit",
              fontWeight: 600,
            }}
          >
            Contact →
          </button>
          <button
            onClick={() => sendFollowUpMessage("Show the availability strip again.")}
            style={{
              padding: "8px 14px",
              fontSize: 13,
              borderRadius: 8,
              border: `1px solid ${c.border}`,
              backgroundColor: c.panel,
              color: c.text,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            ← Back to status
          </button>
        </div>
      </div>
    </McpUseProvider>
  );
}

function Section({
  title,
  c,
  children,
}: {
  title: string;
  c: { sub: string };
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div
        style={{
          fontSize: 11,
          letterSpacing: 0.5,
          textTransform: "uppercase",
          color: c.sub,
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function Card({
  c,
  label,
  children,
}: {
  c: { panel: string; border: string; sub: string };
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: 12,
        backgroundColor: c.panel,
        border: `1px solid ${c.border}`,
        borderRadius: 8,
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
        {label}
      </div>
      {children}
    </div>
  );
}

function ulStyle(): React.CSSProperties {
  return { margin: 0, paddingLeft: 16, fontSize: 13, lineHeight: 1.6 };
}
