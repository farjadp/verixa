# Outreach Prisma integration check (Fri Nov 6)

Verifies the repo layer against real Postgres: raw SQL (discovery, negative stats), the dead-touch
reuse race, daily caps, cascade deletes. The unit suite mocks all of this.

**Never point it at the live database.** The test refuses to run if the target host matches any
`DATABASE_URL`/`DIRECT_URL` in `.env`, `.env.local`, `.env.production` or `.env.vercel`.

## Steps

1. Neon console → project → Branches → **Create branch** from `main` (name: `outreach-it`).
   Copy two connection strings: pooled (`-pooler` host) and direct.
2. Apply the outreach migration to the branch only:

   ```bash
   DATABASE_URL="<branch pooled url>" DIRECT_URL="<branch direct url>" npx prisma migrate deploy
   ```

3. Run the check:

   ```bash
   OUTREACH_IT_DATABASE_URL="<branch pooled url>" OUTREACH_IT_DIRECT_URL="<branch direct url>" \
   OUTREACH_IT_CONFIRM_THROWAWAY=yes npm run test:outreach-db
   ```

4. Expect 7 passing tests. Paste any failure to Claude. The test deletes its own rows (tag `ITOUT-…`).
5. Delete the Neon branch. Only then push the git branch (a Vercel build runs `prisma migrate deploy`).
