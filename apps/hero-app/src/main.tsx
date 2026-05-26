import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { useApp, useHostStyles } from "@modelcontextprotocol/ext-apps/react";

function HeroView() {
  // Connect to the host (Claude Desktop / basic-host / any MCP Apps host)
  const app = useApp({ name: "portfolio-hero", version: "1.0.0" });
  useHostStyles(app);

  const [toolInput, setToolInput] = useState<any>(null);
  const [toolResult, setToolResult] = useState<any>(null);
  const [hostCtx, setHostCtx] = useState<any>(null);

  useEffect(() => {
    app.ontoolinput = (params) => setToolInput(params);
    app.ontoolresult = (result) => setToolResult(result);
    app.onhostcontextchanged = (ctx) => setHostCtx(ctx);
    return () => {
      // best-effort teardown
      void app.teardown?.();
    };
  }, [app]);

  const summary = useMemo(() => {
    const sc: any = (toolResult as any)?.structuredContent;
    if (!sc) return null;
    return {
      name: sc.name,
      headline: sc.headline,
      tagline: sc.tagline,
      location: sc.location,
      availability: sc.availability,
      stats: sc.stats,
      chips: sc.chips,
      links: sc.links,
    };
  }, [toolResult]);

  return (
    <div className="wrap">
      <div className="card">
        <h1>Hero App (MCP Apps)</h1>
        <p>
          This view is driven by the tool result. If you see JSON below, the host
          is correctly delivering tool input/result events.
        </p>
        {summary ? (
          <pre>{JSON.stringify(summary, null, 2)}</pre>
        ) : (
          <pre>{JSON.stringify({ toolInput, toolResult, hostCtx }, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HeroView />
  </React.StrictMode>
);
