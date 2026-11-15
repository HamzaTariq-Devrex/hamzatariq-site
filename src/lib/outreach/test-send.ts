// Test email: sends a real draft exactly as it would go out, but ONLY ever to Hamza's own address
// (SITE.email). The recipient is fixed here, so a test can never reach a business.
import { SITE } from "@/lib/site";
import { ox } from "./db";
import { sendOutreach } from "./mail";

export const sendTestToOwner = async (messageId: string) => {
  const m = await ox.messageForTest(messageId);
  if (!m) throw new Error("Draft not found.");
  return sendOutreach({ to: SITE.email, subject: `[TEST] ${m.subject}`, body: m.body });
};
