# Owner to-do

Facts and access only Hamza can provide. Nothing on the site may be invented to fill these gaps.
`TODO(owner)` boxes are visible on local and preview builds and hidden on the live site, which shows a working fallback instead.

## Open

- [ ] **Cal.com booking link.** Set `bookingUrl` in `src/lib/site.ts`. Until then every "Book a free call" button goes to `/contact` (email + WhatsApp), and the contact page shows a short note instead of the booking embed.
- [ ] **New CV PDF.** Put it in `public/` and set `cvUrl` in `src/lib/site.ts`; the "Download CV" button on `/hire` appears automatically. (The home page Resume button still links the old `public/Hamza Tariq Resume.pdf`.)
- [ ] **More case studies.** For each: client type, problem, what you built, stack, results, screenshots, testimonial (if any), and whether it was your own client or Devrex Digital work. Dashboards and AI chatbots have no related case study yet, so their "Related work" sections are hidden on the live site.
- [ ] **Availability for roles** (`/hire`): open to full-time, contract or remote work?
- [ ] **Google Search Console:** the verification file is live (`/google0a499a204a55eeb8.html`). Click Verify in Search Console, then submit `https://hamzatariq.site/sitemap.xml`.

## Needed before Phase 4 goes live

- [ ] **Verify `hamzatariq.site` in Resend** (Resend → Domains → Verify). The DNS records are on Vercel and live (2026-10-26). Until verified, visitor emails from `hello@hamzatariq.site` cannot be sent.

## Needed for Phase 8 (analytics)

- [ ] Bing Webmaster Tools: verify the site (can import from Search Console).

## Done

- [x] Supabase project (hamzabuildsweb account), Gemini API key, Resend API key; lead emails go to `hamzabuildsweb@gmail.com`.
- [x] Home page Resume button stays.
- [x] Project terms: 50% upfront / 50% on delivery, 2 free revision rounds, 30 days of free bug fixes (maintenance quoted separately), and delivery times per service.
- [x] Supabase Auth URLs: Site URL `https://hamzatariq.site`, redirects `https://hamzatariq.site/**` and `http://localhost:3000/**`.
- [x] Resend DNS records added on Vercel (old records from an earlier Resend setup replaced).
- [x] Positioning line, short bio and photo (`public/images/hamza-tariq-2026.webp`).
- [x] Pricing for all four services.
- [x] First case study: `/work/hamzatariq-site`.
- [x] Client count confirmed: 45+.
- [x] LinkedIn removed; GitHub `HamzaTariq-Devrex` is the main profile link.
- [x] Projects labelled "Built at Devrex Digital".
