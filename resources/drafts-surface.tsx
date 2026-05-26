import { McpUseProvider, useWidget, useWidgetTheme, useCallTool, type WidgetMetadata } from "mcp-use/react";
import { useState } from "react";
import { z } from "zod";

const draftSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  tags: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
  status: z.enum(["draft", "review", "published"]),
});

const propsSchema = z.object({
  authenticated: z.boolean(),
  authMessage: z.string().optional(),
  drafts: z.array(draftSchema),
  totalCount: z.number(),
  authProvider: z.string().optional(),
});

export const widgetMetadata: WidgetMetadata = {
  description: "Private drafts surface — list, create, and preview content drafts",
  props: propsSchema,
  exposeAsTool: false,
};

type Props = z.infer<typeof propsSchema>;
type Draft = z.infer<typeof draftSchema>;

function useViewport() {
  if (typeof window === "undefined") return { isMobile: false };
  return { isMobile: window.innerWidth < 640 };
}

function StatusBadge({ status, theme }: { status: Draft["status"]; theme: string }) {
  const map: Record<Draft["status"], { bg: string; text: string; label: string }> = {
    draft: { bg: theme === "dark" ? "#1c2a3d" : "#eff6ff", text: theme === "dark" ? "#93c5fd" : "#1d4ed8", label: "Draft" },
    review: { bg: theme === "dark" ? "#2d1f07" : "#fef3c7", text: theme === "dark" ? "#fcd34d" : "#b45309", label: "In Review" },
    published: { bg: theme === "dark" ? "#052e16" : "#dcfce7", text: theme === "dark" ? "#86efac" : "#15803d", label: "Published" },
  };
  const s = map[status];
  return (
    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 10, backgroundColor: s.bg, color: s.text, fontSize: 11, fontWeight: 600 }}>{s.label}</span>
  );
}

function DraftCard({ draft, selected, onClick, theme }: { draft: Draft; selected: boolean; onClick: () => void; theme: string }) {
  const bg = selected
    ? (theme === "dark" ? "#1e3a5f" : "#eff6ff")
    : (theme === "dark" ? "#161b22" : "#f8fafc");
  const border = selected
    ? (theme === "dark" ? "#2563eb" : "#93c5fd")
    : (theme === "dark" ? "#30363d" : "#e2e8f0");
  const text = theme === "dark" ? "#e6edf3" : "#1e293b";
  const muted = theme === "dark" ? "#7d8590" : "#64748b";
  return (
    <div
      onClick={onClick}
      style={{ padding: 14, backgroundColor: bg, border: `1px solid ${border}`, borderRadius: 8, cursor: "pointer", transition: "border-color 0.15s" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: text, flex: 1, minWidth: 0, wordBreak: "break-word" }}>{draft.title || "(Untitled)"}</span>
        <StatusBadge status={draft.status} theme={theme} />
      </div>
      <p style={{ margin: "0 0 8px", fontSize: 12, color: muted, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {draft.body || "No content yet."}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {draft.tags.map((t) => (
          <span key={t} style={{ fontSize: 10, padding: "1px 6px", borderRadius: 10, backgroundColor: theme === "dark" ? "#1e293b" : "#e2e8f0", color: muted }}>{t}</span>
        ))}
      </div>
      <div style={{ fontSize: 11, color: muted, marginTop: 6 }}>Updated {new Date(draft.updatedAt).toLocaleDateString()}</div>
    </div>
  );
}

export default function DraftsSurface() {
  const { props, isPending } = useWidget<Props>();
  const theme = useWidgetTheme();
  const { isMobile } = useViewport();
  const { callTool: saveDraft, isPending: isSaving } = useCallTool<{
    title: string;
    body: string;
    tags: string[];
    status: "draft" | "review" | "published";
  }>("save_draft");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newTags, setNewTags] = useState("");
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div style={{ padding: 32, textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
          Loading drafts...
        </div>
      </McpUseProvider>
    );
  }

  const bg = theme === "dark" ? "#0d1117" : "#ffffff";
  const text = theme === "dark" ? "#e6edf3" : "#1e293b";
  const muted = theme === "dark" ? "#7d8590" : "#64748b";
  const border = theme === "dark" ? "#30363d" : "#e2e8f0";
  const sectionBg = theme === "dark" ? "#161b22" : "#f8fafc";
  const inputBg = theme === "dark" ? "#0d1117" : "#ffffff";
  const inputBorder = theme === "dark" ? "#30363d" : "#d1d5db";

  // Not authenticated
  if (!props.authenticated) {
    return (
      <McpUseProvider autoSize>
        <div style={{ fontFamily: "system-ui, sans-serif", backgroundColor: bg, color: text, padding: 32, maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>&#128274;</div>
          <h2 style={{ margin: "0 0 10px", fontSize: 20, fontWeight: 700 }}>Drafts are private</h2>
          <p style={{ fontSize: 14, color: muted, lineHeight: 1.6, margin: "0 0 16px" }}>
            {props.authMessage ?? "Authentication is required to access drafts."}
          </p>
          {props.authProvider && (
            <p style={{ fontSize: 13, color: muted }}>
              Auth provider: <strong>{props.authProvider}</strong>
            </p>
          )}
          <p style={{ fontSize: 12, color: muted, marginTop: 8 }}>
            Configure <code>AUTH0_DOMAIN</code>, <code>AUTH0_CLIENT_ID</code>, and <code>AUTH0_CLIENT_SECRET</code> on the server to enable OAuth gating.
          </p>
        </div>
      </McpUseProvider>
    );
  }

  const selected = props.drafts.find((d) => d.id === selectedId) ?? null;

  const handleSave = () => {
    if (!newTitle.trim()) return;
    const tags = newTags.split(",").map((t) => t.trim()).filter(Boolean);
    saveDraft(
      { title: newTitle, body: newBody, tags, status: "draft" },
      {
        onSuccess: () => {
          setSaveMsg("Draft saved.");
          setNewTitle(""); setNewBody(""); setNewTags(""); setShowNew(false);
          setTimeout(() => setSaveMsg(null), 3000);
        },
        onError: () => setSaveMsg("Save failed."),
      }
    );
  };

  return (
    <McpUseProvider autoSize>
      <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", backgroundColor: bg, color: text, padding: isMobile ? 12 : 20 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Content Drafts</h2>
            <p style={{ margin: 0, fontSize: 12, color: muted }}>{props.totalCount} draft{props.totalCount !== 1 ? "s" : ""}</p>
          </div>
          <button
            onClick={() => { setShowNew(!showNew); setSelectedId(null); }}
            style={{ padding: "7px 16px", fontSize: 13, fontWeight: 600, borderRadius: 6, border: "none", backgroundColor: "#2563eb", color: "#fff", cursor: "pointer" }}
          >
            + New Draft
          </button>
        </div>

        {saveMsg && (
          <div style={{ padding: "8px 14px", borderRadius: 6, backgroundColor: saveMsg.includes("failed") ? (theme === "dark" ? "#3f1212" : "#fee2e2") : (theme === "dark" ? "#052e16" : "#dcfce7"), color: saveMsg.includes("failed") ? "#b91c1c" : "#15803d", fontSize: 13, marginBottom: 12 }}>
            {saveMsg}
          </div>
        )}

        {/* New draft form */}
        {showNew && (
          <div style={{ marginBottom: 20, padding: 16, backgroundColor: sectionBg, border: `1px solid ${border}`, borderRadius: 10 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600 }}>New Draft</h3>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 4, color: muted }}>Title</label>
              <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Draft title..." style={{ width: "100%", padding: "7px 10px", fontSize: 13, borderRadius: 6, border: `1px solid ${inputBorder}`, backgroundColor: inputBg, color: text, boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 4, color: muted }}>Body</label>
              <textarea value={newBody} onChange={(e) => setNewBody(e.target.value)} placeholder="Write your content..." rows={6} style={{ width: "100%", padding: "7px 10px", fontSize: 13, borderRadius: 6, border: `1px solid ${inputBorder}`, backgroundColor: inputBg, color: text, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 4, color: muted }}>Tags (comma-separated)</label>
              <input value={newTags} onChange={(e) => setNewTags(e.target.value)} placeholder="blog, tutorial, open-source" style={{ width: "100%", padding: "7px 10px", fontSize: 13, borderRadius: 6, border: `1px solid ${inputBorder}`, backgroundColor: inputBg, color: text, boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleSave} disabled={isSaving || !newTitle.trim()} style={{ padding: "7px 18px", fontSize: 13, fontWeight: 600, borderRadius: 6, border: "none", backgroundColor: "#2563eb", color: "#fff", cursor: isSaving ? "not-allowed" : "pointer", opacity: isSaving ? 0.7 : 1 }}>
                {isSaving ? "Saving..." : "Save Draft"}
              </button>
              <button onClick={() => setShowNew(false)} style={{ padding: "7px 14px", fontSize: 13, borderRadius: 6, border: `1px solid ${border}`, backgroundColor: "transparent", color: text, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Drafts list + preview */}
        {props.drafts.length === 0 && !showNew ? (
          <div style={{ padding: 40, textAlign: "center", color: muted }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>&#128221;</div>
            <p style={{ margin: 0, fontSize: 14 }}>No drafts yet. Click New Draft to start writing.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: selected && !isMobile ? "320px 1fr" : "1fr", gap: 16 }}>
            {/* List */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {props.drafts.map((d) => (
                <DraftCard
                  key={d.id}
                  draft={d}
                  selected={selectedId === d.id}
                  onClick={() => { setSelectedId(d.id === selectedId ? null : d.id); setShowNew(false); }}
                  theme={theme}
                />
              ))}
            </div>

            {/* Preview */}
            {selected && (
              <div style={{ padding: 20, backgroundColor: sectionBg, border: `1px solid ${border}`, borderRadius: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{selected.title}</h3>
                  <StatusBadge status={selected.status} theme={theme} />
                </div>
                {selected.tags.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 14 }}>
                    {selected.tags.map((t) => (
                      <span key={t} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, backgroundColor: theme === "dark" ? "#1e293b" : "#e2e8f0", color: muted }}>{t}</span>
                    ))}
                  </div>
                )}
                <div style={{ fontSize: 14, color: text, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{selected.body || <em style={{ color: muted }}>No content.</em>}</div>
                <div style={{ marginTop: 16, fontSize: 11, color: muted }}>
                  Created {new Date(selected.createdAt).toLocaleDateString()} · Updated {new Date(selected.updatedAt).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </McpUseProvider>
  );
}
