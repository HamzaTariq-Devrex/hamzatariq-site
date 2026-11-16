"use client";

import { useState } from "react";

/** Copies a list of URLs (one per line) for Search Console's "Request indexing". */
const CopyUrls = ({ urls, label = "Copy unindexed URLs" }: { urls: string[]; label?: string }) => {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  if (!urls.length) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(urls.join("\n"));
      setState("done");
    } catch {
      setState("failed");
    }
    setTimeout(() => setState("idle"), 2500);
  };
  return (
    <button type="button" className="adm-btn" onClick={copy} title="One URL per line, most important first">
      {state === "done" ? `Copied ${urls.length} URLs` : state === "failed" ? "Copy failed: select the list below" : `${label} (${urls.length})`}
    </button>
  );
};

export default CopyUrls;
