"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const ChatWidget = dynamic(() => import("./ChatWidget"), { ssr: false });

/** Loads the chat widget once the page is idle, so it never competes with the page's own loading. */
const AssistantLoader = () => {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const start = () => setReady(true);
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(start, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const t = setTimeout(start, 1500);
    return () => clearTimeout(t);
  }, []);

  if (!ready || pathname.startsWith("/admin")) return null;
  return <ChatWidget />;
};

export default AssistantLoader;
