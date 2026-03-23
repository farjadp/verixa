# 📋 Verixa Changelog

All notable changes to the Verixa ecosystem will be documented in this file.

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
