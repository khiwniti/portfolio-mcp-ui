import { useEffect, useMemo, useState } from "react";
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

const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  summary: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  status: z.enum(["live", "beta", "archived"]),
  metrics: z.array(z.object({ label: z.string(), value: z.string() })),
  links: z.array(z.object({ label: z.string(), href: z.string() })),
});

const propsSchema = z.object({
  projects: z.array(projectSchema),
});

type Props = z.infer<typeof propsSchema>;
type Project = z.infer<typeof projectSchema>;

export const widgetMetadata: WidgetMetadata = {
  description:
    "Projects showcase with tag filtering, status badges, key metrics per project, and an inline detail panel.",
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
    accentSoft: theme === "dark" ? "rgba(96,165,250,0.18)" : "rgba(37,99,235,0.10)",
  };
}

function statusBadge(status: Project["status"]) {
  switch (status) {
    case "live":
      return { fg: "#059669", bg: "rgba(5,150,105,0.12)", label: "Live" };
    case "beta":
      return { fg: "#d97706", bg: "rgba(217,119,6,0.12)", label: "Beta" };
    case "archived":
      return { fg: "#71717a", bg: "rgba(113,113,122,0.18)", label: "Archived" };
  }
}

export default function ProjectsShowcase() {
  const { props, isPending } = useWidget<Props>();
  const colors = useColors();
  const { isMobile, isTablet } = useViewport();
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const tags = useMemo(() => {
    if (!props.projects) return [];
    const set = new Set<string>();
    props.projects.forEach((p) => p.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [props.projects]);

  const filtered = useMemo(() => {
    if (!props.projects) return [];
    if (!activeTag) return props.projects;
    return props.projects.filter((p) => p.tags.includes(activeTag));
  }, [props.projects, activeTag]);

  const detail = selected ? props.projects?.find((p) => p.id === selected) : null;

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div style={{ padding: 24, color: colors.muted }}>Loading projects...</div>
      </McpUseProvider>
    );
  }

  return (
    <McpUseProvider autoSize>
      <section
        style={{
          padding: isMobile ? 16 : 24,
          backgroundColor: colors.bg,
          color: colors.text,
          borderRadius: 12,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        <header style={{ marginBottom: 20 }}>
          <h2 style={{ margin: "0 0 6px 0", fontSize: isMobile ? 22 : 32, fontWeight: 700 }}>
            Projects
          </h2>
          <p style={{ margin: 0, color: colors.muted, fontSize: isMobile ? 13 : 14, wordBreak: "break-word", overflowWrap: "anywhere" }}>
            Production work and side projects. Click a card to see details and metrics.
          </p>
        </header>


        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
          <button
            onClick={() => setActiveTag(null)}
            style={{
              padding: "4px 12px",
              fontSize: 12,
              fontWeight: 500,
              borderRadius: 999,
              border: `1px solid ${activeTag === null ? colors.accent : colors.border}`,
              backgroundColor: activeTag === null ? colors.accent : "transparent",
              color: activeTag === null ? "#fff" : colors.text,
              cursor: "pointer",
            }}
          >
            All ({props.projects.length})
          </button>
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              style={{
                padding: "4px 12px",
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 999,
                border: `1px solid ${activeTag === tag ? colors.accent : colors.border}`,
                backgroundColor: activeTag === tag ? colors.accent : "transparent",
                color: activeTag === tag ? "#fff" : colors.text,
                cursor: "pointer",
              }}
            >
              {tag}
            </button>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(auto-fill, minmax(min(100%, 240px), 1fr))",
            gap: isMobile ? 10 : 14,
            marginBottom: detail ? 20 : 0,
          }}
        >
          {filtered.map((project) => {
            const badge = statusBadge(project.status);
            const active = selected === project.id;
            return (
              <button
                key={project.id}
                onClick={() => setSelected(active ? null : project.id)}
                style={{
                  textAlign: "left",
                  padding: isMobile ? 14 : 20,
                  borderRadius: 12,
                  border: `1px solid ${active ? colors.accent : colors.border}`,
                  backgroundColor: active ? colors.surfaceAlt : colors.surface,
                  cursor: "pointer",
                  color: colors.text,
                  transition: "transform 0.15s, border-color 0.15s",
                  transform: active ? "translateY(-2px)" : "translateY(0)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, wordBreak: "break-word", overflowWrap: "anywhere" }}>{project.name}</h3>
                  <span
                    style={{
                      fontSize: 10,
                      padding: "2px 8px",
                      borderRadius: 999,
                      backgroundColor: badge.bg,
                      color: badge.fg,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: 0.4,
                      whiteSpace: "nowrap",
                      marginLeft: 8,
                    }}
                  >
                    {badge.label}
                  </span>
                </div>
                <p style={{ margin: "0 0 10px 0", fontSize: isMobile ? 12 : 13, color: colors.muted, lineHeight: 1.5, wordBreak: "break-word", overflowWrap: "anywhere" }}>
                  {project.summary}
                </p>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {project.tags.slice(0, 4).map((t) => (
                    <span
                      key={t}
                      style={{
                        fontSize: 10,
                        padding: "1px 6px",
                        borderRadius: 4,
                        backgroundColor: colors.surfaceAlt,
                        color: colors.muted,
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {detail && (
          <div
            style={{
              padding: isMobile ? 14 : 20,
              borderRadius: 12,
              border: `1px solid ${colors.accent}`,
              backgroundColor: colors.surface,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 10, flexWrap: "wrap", gap: 6 }}>
              <h3 style={{ margin: 0, fontSize: isMobile ? 20 : 28, wordBreak: "break-word", overflowWrap: "anywhere" }}>{detail.name}</h3>
              <button
                onClick={() => setSelected(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: colors.muted,
                  cursor: "pointer",
                  fontSize: 18,
                  lineHeight: 1,
                }}
                aria-label="Close detail"
              >
                ×
              </button>
            </div>
            <p style={{ margin: "0 0 14px 0", fontSize: isMobile ? 13 : 14, color: colors.text, lineHeight: 1.6, wordBreak: "break-word", overflowWrap: "anywhere" }}>
              {detail.description}
            </p>

            {detail.metrics.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr 1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(auto-fit, minmax(min(100%, 110px), 1fr))",
                  gap: isMobile ? 8 : 10,
                  marginBottom: 14,
                }}
              >
                {detail.metrics.map((m) => (
                  <div
                    key={m.label}
                    style={{
                      padding: 10,
                      borderRadius: 8,
                      backgroundColor: colors.surfaceAlt,
                    }}
                  >
                    <div style={{ fontSize: 11, color: colors.muted, textTransform: "uppercase", letterSpacing: 0.4 }}>
                      {m.label}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: colors.accent, marginTop: 4, wordBreak: "break-word" }}>
                      {m.value}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {detail.links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 500,
                    textDecoration: "none",
                    backgroundColor: colors.accent,
                    color: "#fff",
                  }}
                >
                  {l.label} →
                </a>
              ))}
            </div>
          </div>
        )}
      </section>
    </McpUseProvider>
  );
}
