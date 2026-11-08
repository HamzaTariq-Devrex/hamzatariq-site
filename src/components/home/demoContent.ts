// Content shared by the static and interactive live demo (DemoStatic, LiveDemo).
export const DEMO_SCENES = [
  { id: "chat", label: "AI chatbot" },
  { id: "seo", label: "SEO audit" },
  { id: "dash", label: "Dashboard" },
] as const;

// The assistant's saved answer for website prices (content/chatbot/answers.json, pricing-websites).
export const DEMO_QUESTION = "How much does a website cost?";
export const DEMO_ANSWER =
  "Next.js websites start from $400 for a landing page or portfolio site, $1,000 for an ecommerce store with an admin dashboard, and $2,000 for a full ecommerce app with user logins, accounts and orders. Every project is quoted after a free call.";
