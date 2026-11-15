import { OG_SIZE, renderOg } from "@/lib/og";

export const alt = "Unsubscribe";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOg({ eyebrow: "Email preferences", title: "Unsubscribe", subtitle: "Stop emails from Hamza Tariq.", footer: "hamzatariq.site" });
}
