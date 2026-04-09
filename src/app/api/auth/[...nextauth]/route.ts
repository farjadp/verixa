// ============================================================================
// Hardware Source: src/app/api/auth/[...nextauth]/route.ts
// Route: /api/auth/[...nextauth]
// Version: 1.0.0 — 2026-04-08
// Why: NextAuth entrypoint for login, session creation, and auth callbacks.
// Domain: Authentication & Session
// Env / Identity: Next.js Route Handler
// Owner: Verixa Web
// Notes: Authentication boundary; preserve NextAuth contract and avoid leaking session internals in responses.
// Critical Path: Session and auth handshake used by the entire authenticated surface.
// Primary Dependencies: NextAuth callbacks, auth options, session storage, provider config.
// Risk Notes: Breaks here affect login, dashboard access, and token-based flows.
// ============================================================================
import NextAuth from "next-auth";
import { authOptions } from "@/lib/authOptions";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
