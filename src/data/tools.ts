/**
 * Free tools: listed under Services in the navbar, in the footer and in the sitemap.
 * `source` is the lead source when a visitor asks for their result by email (see LEAD_SOURCES);
 * `keyword` is the page's main keyword (content:check keeps posts and industry pages off it).
 */
export type Tool = { slug: string; href: string; name: string; summary: string; keyword: string; source: string };

export const SEO_AUDIT_TOOL: Tool = {
  slug: "free-seo-audit",
  href: "/tools/free-seo-audit",
  name: "Free SEO audit tool",
  summary: "Check any website's SEO and speed in about a minute.",
  keyword: "free seo audit tool",
  source: "seo-audit",
};

export const COST_CALCULATOR_TOOL: Tool = {
  slug: "website-cost-calculator",
  href: "/tools/website-cost-calculator",
  name: "Website cost calculator",
  summary: "Starting price and delivery time for your project.",
  keyword: "website cost calculator",
  source: "website-cost-calculator",
};

export const CHATBOT_ROI_TOOL: Tool = {
  slug: "chatbot-roi-calculator",
  href: "/tools/chatbot-roi-calculator",
  name: "Chatbot ROI calculator",
  summary: "Hours and money an AI chatbot could save you each month.",
  keyword: "chatbot roi calculator",
  source: "chatbot-roi-calculator",
};

export const TOOLS: Tool[] = [SEO_AUDIT_TOOL, COST_CALCULATOR_TOOL, CHATBOT_ROI_TOOL];
