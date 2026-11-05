# Owner to-do

Facts and access only Hamza can provide. Nothing on the site may be invented to fill these gaps.
`TODO(owner)` boxes are visible on local and preview builds and hidden on the live site, which shows a working fallback instead.

## Open

- [ ] **Client reviews** (blog information gain, author box, `/reviews`). Send real reviews you have permission to show: client name, role and company, a link to them (their site or the public review), the exact words, the date and where it was given (email, Upwork, Google, WhatsApp). They go in `content/testimonials.json`; `/reviews` and the "Client reviews" link in the author box appear automatically once there is one. Nothing is written for you.
- [ ] **Screenshots for posts** (optional, improves information gain): a screenshot of the AI assistant open on the site, and of the /admin leads screen with test data only. Save as WebP under 250 KB in `public/images/work/`.
- [ ] **Calendly link.** Add `CALENDLY_URL` in Vercel (Production) and `.env.local`, then redeploy. Every "Book a free call" button then opens the Calendly popup and `/contact` shows the inline embed. Until then the buttons go to `/contact` (form, email, WhatsApp).
- [ ] **More case studies.** For each: client type, problem, what you built, stack, results, screenshots, testimonial (if any), and whether it was your own client or Devrex Digital work. Dashboards and AI chatbots have no related case study yet, so their "Related work" sections are hidden on the live site.
- [ ] **Code and account ownership at handover** (`/blog/hire-nextjs-developer`, proposal terms). The post used to say clients own the code and accounts after launch, but that isn't in `content/owner/profile.md`, so it now only advises readers to ask for this. Confirm what you offer (who owns the code, repository, domain, hosting and database accounts after the final payment) and it can be stated as your term.
- [ ] **Availability for roles** (`/hire`): open to full-time, contract or remote work?
- [ ] **PageSpeed API key** for the free SEO audit tool: Google Cloud console → enable "PageSpeed Insights API" → create an API key (restrict it to that API) → add `PAGESPEED_API_KEY` in Vercel and `.env.local`. Without it Google's shared quota is usually busy and the speed check is skipped.
- [ ] **(Later) Search Console access for the autopilot:** create a Google Cloud service account, enable the Search Console API, add its email as a Restricted user on the hamzatariq.site property, and put its JSON key in `GSC_SERVICE_ACCOUNT_JSON` (where the autopilot runs). Skipped for now: refills use the AI assistant's top questions; monthly reports run without Search Console data.


## Needed for Phase 8 (analytics)


- [ ] Bing Webmaster Tools: verify the site (can import from Search Console).

## Done

- [x] Blocked blog topics answered (2026-11-05): no Shopify work (Shopify topics dropped); can build booking/appointment systems but none built yet (no past-project claims); international payments by Payoneer and bank transfer. Facts in `content/owner/profile.md` and the assistant's answer bank.
- [x] Supabase CLI logged in to the hamzabuildsweb account; all migrations applied (including `20261105090000_audit_stats`).
- [x] New CV (`public/Hamza_Tariq_CV.pdf`) on the home Resume button and /hire; /hire and /about updated from it (Devrex Digital since Jan 2023, ICS, languages, CV skills and selected projects). Old resume removed; its URL redirects to the new CV.

- [x] Vercel Web Analytics enabled (custom events show in Vercel on Pro only; /admin counts them from Supabase).
- [x] Add-on prices: extra page $50 each, CMS +$150, second language +$250. Pages included: landing/portfolio 5, store 10 (unlimited products), full ecommerce app 15; dashboards and web apps by features.
- [x] Autopilot schedules set up as Claude scheduled tasks (blog every 2 days at 8:45 PKT, monthly report on the 1st).
- [x] Industry pages reviewed, including the agency page's white-label promises.

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
