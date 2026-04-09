# 🗺️ Verixa Master Roadmap

Welcome to the Verixa strategic roadmap. This document outlines the evolution of the platform from a simple Python data extractor to a multi-tiered, full-stack Next.js marketplace for immigration consultation.

---

## 🚀 Phase 1: The Genesis (Completed)
**Goal:** Acquire the foundation.
- [x] Python Playwright engine to navigate governmental registries.
- [x] SQLite integration for resilient, resumable data extraction.
- [x] Streamlit-powered Python Admin utility for immediate data sanitization.

## 🏗️ Phase 2: Structural Integrity (Completed)
**Goal:** Build the Next.js 15 / React Server Components foundation.
- [x] Implement the `verixa-web` repository.
- [x] Connect `better-sqlite3` to synchronize Python scrape outputs with Next.js loaders.
- [x] Stand up the public-facing Search Engine and dynamic `/[license_number]` profiles.

## 🔐 Phase 3: Identity & Access (Completed)
**Goal:** Establish secure, isolated user roles.
- [x] NextAuth integration with Prisma Postgres.
- [x] Role-Based Access Control (`ADMIN`, `CONSULTANT`, `USER`).
- [x] The `dashboard/layout.tsx` dynamic routing tree protecting restricted zones.

## 🛒 Phase 4: The 5-Step Booking Engine (Completed)
**Goal:** Enable seamless transactions without overlap.
- [x] Interactive Public booking flow (Session → Time → Details → Review → Confirm).
- [x] Server-Side slot validation enforcing absolute conflict prevention.
- [x] Dynamic generation of available time windows based on Consultant rules.

## 🔔 Phase 5: Notification & Action Layers (Completed)
**Goal:** Eliminate dead leads and drive engagement.
- [x] Prisma-level Notification schema linking to all Booking state mutations.
- [x] "Action Required" intelligently sorted Consultant queues.
- [x] HTML `Resend` Email triggers for lifecycle milestones and Vercel CRON reminders.

## 🌐 Phase 6: Delivery & Resolution (Completed)
**Goal:** Fulfill the consultation and resolve conflicts.
- [x] `meeting.service.ts` factory for automated Link injection.
- [x] Full-scale Support Ticketing system bridging Clients/Consultants with Admins.
- [x] Multi-tier Admin oversight dashboards (Bento-box analytics & queues).
- [x] **Database Backups:** Core Node-native stringification to `.json.gz` driven by Cron emails.
- [x] **Cohort Broadcasting:** Push persistent announcements directly to Consultant endpoints.

---

## 🎯 Phase 7: The Commercial Launch (Up Next)
**Goal:** Monetization and Public Release.
- [ ] **Stripe Escrow Integration:** Process holds upon booking, release upon `COMPLETED` state.
- [ ] **Native Video Integrations:** Upgrade `meeting.service.ts` to directly hook Google Calendar / Zoom OAuth endpoints.
- [ ] **PWA Conversion:** Map `next-pwa` configurations ensuring consultants can "Install" the dashboard to their mobile homescreens for instantaneous Action Queues handling.
