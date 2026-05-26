import { McpUseProvider, useWidget, useWidgetTheme, type WidgetMetadata } from "mcp-use/react";
import { z } from "zod";

const langStatSchema = z.object({
  language: z.string(),
  repoCount: z.number(),
  percent: z.number(),
});

const topRepoSchema = z.object({
  name: z.string(),
  fullName: z.string(),
  url: z.string(),
  description: z.string().nullable(),
  language: z.string().nullable(),
  stars: z.number(),
  forks: z.number(),
  topics: z.array(z.string()),
  updatedAt: z.string(),
});

const propsSchema = z.object({
  username: z.string(),
  user: z.object({
    login: z.string(),
    name: z.string().nullable(),
    avatarUrl: z.string(),
    bio: z.string().nullable(),
    blog: z.string().nullable(),
    location: z.string().nullable(),
    company: z.string().nullable(),
    twitterUsername: z.string().nullable(),
    profileUrl: z.string(),
    publicRepos: z.number(),
    followers: z.number(),
    following: z.number(),
    memberSince: z.string(),
  }),
  aggregate: z.object({
    totalStars: z.number(),
    totalForks: z.number(),
    totalRepos: z.number(),
    originalRepos: z.number(),
    forkedRepos: z.number(),
  }),
  languages: z.array(langStatSchema),
  topRepos: z.array(topRepoSchema),
  fetchedAt: z.string(),
});

export const widgetMetadata: WidgetMetadata = {
  description: "Live GitHub profile stats — repos, language breakdown, stars, forks, top projects",
  props: propsSchema,
  exposeAsTool: false,
};

type Props = z.infer<typeof propsSchema>;

/* ---------- helpers ---------- */
function useViewport() {
  if (typeof window === "undefined") return { isMobile: false, isTablet: false };
  const w = window.innerWidth;
  return { isMobile: w < 640, isTablet: w < 1024 };
}

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6", JavaScript: "#f0db4f", Python: "#3572A5",
  Rust: "#dea584", Go: "#00ADD8", "C++": "#f34b7d", C: "#555555",
  Java: "#b07219", Kotlin: "#A97BFF", Swift: "#F05138",
  "C#": "#178600", Ruby: "#701516", PHP: "#4F5D95", Shell: "#89e051",
  Dockerfile: "#384d54", HTML: "#e34c26", CSS: "#563d7c", Vue: "#41b883",
  Svelte: "#ff3e00", Dart: "#00B4AB", Elixir: "#6e4a7e", Scala: "#c22d40",
};

function langColor(lang: string): string {
  return LANG_COLORS[lang] ?? "#8b949e";
}

function fmtNum(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 30) return `${d}d ago`;
  const m = Math.floor(d / 30);
  if (m < 12) return `${m}mo ago`;
  return `${Math.floor(m / 12)}y ago`;
}

/* ---------- sub-components ---------- */
function StatPill({ label, value, theme }: { label: string; value: number; theme: string }) {
  const bg = theme === "dark" ? "#21262d" : "#f6f8fa";
  const border = theme === "dark" ? "#30363d" : "#d0d7de";
  const text = theme === "dark" ? "#e6edf3" : "#24292f";
  const muted = theme === "dark" ? "#7d8590" : "#57606a";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 20px", backgroundColor: bg, border: `1px solid ${border}`, borderRadius: 8, minWidth: 90 }}>
      <span style={{ fontSize: 22, fontWeight: 700, color: text }}>{fmtNum(value)}</span>
      <span style={{ fontSize: 11, color: muted, marginTop: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
    </div>
  );
}

function LanguageBar({ languages, theme }: { languages: Props["languages"]; theme: string }) {
  const border = theme === "dark" ? "#30363d" : "#d0d7de";
  const text = theme === "dark" ? "#e6edf3" : "#24292f";
  const muted = theme === "dark" ? "#7d8590" : "#57606a";
  return (
    <div>
      <div style={{ display: "flex", height: 10, borderRadius: 5, overflow: "hidden", gap: 2, marginBottom: 12 }}>
        {languages.map((l) => (
          <div key={l.language} title={`${l.language} ${l.percent}%`} style={{ width: `${l.percent}%`, backgroundColor: langColor(l.language), minWidth: l.percent > 0 ? 4 : 0, flexShrink: 0 }} />
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px" }}>
        {languages.map((l) => (
          <div key={l.language} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: langColor(l.language), flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: text, fontWeight: 500 }}>{l.language}</span>
            <span style={{ fontSize: 12, color: muted }}>{l.percent}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RepoCard({ repo, theme, isMobile }: { repo: Props["topRepos"][number]; theme: string; isMobile: boolean }) {
  const bg = theme === "dark" ? "#161b22" : "#f6f8fa";
  const border = theme === "dark" ? "#30363d" : "#d0d7de";
  const text = theme === "dark" ? "#e6edf3" : "#24292f";
  const muted = theme === "dark" ? "#7d8590" : "#57606a";
  const linkColor = theme === "dark" ? "#58a6ff" : "#0969da";
  return (
    <div style={{ padding: 14, backgroundColor: bg, border: `1px solid ${border}`, borderRadius: 8, display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
      <a href={repo.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, fontWeight: 600, color: linkColor, textDecoration: "none", wordBreak: "break-word" }}>
        {repo.name}
      </a>
      {repo.description && (
        <p style={{ margin: 0, fontSize: 12, color: muted, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {repo.description}
        </p>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: "auto", paddingTop: 4, flexWrap: "wrap" }}>
        {repo.language && (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: langColor(repo.language) }} />
            <span style={{ fontSize: 11, color: muted }}>{repo.language}</span>
          </div>
        )}
        <span style={{ fontSize: 11, color: muted }}>&#9733; {fmtNum(repo.stars)}</span>
        <span style={{ fontSize: 11, color: muted }}>&#9897; {fmtNum(repo.forks)}</span>
        <span style={{ fontSize: 11, color: muted, marginLeft: "auto" }}>{timeAgo(repo.updatedAt)}</span>
      </div>
    </div>
  );
}

/* ---------- main widget ---------- */
export default function GitHubStats() {
  const { props, isPending } = useWidget<Props>();
  const theme = useWidgetTheme();
  const { isMobile } = useViewport();

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div style={{ padding: 32, textAlign: "center", color: theme === "dark" ? "#7d8590" : "#57606a", fontFamily: "system-ui, sans-serif" }}>
          Fetching GitHub data...
        </div>
      </McpUseProvider>
    );
  }

  const bg = theme === "dark" ? "#0d1117" : "#ffffff";
  const border = theme === "dark" ? "#30363d" : "#d0d7de";
  const text = theme === "dark" ? "#e6edf3" : "#24292f";
  const muted = theme === "dark" ? "#7d8590" : "#57606a";
  const sectionBg = theme === "dark" ? "#161b22" : "#f6f8fa";
  const linkColor = theme === "dark" ? "#58a6ff" : "#0969da";

  const { user, aggregate, languages, topRepos } = props;

  const memberYear = new Date(user.memberSince).getFullYear();

  return (
    <McpUseProvider autoSize>
      <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", backgroundColor: bg, color: text, padding: isMobile ? 16 : 24, maxWidth: 900, margin: "0 auto" }}>

        {/* Profile header */}
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 24, flexWrap: isMobile ? "wrap" : "nowrap" }}>
          <img src={user.avatarUrl} alt={user.login} style={{ width: 72, height: 72, borderRadius: "50%", flexShrink: 0, border: `2px solid ${border}` }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <a href={user.profileUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 20, fontWeight: 700, color: linkColor, textDecoration: "none" }}>
                {user.name ?? user.login}
              </a>
              <span style={{ fontSize: 14, color: muted }}>@{user.login}</span>
            </div>
            {user.bio && <p style={{ margin: "6px 0 0", fontSize: 14, color: text, lineHeight: 1.4 }}>{user.bio}</p>}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", marginTop: 8 }}>
              {user.location && <span style={{ fontSize: 12, color: muted }}>&#128205; {user.location}</span>}
              {user.company && <span style={{ fontSize: 12, color: muted }}>&#127970; {user.company}</span>}
              {user.blog && <a href={user.blog.startsWith("http") ? user.blog : `https://${user.blog}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: linkColor }}>&#128279; {user.blog}</a>}
              {user.twitterUsername && <span style={{ fontSize: 12, color: muted }}>&#64; @{user.twitterUsername}</span>}
              <span style={{ fontSize: 12, color: muted }}>Member since {memberYear}</span>
            </div>
          </div>
        </div>

        {/* Stats pills */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
          <StatPill label="Repos" value={aggregate.originalRepos} theme={theme} />
          <StatPill label="Stars" value={aggregate.totalStars} theme={theme} />
          <StatPill label="Forks" value={aggregate.totalForks} theme={theme} />
          <StatPill label="Followers" value={user.followers} theme={theme} />
          <StatPill label="Following" value={user.following} theme={theme} />
        </div>

        {/* Language breakdown */}
        {languages.length > 0 && (
          <div style={{ marginBottom: 24, padding: 16, backgroundColor: sectionBg, borderRadius: 10, border: `1px solid ${border}` }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 600, color: text }}>Language breakdown</h3>
            <LanguageBar languages={languages} theme={theme} />
          </div>
        )}

        {/* Top repos */}
        {topRepos.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: text }}>Top repositories</h3>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
              {topRepos.map((repo) => (
                <RepoCard key={repo.fullName} repo={repo} theme={theme} isMobile={isMobile} />
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ fontSize: 11, color: muted, textAlign: "right", marginTop: 12 }}>
          Fetched {new Date(props.fetchedAt).toLocaleString()} · cached 15 min
        </div>
      </div>
    </McpUseProvider>
  );
}
