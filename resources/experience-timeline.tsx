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

const roleSchema = z.object({
  id: z.string(),
  company: z.string(),
  title: z.string(),
  start: z.string(),
  end: z.string(),
  current: z.boolean(),
  summary: z.string(),
  achievements: z.array(z.string()),
  stack: z.array(z.string()),
});

const propsSchema = z.object({
  roles: z.array(roleSchema),
});

type Props = z.infer<typeof propsSchema>;
type Role = z.infer<typeof roleSchema>;

export const widgetMetadata: WidgetMetadata = {
  description:
    "Vertical experience timeline with stack filtering and expandable role cards. Filter by technology to highlight matching roles.",
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
    accentSoft: theme === "dark" ? "rgba(96,165,250,0.15)" : "rgba(37,99,235,0.10)",
    dim: theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
  };
}

export default function ExperienceTimeline() {
  const { props, isPending } = useWidget<Props>();
  const colors = useColors();
  const { isMobile } = useViewport();
  const [filter, setFilter] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const allTech = useMemo(() => {
    if (!props.roles) return [];
    const set = new Set<string>();
    props.roles.forEach((r) => r.stack.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [props.roles]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div style={{ padding: 24, color: colors.muted }}>Loading experience...</div>
      </McpUseProvider>
    );
  }

  const matches = (role: Role) => !filter || role.stack.includes(filter);

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
          <h2 style={{ margin: "0 0 6px 0", fontSize: "clamp(18px, 4vw, 24px)", fontWeight: 700 }}>Experience</h2>
          <p style={{ margin: 0, color: colors.muted, fontSize: 14 }}>
            Click any technology to filter roles that used it.
          </p>
        </header>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 24 }}>
          <button
            onClick={() => setFilter(null)}
            style={{
              padding: "4px 10px",
              fontSize: 12,
              borderRadius: 999,
              border: `1px solid ${filter === null ? colors.accent : colors.border}`,
              backgroundColor: filter === null ? colors.accent : "transparent",
              color: filter === null ? "#fff" : colors.text,
              cursor: "pointer",
            }}
          >
            All
          </button>
          {allTech.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(filter === t ? null : t)}
              style={{
                padding: "4px 10px",
                fontSize: 12,
                borderRadius: 999,
                border: `1px solid ${filter === t ? colors.accent : colors.border}`,
                backgroundColor: filter === t ? colors.accent : "transparent",
                color: filter === t ? "#fff" : colors.text,
                cursor: "pointer",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <div style={{ position: "relative", paddingLeft: "clamp(20px, 6vw, 24px)" }}>
          <div
            style={{
              position: "absolute",
              left: 7,
              top: 8,
              bottom: 8,
              width: 2,
              backgroundColor: colors.border,
            }}
          />

          {props.roles.map((role) => {
            const isMatch = matches(role);
            const isOpen = expanded.has(role.id);
            return (
              <div
                key={role.id}
                style={{
                  position: "relative",
                  marginBottom: 16,
                  opacity: isMatch ? 1 : 0.35,
                  transition: "opacity 0.2s",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: -22,
                    top: 14,
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    backgroundColor: role.current ? colors.accent : colors.surface,
                    border: `2px solid ${isMatch ? colors.accent : colors.border}`,
                  }}
                />
                <div
                  style={{
                    border: `1px solid ${isMatch && filter ? colors.accent : colors.border}`,
                    borderRadius: 10,
                    backgroundColor: colors.surface,
                    overflow: "hidden",
                  }}
                >
                  <button
                    onClick={() => toggleExpand(role.id)}
                    style={{
                      width: "100%",
                      padding: "clamp(12px, 3vw, 16px)",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      color: colors.text,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        marginBottom: 4,
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ fontSize: 16, fontWeight: 600, wordBreak: "break-word", overflowWrap: "anywhere" }}>
                        {role.title} · {role.company}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: colors.muted,
                          whiteSpace: isMobile ? "normal" : "nowrap",
                        }}
                      >
                        {role.start} — {role.current ? "Present" : role.end}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: colors.muted,
                        marginBottom: 10,
                        lineHeight: 1.5,
                        wordBreak: "break-word",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {role.summary}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {role.stack.map((t) => (
                        <span
                          key={t}
                          style={{
                            fontSize: 11,
                            padding: "2px 8px",
                            borderRadius: 999,
                            backgroundColor: filter === t ? colors.accent : colors.surfaceAlt,
                            color: filter === t ? "#fff" : colors.muted,
                            fontWeight: 500,
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </button>

                  {isOpen && (
                    <div
                      style={{
                        padding: "0 clamp(12px, 3vw, 16px) clamp(12px, 3vw, 16px) clamp(12px, 3vw, 16px)",
                        borderTop: `1px solid ${colors.border}`,
                      }}
                    >
                      <div style={{ fontSize: 11, color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5, margin: "12px 0 6px" }}>
                        Key achievements
                      </div>
                      <ul
                        style={{
                          margin: 0,
                          paddingLeft: 18,
                          fontSize: 13,
                          color: colors.text,
                          lineHeight: 1.6,
                          wordBreak: "break-word",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {role.achievements.map((a, i) => (
                          <li key={i}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </McpUseProvider>
  );
}
