// One-off test of the real outreach sender (src/lib/outreach/mail.ts): sends a sample draft to
// Hamza's own address only, with a dummy unsubscribe token. Run:
//   npx tsx --env-file=.env.local scripts/outreach-test-send.ts
import { SITE } from "../src/lib/site";
import { sendOutreach } from "../src/lib/outreach/mail";

const body = [
  "Hi there,",
  "I was looking at Didsbury Jewellers online and noticed your page is missing an H1 heading and a meta description. When search engines like Google scan your website, these missing details make it harder for local shoppers in Manchester to find your store in search results.",
  "I put the full results in a free report for you. If you'd like, would a short fix plan be useful to review?",
  "Your free report (no sign-up): https://hamzatariq.site/report/ed9ddb7c283d83c93f5600e9",
  "Hamza Tariq\nWeb developer, Devrex Digital\nhttps://hamzatariq.site",
].join("\n\n");

const id = await sendOutreach({ to: SITE.email, subject: "[TEST] Quick web question for Didsbury Jewellers", body, unsubscribeToken: "0".repeat(36) });
console.log("sent to", SITE.email, id);
