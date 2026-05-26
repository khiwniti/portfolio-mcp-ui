/**
 * GitHub REST API client — no external npm deps, pure fetch.
 * Authenticated via GITHUB_TOKEN env var (5 000 req/hr vs 60 unauthenticated).
 * Results are cached in-memory with a 15-minute TTL.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  blog: string | null;
  location: string | null;
  company: string | null;
  email: string | null;
  twitter_username: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
  html_url: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  fork: boolean;
  stargazers_count: number;
  watchers_count: number;
  forks_count: number;
  open_issues_count: number;
  language: string | null;
  topics: string[];
  created_at: string;
  updated_at: string;
  pushed_at: string;
  is_template: boolean;
  archived: boolean;
  disabled: boolean;
  visibility: string;
  size: number;
}

export interface LanguageStat {
  language: string;
  repoCount: number;
  percent: number;
}

export interface TopRepo {
  name: string;
  fullName: string;
  url: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  topics: string[];
  updatedAt: string;
}

export interface GitHubStats {
  user: {
    login: string;
    name: string | null;
    avatarUrl: string;
    bio: string | null;
    blog: string | null;
    location: string | null;
    company: string | null;
    twitterUsername: string | null;
    profileUrl: string;
    publicRepos: number;
    followers: number;
    following: number;
    memberSince: string;
  };
  aggregate: {
    totalStars: number;
    totalForks: number;
    totalRepos: number;
    originalRepos: number;
    forkedRepos: number;
    totalSize: number;
  };
  languages: LanguageStat[];
  topRepos: TopRepo[];
  fetchedAt: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const BASE = "https://api.github.com";

function authHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  return token
    ? { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" }
    : { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
}

async function ghFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: authHeaders() });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub API ${res.status} for ${path}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

async function fetchAllRepos(username: string): Promise<GitHubRepo[]> {
  const all: GitHubRepo[] = [];
  let page = 1;
  while (true) {
    const batch = await ghFetch<GitHubRepo[]>(
      `/users/${encodeURIComponent(username)}/repos?type=owner&per_page=100&page=${page}&sort=updated`
    );
    all.push(...batch);
    if (batch.length < 100) break;
    page++;
    if (page > 10) break; // safety cap at 1000 repos
  }
  return all;
}

// ---------------------------------------------------------------------------
// Public fetchers
// ---------------------------------------------------------------------------

export async function fetchGitHubUser(username: string): Promise<GitHubUser> {
  return ghFetch<GitHubUser>(`/users/${encodeURIComponent(username)}`);
}

export async function fetchGitHubRepos(username: string): Promise<GitHubRepo[]> {
  return fetchAllRepos(username);
}

export function aggregateGitHubStats(user: GitHubUser, repos: GitHubRepo[]): GitHubStats {
  const original = repos.filter((r) => !r.fork && !r.archived && !r.disabled);
  const forked = repos.filter((r) => r.fork);

  // Language breakdown (original repos only, excluding null)
  const langCount: Record<string, number> = {};
  for (const r of original) {
    if (r.language) {
      langCount[r.language] = (langCount[r.language] ?? 0) + 1;
    }
  }
  const totalWithLang = Object.values(langCount).reduce((a, b) => a + b, 0) || 1;
  const languages: LanguageStat[] = Object.entries(langCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([language, repoCount]) => ({
      language,
      repoCount,
      percent: Math.round((repoCount / totalWithLang) * 100),
    }));

  // Top repos by stars
  const topRepos: TopRepo[] = [...original]
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 8)
    .map((r) => ({
      name: r.name,
      fullName: r.full_name,
      url: r.html_url,
      description: r.description,
      language: r.language,
      stars: r.stargazers_count,
      forks: r.forks_count,
      topics: r.topics ?? [],
      updatedAt: r.updated_at,
    }));

  const totalStars = original.reduce((s, r) => s + r.stargazers_count, 0);
  const totalForks = original.reduce((s, r) => s + r.forks_count, 0);
  const totalSize = original.reduce((s, r) => s + r.size, 0);

  return {
    user: {
      login: user.login,
      name: user.name,
      avatarUrl: user.avatar_url,
      bio: user.bio,
      blog: user.blog,
      location: user.location,
      company: user.company,
      twitterUsername: user.twitter_username,
      profileUrl: user.html_url,
      publicRepos: user.public_repos,
      followers: user.followers,
      following: user.following,
      memberSince: user.created_at,
    },
    aggregate: {
      totalStars,
      totalForks,
      totalRepos: repos.length,
      originalRepos: original.length,
      forkedRepos: forked.length,
      totalSize,
    },
    languages,
    topRepos,
    fetchedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Public events feed
// ---------------------------------------------------------------------------

export interface GitHubEvent {
  id: string;
  type: string;
  actor: { login: string; display_login: string; avatar_url: string };
  repo: { id: number; name: string; url: string };
  payload: Record<string, unknown>;
  public: boolean;
  created_at: string;
}

export interface OSSActivity {
  id: string;
  type: string;
  /** Human-readable label, e.g. "Push", "PR opened", "Release" */
  eventLabel: string;
  repoName: string;
  repoUrl: string;
  detail: string | null;
  createdAt: string;
}

function eventToActivity(e: GitHubEvent): OSSActivity {
  let eventLabel = e.type.replace("Event", "");
  let detail: string | null = null;

  switch (e.type) {
    case "PushEvent": {
      const p = e.payload as {
        commits?: { message: string }[];
        distinct_size?: number;
        size?: number;
        ref?: string;
      };
      // Use || (not ??) so API-returned 0 is treated as "count unknown".
      // distinct_size is the canonical commit count; fall back to size then commits array.
      const count = p.distinct_size || p.size || p.commits?.length || 0;
      const msg = p.commits?.[0]?.message?.split("\n")[0] ?? null;
      const branch = p.ref ? p.ref.replace(/^refs\/heads\//, "") : null;
      eventLabel = "Push";
      if (msg && count > 0) {
        detail = `${count} commit${count !== 1 ? "s" : ""}: ${msg.slice(0, 100)}`;
      } else if (count > 0) {
        detail = `${count} commit${count !== 1 ? "s" : ""}${branch ? ` to ${branch}` : ""}`;
      } else if (branch) {
        detail = `pushed to ${branch}`;
      } else {
        detail = "code push";
      }
      break;
    }
    case "PullRequestEvent": {
      const p = e.payload as {
        action?: string;
        pull_request?: { title?: string; number?: number };
      };
      eventLabel = `PR ${p.action ?? ""}`.trim();
      detail = p.pull_request?.title ?? null;
      break;
    }
    case "IssuesEvent": {
      const p = e.payload as {
        action?: string;
        issue?: { title?: string };
      };
      eventLabel = `Issue ${p.action ?? ""}`.trim();
      detail = p.issue?.title ?? null;
      break;
    }
    case "IssueCommentEvent": {
      const p = e.payload as { issue?: { title?: string } };
      eventLabel = "Issue comment";
      detail = p.issue?.title ?? null;
      break;
    }
    case "CreateEvent": {
      const p = e.payload as { ref_type?: string; ref?: string };
      eventLabel = `Created ${p.ref_type ?? ""}`.trim();
      detail = p.ref ? `"${p.ref}"` : null;
      break;
    }
    case "ForkEvent": {
      const p = e.payload as { forkee?: { full_name?: string } };
      eventLabel = "Fork";
      detail = p.forkee?.full_name ?? null;
      break;
    }
    case "WatchEvent":
      eventLabel = "Starred";
      break;
    case "ReleaseEvent": {
      const p = e.payload as {
        release?: { tag_name?: string; name?: string };
      };
      eventLabel = "Release";
      detail = p.release?.tag_name ?? p.release?.name ?? null;
      break;
    }
    case "PullRequestReviewEvent": {
      const p = e.payload as {
        review?: { state?: string };
        pull_request?: { title?: string };
      };
      eventLabel = `PR review${p.review?.state ? ` (${p.review.state})` : ""}`;
      detail = (p.pull_request as { title?: string } | undefined)?.title ?? null;
      break;
    }
    default:
      eventLabel = e.type
        .replace("Event", "")
        .replace(/([A-Z])/g, " $1")
        .trim();
  }

  return {
    id: e.id,
    type: e.type,
    eventLabel,
    repoName: e.repo.name,
    repoUrl: `https://github.com/${e.repo.name}`,
    detail,
    createdAt: e.created_at,
  };
}

interface EventsCacheEntry {
  data: OSSActivity[];
  expiresAt: number;
}

const eventsCache = new Map<string, EventsCacheEntry>();
const EVENTS_TTL_MS = 10 * 60 * 1000; // 10-min TTL

export async function getGitHubEventsCached(
  username: string,
  limit = 30
): Promise<{ ok: true; data: OSSActivity[] } | { ok: false; reason: string }> {
  if (!username?.trim()) return { ok: false, reason: "No username provided." };

  const cacheKey = `${username}:${limit}`;
  const cached = eventsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return { ok: true, data: cached.data };
  }

  try {
    const events = await ghFetch<GitHubEvent[]>(
      `/users/${encodeURIComponent(username)}/events/public?per_page=${Math.min(limit, 100)}`
    );
    const data = events
      .filter((e) => e.public)
      .slice(0, limit)
      .map(eventToActivity);
    eventsCache.set(cacheKey, { data, expiresAt: Date.now() + EVENTS_TTL_MS });
    return { ok: true, data };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return { ok: false, reason };
  }
}

// ---------------------------------------------------------------------------
// Cache layer (15-min TTL, keyed by username)
// ---------------------------------------------------------------------------

interface CacheEntry {
  data: GitHubStats;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const TTL_MS = 15 * 60 * 1000;

export async function getGitHubStatsCached(username: string): Promise<{ ok: true; data: GitHubStats } | { ok: false; reason: string }> {
  if (!username?.trim()) return { ok: false, reason: "GITHUB_USERNAME not set or empty." };

  const cached = cache.get(username);
  if (cached && cached.expiresAt > Date.now()) {
    return { ok: true, data: cached.data };
  }

  try {
    const [user, repos] = await Promise.all([
      fetchGitHubUser(username),
      fetchGitHubRepos(username),
    ]);
    const data = aggregateGitHubStats(user, repos);
    cache.set(username, { data, expiresAt: Date.now() + TTL_MS });
    return { ok: true, data };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return { ok: false, reason };
  }
}
