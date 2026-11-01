import { OG_SIZE, renderOg } from "@/lib/og";

export const alt = "Chatbot ROI calculator by Hamza Tariq";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOg({
    eyebrow: "Free tool",
    title: "Chatbot ROI calculator",
    subtitle: "Hours and money an AI chatbot could save you each month. Your numbers, clear formula.",
    footer: "hamzatariq.site/tools/chatbot-roi-calculator",
  });
}
