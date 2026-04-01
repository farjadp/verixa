# Verixa Platform

Verixa is a full-stack Next.js marketplace engineered to bridge immigration consultants with global clients. It features self-contained modules for transaction processing, dual-sided portals, SEO-driven content aggregation, and system administration.

## 🚀 Quick Start

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Database Setup (Neon Postgres):**
   Copy `.env.example` to `.env.local` and configure your credentials.
   ```bash
   # Push schema to db
   npx prisma db push
   # Generate Prisma client
   npx prisma generate
   ```

3. **Run the Development Server:**
   ```bash
   npm run dev
   ```

4. **Access Platforms:**
   - **Public:** `http://localhost:3000`
   - **Dashboard:** `http://localhost:3000/dashboard`

## 🛠 Features at a Glance
- **5-Step Booking Engine:** Real-time scheduling with strict slot conflict prevention.
- **Role-Based Workspaces:** Granular views for Clients, Consultants, and System Admins.
- **Automated Lifecycle Pipelines:** Cron-driven email campaigns via Resend and native DB Notifications.
- **Node-Native Backups:** Automatic database JSON serialization and gzip compression delivered securely to the admin inbox.
- **SEO & AI Engines:** Headless data scrapers utilizing OpenAI structured outputs for continuous discovery content.

## 🚢 Deployment Guidelines (Vercel)
This platform is optimized for Vercel Serverless environments. Ensure the follow environment variables are configured in production:
- `DATABASE_URL` (Neon Postgres URI)
- `CRON_SECRET` & `NEXTAUTH_SECRET` (Secure Hashes)
- `RESEND_API_KEY` (Email Dispatch)
- `OPENAI_API_KEY` (AI Tools)

The repo includes a `vercel.json` designed to orchestrate serverless webhook and database-backup schedules automatically upon deployment.
