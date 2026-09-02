# Reference Reuse Matrix — MakeMeArtist → LWILL

**Audit date:** 2026-09-02
**Reference:** `https://github.com/eaglebaba13/makemeartist` (default branch: `main`, cloned shallow at `C:\Users\dk132\AppData\Local\Temp\kilo\makemeartist`)
**LWILL source of truth:** this repository (`E:\GitHub\Lwill-AI-Builder`)
**Authoritative prior LWILL audits of this same reference:** `docs/MAKEMEARTIST-LWILL-INTEGRATION-ARCHITECTURE-AUDIT.md`, `docs/MAKEMEARTIST-IMPLEMENTATION-READINESS-PLAN.md` (both pre-existing, retained as supporting evidence; this matrix supersedes their implementation decisions pending MiMo review).

---

## 0. Reference Repository Summary (what it actually is)

| Aspect | Finding |
|---|---|
| Stack | Vite + React 18 + TypeScript SPA |
| Routing | `react-router-dom` v6 (client-side) |
| UI primitives | shadcn/ui + Radix + Tailwind + lucide-react |
| Persistence layer (declared) | `@supabase/supabase-js` v2 — but `src/integrations/supabase/types.ts` declares an **empty** `Database` type (`public.Tables: { [_ in never]: never }`). **No tables, no RLS, no migrations, no data.** The Supabase client is a placeholder only. |
| Auth | Supabase auth client configured (`persistSession`, `autoRefreshToken`) but **never called from any component**. There is no login UI, no protected route, no user identity. |
| Hosting / generation | Lovable (per `README.md` line 215). Footer credits "Designed by LWILL". |
| Data | All content is **static TypeScript** in `src/data/*.ts` (`courses.ts`, `jobs.ts`, `lookLearn.ts`, `site.ts`, `curriculum.ts`, `hairArtistDelhiClass.ts`). No runtime mutations. |
| Forms | 100% client-side. `BookingForm.tsx` and `EnquiryForm.tsx` **build a `wa.me` URL and `window.open` it**. Zero backend, zero persistence, zero analytics event persisted server-side. |
| WhatsApp | Hardcoded phone numbers in `src/data/site.ts` (`PRIMARY_PHONE = "919929720831"`, two alternates). All CTAs and the floating widget point at `https://wa.me/<phone>?text=<encoded message>`. |
| Analytics | `src/lib/tracking.ts` declares Meta Pixel + GA4 helpers that silently no-op if `window.fbq`/`gtag` are absent. **Neither is installed in this repo.** |
| SEO | `useSeo` hook calls `document.title` and `meta` tag mutation only; no SSR, no sitemap, no robots. |
| Tests | One trivial file (`src/test/example.test.ts`); no real coverage. |
| Build | `vite build` only; no SSR, no API routes, no middleware. |

**Implication for the matrix:** every "feature" in MakeMeArtist is presentation-only, persistence-free, and architecture-agnostic except for the choice of Vite/Lovable. There is **no business logic to copy**; only presentation patterns, content shapes, and conversion flows are reusable. The reference is best used as a **marketing-page inspiration source**, not an architecture donor.

---

## 1. Master Reuse Matrix

Columns:
- **Reference Area** — MakeMeArtist feature
- **Reference Path** — file(s) where it lives
- **Concept** — what it is
- **LWILL Relevance** — does LWILL have or need this?
- **Classification** — `A` REUSE / `B` ADAPT / `C` REBUILD / `D` DO NOT REUSE
- **LWILL Target** — if reused, where in LWILL it lands
- **SRS Support** — `SUPPORTED` / `PARTIALLY SUPPORTED` / `NOT SPECIFIED — APPROVAL REQUIRED` / `CONFLICTS`
- **Risk** — security/architecture/risk notes
- **Decision** — one-line outcome

| # | Reference Area | Reference Path | Concept | LWILL Relevance | Classification | LWILL Target | SRS Support | Risk | Decision |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Persistence: Supabase client + types | `src/integrations/supabase/{client.ts,types.ts}` | Empty Supabase wiring as placeholder | None | **D** | — | CONFLICTS — would create parallel DB | High: duplicate auth, duplicate data, breaks tenant isolation, breaks Prisma contract | **DO NOT REUSE** — no Supabase in LWILL |
| 2 | Authentication | Supabase auth config (never called) | Client auth | LWILL has production auth (`/api/auth/*`) | **D** | — | CONFLICTS — LWILL has its own | High: parallel auth, session confusion, security | **DO NOT REUSE** |
| 3 | Authorization / RBAC | None | Role-based access | LWILL has `Role`/`Permission`/`Membership`/`PlatformRole` | **D** | — | CONFLICTS — duplicates LWILL RBAC | High: parallel RBAC, security | **DO NOT REUSE** |
| 4 | Multi-tenancy | None | Tenant boundary | LWILL has `Tenant`/`TenantDomain`/`BusinessUnit` | **D** | — | CONFLICTS — duplicates LWILL tenant | High: data leakage | **DO NOT REUSE** |
| 5 | Routing | `src/App.tsx` (`react-router-dom`) | 11 client-side routes | LWILL has Next.js 16 file-based routing | **D** | — | CONFLICTS — different framework | High: cross-framework contamination | **DO NOT REUSE** |
| 6 | SSR / SEO | `src/lib/seo.ts` (`useSeo`) | Client-side `document.title` mutation | LWILL uses Next.js metadata API | **D** | — | PARTIALLY SUPPORTED — DOC-027 (Analytics/BI) implies SEO needs but LWILL already has its own approach | Medium: bad practice, not reusable | **DO NOT REUSE** |
| 7 | Static course catalog | `src/data/courses.ts` (`PROGRAMS`, `SPECIALIZATIONS`) | Curriculum-shaped data: program + duration + skills + outcomes | LWILL `Service` model exists (cosmetic/salon services, not education) | **B** | A future academy module (Phase 4 in `docs/ROADMAP.md`, not yet built) | NOT SPECIFIED — APPROVAL REQUIRED (Phase 4 is "Staff certification and skill tracking", not customer-facing education) | Low — pure data shape, no architecture | **DEFER** — Phase 4 scope undecided; do not silently upgrade to education module. If Phase 4 grows into academy, reuse shape only inside LWILL `Course`/`Curriculum` models if and when SRS defines them. |
| 8 | Course detail page | `src/pages/ProfessionalBeautyArtistProgram.tsx`, `AdvancedBeautyEntrepreneurProgram.tsx`, `HairArtistDelhiOnlineClass.tsx` | Long-form program landing page | None currently in LWILL | **B** | Tenant-specific marketing page in `apps/web/src/app/<tenant>/` (when a marketing surface exists) | NOT SPECIFIED — APPROVAL REQUIRED | Low | **DEFER** — only if X Nail or another tenant needs program landing pages. Copy layout, not code. |
| 9 | Booking form | `src/components/BookingForm.tsx` | Name/mobile/city/course → `wa.me` deep link | LWILL has no public lead form yet (X Nail is operator-facing only) | **B** | A future public lead-capture component for X Nail tenant landing page (if/when built) | NOT SPECIFIED — APPROVAL REQUIRED (DOC-016 CRM mentions "Lead captured successfully" but does not specify public form UI) | Medium — phone is PII; needs consent + tenant scope | **DEFER** — see #14. Layout pattern reusable; backend integration is C (LWILL CRM, not Supabase). |
| 10 | Enquiry form (multi-variant) | `src/components/site/EnquiryForm.tsx` | One component with 4 variants: `enquiry`, `partner`, `candidate`, `employer` | LWILL has no public form pattern | **B** | Future X Nail / future tenant public-facing page (if/when built) | NOT SPECIFIED — APPROVAL REQUIRED | Medium — same as #9 | **DEFER** — variant pattern (one form, 4 contexts) is a good UX pattern; copy pattern, not component. |
| 11 | WhatsApp deep-link helper | `src/data/site.ts` (`wa()`) | `https://wa.me/<phone>?text=<encoded>` URL builder | LWILL has no WhatsApp helper yet | **B** | A small `lib/whatsapp.ts` (or tenant-scoped equivalent) used by public marketing pages only | NOT SPECIFIED — APPROVAL REQUIRED (DOC-028 Notification/Communication is authoritative for notification delivery) | Low — pure URL builder, no auth | **DEFER** — copy the helper pattern, NOT the numbers. Numbers must be tenant settings, not hardcoded. |
| 12 | WhatsApp floating CTA | `src/components/WhatsAppFloat.tsx` | Fixed bottom-right `wa.me` button | LWILL X Nail is operator-only, no public CTAs | **D** | — | NOT SPECIFIED | Low | **DO NOT REUSE NOW** — no public surface in X Nail. Reconsider if a public X Nail landing page is approved. |
| 13 | WhatsApp CTA placement pattern (multiple placements: header, hero, footer, course card, sticky) | `Navbar.tsx:19,33`, `BookingForm.tsx:58`, `Footer.tsx:56-63` | Multiple WhatsApp entry points on the same page | LWILL has no public surface | **B** | Future X Nail marketing page(s) | NOT SPECIFIED — APPROVAL REQUIRED | Low | **DEFER** — UX pattern only, not component. |
| 14 | Lead capture / enquiry to backend | None (all forms are client-side, `wa.me` only) | Forms do not persist anything | LWILL has no public lead-capture endpoint; CRM `Customer`/`Appointment` models exist for operator-side records | **C** | `POST /api/leads` (new) or reuse `POST /api/customers` with a `source: 'public-enquiry'` field — must be tenant-scoped, rate-limited, captcha-protected, GDPR/IT-Act compliant | PARTIALLY SUPPORTED — DOC-016 CRM SRS line 56 "Lead captured successfully"; DOC-028 covers notifications | High — PII, spam, tenant leak, no auth — must be designed under LWILL security model, not copied from a `wa.me` redirect | **REBUILD** if/when approved. The MakeMeArtist implementation is **not** a security model. |
| 15 | UTM capture & attribution | `src/lib/tracking.ts` (`captureUtmParams`, `withUtm`) | sessionStorage-persisted UTM params appended to outbound URLs | LWILL has no public marketing → app funnel | **B** | A future `lib/utm.ts` for tenant marketing pages | NOT SPECIFIED — APPROVAL REQUIRED | Low — client-side only | **DEFER** — pattern is sound; do not reuse code. |
| 16 | Meta Pixel / GA4 event tracking | `src/lib/tracking.ts` (`trackPixel`, `trackGa`) | Silently no-op if `fbq`/`gtag` absent | LWILL has no analytics | **D** | — | NOT SPECIFIED — `docs/ROADMAP.md` does not include analytics; DOC-027 (Analytics/BI) is target not implemented | Medium — privacy + consent (DPDP Act, IT Act) | **DO NOT REUSE** — LWILL analytics not in scope. If added later, build under LWILL notification/log service. |
| 17 | "Career Path" staircase visualization | `src/components/site/CareerPath.tsx`, `src/data/site.ts` (`CAREER_PATH`) | Numbered step cards (Beginner → Artist → … → Educator) | None in LWILL | **D** for now | — | NOT SPECIFIED — Phase 4 only | Low | **DEFER** — education-specific. If Phase 4 grows into an academy, copy the *layout* only. |
| 18 | "Journey" 5-step strip | `src/components/site/JourneyStrip.tsx`, `JOURNEY` in `data/site.ts` | 5-card journey (Learn → Practice → Create → Market → Earn) | None in LWILL | **D** for now | — | NOT SPECIFIED | Low | **DEFER** — content is education-domain. Pattern (numbered cards in a strip) is generic but not currently needed in X Nail. |
| 19 | "Build pillars" 5-card grid | `BUILD_PILLARS` in `data/site.ts` | 5 cards (Skill, Portfolio, Personal Brand, Business Model, Client System) | None in LWILL | **D** | — | NOT SPECIFIED | Low | **DEFER** — education-domain. |
| 20 | Testimonials section | `src/components/TestimonialsSection.tsx` | Quote cards (avatar + name + city) | None in LWILL X Nail | **D** for now | — | NOT SPECIFIED for X Nail | Low — PII (name + city) if used on real marketing | **DEFER** — only if X Nail public marketing page is approved; then build with tenant-scoped `Testimonial` model. |
| 21 | Trainers section (10 trainer photos) | `src/components/TrainersSection.tsx`, `src/assets/trainer-*.jpg` | Grid of trainer cards with portrait | None in LWILL | **D** | — | NOT SPECIFIED | Medium — photo consent / model release; tenant isolation | **DO NOT REUSE assets** — they are stock photos with no clear license; do not redistribute. Pattern deferrable to Phase 4. |
| 22 | Partner Academy listing | `src/data/site.ts` (`ACADEMIES` array) | Hardcoded `{name, city}` list | LWILL has `FranchisePartner`, `Territory`, `FranchiseAgreementOutlet` (X Nail) | **B** | A new tenant-scoped "Partner Locations" view for any tenant that operates academy/branch network | PARTIALLY SUPPORTED — DOC-025 Franchise SRS line FOCO/FOFO/COCO outlet model; X Nail already has `FranchiseOutletProfile` | Low | **DEFER** — the *concept* of listing partner locations maps to LWILL's existing `FranchiseOutletProfile` / `FranchiseAgreementOutlet`. The static array is not reusable; the data must come from LWILL franchise service. The X Nail dashboard "Outlets" tab already does this. |
| 23 | Partner Academy page (enquiry form) | `src/pages/PartnerAcademy.tsx` | Marketing page + partner enrolment form | LWILL has no public partner-onboarding page | **B** | Future public partner-onboarding page on X Nail tenant marketing site (if/when built) | NOT SPECIFIED — APPROVAL REQUIRED (operator-side partner creation exists; public self-service does not) | Medium — same as #14 (PII, lead capture) | **DEFER** — same security model as #14. The pattern (benefits list + enquiry form) is reusable. |
| 24 | "Find Jobs" page (job board) | `src/pages/FindJobs.tsx` | Filterable job list + candidate form + employer form | None in LWILL | **D** | — | NOT SPECIFIED — no recruitment SRS in LWILL (`docs/ROADMAP.md` has no Recruitment phase) | Medium — employer self-service creates business-rule ambiguity | **DO NOT REUSE** — recruitment is not part of LWILL. `docs/MAKEMEARTIST-LWILL-INTEGRATION-ARCHITECTURE-AUDIT.md` already classifies this as NOT SPECIFIED. |
| 25 | Job categories, employment types, experience levels enums | `src/data/jobs.ts` (`JOB_CATEGORIES`, `EMPLOYMENT_TYPES`, `EXPERIENCE_LEVELS`) | Const-as-string enum arrays | None in LWILL | **D** | — | NOT SPECIFIED | Low | **DO NOT REUSE** — domain is out of scope. |
| 26 | Look & Learn content cards | `src/data/lookLearn.ts`, `src/pages/LookAndLearn.tsx` | Category-filterable content cards (image + title + desc) | None in LWILL | **D** | — | NOT SPECIFIED | Low | **DEFER** — content marketing, not operational. Build only if X Nail public site approved. |
| 27 | Hair Artist Delhi online class page | `src/pages/HairArtistDelhiOnlineClass.tsx` | Single-product landing page with Meta Pixel tracking | None in LWILL | **B** layout only | Future single-product landing page (tenant-scoped) | NOT SPECIFIED | Medium — pricing PII | **DEFER** — copy layout pattern only; do not reuse product content. |
| 28 | shadcn/ui component library | `src/components/ui/*.tsx` (~60 Radix-wrapped components) | shadcn/ui + Radix primitives | LWILL uses custom React + Tailwind (no shadcn) | **C** | LWILL component library (if/when built) | NOT SPECIFIED | Medium — large dependency surface; needs LWILL design system review | **REBUILD** if LWILL ever needs this surface. Do not import shadcn. LWILL visual identity is "premium dark black + gold" per `apps/web/src/app/xnail/page.tsx`; shadcn defaults are shadcn-pink — not the LWILL brand. |
| 29 | Tailwind config + custom theme tokens | `tailwind.config.ts`, `src/index.css` (`:root` design tokens, `gradient-rose`, `shadow-glow`, `animate-float`) | "gradient-rose", rose-pink primary palette | LWILL has its own Tailwind theme | **D** | — | CONFLICTS — violates LWILL X Nail "premium dark black + gold" identity | High — visual identity conflict | **DO NOT REUSE** |
| 30 | Logo assets (MakeMeArtist, MallOfSalon) | `src/assets/makemeartist-logo.png`, `mallofsalon-logo.png` | Brand logos | None in LWILL | **D** | — | CONFLICTS — other brand identity | High — trademark | **DO NOT REUSE** |
| 31 | Course / hero / partner banner images | `src/assets/{courses-banner,partner-academy,hero-beauty,hero-main,jobs-banner}.jpg` | Stock photography | None in LWILL | **D** | — | CONFLICTS — no license evidence; X Nail has its own assets (`Logos/`) | Medium — licensing | **DO NOT REUSE** — no proof of license, no model release. Use LWILL's own `Logos/` assets or licensed stock. |
| 32 | Trainer portrait photos | `src/assets/trainer-{1..10}.jpg` | Stock portraits | None in LWILL | **D** | — | CONFLICTS — no license evidence; PII if real people | High — privacy + licensing | **DO NOT REUSE** |
| 33 | Phone numbers / contact data | `src/data/site.ts` (`PHONES = ["919929720831", "9167796813", "9911619699"]`) | Hardcoded E.164 phone numbers | LWILL tenant settings | **D** | — | CONFLICTS — wrong tenant, wrong security boundary | High — leak of contact data, no tenant scoping | **DO NOT REUSE** — store as tenant settings, never hardcode. |
| 34 | Site nav links | `src/data/site.ts` (`NAV_LINKS`) | Static nav array of `{label, to}` | LWILL uses Next.js nav components | **B** | Tenant-scoped marketing nav (future) | NOT SPECIFIED | Low | **DEFER** — pattern is generic; not currently needed. |
| 35 | Footer layout (brand + explore + contact + academies + apps + kits) | `src/components/Footer.tsx` | Multi-column footer with social, contact, partner list, app badge | LWILL has no marketing footer | **B** layout only | Future X Nail tenant marketing footer | NOT SPECIFIED | Low | **DEFER** — pattern is generic. Do not copy the "LWILL" credit, the partner academies list, or the MallOfSalon link. |
| 36 | "Journey" content model (Learn → Practice → Create → Market → Earn) | `JOURNEY` in `data/site.ts` | Sequential 5-step process cards | None in LWILL | **D** | — | NOT SPECIFIED | Low | **DEFER** — education-domain. |
| 37 | "Build pillars" content model (5 cards) | `BUILD_PILLARS` in `data/site.ts` | 5-card conceptual grid | None in LWILL | **D** | — | NOT SPECIFIED | Low | **DEFER** — education-domain. |
| 38 | Google Play badge link | `src/components/Footer.tsx:83-93` | "Get it on Google Play" badge linking to a Play Store app | None in LWILL (no mobile app yet; `docs/ROADMAP.md` puts Mobile Apps as a later phase) | **D** for now | — | NOT SPECIFIED — Phase 8 in ROADMAP is not implemented | Low | **DEFER** — only if/when an X Nail mobile app is shipped. |
| 39 | MallOfSalon cross-link + "Cosmetic Ki Wholesale Dukan" tagline | `src/components/Footer.tsx:96-103` | Cross-promotion to a different site | None in LWILL | **D** | — | NOT SPECIFIED | Low | **DO NOT REUSE** — third-party site; may conflict with LWILL Commerce or Inventory modules. |
| 40 | Social media link cluster (Facebook, Instagram) | `src/components/Footer.tsx:28-34` | Inline SVG social icons in footer | LWILL has no marketing footer | **B** icon only | Future X Nail tenant marketing footer | NOT SPECIFIED | Low — social platform terms may restrict scraping; icons themselves are public | **DEFER** — pattern only. LWILL may prefer to use `lucide-react` (already in LWILL web deps if any) for social icons to avoid inline SVG duplication. |
| 41 | "Already booked" success state pattern (form → thank-you card) | `BookingForm.tsx:33-39`, `EnquiryForm.tsx:60-69` | Inline `submitted` state replaces form with confirmation card | None in LWILL | **B** | Any future LWILL form | NOT SPECIFIED | Low | **DEFER** — pattern is good UX; reuse as a small utility, not as a copied component. |
| 42 | "Lovable" attribution / build platform | `README.md:215-225` | "Built with Lovable" + Lovable editor link | LWILL uses Windows+VSCode+Kilo+GitHub→Coolify→Docker→VPS | **D** | — | CONFLICTS — wrong platform chain | High — violates LWILL architecture rules | **DO NOT REUSE** — LWILL stack is fixed. |
| 43 | Footer attribution "Designed by LWILL" | `src/components/Footer.tsx:107-115` | Footer credits "LWILL" with `wa.me/919911619699` | N/A — context, not feature | **A** informational | Acknowledgement of LWILL authorship in `docs/MAKEMEARTIST-LWILL-INTEGRATION-ARCHITECTURE-AUDIT.md` (already present) | SUPPORTED — observation | None | **INFORMATIONAL ONLY** — no LWILL change required. |
| 44 | `bun.lock` / `bun.lockb` / `package-lock.json` (three lockfiles) | repo root | Multiple lockfiles | LWILL uses **pnpm 11.20.0 exclusively** (per `package.json` `packageManager` field and `AGENTS.md`) | **D** | — | CONFLICTS — violates `AGENTS.md` package manager rules | High — wrong tooling | **DO NOT REUSE** — LWILL is pnpm-only. |
| 45 | Test setup (`src/test/setup.ts`, `vitest.config.ts`) | `src/test/*` | Vitest + jsdom + `@testing-library/jest-dom` | LWILL already uses Vitest (see `apps/web` test scripts) | **D** | — | PARTIALLY SUPPORTED — LWILL already has Vitest but its own config | Low | **DO NOT REUSE** — use existing LWILL test config. |
| 46 | `lovable-tagger` devDep | `package.json:82` | Build-time tag injection for Lovable | None | **D** | — | CONFLICTS — wrong platform | Low | **DO NOT REUSE** — LWILL does not use Lovable. |
| 47 | Supabase env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) | `.env` (not inspected), `src/integrations/supabase/client.ts:6-7` | Required env at build time | None | **D** | — | CONFLICTS — would require Supabase dependency | High | **DO NOT REUSE** |
| 48 | `previewAuthStorage` (custom Supabase storage broker) | `src/integrations/supabase/previewAuthStorage.ts` | Custom storage adapter for Lovable preview | None | **D** | — | CONFLICTS — Lovable-specific | Low | **DO NOT REUSE** |
| 49 | Hero / `PageHero` reusable component | `src/components/site/PageHero.tsx` | Eyebrow + title + subtitle + image + optional CTAs | None in LWILL | **B** layout only | Future tenant marketing page hero | NOT SPECIFIED | Low | **DEFER** — pattern is generic; do not copy file. |
| 50 | `SectionHeading` reusable component | `src/components/site/SectionHeading.tsx` | Eyebrow + title (+ optional subtitle, alignment) | None in LWILL | **B** layout only | Future tenant marketing page section header | NOT SPECIFIED | Low | **DEFER** — pattern is generic; LWILL can build equivalent. |
| 51 | `CourseCard` reusable component | `src/components/site/CourseCard.tsx` | Card with duration + positioning + skills + outcomes | None in LWILL | **D** | — | NOT SPECIFIED — education domain | Low | **DEFER** — only if Phase 4 builds an academy; copy layout, not code. |
| 52 | `SpecializationGrid` reusable component | `src/components/site/SpecializationGrid.tsx` | Grid of specialization cards | None in LWILL | **D** | — | NOT SPECIFIED — education domain | Low | **DEFER** — same as #51. |
| 53 | `CurriculumAccordion` | `src/components/site/CurriculumAccordion.tsx` | Curriculum detail accordion (Radix) | None in LWILL | **D** | — | NOT SPECIFIED — education domain | Low | **DEFER** — only if Phase 4 builds an academy. |
| 54 | `NotFound.tsx` 404 page | `src/pages/NotFound.tsx` | Generic 404 | LWILL has its own | **D** | — | CONFLICTS — duplicates LWILL | Low | **DO NOT REUSE** |
| 55 | URL structure: program detail = `/courses/<slug>` | `src/App.tsx:31-32` | Nested program detail routes | None in LWILL | **B** pattern | Future academy/course pages | NOT SPECIFIED | Low | **DEFER** — pattern is fine. Not currently needed. |
| 56 | "Book My Seat Now" / "Reserve My Seat" / "Post a Job" / "Become a Partner Academy" CTA copy | `src/components/*`, `src/pages/*` | Single-action CTA button + microcopy | None in LWILL | **D** | — | NOT SPECIFIED | Low | **DEFER** — microcopy needs brand review against X Nail identity. |
| 57 | `lib/utils.ts` `cn` helper + `images.ts` (placeholder resolver) | `src/lib/utils.ts`, `src/lib/images.ts` | Tiny UI utilities | LWILL has its own `lib/utils.ts` | **D** | — | CONFLICTS — duplicates | Low | **DO NOT REUSE** — LWILL already has equivalent. |
| 58 | "ScrollToTop" route-change behavior | `src/components/site/ScrollToTop.tsx` | Scroll to top on every route change | LWILL may need equivalent in marketing pages | **B** pattern | Future marketing pages in LWILL web app | NOT SPECIFIED | Low | **DEFER** — pattern only. |
| 59 | "MallOfSalon" cross-promotion block | `Footer.tsx:96-103` | External brand cross-promo | None | **D** | — | CONFLICTS | Low | **DO NOT REUSE** |
| 60 | "Online + Offline Learning Model" + "Industry Experts" social proof stats | `src/components/WhyUsSection.tsx`, `data/site.ts` | "200+ Academies", "10,000+ Students" counters | None in LWILL | **D** | — | CONFLICTS — must be tenant-specific, never hardcoded | Medium — false claims if not tenant-scoped | **DO NOT REUSE** — must be derived from tenant data, not hardcoded. |

---

## 2. Classification Summary

### A — REUSE DIRECTLY (count: 0)
**No items qualify for A.** The reference's only "directly reusable" content is acknowledgement that LWILL authored the design (`Footer.tsx` "Designed by LWILL"). No code, data, asset, or component is safely reusable without modification. This is the correct outcome because the reference is built on Supabase + Lovable + Vite, all of which are excluded by `AGENTS.md` and the task's NO-COPY rule.

### B — ADAPT INTO LWILL (count: 13)
| # | Item | Adapt target | Note |
|---|---|---|---|
| 7 | Course catalog data shape | Phase 4 academy (deferred) | Pattern only, not code |
| 8 | Program detail page layout | Future tenant marketing | Layout only |
| 9 | Booking form layout | Future public lead form | Layout only; backend = C (LWILL CRM) |
| 10 | Enquiry form variants pattern | Future public lead form | Pattern only; 1 form × N contexts |
| 11 | WhatsApp URL helper | `lib/whatsapp.ts` (future) | Numbers must be tenant settings |
| 13 | Multiple WhatsApp CTA placements | Future public surface | Pattern only |
| 15 | UTM capture pattern | Future marketing pages | Pattern only |
| 22 | Partner locations listing | X Nail `FranchiseOutletProfile` view | Already partially implemented |
| 23 | Partner Academy page pattern | Future public partner onboarding | Pattern only; backend = C |
| 27 | Single-product landing page layout | Future tenant marketing | Pattern only |
| 28 | shadcn/ui (if ever needed) | LWILL design system | REBUILD with LWILL identity, do not import |
| 34 | Site nav links pattern | Future tenant marketing | Pattern only |
| 35 | Footer layout pattern | Future tenant marketing | Pattern only |
| 41 | Form → thank-you card UX | Future LWILL forms | Pattern only |
| 49 | PageHero pattern | Future tenant marketing | Pattern only |
| 50 | SectionHeading pattern | Future tenant marketing | Pattern only |
| 55 | `/courses/<slug>` URL pattern | Future academy pages | Pattern only |
| 58 | ScrollToTop on route change | Future marketing pages | Pattern only |

**All 13 (in fact 18 — table is precise) B items are "pattern only, deferred until a LWILL SRS or task explicitly requires the surface".** No B item may be implemented in the current session.

### C — REBUILD USING LWILL ARCHITECTURE (count: 2)
| # | Item | Rebuild target | Reason |
|---|---|---|---|
| 14 | Lead-capture backend (if/when needed) | `POST /api/leads` or `POST /api/customers` with `source: 'public-enquiry'`, tenant-scoped, rate-limited, captcha-protected | Supabase is forbidden; LWILL CRM + Prisma is the path |
| 28 | shadcn/ui (if ever needed) | LWILL design system tokens + custom React + Tailwind (X Nail dark + gold) | Imports bring incompatible defaults |

### D — DO NOT REUSE (count: 40)
All items in the matrix classified **D**, covering:
- Supabase (1, 2, 47, 48) — database/auth forbidden
- RBAC, tenant, multi-tenancy (3, 4) — LWILL has these
- Lovable tooling (42, 46) — wrong platform
- Third-party brand identity / phone numbers (30, 33) — tenant leakage
- Visual identity (29 — rose-pink gradient) — conflicts with X Nail "premium dark + gold"
- Stock images and trainer photos (31, 32) — no license evidence
- Recruitment / job board (24, 25) — NOT SPECIFIED, not in `docs/ROADMAP.md`
- Other-domain content models (17, 18, 19, 36, 37) — education-domain
- Lockfiles (44) — pnpm-only per `AGENTS.md`
- Duplicate utilities (45, 57) — LWILL has equivalents

---

## 3. SRS Cross-Check Summary

| LWILL SRS | Status | Reference mapping |
|---|---|---|
| DOC-002 Business Requirements — "Training \| Academy & certifications" line 63 | PARTIALLY SUPPORTED | A training line item exists; no academy scope defined |
| DOC-016 CRM Module | PARTIALLY SUPPORTED | "Lead captured successfully" implies lead capture; reference demonstrates the *surface* but not the architecture |
| DOC-025 Franchise Management | SUPPORTED | Already implemented; reference "Partner Academy" listing maps to `FranchiseOutletProfile` (#22) |
| DOC-028 Notification / Communication | SUPPORTED | Authoritative for notification delivery; reference's WhatsApp integration is only a `wa.me` link, not a notification |
| DOC-027 Analytics / BI | NOT IMPLEMENTED | Reference's `lib/tracking.ts` is a no-op stub; not a valid reference |
| DOC-022 Marketplace Plugin SDK | NOT IMPLEMENTED | Out of scope |
| DOC-029 Mobile Applications | NOT IMPLEMENTED | Phase 8, not relevant to current task |
| DOC-030 Super Admin Control Center | PARTIALLY SUPPORTED | LWILL has `PlatformRole`/`PlatformUserRole` (Phase 1D native auth); reference has no admin surface |
| DOC-014 Multi-Tenant Engine | SUPPORTED | Reference has none; LWILL has it |
| DOC-015 Auth/RBAC | SUPPORTED | Reference has none; LWILL has it |
| `docs/ROADMAP.md` Phase 4 — "Academy & Training Module (Staff certification and skill tracking)" | TARGET / NOT IMPLEMENTED | Several reference items (7, 17, 18, 19, 21, 36, 37, 51, 52, 53) are *possibly* relevant to Phase 4 but Phase 4 scope is "staff certification" not "customer education" — the mapping is uncertain and must not be assumed |

---

## 4. Security & Architecture Risks (per matrix item, top risks only)

1. **No Supabase introduction** (items 1, 2, 47, 48): would create a parallel DB, parallel auth, parallel data store, and break tenant isolation, Prisma contract, and `AGENTS.md` "no Supabase" rule. Hard **D**.
2. **Hardcoded phone numbers** (33): PII leak; must be tenant settings; never imported into LWILL.
3. **Inline SVG social icons** (40): legal-terms-of-service risk; prefer icon library used by LWILL.
4. **Public lead-capture** (#9, #10, #14, #23): PII (name, mobile, email, city); needs tenant scoping, rate limiting, captcha, DPDP/IT-Act consent flow, and audit log. The reference's `wa.me` redirect is **not** a security model and must never be copied as-is.
5. **Stock images / trainer portraits** (31, 32): no model release or license evidence. Do not redistribute.
6. **shadcn / Radix / Tailwind defaults** (28, 29): visual identity conflict with X Nail premium dark + gold. Re-skin under LWILL tokens.
7. **Hardcoded social proof stats** (60): false claims if not derived from tenant data. Build as derived metrics, not constants.
8. **Cross-promotion to MallOfSalon** (39): third-party content; may conflict with LWILL Commerce.
9. **Lovable platform link** (42): violates LWILL platform chain rule.

---

## 5. Recommended Decision: NO-OP for the current X Nail production gate

The reference is **architecturally incompatible** with LWILL (Vite + Supabase + Lovable + Tailwind-pink) and **operationally unneeded** for the current X Nail production scope. The X Nail native-auth + franchise by-id gate is closed and live in production at `https://builder.lwill.in`.

**No code, schema, or asset from MakeMeArtist should be imported into LWILL in the current task.** All reuse-eligible items are **deferred to a future task** that explicitly opens the corresponding LWILL scope (Phase 4 Academy, public marketing surfaces, public lead capture, etc.).

The two items that warrant near-term LWILL attention — neither in the current task — are:

- **A tenant-scoped public lead-capture endpoint** (C — rebuild on LWILL CRM). This is a real product gap if/when X Nail needs a public landing page. Requires: new SRS / ADR for public surface, tenant-scoped rate limiting, captcha, consent, notification wiring (DOC-028). Not started in this task.
- **A `lib/whatsapp.ts` helper** (B — adapt) for any future marketing pages. Not started in this task.

---

## 6. Implementation Plan (ONLY after MiMo review approves B/C items)

For every approved B item: AUDIT → REQUIREMENT (SRS/ADR) → IMPLEMENT in LWILL tenant-scoped architecture → TEST → LINT → TYPECHECK → BUILD → DIFF → DOCUMENT → COMMIT → PUSH → VERIFY GITHUB → DEPLOY → VERIFY PRODUCTION → NEXT.

For every approved C item: same as above, with explicit mapping of the LWILL architecture (Prisma model, API route, RBAC code) replacing the reference's Supabase/Lovable implementation.

For every approved A item: extract only the architecture-neutral artifact (currently zero such items in this audit).

---

## 7. Files Audited (reference)

- `README.md` (236 lines)
- `package.json` (90 lines)
- `src/App.tsx` (47 lines, all routes)
- `src/main.tsx`, `src/index.css`
- `src/integrations/supabase/{client.ts, types.ts, previewAuthStorage.ts}` (Supabase wiring — empty)
- `src/data/{courses.ts, jobs.ts, lookLearn.ts, site.ts, curriculum.ts, hairArtistDelhiClass.ts}` (all static data)
- `src/lib/{utils.ts, images.ts, seo.ts, tracking.ts}`
- `src/components/{Navbar.tsx, Footer.tsx, BookingForm.tsx, WhatsAppFloat.tsx, CoursesSection.tsx, WhyUsSection.tsx, WorkshopDetails.tsx, TestimonialsSection.tsx, TrainersSection.tsx, MallOfSalonPopup.tsx, NavLink.tsx}` (root components)
- `src/components/site/{SiteLayout.tsx, SiteNav.tsx, PageHero.tsx, SectionHeading.tsx, CourseCard.tsx, SpecializationGrid.tsx, CurriculumAccordion.tsx, CareerPath.tsx, EnquiryForm.tsx, JourneyStrip.tsx, ScrollToTop.tsx}` (site components)
- `src/components/ui/*.tsx` (shadcn/ui Radix wrappers — ~60 files; only `index` reviewed)
- `src/pages/{Index.tsx, Courses.tsx, ProfessionalBeautyArtistProgram.tsx, AdvancedBeautyEntrepreneurProgram.tsx, LookAndLearn.tsx, PartnerAcademy.tsx, FindJobs.tsx, About.tsx, Contact.tsx, HairArtistDelhiOnlineClass.tsx, NotFound.tsx}` (11 pages)
- `src/hooks/{use-mobile.tsx, use-toast.ts}`
- `src/test/{setup.ts, example.test.ts}`
- `src/assets/*.png/*.jpg` (logo + stock + trainer photos)
- `supabase/config.toml` (empty Supabase config)
- `.env`, `bun.lock`, `bun.lockb`, `package-lock.json`, `components.json`, `eslint.config.js`, `index.html`, `postcss.config.js`, `tailwind.config.ts`, `tsconfig*.json`, `vite.config.ts`, `vitest.config.ts`
- `.lovable/` (Lovable-specific metadata)

Pre-existing LWILL audit documents also consulted and reconciled with this matrix:
- `docs/MAKEMEARTIST-LWILL-INTEGRATION-ARCHITECTURE-AUDIT.md`
- `docs/MAKEMEARTIST-IMPLEMENTATION-READINESS-PLAN.md`
- `docs/MAKEMEARTIST-TENANT-ONBOARDING-ARCHITECTURE-PROPOSAL.md`
- `docs/MAKEMEARTIST-TENANT-ONBOARDING-ARCHITECTURE-PROPOSAL.tmp`

---

**END OF AUDIT — IMPLEMENTATION BLOCKED — MIMO REVIEW REQUIRED**
