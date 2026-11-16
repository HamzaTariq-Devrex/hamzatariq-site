// Homepage concept templates (owner, 2026-11-16): one per niche family. Everything here is either
// a fact from OpenStreetMap (formatted by the helpers below) or an *example* section, labelled
// "Example section: …", with empty cards that say what would go there. No invented reviews,
// prices, services, awards, people or claims.
import type { Country } from "./db";
import type { NicheGroup } from "./osm-types";

export type TemplateKey = "luxe" | "food" | "trades" | "beauty" | "clinic" | "fitness" | "property" | "generic";

export const templateFor = (group: NicheGroup | null): TemplateKey => {
  switch (group) {
    case "jewellery":
    case "fashion":
      return "luxe";
    case "restaurant":
      return "food";
    case "home":
    case "auto":
    case "delivery":
      return "trades";
    case "salon":
      return "beauty";
    case "clinic":
      return "clinic";
    case "gym":
      return "fitness";
    case "realestate":
      return "property";
    default:
      return "generic";
  }
};

export type Example = { title: string; kind: "cards" | "list" | "text" | "people" | "week"; items: string[] };

/** Two example sections per template. Every caption is a full sentence about what goes there. */
export const EXAMPLES: Record<TemplateKey, Example[]> = {
  luxe: [
    { title: "Collections", kind: "cards", items: ["Your first collection goes here.", "Your second collection goes here.", "Photos of your pieces go here."] },
    { title: "Our story", kind: "text", items: ["Your story goes here: how you started, what you make and what makes your pieces yours."] },
  ],
  food: [
    { title: "Menu", kind: "list", items: ["Your first dish goes here.", "Your second dish goes here.", "Your third dish goes here.", "Your fourth dish goes here."] },
    { title: "Gallery", kind: "cards", items: ["Photos of your food go here.", "Photos of your space go here.", "Photos of your counter go here."] },
  ],
  trades: [
    { title: "Services", kind: "cards", items: ["Your main service goes here.", "Your second service goes here.", "Your third service goes here."] },
    { title: "Areas covered", kind: "text", items: ["The towns and areas you cover go here."] },
  ],
  beauty: [
    { title: "Treatments", kind: "list", items: ["Your first treatment goes here.", "Your second treatment goes here.", "Your third treatment goes here.", "Your fourth treatment goes here."] },
    { title: "Gallery", kind: "cards", items: ["Photos of your work go here.", "Photos of your salon go here.", "More photos of your work go here."] },
  ],
  clinic: [
    { title: "Treatments", kind: "cards", items: ["Your first treatment goes here.", "Your second treatment goes here.", "Your third treatment goes here."] },
    { title: "Your team", kind: "people", items: ["A team member's name and role go here.", "A team member's name and role go here.", "A team member's name and role go here."] },
  ],
  fitness: [
    { title: "Classes", kind: "cards", items: ["Your first class goes here.", "Your second class goes here.", "Your third class goes here."] },
    { title: "Timetable", kind: "week", items: ["Your class times go here."] },
  ],
  property: [
    { title: "Featured listings", kind: "cards", items: ["Your first listing goes here.", "Your second listing goes here.", "Your third listing goes here."] },
    { title: "Areas we cover", kind: "text", items: ["The neighbourhoods and towns you cover go here."] },
  ],
  generic: [
    { title: "Services", kind: "cards", items: ["Your main service goes here.", "Your second service goes here.", "Your third service goes here."] },
    { title: "About us", kind: "text", items: ["A few lines about who you are and how you work go here."] },
  ],
};

const DAY: Record<string, string> = { Mo: "Mon", Tu: "Tue", We: "Wed", Th: "Thu", Fr: "Fri", Sa: "Sat", Su: "Sun", PH: "Public holidays" };

/** OpenStreetMap opening_hours ("Mo-Fr 09:00-17:30; Sa 10:00-16:00") as [days, times] rows. */
export const hoursRows = (raw: string | undefined): [string, string][] => {
  if (!raw?.trim()) return [];
  if (raw.trim() === "24/7") return [["Every day", "Open 24 hours"]];
  return raw
    .split(";")
    .map((r) => r.trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((r) => {
      const nice = r.replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su|PH)\b/g, (d) => DAY[d]).replace(/-/g, "–").replace(/,/g, ", ");
      const m = nice.match(/^([A-Za-z ,–]+?)\s+((?:\d|closed|off|open).*)$/i);
      if (!m) return ["", nice] as [string, string];
      return [m[1].trim(), m[2].replace(/\boff\b/i, "Closed").replace(/\bclosed\b/i, "Closed")] as [string, string];
    });
};

export const addressLine = (tags: Record<string, string>, city: string | null) => {
  const street = [tags["addr:unit"], tags["addr:housenumber"], tags["addr:street"] ?? tags["addr:place"]].filter(Boolean).join(" ");
  return [street, tags["addr:suburb"], tags["addr:city"] ?? city, tags["addr:postcode"]].filter(Boolean).join(", ");
};

/** Google Maps search for the business at its public address (no API key, opens the app on phones). */
export const directionsUrl = (name: string, address: string, city: string | null) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([name, address || city].filter(Boolean).join(", "))}`;

const CALLING: Record<Country, string> = { GB: "44", AU: "61", NZ: "64", AE: "971", US: "1", CA: "1" };

/** wa.me link only when OSM lists a WhatsApp number; local numbers get the country code. */
export const whatsappUrl = (tags: Record<string, string>, country: Country) => {
  const raw = (tags["contact:whatsapp"] ?? tags.whatsapp ?? "").split(";")[0].trim();
  if (!raw) return null;
  if (/^https?:\/\/(wa\.me|api\.whatsapp\.com)\//i.test(raw)) return raw;
  let d = raw.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  else if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = CALLING[country] + d.slice(1);
  else if ((country === "US" || country === "CA") && d.length === 10) d = `1${d}`;
  return /^\d{8,15}$/.test(d) ? `https://wa.me/${d}` : null;
};

export const telUrl = (phone: string | null) => (phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : null);
