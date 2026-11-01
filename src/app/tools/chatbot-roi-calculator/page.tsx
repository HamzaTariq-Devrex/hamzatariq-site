import type { Metadata } from "next";
import Link from "next/link";
import SiteShell from "@/components/site/SiteShell";
import Section from "@/components/site/ds/Section";
import Faq from "@/components/site/ds/Faq";
import RoiCalculator from "@/components/tools/RoiCalculator";
import { CHATBOT_ROI_TOOL } from "@/data/tools";
import { CHATBOT_PRICE, money } from "@/lib/tools/roi";
import { SITE } from "@/lib/site";
import { jsonLd } from "@/lib/seo";
import "@/components/styles/Tools.css";

export const metadata: Metadata = {
  title: "Chatbot ROI Calculator: Hours and Money Saved",
  description:
    "Free chatbot ROI calculator: enter your daily questions, time per answer and staff cost to see the hours and money an AI chatbot could save you each month.",
  alternates: { canonical: CHATBOT_ROI_TOOL.href },
};

const FAQS = [
  {
    q: "Where do the numbers in this chatbot ROI calculator come from?",
    a: "Only from you. The calculator multiplies the values you enter; it doesn't use industry averages or claims about how much chatbots save. Change any number and the result updates.",
  },
  {
    q: "What share of questions can a chatbot really answer?",
    a: "It depends on your business, so the calculator asks you. A good way to guess: count how many of last week's questions were already answered somewhere on your website, such as prices, delivery times, opening hours or how to book.",
  },
  {
    q: "Does the result include the chatbot's running cost?",
    a: "No. AI usage is billed by the provider (for example Google Gemini) to your own account, and small sites can start on a free tier. The payback line only uses the one-time build price, from $350.",
  },
  {
    q: "What happens to questions the chatbot can't answer?",
    a: "My chatbots don't guess. When they don't know, they say so and offer a lead form, WhatsApp or email, so the visitor still reaches you.",
  },
  {
    q: "Can I see a chatbot like this working?",
    a: "Yes. The assistant on this site is one: open it from the chat button and ask it about my services, prices or projects.",
  },
];

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
        { "@type": "ListItem", position: 2, name: CHATBOT_ROI_TOOL.name, item: `${SITE.url}${CHATBOT_ROI_TOOL.href}` },
      ],
    },
    {
      "@type": "WebApplication",
      name: CHATBOT_ROI_TOOL.name,
      url: `${SITE.url}${CHATBOT_ROI_TOOL.href}`,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Any",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      creator: { "@id": `${SITE.url}/#person` },
    },
    { "@type": "FAQPage", mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
  ],
};

export default function ChatbotRoiCalculatorPage() {
  return (
    <SiteShell cta={{ title: <>Want a chatbot that <span>answers for you</span>?</>, text: `AI chatbots from ${money(CHATBOT_PRICE)}, trained on your own content and usually live in 3–5 days.` }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
      <section className="x-hero x-hero-center">
        <span className="x-label">Free tool</span>
        <h1 className="x-h1">
          Chatbot <span>ROI calculator</span>
        </h1>
        <p className="x-hero-lead">
          How much time does answering the same questions cost you? Enter your own numbers to see the hours and money an AI chatbot could save
          each month, with the full formula shown.
        </p>
        <RoiCalculator />
      </section>

      <Section
        label="The formula"
        title={
          <>
            Your numbers, <span>nothing else</span>
          </>
        }
        text="This chatbot ROI calculator uses one simple formula and no benchmarks. You can check every step."
      >
        <div className="tool-prose" data-reveal>
          <p>The calculation has three steps:</p>
          <ul>
            <li>
              <strong>Hours saved per month</strong> = questions per day × minutes per answer × days per month × share the chatbot answers ÷ 60.
            </li>
            <li>
              <strong>Money saved per month</strong> = hours saved × staff cost per hour.
            </li>
            <li>
              <strong>Payback time</strong> = chatbot price ({money(CHATBOT_PRICE)}, one-time) ÷ money saved per month.
            </li>
          </ul>
          <p>
            The share the chatbot answers is your own estimate. I don&apos;t use a typical percentage, because it changes a lot between businesses. A
            clinic answering &quot;are you open on Saturday?&quot; all day has a very different mix from a B2B company with long technical questions.
          </p>
          <h3>How to get honest inputs</h3>
          <ul>
            <li>
              <strong>Questions per day:</strong> count one normal week of WhatsApp messages, emails, website chats and calls about the same basic
              topics, then divide by seven.
            </li>
            <li>
              <strong>Minutes per answer:</strong> include finding the information, typing the reply and switching back to other work.
            </li>
            <li>
              <strong>Staff cost per hour:</strong> what that person&apos;s time costs you, even if you answer the messages yourself.
            </li>
            <li>
              <strong>Share the chatbot answers:</strong> look at those questions and mark the ones whose answer is already on your website.
            </li>
          </ul>
          <h3>What the calculator leaves out</h3>
          <p>
            Saved time isn&apos;t the only benefit. A chatbot also answers at night and on weekends, replies in the visitor&apos;s language, and turns
            questions into leads with a name and email. Those are harder to put a number on, so they&apos;re not in the result. The AI usage cost
            isn&apos;t included either: it&apos;s billed by the AI provider to your account and depends on how many people use the chat.
          </p>
          <p>
            For a closer look at build and running costs, read{" "}
            <Link href="/blog/ai-chatbot-for-website-cost">how much an AI chatbot for a website costs</Link>. To see what&apos;s included in a build,
            visit the <Link href="/services/ai-chatbots">AI chatbot service</Link>, or try the assistant on this site, which answers only from my own
            pages. If you&apos;re planning a new site at the same time, the <Link href="/tools/website-cost-calculator">website cost calculator</Link>{" "}
            adds the chatbot to your estimate.
          </p>
        </div>
      </Section>

      <Section label="FAQ" title={<>Questions about <span>chatbot ROI</span></>}>
        <Faq items={FAQS} />
      </Section>
    </SiteShell>
  );
}
