import { McpUseProvider, useWidget, useWidgetTheme, type WidgetMetadata } from "mcp-use/react";
import { useMemo, useState } from "react";
import { z } from "zod";

const activitySchema = z.object({
  id: z.string(),
  type: z.string(),
  eventLabel: z.string(),
  repoName: z.string(),
  repoUrl: z.string(),
  detail: z.string().nullable(),
  createdAt: z.string(),
});

const propsSchema = z.object({
  username: z.string(),
  activities: z.array(activitySchema),
  totalCount: z.number(),
  hasGithubToken: z.boolean(),
  fetchedAt: z.string(),
});

export const widgetMetadata: WidgetMetadata = {
  description:
    "Live GitHub public activity feed — pushes, PRs, issues, releases and more, grouped by repository",
  props: propsSchema,
  exposeAsTool: false,
};

type Props = z.infer<typeof propsSchema>;
type Activity = z.infer<typeof activitySchema>;

/* ─── event type colour palette ─────────────────────────────────────────── */

const EVENT_PALETTE: Record<string, { light: string; dark: string; icon: string }> = {
  PushEvent:                { light: "#dbeafe", dark: "#1c3a5e", icon: "↑" },
  PullRequestEvent:         { light: "#ede9fe", dark: "#2d1b6b", icon: "⤴" },
  IssuesEvent:              { light: "#fef9c3", dark: "#3d320a", icon: "!" },
  IssueCommentEvent:        { light: "#fef3c7", dark: "#3d2b0a", icon: "✎" },
  CreateEvent:              { light: "#dcfce7", dark: "#0f3320", icon: "+" },
  ForkEvent:                { light: "#f3f4f6", dark: "#1f2937", icon: "⑂" },
  WatchEvent:               { light: "#fef9c3", dark: "#3d320a", icon: "★" },
  ReleaseEvent:             { light: "#d1fae5", dark: "#052e16", icon: "◈" },
  PullRequestReviewEvent:   { light: "#fce7f3", dark: "#3b0d2b", icon: "✔" },
  default:                  { light: "#f1f5f9", dark: "#1e293b", icon: "•" },
};

function eventPalette(type: string, theme: string) {
  const p = EVENT_PALETTE[type] ?? EVENT_PALETTE.default;
  return { bg: theme === "dark" ? p.dark : p.light, icon: p.icon };
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function EventBadge({ type, label, theme }: { type: string; label: string; theme: string }) {
  const { bg, icon } = eventPalette(type, theme);
  const text = theme === "dark" ? "#e2e8f0" : "#1e293b";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 10,
        backgroundColor: bg,
        color: text,
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontSize: 12 }}>{icon}</span>
      {label}
    </span>
  );
}

function ActivityRow({ act, theme }: { act: Activity; theme: string }) {
  const border = theme === "dark" ? "#30363d" : "#e2e8f0";
  const text = theme === "dark" ? "#e6edf3" : "#1e293b";
  const muted = theme === "dark" ? "#7d8590" : "#64748b";
  const link = theme === "dark" ? "#58a6ff" : "#2563eb";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: "6px 12px",
        padding: "10px 16px",
        borderBottom: `1px solid ${border}`,
        alignItems: "start",
      }}
    >
      {/* left column */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <EventBadge type={act.type} label={act.eventLabel} theme={theme} />
          <a
            href={act.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 12, color: link, textDecoration: "none", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "180px" }}
          >
            {act.repoName}
          </a>
        </div>
        {act.detail && (
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: muted,
              lineHeight: 1.4,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {act.detail}
          </p>
        )}
      </div>

      {/* right column — time */}
      <span style={{ fontSize: 11, color: muted, whiteSpace: "nowrap", paddingTop: 3 }}>
        {timeAgo(act.createdAt)}
      </span>
    </div>
  );
}

export default function OssFeed() {
  const { props, isPending } = useWidget<Props>();
  const theme = useWidgetTheme();
  const [typeFilter, setTypeFilter] = useState<string>("all");

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div
          style={{
            padding: 32,
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
            color: "#64748b",
          }}
        >
          Loading OSS activity...
        </div>
      </McpUseProvider>
    );
  }

  const bg = theme === "dark" ? "#0d1117" : "#ffffff";
  const text = theme === "dark" ? "#e6edf3" : "#1e293b";
  const muted = theme === "dark" ? "#7d8590" : "#64748b";
  const border = theme === "dark" ? "#30363d" : "#e2e8f0";
  const headerBg = theme === "dark" ? "#161b22" : "#f8fafc";
  const chipActive = theme === "dark" ? "#1d4ed8" : "#2563eb";

  /* unique event types for filter tabs */
  const eventTypes = useMemo(() => {
    const seen = new Set<string>();
    props.activities.forEach((a) => seen.add(a.type));
    return ["all", ...Array.from(seen).sort()];
  }, [props.activities]);

  const visible =
    typeFilter === "all"
      ? props.activities
      : props.activities.filter((a) => a.type === typeFilter);

  const fetchedDate = new Date(props.fetchedAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <McpUseProvider autoSize>
      <div
        style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          backgroundColor: bg,
          color: text,
          borderRadius: 8,
          overflow: "hidden",
          border: `1px solid ${border}`,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 16px",
            backgroundColor: headerBg,
            borderBottom: `1px solid ${border}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>@{props.username}</span>
              <span style={{ fontSize: 11, color: muted }}>OSS activity</span>
              {!props.hasGithubToken && (
                <span
                  style={{
                    fontSize: 10,
                    padding: "2px 6px",
                    borderRadius: 8,
                    backgroundColor: theme === "dark" ? "#3d2b0a" : "#fef3c7",
                    color: theme === "dark" ? "#fbbf24" : "#92400e",
                    fontWeight: 600,
                  }}
                >
                  unauthenticated — rate-limited
                </span>
              )}
            </div>
            <span style={{ fontSize: 11, color: muted }}>updated {fetchedDate}</span>
          </div>

          {/* Type filter chips */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {eventTypes.map((t) => {
              const isActive = typeFilter === t;
              const label =
                t === "all"
                  ? `All (${props.activities.length})`
                  : t.replace("Event", "");
              return (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  style={{
                    padding: "3px 10px",
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: 10,
                    border: "none",
                    cursor: "pointer",
                    backgroundColor: isActive
                      ? chipActive
                      : theme === "dark"
                      ? "#21262d"
                      : "#e2e8f0",
                    color: isActive ? "#fff" : muted,
                    transition: "background-color 0.15s",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Activity list */}
        <div>
          {visible.length === 0 ? (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                color: muted,
                fontSize: 13,
              }}
            >
              No events match the selected filter.
            </div>
          ) : (
            visible.map((act) => (
              <ActivityRow key={act.id} act={act} theme={theme} />
            ))
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "8px 16px",
            backgroundColor: headerBg,
            borderTop: `1px solid ${border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 11, color: muted }}>
            {visible.length} event{visible.length !== 1 ? "s" : ""}
            {typeFilter !== "all" ? ` · filtered` : ""}
          </span>
          <a
            href={`https://github.com/${props.username}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 11,
              color: theme === "dark" ? "#58a6ff" : "#2563eb",
              textDecoration: "none",
            }}
          >
            View on GitHub
          </a>
        </div>
      </div>
    </McpUseProvider>
  );
}
