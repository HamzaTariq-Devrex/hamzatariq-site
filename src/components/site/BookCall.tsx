"use client";

// Every call-to-action button ("Chat on WhatsApp", navbar "Let's talk"): opens WhatsApp in a new tab
// with a prefilled message (SITE.whatsappUrl) and records a whatsapp_clicked event.
import { SITE } from "@/lib/site";
import { trackEvent } from "@/lib/analytics";
import ShimmerLayers from "@/components/ui/Shimmer";

type Props = {
  label?: string;
  variant?: "primary" | "ghost";
  className?: string;
  /** Use only `className`, without the default pill button classes. */
  bare?: boolean;
  onClick?: () => void;
  /** Shown after the label (e.g. an arrow). */
  icon?: React.ReactNode;
  /** Leading WhatsApp icon (on by default). */
  waIcon?: boolean;
  /** Magic UI Shimmer Button layers (a light spark running around the pill's edge). */
  shimmer?: boolean;
};

export const WhatsAppIcon = ({ size = 16 }: { size?: number }) => (
  <svg className="wa-icon" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.2 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.4.6-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.6-.1 1.2z" />
  </svg>
);

const BookCall = ({ label = "Chat on WhatsApp", variant = "primary", className = "", bare = false, onClick, icon, waIcon = true, shimmer = variant === "primary" && !bare }: Props) => {
  const cls = `${bare ? className : `page-btn page-btn-${variant} ${className}`}${shimmer ? " shimmer-btn" : ""}`.trim();
  return (
    <a
      href={SITE.whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cls}
      data-cursor="disable"
      onClick={() => {
        trackEvent("whatsapp_clicked");
        onClick?.();
      }}
    >
      {shimmer ? <ShimmerLayers /> : null}
      {waIcon ? <WhatsAppIcon /> : null}
      {label}
      {icon}
    </a>
  );
};

export default BookCall;
