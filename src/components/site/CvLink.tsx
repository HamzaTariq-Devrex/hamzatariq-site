"use client";

import { trackEvent } from "@/lib/analytics";

/** "Download CV" link that records cv_downloaded. */
const CvLink = ({ href, className, from }: { href: string; className?: string; from: string }) => (
  <a href={href} download className={className} onClick={() => trackEvent("cv_downloaded", { from })}>
    Download CV
  </a>
);

export default CvLink;
