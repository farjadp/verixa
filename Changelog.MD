# 📋 Verixa Changelog

All notable changes to the Verixa ecosystem will be documented in this file.

---

## [v1.0.0-RC] - 2026-04-01
### Added
- **Database Backup Engine:** A fully serverless database backup tool powered by native Node `zlib` that queries all models, converts them to `.gz`, and dispatches via Resend Email. Both manual via Settings UI and Automated via Vercel Crons (`/api/cron/backup`).
- **In-App Broadcast System:** Admins can now explicitly target Consultant dashboard cohorts with priority rich-text broadcasts accompanied by styled email dispatches.
- **Settings UI Tabs:** Hard-refactored `PlatformSettingsClient.tsx` breaking monolith forms into fluidly animated functional layout tabs (`VARIABLES`, `ANNOUNCEMENTS`, `SYSTEM TOOLS`).

---

## [v0.9.1-Beta] - 2026-03-28
### Added
- **Dynamic AI Article Styling:** Upgraded `LatestArticles` frontend mechanics with premium CSS Grid-based hover accordions to prevent text clipping and fluidly auto-match container heights.
- **Disclaimer Widgets:** Decoupled auto-generated warnings from raw markdown strings, transforming them into dedicated React disclaimer widgets dynamically injected above the FAQ boundaries.

### Fixed
- **Image Generation Pipeline:** Replaced the failing FAL AI Flux endpoints with a highly reliable OpenAI DALL-E-3 integration to guarantee cover image compiling on every run.
- **Table Morphology:** Deep-injected standard `ReactMarkdown` styling overrides to render Markdown tables with a clean, border-collapsed minimalist design instead of relying on default typography plugins.
- **Policy Analysis Scaling:** Modified the core LLM Aggregator extraction prompts, instructing the AI to dynamically scale high-importance articles into multiple strategic paragraphs.

---

## [v0.9.0-MVP] - 2026-03-23
### Added
- **Admin Booking Audit Page:** Complete read-only view mapped to `/dashboard/admin/bookings/[id]` exposing raw financial and metadata metrics.
- **Meeting Configurations:** Consultants can now dictate Default Providers (Manual, Phone, In-Person) and automatic instructions from `/dashboard/settings`.
- **Pre-filled Acceptance Modal:** Consultant actions natively inject configuration schemas before allowing a Booking Status shift to `CONFIRMED`.
- **Action Required Queues:** Dashboard panels explicitly prioritize stuck bookings based on UTC time distance.

### Fixed
- **Next.js 15 Routing Crash:** Fully mitigated `PrismaClientValidationError` across all dynamic `/[id]` routes by converting synchronous property reads to asynchronous strict `await` destructuring arrays.
- **Legacy Property Types:** Stripped outdated `consultantProfile` strings from automated CRON HTML email outputs, correctly routing to `profile.user.name`.
- **Phantom DB References:** Purged `caseDetails` and `uploadedFiles` references causing strict Typescript aborts during production compiles in the Admin dashboard.

---

## [v0.8.0-Beta] - 2026-03-20
### Added
- **The Support Engine:** Deployed full Ticket schemas enabling direct, category-sorted dual communication between global clients and the Admin Mission Control (`/dashboard/admin/disputes`).
- **Confirmation Transparency:** Refactored `/success` rendering pages to visibly state "Pending" milestones instead of false confirmation anxiety.
- **Vercel CRON Integrations:** Added absolute time checks firing emails 24h prior to `scheduledStart`.

### Changed
- Rebuilt `/dashboard` routing to conditionally branch UI elements based purely on NextAuth `Session.Role` (Client Home vs. Consultant Action Inbox vs. Admin Command Center).
- Upgraded local SQLite tracking maps to universal Prisma `PostgreSQL` relationship models handling Deep `Include` joining.

---

## [v0.5.0-Alpha] - Genesis
### Added
- Core Next.js Foundation and global Tailwind typography configuration.
- CICC Python Scraper outputting to raw SQLite `.db` binaries.
- Initial Public Directory searching and rudimentary authentication logic.
