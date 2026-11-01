# Owner to-do

Facts and access only Hamza can provide. Nothing on the site may be invented to fill these gaps.
`TODO(owner)` boxes are visible on local and preview builds and hidden on the live site, which shows a working fallback instead.

## Open

- [ ] **Calendly link.** Add `CALENDLY_URL` in Vercel (Production) and `.env.local`, then redeploy. Every "Book a free call" button then opens the Calendly popup and `/contact` shows the inline embed. Until then the buttons go to `/contact` (form, email, WhatsApp).
- [ ] **New CV PDF.** Put it in `public/` and set `cvUrl` in `src/lib/site.ts`; the "Download CV" button on `/hire` appears automatically. (The home page Resume button still links the old `public/Hamza Tariq Resume.pdf`.)
- [ ] **More case studies.** For each: client type, problem, what you built, stack, results, screenshots, testimonial (if any), and whether it was your own client or Devrex Digital work. Dashboards and AI chatbots have no related case study yet, so their "Related work" sections are hidden on the live site.
- [ ] **Availability for roles** (`/hire`): open to full-time, contract or remote work?
- [ ] **Supabase CLI login (blocks the growth-engine push).** The CLI is logged in to a client account (tuluawear07). Run `npx supabase login` with the hamzabuildsweb account, then I apply migration `20261102090000_seo_audit_autopilot` (SEO audits table, `seo-audit` lead source, autopilot data functions) and regenerate types.
- [ ] **PageSpeed API key** for the free SEO audit tool: Google Cloud console → enable "PageSpeed Insights API" → create an API key (restrict it to that API) → add `PAGESPEED_API_KEY` in Vercel and `.env.local`. Without it Google's shared quota is usually busy and the speed check is skipped.
- [ ] **(Later) Search Console access for the autopilot:** create a Google Cloud service account, enable the Search Console API, add its email as a Restricted user on the hamzatariq.site property, and put its JSON key in `GSC_SERVICE_ACCOUNT_JSON` (where the autopilot runs). Skipped for now: refills use the AI assistant's top questions; monthly reports run without Search Console data.
- [ ] **Autopilot schedule:** set up the two scheduled sessions in `docs/AUTOPILOT.md` (post every other day, monthly report on the 1st).

## Needed for Phase 8 (analytics)

- [ ] Bing Webmaster Tools: verify the site (can import from Search Console).

## Done

- [x] Location: based in Pakistan, working with clients worldwide (US, UK, EU time zones); no city targeting. Local topics replaced with international/remote ones.
- [x] Posting pace: one post every 2 days (max 4 per week).
- [x] "Most popular" tiers: Ecommerce store with admin dashboard, AI chatbot.
- [x] Education: BS Artificial Intelligence, The Islamia University of Bahawalpur, 2022–2026. No company logos (text only). "Working directly with businesses" wording confirmed.

- [x] Supabase project (hamzabuildsweb account), Gemini API key, Resend API key; lead emails go to `hamzabuildsweb@gmail.com`.
- [x] Home page Resume button stays.
- [x] Google Search Console verified; sitemap submitted (42 pages discovered).
- [x] Resend domain `hamzatariq.site` verified; visitor emails send from `hello@hamzatariq.site`.
- [x] Project terms: 50% upfront / 50% on delivery, 2 free revision rounds, 30 days of free bug fixes (maintenance quoted separately), and delivery times per service.
- [x] Supabase Auth URLs: Site URL `https://hamzatariq.site`, redirects `https://hamzatariq.site/**` and `http://localhost:3000/**`.
- [x] Resend DNS records added on Vercel (old records from an earlier Resend setup replaced).
- [x] Positioning line, short bio and photo (`public/images/hamza-tariq-2026.webp`).
- [x] Pricing for all four services.
- [x] First case study: `/work/hamzatariq-site`.
- [x] Client count confirmed: 45+.
- [x] LinkedIn removed; GitHub `HamzaTariq-Devrex` is the main profile link.
- [x] Projects labelled "Built at Devrex Digital".
