// Client-safe helpers for the manual WhatsApp messages in /admin/prospects. Hamza reads and sends
// every WhatsApp message himself; nothing here sends anything.
import { SITE } from "@/lib/site";

const CALLING_CODES: Record<string, string> = { GB: "44", US: "1", CA: "1", AE: "971", AU: "61" };

/** wa.me needs the full international number: "+44 20…" stays, a local "020…" gets the country code. */
export const whatsappNumber = (phone: string, country: string) => {
  const trimmed = phone.split(/[;,/]/)[0].trim();
  let digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+")) return digits;
  if (digits.startsWith("00")) return digits.slice(2);
  const code = CALLING_CODES[country] ?? "";
  if (code === "1") return digits.length === 10 ? `1${digits}` : digits;
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.startsWith(code) ? digits : `${code}${digits}`;
};

type ForMessage = { name: string; website: string | null; reportId: string | null; reportExpires: string | null };

/** Short, personal first message. Only facts from the audit: no numbers, no claims. */
export const whatsappText = (p: ForMessage) => {
  const report = p.reportId && p.reportExpires && Date.parse(p.reportExpires) > Date.now() ? `${SITE.url}/report/${p.reportId}` : null;
  return [
    `Hi ${p.name} team, this is Hamza Tariq, a web developer.`,
    p.website
      ? `I ran a free check of your website and noticed a few things that make it harder for people to find you on Google.${report ? ` Here's the short report: ${report}` : ""}`
      : "I couldn't find a website listed for your business and wanted to ask whether you'd like a few ideas for one.",
    "Happy to explain in a quick chat if it's useful. No pressure at all.",
  ].join(" ");
};

export const whatsappLink = (phone: string, country: string, text: string) => `https://wa.me/${whatsappNumber(phone, country)}?text=${encodeURIComponent(text)}`;
