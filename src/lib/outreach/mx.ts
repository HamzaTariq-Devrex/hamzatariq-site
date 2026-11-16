import { promises as dns } from "node:dns";

/** True when the email's domain has a mail server (MX). A typo or dead domain is dropped. */
export const hasMailServer = async (email: string) => {
  const domain = email.split("@")[1];
  if (!domain) return false;
  try {
    const mx = await dns.resolveMx(domain);
    return mx.some((r) => r.exchange && r.exchange !== ".");
  } catch {
    return false;
  }
};
