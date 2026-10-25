import { OG_SIZE, renderOg } from "@/lib/og";

export const alt = "Hire Hamza Tariq";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOg({
    eyebrow: "Hire me",
    title: "Hire a React and Next.js developer",
    subtitle: "Skills, experience, tech stack and availability.",
    footer: "hamzatariq.site/hire",
  });
}
