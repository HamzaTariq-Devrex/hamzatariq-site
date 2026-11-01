"use client";

/** Opens the site's AI assistant (ChatWidget listens for this event and loads itself if needed). */
export const OPEN_CHAT_EVENT = "hamza-ai:open";

const OpenChat = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(OPEN_CHAT_EVENT))}>
    {children}
  </button>
);

export default OpenChat;
