// Client-safe helpers for the manual WhatsApp messages in /admin/prospects. Hamza reads and sends
// every WhatsApp message himself; nothing here sends anything.
import { nounFor } from "./osm-types";

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

type ForMessage = { name: string; website: string | null; reportId: string | null; reportExpires: string | null; businessType?: string; city?: string | null };

/**
 * Short, personal first message (owner, 2026-11-17): says exactly what is offered (never "send it"),
 * signed "Founder, Devrex Digital" like the emails. Only facts from the audit: no numbers, no claims.
 */
export const whatsappText = (p: ForMessage) => {
  const noun = p.businessType ? nounFor(p.businessType) : "business like yours";
  const where = p.city ? ` in ${p.city}` : " nearby";
  return [
    `Hi ${p.name} team, I'm Hamza, I run Devrex Digital, a small web studio.`,
    p.website
      ? "I had a look at your website and noticed a few things that make it harder for people to find you and get in touch. Want me to send you the quick fixes I found?"
      : `I couldn't find a website for ${p.name}, so people searching for ${/^[aeiou]/i.test(noun) ? "an" : "a"} ${noun}${where} find other places first. Want me to make you a free sample homepage?`,
    "Hamza Tariq\nFounder, Devrex Digital",
  ].join("\n\n");
};

export const whatsappLink = (phone: string, country: string, text: string) => `https://wa.me/${whatsappNumber(phone, country)}?text=${encodeURIComponent(text)}`;
