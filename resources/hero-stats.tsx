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
  yearsExperience: z.number(),
  companies: z.number(),
  productionLaunches: z.number(),
  reposMaintained: z.number(),
  ossStarsTotal: z.number(),
  ossWeeklyDownloads: z.number(),
  mentees: z.number(),
  rfcsAuthored: z.number(),
  topLanguages: z.array(
    z.object({ name: z.string(), years: z.number() })
  ),
});

type Props = z.infer<typeof propsSchema>;

export const widgetMetadata: WidgetMetadata = {
  description:
    "Hero stats card — career-summary numbers across experience, OSS, mentoring and writing.",
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
  };
}

export default function HeroStats() {
  const { props, isPending } = useWidget<Props>();
  const c = useColors();
  const { isMobile, isTablet } = useViewport();

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div style={{ padding: "clamp(14px, 4vw, 20px)", color: c.sub }}>Loading hero stats...</div>
      </McpUseProvider>
    );
  }

  const cells: { label: string; value: string | number; sub?: string }[] = [
    { label: "Years building software", value: `${props.yearsExperience}+`, sub: "Production shipping" },
    { label: "Companies (FT)", value: props.companies, sub: "Excl. internship" },
    { label: "Production launches", value: props.productionLaunches, sub: "Across roles" },
    { label: "OSS repos maintained", value: props.reposMaintained, sub: "Active triage" },
    { label: "Aggregate GitHub stars", value: props.ossStarsTotal.toLocaleString(), sub: "All public repos" },
    { label: "OSS weekly downloads", value: `${(props.ossWeeklyDownloads / 1000).toFixed(1)}k`, sub: "npm + JSR" },
    { label: "Engineers mentored", value: props.mentees, sub: "Direct mentees" },
    { label: "RFCs authored", value: props.rfcsAuthored, sub: "Internal + public" },
  ];

  return (
    <McpUseProvider autoSize>
      <div style={{ padding: isMobile ? 16 : 20, backgroundColor: c.bg, color: c.text, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div style={{ fontSize: 12, color: c.sub, marginBottom: 8, wordBreak: "break-word", overflowWrap: "anywhere" }}>
          {props.breadcrumb.join("  ›  ")}
        </div>
        <h2 style={{ margin: "0 0 16px 0", fontSize: isMobile ? 16 : 20, fontWeight: 600 }}>Career at a glance</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(auto-fill, minmax(min(100%, 150px), 1fr))",
            gap: isMobile ? 8 : 12,
          }}
        >
          {cells.map((cell) => (
            <div
              key={cell.label}
              style={{
                padding: isMobile ? 12 : 14,
                border: `1px solid ${c.border}`,
                borderRadius: 8,
                backgroundColor: c.panel,
                wordBreak: "break-word",
                overflowWrap: "anywhere",
              }}
            >
              <div style={{ fontSize: 11, color: c.sub, textTransform: "uppercase", letterSpacing: 0.4 }}>
                {cell.label}
              </div>
              <div style={{ fontSize: isMobile ? 20 : 26, fontWeight: 700, color: c.accent, marginTop: 4 }}>
                {cell.value}
              </div>
              {cell.sub && <div style={{ fontSize: 11, color: c.sub, marginTop: 2 }}>{cell.sub}</div>}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
            Languages by tenure
          </div>
          <div style={{ display: "flex", gap: isMobile ? 6 : 8, flexWrap: "wrap" }}>
            {props.topLanguages.map((lang) => (
              <div
                key={lang.name}
                style={{
                  padding: "6px 12px",
                  border: `1px solid ${c.border}`,
                  borderRadius: 999,
                  fontSize: isMobile ? 12 : 13,
                  backgroundColor: c.panel,
                }}
              >
                <span style={{ fontWeight: 600 }}>{lang.name}</span>
                <span style={{ color: c.sub, marginLeft: 6 }}>{lang.years}y</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </McpUseProvider>
  );
}
