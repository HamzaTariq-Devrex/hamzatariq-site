// Shared by the lead form (browser) and /api/leads (server).

export const PROJECT_TYPES = [
  "Next.js website",
  "Ecommerce store",
  "Dashboard or web app",
  "AI chatbot",
  "React / Next.js SEO",
  "Something else",
] as const;

export const BUDGETS = ["Under $500", "$500 to $1,000", "$1,000 to $2,500", "$2,500+", "Not sure yet"] as const;

export const LEAD_SOURCES = ["chatbot", "form", "tool", "page"] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export type LeadInput = {
  name: string;
  email: string;
  projectType: string;
  budget: string;
  message: string;
  /** Optional WhatsApp number, as typed (validated loosely). */
  phone: string;
  source: LeadSource;
  page: string;
  session: string | null;
};

export const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
/** Digits with optional +, spaces, dashes or brackets; 7 to 15 digits (the E.164 maximum). */
export const isPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").length;
  return /^\+?[\d\s\-()]+$/.test(value) && digits >= 7 && digits <= 15;
};
