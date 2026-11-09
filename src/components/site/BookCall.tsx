"use client";

// Every "Book a free call" button. With a Calendly link (CALENDLY_URL) it opens the Calendly popup,
// loading Calendly's script only on click; without one it goes to /contact.
import Link from "next/link";
import { SITE } from "@/lib/site";
import { trackEvent } from "@/lib/analytics";
import ShimmerLayers from "@/components/ui/Shimmer";

type Props = {
  label?: string;
  variant?: "primary" | "ghost";
  className?: string;
  /** Use only `className`, without the default pill button classes. */
  bare?: boolean;
  /** Plain <a> instead of next/link (home page: full page loads only). */
  plain?: boolean;
  onClick?: () => void;
  /** Shown after the label (e.g. an arrow). */
  icon?: React.ReactNode;
  /** Magic UI Shimmer Button layers (a light spark running around the pill's edge). */
  shimmer?: boolean;
};

declare global {
  interface Window {
    Calendly?: { initPopupWidget: (options: { url: string }) => void };
  }
}

const CALENDLY_JS = "https://assets.calendly.com/assets/external/widget.js";
const CALENDLY_CSS = "https://assets.calendly.com/assets/external/widget.css";

let loading: Promise<void> | null = null;
const loadCalendly = () => {
  loading ??= new Promise<void>((resolve, reject) => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = CALENDLY_CSS;
    document.head.appendChild(css);
    const js = document.createElement("script");
    js.src = CALENDLY_JS;
    js.async = true;
    js.onload = () => resolve();
    js.onerror = () => {
      loading = null;
      reject(new Error("Calendly failed to load"));
    };
    document.head.appendChild(js);
  });
  return loading;
};

const BookCall = ({ label = "Book a free call", variant = "primary", className = "", bare = false, plain = false, onClick: onClickProp, icon, shimmer = variant === "primary" && !bare }: Props) => {
  const cls = `${bare ? className : `page-btn page-btn-${variant} ${className}`}${shimmer ? " shimmer-btn" : ""}`.trim();
  const layers = shimmer ? <ShimmerLayers /> : null;
  const url = SITE.bookingUrl;
  const onClick = () => {
    trackEvent("booking_clicked", { calendly: !!url });
    onClickProp?.();
  };

  if (url) {
    const open = async (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      onClick?.();
      try {
        await loadCalendly();
        window.Calendly!.initPopupWidget({ url });
      } catch {
        window.open(url, "_blank", "noopener");
      }
    };
    return (
      <a href={url} target="_blank" rel="noreferrer" className={cls} onClick={open} data-cursor="disable">
        {layers}
        {label}
        {icon}
      </a>
    );
  }
  return plain ? (
    <a href="/contact" className={cls} onClick={onClick} data-cursor="disable">
      {layers}
      {label}
      {icon}
    </a>
  ) : (
    <Link href="/contact" className={cls} onClick={onClick}>
      {layers}
      {label}
      {icon}
    </Link>
  );
};

export default BookCall;
