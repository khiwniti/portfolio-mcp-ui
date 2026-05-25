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

const skillSchema = z.object({
  name: z.string(),
  category: z.string(),
  level: z.enum(["working", "proficient", "expert"]),
  years: z.number(),
  evidence: z.array(z.string()),
});

const propsSchema = z.object({
  categories: z.array(z.string()),
  skills: z.array(skillSchema),
  liveTechRankings: z
    .array(z.object({ slug: z.string(), label: z.string(), reposUsing: z.number() }))
    .optional(),
});

type Props = z.infer<typeof propsSchema>;
type Skill = z.infer<typeof skillSchema>;

export const widgetMetadata: WidgetMetadata = {
  description:
    "Interactive skills grid with category filters, level-based grouping (working/proficient/expert), and hover-to-reveal evidence panel listing where each skill has been used.",
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

function levelStyle(level: Skill["level"], colors: ReturnType<typeof useColors>) {
  switch (level) {
    case "expert":
      return { bg: colors.accent, fg: "#ffffff", label: "Expert" };
    case "proficient":
      return { bg: colors.accentSoft, fg: colors.accent, label: "Proficient" };
    case "working":
      return { bg: colors.surfaceAlt, fg: colors.muted, label: "Working" };
  }
}

export default function SkillsGrid() {
  const { props, isPending } = useWidget<Props>();
  const colors = useColors();
  const { isMobile, isTablet } = useViewport();
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [focused, setFocused] = useState<Skill | null>(null);

  const categories = useMemo(
    () => (props.categories ? ["All", ...props.categories] : ["All"]),
    [props.categories]
  );

  const filtered = useMemo(() => {
    if (!props.skills) return [];
    if (activeCategory === "All") return props.skills;
    return props.skills.filter((s) => s.category === activeCategory);
  }, [props.skills, activeCategory]);

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div style={{ padding: 24, color: colors.muted }}>Loading skills...</div>
      </McpUseProvider>
    );
  }

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
        <header style={{ marginBottom: 20 }}>
          <h2 style={{ margin: "0 0 6px 0", fontSize: "clamp(18px, 4vw, 24px)", fontWeight: 700 }}>Skills</h2>
          <p style={{ margin: 0, color: colors.muted, fontSize: 14 }}>
            Hover or focus any skill to see corroborating evidence.
          </p>
        </header>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
          {categories.map((cat) => {
            const active = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: "6px 14px",
                  fontSize: 13,
                  fontWeight: 500,
                  borderRadius: 999,
                  border: `1px solid ${active ? colors.accent : colors.border}`,
                  backgroundColor: active ? colors.accent : "transparent",
                  color: active ? "#ffffff" : colors.text,
                  cursor: "pointer",
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {props.liveTechRankings && props.liveTechRankings.length > 0 && (
          <div
            style={{
              marginBottom: 18,
              padding: "clamp(12px, 3vw, 16px)",
              borderRadius: 12,
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.surface,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: "#22c55e",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  color: colors.muted,
                }}
              >
                LIVE · Knowledge Graph
              </span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {props.liveTechRankings.slice(0, 10).map((item) => (
                <span
                  key={item.slug}
                  style={{
                    fontSize: 12,
                    padding: "3px 10px",
                    borderRadius: 999,
                    backgroundColor: colors.surfaceAlt,
                    color: colors.muted,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  {item.label}{" "}
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>
                    {item.reposUsing} repos
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isTablet ? "1fr" : "1fr 320px",
            gap: 20,
            alignItems: "start",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 140px), 1fr))",
              gap: 10,
            }}
          >
            {filtered.map((skill) => {
              const ls = levelStyle(skill.level, colors);
              const isFocused = focused?.name === skill.name;
              return (
                <button
                  key={skill.name}
                  onMouseEnter={() => setFocused(skill)}
                  onMouseLeave={() => setFocused((cur) => (cur?.name === skill.name ? null : cur))}
                  onFocus={() => setFocused(skill)}
                  onBlur={() => setFocused((cur) => (cur?.name === skill.name ? null : cur))}
                  style={{
                    textAlign: "left",
                    padding: 12,
                    border: `1px solid ${isFocused ? colors.accent : colors.border}`,
                    borderRadius: 10,
                    backgroundColor: isFocused ? colors.surfaceAlt : colors.surface,
                    cursor: "pointer",
                    color: colors.text,
                    transition: "border-color 0.15s, background-color 0.15s",
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
                    {skill.name}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: 999,
                        backgroundColor: ls.bg,
                        color: ls.fg,
                        textTransform: "uppercase",
                        letterSpacing: 0.4,
                      }}
                    >
                      {ls.label}
                    </span>
                    <span style={{ fontSize: 11, color: colors.muted }}>
                      {skill.years}y
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <aside
            style={{
              position: isTablet ? "static" : "sticky",
              top: 12,
              padding: "clamp(12px, 3vw, 16px)",
              borderRadius: 12,
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.surface,
              minHeight: isMobile ? 0 : 200,
            }}
          >
            {focused ? (
              <div>
                <div style={{ fontSize: 11, color: colors.muted, textTransform: "uppercase", letterSpacing: 0.4 }}>
                  Evidence for
                </div>
                <h3 style={{ margin: "4px 0 4px 0", fontSize: 18 }}>{focused.name}</h3>
                <div style={{ fontSize: 12, color: colors.muted, marginBottom: 12 }}>
                  {focused.category} · {focused.years} years experience
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: colors.text, lineHeight: 1.6, wordBreak: "break-word", overflowWrap: "anywhere" }}>
                  {focused.evidence.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div style={{ color: colors.muted, fontSize: 13, lineHeight: 1.5 }}>
                <strong style={{ color: colors.text }}>Evidence panel.</strong>
                <br />
                Hover or tab to any skill to see the projects, roles, and contributions where it was applied.
              </div>
            )}
          </aside>
        </div>
      </section>
    </McpUseProvider>
  );
}
