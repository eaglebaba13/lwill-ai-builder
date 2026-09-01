# MakeMeArtist Implementation Readiness Plan

**Document ID:** MAKEMEARTIST-IMPLEMENTATION-READINESS-PLAN
**Version:** 1.0
**Status:** Audit/Planning — No Code Changes
**Date:** 2026-09-01
**Baseline:** X Nail ERP MVP frozen at `b4345fe` on `phase-1d-native-auth`
**Sources:** MAKEMEARTIST-LWILL-INTEGRATION-ARCHITECTURE-AUDIT.md, MAKEMEARTIST-TENANT-ONBOARDING-ARCHITECTURE-PROPOSAL.md, DOC-009, DOC-014, DOC-016, DOC-017, DOC-021, DOC-022, DOC-026, DOC-027, DOC-028, DOC-029, LWILL repository, eaglebaba13/makemeartist repository

---

## 1. Executive Conclusion

MakeMeArtist is a **standalone Vite/React marketing site** with no backend, no authentication, no database, and no connection to the LWILL platform. It uses Supabase as a placeholder (empty project, no tables, no data). All lead capture goes directly to WhatsApp via `wa.me` links. The site is fully static — courses, trainers, testimonials, partner academies, and jobs are hardcoded in TypeScript data files.

LWILL is architecturally ready to absorb MakeMeArtist as a tenant. The existing multi-tenant infrastructure (Tenant, TenantDomain, TenantMembership, Role, Permission, RBAC) can support MakeMeArtist without schema changes. The existing CRM, notification, and reporting services can be reused with new tenant-scoped permission codes.

**Key decisions required before coding:**
1. MakeMeArtist as a **Tenant** (recommended) vs. BusinessUnit under HDK Beauty
2. Education/course/trainer domain: **platform module** vs. **tenant-specific implementation**
3. WhatsApp-first conversion preservation strategy
4. `makemeartist.com` domain migration approach

**Recommended first coding task:** Register MakeMeArtist as a LWILL tenant via the existing bootstrap CLI, create TenantDomain for `makemeartist.com`, and bootstrap an admin user — all using existing infrastructure with zero schema changes.

---

## 2. Current MakeMeArtist Architecture

### 2.1 Technology Stack

| Layer | Technology | Status |
|---|---|---|
| Framework | React 18 + TypeScript + Vite | IMPLEMENTED |
| Routing | React Router DOM v6 | IMPLEMENTED |
| UI Library | shadcn/ui + Radix UI + Tailwind CSS v3 | IMPLEMENTED |
| State/Data | TanStack React Query v5 | IMPLEMENTED (unused — no backend) |
| Backend | Supabase (client only) | PLACEHOLDER (empty project) |
| Auth | Supabase Auth (client config only) | PLACEHOLDER (no login UI) |
| Forms | React Hook Form + Zod | IMPLEMENTED |
| SEO | Custom `useSeo` hook | IMPLEMENTED |
| Tracking | Custom `tracking.ts` | IMPLEMENTED |
| Testing | Vitest + Testing Library | PLACEHOLDER (1 example test) |
| Build | Vite | IMPLEMENTED |
| Package Manager | Bun (bun.lock + bun.lockb) | IMPLEMENTED |
| Deployment | Lovable preview / Vercel implied | PARTIAL |
| CI/CD | None | NOT IMPLEMENTED |

### 2.2 Repository Structure

```
makemeartist/
├── src/
│   ├── assets/                     # Static images
│   ├── components/
│   │   ├── site/                   # Layout, sections, forms
│   │   └── ui/                     # shadcn/ui components
│   ├── data/                       # Static data files
│   │   ├── courses.ts              # Program[] + Specialization[]
│   │   ├── curriculum.ts           # Curriculum modules
│   │   ├── hairArtistDelhiClass.ts # Online class content
│   │   ├── jobs.ts                 # Job listings
│   │   ├── lookLearn.ts            # Look & Learn content
│   │   └── site.ts                 # Phones, nav, academies, pillars, testimonials
│   ├── hooks/                      # React hooks (use-mobile, use-toast)
│   ├── integrations/supabase/      # Supabase client + types (empty)
│   ├── lib/                        # Utilities (images, seo, tracking, utils)
│   ├── pages/                      # Route pages (11 pages)
│   ├── test/                       # Vitest placeholder (1 test)
│   ├── App.tsx                     # Router + app shell
│   └── main.tsx                    # Entry point
├── supabase/config.toml            # Supabase config (project ID only)
├── public/                         # Static assets
├── package.json                    # Vite + React + shadcn
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── .env                            # Environment variables
```

### 2.3 Functional Capabilities

| Capability | Status | Data Source |
|---|---|---|
| Landing/Home page | IMPLEMENTED | `site.ts` — hero, programs, specializations, career path, trainers, testimonials, enquiry form |
| Course catalog | IMPLEMENTED | `courses.ts` — 2 programs + specializations |
| Program detail pages | IMPLEMENTED | `courses.ts` + `curriculum.ts` |
| Partner academy listing | IMPLEMENTED | `site.ts` (`ACADEMIES` array) |
| Jobs page | PARTIAL | `jobs.ts` — static listings |
| Look & Learn | IMPLEMENTED | `lookLearn.ts` — static content |
| Contact page | IMPLEMENTED | `site.ts` (`PHONES`) — phone, WhatsApp, social |
| Booking form | IMPLEMENTED | Client-side → WhatsApp redirect |
| Enquiry form | IMPLEMENTED | Client-side → WhatsApp redirect |
| WhatsApp float | IMPLEMENTED | `site.ts` — `wa.me` links |
| Testimonials | IMPLEMENTED | `site.ts` — static array |
| Trainers | IMPLEMENTED | Static in `TrainersSection.tsx` |
| User accounts/auth | NOT IMPLEMENTED | Supabase client configured but no login UI |
| Course enrollment | NOT IMPLEMENTED | No enrollment logic or database |
| Payments | NOT IMPLEMENTED | No payment gateway |
| Lead capture to DB | NOT IMPLEMENTED | Forms redirect to WhatsApp only |
| Admin/CMS | NOT IMPLEMENTED | No admin routes |
| Backend API | NOT IMPLEMENTED | No server-side logic |
| Database | NOT IMPLEMENTED | Supabase project exists but no tables |

### 2.4 Key Finding

MakeMeArtist is **entirely stateless from a data perspective**. No customer data, no leads, no user accounts exist in any database. All conversion happens via WhatsApp. The Supabase project is empty (`types.ts` shows `Tables: { [_ in never]: never }`).

---

## 3. Current LWILL Architecture Relevant to Onboarding

### 3.1 Multi-Tenant Infrastructure (IMPLEMENTED)

| Component | Status | Evidence |
|---|---|---|
| `Tenant` model | IMPLEMENTED | `schema.prisma` — id, name, slug, isActive |
| `TenantDomain` model | IMPLEMENTED | Hostname → tenant resolution |
| `TenantSetting` model | IMPLEMENTED | Per-tenant configuration |
| `TenantMembership` model | IMPLEMENTED | User ↔ Tenant binding |
| `BusinessUnit` model | IMPLEMENTED | Hierarchical under Tenant |
| `Branch` model | IMPLEMENTED | Under BusinessUnit |
| Application resolver | IMPLEMENTED | `application-resolver.ts` — hostname → context |
| Middleware | IMPLEMENTED | Tenant-aware route rewriting |
| Tenant-scoped queries | IMPLEMENTED | All services filter by `tenantId` |

### 3.2 Authentication (IMPLEMENTED + DEPLOYED)

| Component | Status | Evidence |
|---|---|---|
| Native JWT auth | IMPLEMENTED | RS256, cookie-based sessions |
| Login/refresh/logout | IMPLEMENTED | 4 auth routes, production-verified |
| Password credentials | IMPLEMENTED | `PasswordCredential` model |
| Session management | IMPLEMENTED | `AuthenticationSession`, `RefreshToken` models |
| Fail-closed design | IMPLEMENTED | All endpoints return 401 for unauthenticated |

### 3.3 Authorization / RBAC (IMPLEMENTED + ALIGNED)

| Component | Status | Evidence |
|---|---|---|
| Role model | IMPLEMENTED | `Role` — tenant-scoped |
| Permission model | IMPLEMENTED | `Permission` — code-based |
| RolePermission | IMPLEMENTED | Role ↔ Permission binding |
| MembershipRole | IMPLEMENTED | User ↔ Role binding (tenant scope) |
| BranchMembershipRole | IMPLEMENTED | User ↔ Role binding (branch scope) |
| Permission grant loader | IMPLEMENTED | `load-permission-grants.ts` |
| Authorization service | IMPLEMENTED | `authorization-service.ts` |
| 26 permission code sets | IMPLEMENTED | Bootstrap CLIs for each module |

### 3.4 Reusable Services (IMPLEMENTED)

| Service | Reuse for MakeMeArtist | Gap |
|---|---|---|
| `customer-service.ts` | HIGH — lead/enquiry management | None |
| `appointment-service.ts` | MEDIUM — class bookings, demo sessions | May need batch/class extension |
| `notification-template-service.ts` | HIGH — course reminders, enrollment confirmations | Needs WhatsApp/email delivery channel |
| `notification-log-service.ts` | HIGH — notification audit trail | None |
| `report-service.ts` | HIGH — enrollment, revenue dashboards | None |
| `membership-service.ts` | MEDIUM — student memberships | May need education context adaptation |
| `package-service.ts` | MEDIUM — course bundles | None |
| `staff-service.ts` | MEDIUM — instructor management | None |
| `service-service.ts` | LOW — could model courses as services | Conceptual mapping needed |
| `invoice-service.ts` | MEDIUM — course payments | None |
| `branch-service.ts` | LOW — partner academy locations | None |
| `setting-service.ts` | HIGH — tenant configuration | None |
| `user-service.ts` | HIGH — user management | None |
| `role-service.ts` | HIGH — role management | None |

### 3.5 Infrastructure (IMPLEMENTED)

| Component | Status |
|---|---|
| Dockerfile | IMPLEMENTED |
| Coolify deployment | IMPLEMENTED |
| GitHub auto-deploy | IMPLEMENTED |
| PostgreSQL 18 | IMPLEMENTED |
| Prisma ORM | IMPLEMENTED |
| pnpm monorepo | IMPLEMENTED |
| Turborepo | IMPLEMENTED |
| CI pipeline | IMPLEMENTED |

---

## 4. Tenant Model Decision

### 4.1 Recommendation: MakeMeArtist = Tenant (Option A)

**Rationale:**
- Independent subscription and billing lifecycle
- Separate branding, domains, and feature flags
- Autonomous user base with no overlap with HDK Beauty/X Nail
- Aligns with DOC-014 MT-001 (create tenants) and MT-004 (isolated data)
- Future tenant additions follow the same pattern
- No legal/ownership confusion with HDK Beauty

**Against Option B (BusinessUnit under HDK):**
- HDK Beauty may not legally own MakeMeArtist
- Blurs brand boundaries
- Shared tenant infrastructure creates coupling
- Different value propositions (nail salon vs. beauty education)

### 4.2 Tenant Configuration

```
Tenant: MakeMeArtist
  ├── slug: "makemeartist"
  ├── BusinessUnit: MakeMeArtist Academy
  │     └── Branches (if physical locations exist)
  ├── TenantDomain: makemeartist.com
  ├── TenantDomain: www.makemeartist.com
  ├── Users (students, instructors, admins)
  └── Roles: admin, instructor, student, partner
```

### 4.3 Status: **REQUIRES BUSINESS APPROVAL**

---

## 5. Domain/Application Boundary

### 5.1 Platform-Owned (LWILL)

- Authentication and identity
- Authorization and RBAC
- Tenant management
- CRM / lead management
- Notification infrastructure
- Reporting / analytics engine
- Workflow primitives (future)
- Document management (future)

### 5.2 Tenant-Owned (MakeMeArtist)

- Public landing page and branding
- Course catalog and content
- Trainer/testimonial content
- Partner academy listings
- WhatsApp conversion flows
- Pricing and offers
- SEO and meta configuration
- Jobs/recruitment content

### 5.3 Shared Platform Modules (Future — NOT SPECIFIED)

- Education/course domain (if approved as platform module)
- Jobs/recruitment domain
- Document generation (certificates, ID cards)
- AI content tools

---

## 6. Authentication Migration Plan

### 6.1 Current State

- MakeMeArtist: **No authentication**. Supabase Auth configured but unused. No login UI, no protected routes, no users.
- LWILL: **Production-grade native JWT auth** with cookie-based sessions, RBAC, tenant isolation.

### 6.2 Migration Path

**Phase 1: Public access preserved**
- `makemeartist.com` continues to serve public pages without authentication
- LWILL auth does not force login for public pages
- Middleware allows unauthenticated access to public routes

**Phase 2: LWILL auth for protected routes**
- Admin dashboard, student portal, instructor portal use LWILL native auth
- Login page rendered with MakeMeArtist branding (tenant-aware theme)
- Session scoped to MakeMeArtist tenant

**Phase 3: Supabase decommission**
- Remove `@supabase/supabase-js` dependency
- Remove `src/integrations/supabase/` directory
- Remove Supabase environment variables
- Supabase project can be archived (no data to migrate)

### 6.3 Implementation

- Reuse existing `POST /api/auth/login`, `/refresh`, `/logout` routes
- Add `makemeartist.com` to `TenantDomain` table
- Update `application-resolver.ts` to resolve `makemeartist.com` → `"makemeartist"` context
- Create MakeMeArtist-specific roles: `admin`, `instructor`, `student`, `partner`
- Bootstrap permissions for MakeMeArtist modules using existing CLI pattern

### 6.4 Status: **REUSABLE — requires tenant registration first**

---

## 7. CRM Migration/Reuse Plan

### 7.1 Current State

- MakeMeArtist: **No CRM**. Leads go directly to WhatsApp via `wa.me` links. No database capture.
- LWILL: **Full CRM** with Customer model, tenant-scoped CRUD, visit history, appointment tracking.

### 7.2 Reuse Strategy

**Direct reuse of `customer-service.ts`:**
- EnquiryForm submissions → create Customer record in LWILL CRM
- BookingForm submissions → create Customer + Appointment record
- WhatsApp link preserved as notification channel (not primary capture)
- Customer visit history tracks course enquiries, demo sessions, enrollments

**Lead capture flow:**
```
User fills EnquiryForm
  → POST /api/customers (LWILL CRM)
  → Customer record created (tenantId = MakeMeArtist)
  → Notification triggered (WhatsApp/email follow-up)
  → User redirected to WhatsApp (preserves current workflow)
```

### 7.3 Status: **REUSABLE — no gap**

---

## 8. Notification/WhatsApp Plan

### 8.1 Current State

- MakeMeArtist: **WhatsApp-only** via `wa.me` links. No notification system.
- LWILL: **Notification template + log services**. No delivery channel implementation.

### 8.2 Reuse Strategy

**Phase 1: Log-only (immediate)**
- EnquiryForm/BookingForm submissions logged via `notification-log-service.ts`
- Notification templates created for: enquiry confirmation, booking confirmation, course reminder
- WhatsApp link remains primary conversion channel

**Phase 2: Delivery channels (future)**
- WhatsApp Business API integration (requires API credentials)
- Email delivery (requires SMTP configuration)
- SMS delivery (requires gateway)
- All channels tenant-aware (MakeMeArtist branding)

### 8.3 Status: **REUSABLE — delivery channels are external dependency**

---

## 9. Education/Course/Trainer/Testimonial Architecture

### 9.1 Current State

- MakeMeArtist: All content is **static TypeScript data** in `src/data/*.ts` files
- LWILL: **No education/course module** exists

### 9.2 Architecture Options

**Option A: Tenant-specific implementation (RECOMMENDED for v1)**
- Course catalog stored as tenant settings or dedicated tables under MakeMeArtist tenant
- No platform module needed
- Faster to implement, lower risk
- Can be promoted to platform module later if other education tenants onboard

**Option B: Platform education module**
- New shared module in `packages/authentication-context-prisma/`
- Reusable across future education tenants
- Higher effort, requires SRS/design approval
- Over-engineered for single tenant

### 9.3 Recommended v1 Data Model (Tenant-Specific)

If Option A is approved, the following tables would be added to the Prisma schema under MakeMeArtist tenant scope:

```
Course (tenantId, name, description, duration, price, isActive)
CourseModule (tenantId, courseId, name, description, order)
Trainer (tenantId, name, bio, specializations, imageUrl)
Testimonial (tenantId, name, content, rating, courseId)
PartnerAcademy (tenantId, name, location, contactInfo)
Enquiry (tenantId, customerId, courseId, source, status)
Enrollment (tenantId, customerId, courseId, status, enrolledAt)
```

### 9.4 Status: **NOT SPECIFIED — requires architecture decision**

---

## 10. Franchise Dashboard Architecture

### 10.1 Evidence Review

| Question | Evidence | Conclusion |
|---|---|---|
| Does MakeMeArtist need franchise? | No source document mentions MakeMeArtist franchise | **NOT REQUIRED** |
| Is MakeMeArtist a franchise partner? | No agreement, no FranchisePartner record | **NO** |
| Should franchise dashboard be on MakeMeArtist? | ADR 014 places franchise on HDK/X Nail tenant | **NO** |

### 10.2 Determination

**MakeMeArtist does not require franchise functionality.** It is a beauty education platform, not a franchise operation. If future business strategy requires linking MakeMeArtist to franchise (e.g., beauty courses at franchise locations), that would be a new business decision requiring separate approval.

### 10.3 Status: **NOT REQUIRED — no franchise relationship exists**

---

## 11. Data Migration Strategy

### 11.1 Source Data Inventory

| Data Type | Current Storage | Migration Target | Effort |
|---|---|---|---|
| Course catalog | `src/data/courses.ts` (static TS) | Tenant DB or settings | Low |
| Curriculum | `src/data/curriculum.ts` (static TS) | Tenant DB | Low |
| Jobs | `src/data/jobs.ts` (static TS) | Tenant DB (if jobs module) | Low |
| Look & Learn | `src/data/lookLearn.ts` (static TS) | Tenant DB or CMS | Low |
| Site config | `src/data/site.ts` (static TS) | TenantSetting | Low |
| Partner academies | `site.ts` (`ACADEMIES`) | Tenant DB | Low |
| Trainers | Static in components | Tenant DB | Low |
| Testimonials | Static in components | Tenant DB | Low |
| Leads/enquiries | None (WhatsApp only) | LWILL CRM | Medium |
| Bookings | None (WhatsApp only) | LWILL Appointments | Medium |
| Users | None | LWILL Identity | Low (greenfield) |
| Supabase | Empty project | None | None |

### 11.2 Migration Approach

**No data migration from Supabase required** (empty project). All static content is transformed from TypeScript files to database records via seed scripts.

### 11.3 Status: **LOW RISK — greenfield data, no legacy migration**

---

## 12. Existing Customer/Lead Data Handling

### 12.1 Current State

**No customer/lead data exists in any database.** All leads go directly to WhatsApp. There is no Supabase data, no localStorage data, no cookie-based tracking.

### 12.2 Implication

MakeMeArtist onboarding is a **greenfield deployment** from a data perspective. No ETL, no data migration, no legacy cleanup required.

### 12.3 Status: **NO DATA TO MIGRATE**

---

## 13. Domain/DNS/Deployment Strategy

### 13.1 Current URLs

| URL | Current Owner | Current Role |
|---|---|---|
| `builder.lwill.in` | LWILL | Platform admin + AI Builder |
| `xnail.makemeartist.com` | LWILL (Coolify) | X Nail tenant application |
| `makemeartist.com` | MakeMeArtist (Lovable/Vercel) | MakeMeArtist public site |

### 13.2 Proposed URL Model

```
LWILL Platform (Coolify)
  ├── builder.lwill.in                    # Platform admin
  ├── xnail.makemeartist.com              # X Nail tenant
  └── makemeartist.com                    # MakeMeArtist tenant
```

### 13.3 Migration Approach

**Phase 1: LWILL serves MakeMeArtist API**
- MakeMeArtist frontend remains on current hosting (Lovable/Vercel)
- API calls go to LWILL (`builder.lwill.in/api/...` or dedicated API subdomain)
- Public pages remain on current hosting

**Phase 2: LWILL serves full MakeMeArtist**
- MakeMeArtist frontend migrated to LWILL Next.js app
- `makemeartist.com` DNS pointed to Coolify
- Middleware resolves `makemeartist.com` → MakeMeArtist tenant context
- Public pages served without authentication
- Protected pages (admin, student portal) require LWILL auth

### 13.4 SEO Continuity

- Preserve all existing URLs (`/courses`, `/about`, `/contact`, etc.)
- Implement 301 redirects if URL structure changes
- Maintain meta tags and structured data
- Submit sitemap to search engines after migration

### 13.5 Status: **REQUIRES PLANNING — DNS migration is operational**

---

## 14. Navigation and Branding Strategy

### 14.1 Current LWILL Navigation

X Nail uses `apps/web/src/app/xnail/page.tsx` (6,606 lines) with role-based tab configuration in `role-dashboard-config.ts`.

### 14.2 MakeMeArtist Navigation Requirements

| Section | Auth Required | Audience |
|---|---|---|
| Landing page | No | Public |
| Course catalog | No | Public |
| Program details | No | Public |
| About | No | Public |
| Contact | No | Public |
| Jobs | No | Public |
| Look & Learn | No | Public |
| Student portal | Yes | Students |
| Instructor dashboard | Yes | Instructors |
| Admin dashboard | Yes | Admins |

### 14.3 Implementation Approach

**Option A: Separate Next.js app in monorepo (RECOMMENDED)**
- `apps/makemeartist/` — MakeMeArtist tenant application
- Shares platform packages (`@lwill/authentication-context-prisma`, etc.)
- Independent branding, navigation, and route structure
- Deploys independently via Coolify

**Option B: Tenant-aware routing in existing `apps/web/`**
- Single Next.js app serves both X Nail and MakeMeArtist
- Middleware resolves tenant and renders appropriate UI
- Risk of code bloat and brand confusion

### 14.4 Branding

- MakeMeArtist logo, colors, fonts configured via `TenantSetting`
- Login page rendered with MakeMeArtist branding
- Email/notification templates use MakeMeArtist branding
- No X Nail branding visible to MakeMeArtist users

### 14.5 Status: **REQUIRES ARCHITECTURE DECISION**

---

## 15. RBAC/Security Model

### 15.1 Proposed MakeMeArtist Roles

| Role | Code | Permissions | Audience |
|---|---|---|---|
| Admin | `mma-admin` | All MakeMeArtist permissions | Platform operators |
| Instructor | `mma-instructor` | Course management, student view | Trainers |
| Student | `mma-student` | Course view, enrollment, profile | Learners |
| Partner | `mma-partner` | Academy management, student view | Partner academies |

### 15.2 Permission Codes

```
mma-course.read, mma-course.write
mma-enrollment.read, mma-enrollment.write
mma-trainer.read, mma-trainer.write
mma-student.read, mma-student.write
mma-academy.read, mma-academy.write
mma-enquiry.read, mma-enquiry.write
mma-report.read
mma-setting.read, mma-setting.write
```

### 15.3 Implementation

- Reuse existing `Permission`, `Role`, `RolePermission`, `MembershipRole` models
- Create MakeMeArtist-specific permission bootstrap CLI (following existing pattern)
- All API routes check MakeMeArtist tenant scope
- Cross-tenant access denied by default

### 15.4 Status: **REUSABLE — existing RBAC infrastructure supports this**

---

## 16. Reporting/Analytics Strategy

### 16.1 Reusable LWILL Reports

| Report | Reuse for MakeMeArtist | Gap |
|---|---|---|
| Daily Sales | HIGH — course payment revenue | None |
| Appointment Report | MEDIUM — class/demo bookings | None |
| Membership Report | MEDIUM — student memberships | None |
| Package Utilization | MEDIUM — course bundle usage | None |
| GST Summary | HIGH — tax reporting | None |
| Branch Performance | LOW — partner academy performance | None |
| Inventory Stock | N/A — not applicable | None |

### 16.2 MakeMeArtist-Specific Reports (Future)

- Enrollment trends
- Course completion rates
- Trainer performance
- Partner academy revenue
- Lead conversion funnel (WhatsApp → enquiry → enrollment)

### 16.3 Status: **REUSABLE — existing reporting service supports tenant-scoped reports**

---

## 17. Testing Strategy

### 17.1 Current State

- LWILL: 1,038 automated tests (562 web + 476 service)
- MakeMeArtist: 1 placeholder test

### 17.2 Testing Plan

**Phase 1: Tenant registration tests**
- Tenant bootstrap CLI tests (following existing pattern)
- TenantDomain resolution tests
- Authentication flow tests for MakeMeArtist tenant

**Phase 2: Service integration tests**
- CRM lead capture tests (MakeMeArtist tenant scope)
- Notification template/log tests
- Reporting tests (MakeMeArtist tenant data)

**Phase 3: E2E tests**
- Playwright-based public page verification
- Login/logout flow for MakeMeArtist users
- Cross-tenant isolation validation
- Branding verification

### 17.3 Status: **REQUIRES IMPLEMENTATION — existing test patterns can be followed**

---

## 18. CI/CD Strategy

### 18.1 Current State

- LWILL: GitHub → Coolify auto-deploy → Docker → port 8080
- MakeMeArtist: Lovable preview / Vercel implied (no CI/CD)

### 18.2 Proposed CI/CD

**Phase 1: MakeMeArtist as separate app in LWILL monorepo**
- `apps/makemeartist/` added to pnpm workspace
- Turborepo builds both `apps/web` (X Nail) and `apps/makemeartist`
- Coolify deploys both applications
- Separate Coolify services for each tenant

**Phase 2: Independent deployment**
- MakeMeArtist has its own Coolify service
- `makemeartist.com` DNS → Coolify
- Independent release cadence from X Nail

### 18.3 Status: **REQUIRES INFRASTRUCTURE SETUP**

---

## 19. Repository/Package Dependency Strategy

### 19.1 Recommended Architecture

```
lwill-ai-builder/                    # Platform monorepo
├── apps/
│   ├── web/                         # X Nail tenant application
│   └── makemeartist/                # MakeMeArtist tenant application (NEW)
├── packages/
│   ├── database/                    # Shared Prisma schema
│   ├── authentication-context/      # Auth context providers
│   ├── authentication-context-prisma/ # Auth + services
│   ├── authorization/               # Authorization engine
│   ├── authorization-prisma/        # Permission grant loading
│   └── authorization-service/       # Authorization decision service
└── docs/
```

### 19.2 Package Dependencies

MakeMeArtist app would depend on:
- `@lwill/authentication-context` (workspace)
- `@lwill/authorization` (workspace)
- `@lwill/authorization-prisma` (workspace)
- `@lwill/authorization-service` (workspace)
- `@lwill/database` (workspace)
- Next.js 16, React 19, Tailwind CSS v4

### 19.3 Status: **REQUIRES IMPLEMENTATION — monorepo structure change**

---

## 20. Migration Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | SEO loss during domain migration | Medium | High | 301 redirects, sitemap resubmission, preserve URL structure |
| 2 | WhatsApp conversion disruption | Low | High | Preserve WhatsApp links as primary channel; CRM is additive |
| 3 | Cross-tenant data leakage | Low | Critical | Application-layer scoping + automated isolation tests |
| 4 | Auth migration breaks public access | Low | High | Middleware allows unauthenticated access to public pages |
| 5 | Tech stack incompatibility | Low | Medium | Vite/React → Next.js migration; shadcn/ui compatible with both |
| 6 | Supabase dependency removal | Low | Low | No data to migrate; simply remove SDK |
| 7 | Lovable-generated code quality | Medium | Medium | Refactoring needed for platform integration |
| 8 | Brand confusion with X Nail | Low | Medium | Separate tenant, separate branding, separate navigation |
| 9 | Education module scope creep | Medium | Medium | Time-box v1 to tenant-specific; promote to platform later |
| 10 | Performance under multi-tenant load | Low | Medium | Query optimization; tenant-scoped indexes |

---

## 21. Rollback Strategy

### 21.1 Phase 1 Rollback (Tenant Registration)
- Delete MakeMeArtist Tenant record
- Delete TenantDomain records
- Delete TenantMembership records
- No user impact (MakeMeArtist site unchanged)

### 21.2 Phase 2 Rollback (CRM Integration)
- Remove MakeMeArtist CRM API calls from frontend
- Restore WhatsApp-only lead capture
- No data loss (leads still in WhatsApp)

### 21.3 Phase 3 Rollback (Domain Migration)
- Revert DNS to original hosting
- Remove MakeMeArtist from Coolify
- No data loss (all data in LWILL database)

### 21.4 Phase 4 Rollback (Full Migration)
- Restore MakeMeArtist to standalone Vite/React app
- Remove LWILL package dependencies
- Decommission MakeMeArtist tenant

---

## 22. Exact Implementation Phases

### Phase 1: Tenant Registration (1-2 days)

**Goal:** MakeMeArtist becomes a recognized LWILL tenant.

**Tasks:**
1. Create MakeMeArtist Tenant record in database
2. Create TenantDomain for `makemeartist.com` and `www.makemeartist.com`
3. Create MakeMeArtist Academy BusinessUnit
4. Bootstrap admin user with `mma-admin` role
5. Create MakeMeArtist permission codes and roles
6. Verify tenant isolation (MakeMeArtist data separate from HDK Beauty)
7. Add tests for tenant bootstrap CLI

**Dependencies:** Business approval for tenant model (Section 4.3)
**Schema changes:** None (uses existing models)
**Risk:** Low

### Phase 2: Application Resolver Update (1 day)

**Goal:** `makemeartist.com` resolves to MakeMeArtist tenant context.

**Tasks:**
1. Update `application-resolver.ts` to map `makemeartist.com` → `"makemeartist"` context
2. Update middleware to handle MakeMeArtist routes
3. Create MakeMeArtist landing page route (`/makemeartist`)
4. Verify public access works without authentication
5. Verify authenticated access works for admin routes
6. Add tests for hostname resolution

**Dependencies:** Phase 1 complete
**Schema changes:** None
**Risk:** Low

### Phase 3: CRM Integration (2-3 days)

**Goal:** Replace WhatsApp-only lead capture with LWILL CRM backend.

**Tasks:**
1. Update EnquiryForm to POST to `/api/customers` (MakeMeArtist tenant)
2. Update BookingForm to POST to `/api/appointments` (MakeMeArtist tenant)
3. Preserve WhatsApp redirect as secondary channel
4. Create MakeMeArtist notification templates (enquiry confirmation, booking confirmation)
5. Add notification logging for all form submissions
6. Create admin dashboard for viewing leads/enquiries
7. Add tests for CRM integration

**Dependencies:** Phase 2 complete
**Schema changes:** None (reuses existing Customer, Appointment models)
**Risk:** Medium (workflow change from WhatsApp-only to DB + WhatsApp)

### Phase 4: Content Migration (3-5 days)

**Goal:** Move static content from TypeScript files to database.

**Tasks:**
1. Design tenant-specific content schema (courses, trainers, testimonials, academies)
2. Create Prisma migration for new tables
3. Create seed scripts to populate from `src/data/*.ts` files
4. Create API routes for content management
5. Create admin UI for content management
6. Update frontend to fetch from API instead of static data
7. Add tests for content CRUD

**Dependencies:** Phase 3 complete
**Schema changes:** Yes (new tables for courses, trainers, testimonials, academies)
**Risk:** Medium (content transformation effort)

### Phase 5: Frontend Migration (5-7 days)

**Goal:** MakeMeArtist frontend runs on LWILL platform.

**Tasks:**
1. Create `apps/makemeartist/` in LWILL monorepo
2. Migrate React components to Next.js App Router
3. Replace React Router with Next.js routing
4. Replace Vite build with Next.js build
5. Integrate LWILL auth for protected routes
6. Implement tenant-aware branding (logo, colors, fonts)
7. Preserve all public URLs for SEO continuity
8. Add comprehensive tests
9. Deploy to Coolify under `makemeartist.com`

**Dependencies:** Phase 4 complete
**Schema changes:** None
**Risk:** High (tech stack migration)

### Phase 6: Production Cutover (1-2 days)

**Goal:** `makemeartist.com` served by LWILL platform.

**Tasks:**
1. Point `makemeartist.com` DNS to Coolify
2. Verify all public pages load correctly
3. Verify authentication works
4. Verify CRM captures leads
5. Verify WhatsApp links still work
6. Monitor error rates and performance
7. Decommission Supabase project
8. Update documentation

**Dependencies:** Phase 5 complete
**Schema changes:** None
**Risk:** Medium (DNS migration)

---

## 23. Dependencies on LWILL Platform

| Dependency | Status | Required For |
|---|---|---|
| Tenant model | IMPLEMENTED | Phase 1 |
| TenantDomain model | IMPLEMENTED | Phase 1 |
| TenantMembership model | IMPLEMENTED | Phase 1 |
| Role/Permission models | IMPLEMENTED | Phase 1 |
| Bootstrap CLI pattern | IMPLEMENTED | Phase 1 |
| Application resolver | IMPLEMENTED | Phase 2 |
| Middleware | IMPLEMENTED | Phase 2 |
| Customer service | IMPLEMENTED | Phase 3 |
| Appointment service | IMPLEMENTED | Phase 3 |
| Notification services | IMPLEMENTED | Phase 3 |
| Report service | IMPLEMENTED | Phase 3 |
| Native JWT auth | IMPLEMENTED | Phase 5 |
| RBAC | IMPLEMENTED | Phase 5 |
| Dockerfile | IMPLEMENTED | Phase 6 |
| Coolify deployment | IMPLEMENTED | Phase 6 |

**All platform dependencies are IMPLEMENTED.** No new platform modules required for Phases 1-3.

---

## 24. Items Requiring Business Approval

| Item | Decision Needed | Impact |
|---|---|---|
| Tenant model (A vs B) | MakeMeArtist as Tenant vs. BusinessUnit | Architecture foundation |
| Education module scope | Platform module vs. tenant-specific | Schema design |
| WhatsApp preservation | Primary channel vs. CRM-first | Workflow design |
| Domain migration | When/how to migrate makemeartist.com | Deployment timeline |
| Content migration scope | Which static content to migrate first | Phase 4 prioritization |
| Role definitions | Exact roles and permissions for MakeMeArtist | RBAC implementation |
| Pricing model | Subscription plans for MakeMeArtist | Future billing |

---

## 25. Items NOT Specified by Current SRS

| Item | Status | Source |
|---|---|---|
| Education/course module | NOT SPECIFIED in any SRS | No DOC-0XX defines education domain |
| Jobs/recruitment module | NOT SPECIFIED | No SRS defines jobs domain |
| Partner academy management | NOT SPECIFIED | No SRS defines partner academy domain |
| Student portal | NOT SPECIFIED | No SRS defines student-facing portal |
| Instructor dashboard | NOT SPECIFIED | No SRS defines instructor-facing dashboard |
| Course enrollment workflow | NOT SPECIFIED | No SRS defines enrollment process |
| Certificate generation | NOT SPECIFIED | No SRS defines document generation |
| MakeMeArtist as LWILL tenant | NOT SPECIFIED | No SRS/ADR defines this relationship |

**All items marked NOT SPECIFIED require explicit business/architecture approval before implementation.**

---

## 26. Recommended First Coding Task

### Task: Register MakeMeArtist as a LWILL Tenant

**Scope:** Create a bootstrap CLI that registers MakeMeArtist as a LWILL tenant using existing infrastructure. Zero schema changes. Zero new modules.

**What it does:**
1. Creates `Tenant` record: `{ name: "MakeMeArtist", slug: "makemeartist", isActive: true }`
2. Creates `TenantDomain` records: `makemeartist.com`, `www.makemeartist.com`
3. Creates `BusinessUnit`: `{ name: "MakeMeArtist Academy", tenantId: ... }`
4. Creates roles: `mma-admin`, `mma-instructor`, `mma-student`, `mma-partner`
5. Creates permission codes: `mma-course.read/write`, `mma-enrollment.read/write`, etc.
6. Assigns permissions to roles
7. Creates initial admin user with `mma-admin` role
8. Verifies tenant isolation (queries scoped to MakeMeArtist tenantId)

**What it does NOT do:**
- Modify Prisma schema
- Create migrations
- Change MakeMeArtist frontend
- Deploy anything
- Affect X Nail

**Estimated effort:** 1-2 days
**Risk:** Low
**Prerequisites:** Business approval for tenant model (Section 4.3)

**Files to create:**
- `packages/authentication-context-prisma/src/initial-makemeartist-tenant-bootstrap.ts`
- `packages/authentication-context-prisma/src/initial-makemeartist-tenant-bootstrap-cli.ts`
- `packages/authentication-context-prisma/src/initial-makemeartist-tenant-bootstrap.test.ts`
- `packages/authentication-context-prisma/src/initial-makemeartist-permissions-bootstrap.ts`
- `packages/authentication-context-prisma/src/initial-makemeartist-permissions-bootstrap-cli.ts`
- `packages/authentication-context-prisma/src/initial-makemeartist-permissions-bootstrap.test.ts`

**Pattern to follow:** Existing `initial-hierarchy-bootstrap.ts`, `initial-customer-permissions-bootstrap.ts`, and all other `initial-*-permissions-bootstrap.ts` files.

---

## Appendix A: LWILL Prisma Models (40 models)

Tenant, TenantDomain, TenantSetting, BusinessUnit, Branch, Territory, FranchisePartner, FranchiseOutletProfile, FranchiseAgreement, FranchiseAgreementOutlet, FranchiseRevenueDistribution, Customer, Service, Appointment, Package, Membership, Staff, Attendance, Category, Product, StockItem, StockMovement, Invoice, InvoiceLineItem, AuditLog, User, PasswordCredential, AuthenticationSession, RefreshToken, PasswordResetToken, TenantMembership, Role, Permission, RolePermission, MembershipRole, BusinessUnitMembershipRole, BranchMembershipRole, NotificationTemplate, NotificationLog, Warehouse, Supplier, ReorderRule, PurchaseReceipt, PurchaseReceiptLineItem, StockTransfer, StockTransferLineItem, StockAdjustment, StockAdjustmentLineItem

## Appendix B: MakeMeArtist Pages (11 pages)

Index.tsx (landing), Courses.tsx, ProfessionalBeautyArtistProgram.tsx, AdvancedBeautyEntrepreneurProgram.tsx, LookAndLearn.tsx, PartnerAcademy.tsx, FindJobs.tsx, About.tsx, Contact.tsx, HairArtistDelhiOnlineClass.tsx, NotFound.tsx

## Appendix C: MakeMeArtist Data Files (6 files)

courses.ts (Program[], Specialization[]), curriculum.ts (Curriculum modules), hairArtistDelhiClass.ts (Online class content), jobs.ts (Job listings), lookLearn.ts (Look & Learn content), site.ts (Phones, nav links, academies, pillars, testimonials, specializations)

## Appendix D: References

- MAKEMEARTIST-LWILL-INTEGRATION-ARCHITECTURE-AUDIT.md (706 lines)
- MAKEMEARTIST-TENANT-ONBOARDING-ARCHITECTURE-PROPOSAL.md (499 lines)
- LWILL-DOC-009-Master-Platform-Blueprint-v1.0.txt
- LWILL-DOC-014-Multi-Tenant-Engine-SRS-v1.0.txt
- LWILL-DOC-016-CRM-Module-SRS-v1.0.txt
- LWILL-DOC-017-X-Nail-ERP-SRS-MVP-v1.0.txt
- LWILL-DOC-021-AI-Builder-Engine-SRS-v1.0.txt
- LWILL-DOC-022-Marketplace-Plugin-SDK-SRS-v1.0.txt
- LWILL-DOC-026-Workflow-Automation-Engine-SRS-v1.0.txt
- LWILL-DOC-027-Analytics-Business-Intelligence-SRS-v1.0.txt
- LWILL-DOC-028-Notification-Communication-Engine-SRS-v1.0.txt
- LWILL-DOC-029-Mobile-Applications-SRS-v1.0.txt
- packages/database/prisma/schema.prisma
- eaglebaba13/makemeartist repository (GitHub)
- makemeartist.com (production)

---

*End of plan. No code, schema, or application files were modified.*
