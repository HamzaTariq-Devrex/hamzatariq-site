"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { OPEN_CHAT_EVENT } from "@/components/site/ds/OpenChat";

const ChatWidget = dynamic(() => import("./ChatWidget"), { ssr: false });

/** Loads the chat widget once the page is idle, so it never competes with the page's own loading. */
const AssistantLoader = () => {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [openNow, setOpenNow] = useState(false);

  // A "talk to the assistant" button before the widget has loaded: load it now, already open.
  useEffect(() => {
    const open = () => {
      setOpenNow(true);
      setReady(true);
    };
    window.addEventListener(OPEN_CHAT_EVENT, open);
    return () => window.removeEventListener(OPEN_CHAT_EVENT, open);
  }, []);

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
  return <ChatWidget startOpen={openNow} />;
};

export default AssistantLoader;
