# Owner to-do

Facts and access only Hamza can provide. Nothing on the site may be invented to fill these gaps.
`TODO(owner)` boxes are visible on local and preview builds and hidden on the live site, which shows a working fallback instead.

## Open

- [ ] **Cal.com booking link.** Set `bookingUrl` in `src/lib/site.ts`. Until then every "Book a free call" button goes to `/contact` (email + WhatsApp), and the contact page shows a short note instead of the booking embed.
- [ ] **New CV PDF.** Put it in `public/` and set `cvUrl` in `src/lib/site.ts`; the "Download CV" button on `/hire` appears automatically. (The home page Resume button still links the old `public/Hamza Tariq Resume.pdf`.)
- [ ] **More case studies.** For each: client type, problem, what you built, stack, results, screenshots, testimonial (if any), and whether it was your own client or Devrex Digital work. Dashboards and AI chatbots have no related case study yet, so their "Related work" sections are hidden on the live site.
- [ ] **Availability for roles** (`/hire`): open to full-time, contract or remote work?
- [ ] **Google Search Console verification code**, then submit `https://hamzatariq.site/sitemap.xml`.

## Needed before Phase 4 goes live

- [ ] **Gemini plan.** The free tier allows only 20 chat replies per day on the fast model, and the free Flash-Lite models took 13–40 s per reply when tested (2026-10-26). Turn on billing for the Gemini API project in Google AI Studio, or accept slow replies and a daily cap.
- [ ] **Resend DNS records** for `hamzatariq.site` (Resend → Domains): send them so they can be added on Vercel and the domain verified. Until then visitor emails from `hello@hamzatariq.site` cannot be sent.
- [ ] **Supabase Auth URLs** (Supabase → Authentication → URL Configuration): Site URL `https://hamzatariq.site`; Redirect URLs `http://localhost:3000/**`. Needed for the `/admin` sign-in link on the live site.

## Needed for Phase 8 (analytics)

- [ ] Bing Webmaster Tools: verify the site (can import from Search Console).

## Done

- [x] Supabase project (hamzabuildsweb account), Gemini API key, Resend API key; lead emails go to `hamzabuildsweb@gmail.com`.
- [x] Home page Resume button stays.
- [x] Positioning line, short bio and photo (`public/images/hamza-tariq-2026.webp`).
- [x] Pricing for all four services.
- [x] First case study: `/work/hamzatariq-site`.
- [x] Client count confirmed: 45+.
- [x] LinkedIn removed; GitHub `HamzaTariq-Devrex` is the main profile link.
- [x] Projects labelled "Built at Devrex Digital".
