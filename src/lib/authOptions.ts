import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { logEvent } from "./logger";

// ── Issue 15b: In-memory rate limiter for login brute-force protection ────────
// Acceptable for login because: each cold start resets counters, worst case an
// attacker gets 5 attempts per cold start — which is acceptable given the cost.
// OTP endpoints use DB-based limiting (more persistent, multi-instance safe).
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function checkLoginRateLimit(email: string): boolean {
  const now = Date.now();
  const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  const MAX_ATTEMPTS = 5;

  const entry = loginAttempts.get(email);

  if (!entry || now > entry.resetAt) {
    loginAttempts.set(email, { count: 1, resetAt: now + WINDOW_MS });
    return true; // allowed
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return false; // blocked
  }

  entry.count += 1;
  return true; // allowed
}

function resetLoginRateLimit(email: string) {
  loginAttempts.delete(email);
}

// ── Issue 13: PrismaAdapter type fix ─────────────────────────────────────────
// The @ts-ignore was hiding a minor version mismatch between @auth/prisma-adapter
// and next-auth's Adapter type. Explicit cast to `any` is contained here and does
// not affect runtime behaviour — the adapter works correctly at runtime.
// This is the ONLY acceptable `as any` in this file.
const adapter = PrismaAdapter(prisma) as any;

export const authOptions: NextAuthOptions = {
  adapter,
  providers: [
    CredentialsProvider({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const email = credentials.email.trim().toLowerCase();

        // Issue 15b: reject before touching DB if rate-limited
        if (!checkLoginRateLimit(email)) {
          console.warn("[AUTH] Rate limit exceeded for:", email);
          throw new Error("Too many login attempts. Please try again in 15 minutes.");
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user || !user.hashedPassword) {
          console.log("[AUTH] User not found or missing password:", email);
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.hashedPassword);

        if (!isValid) {
          console.log("[AUTH] Invalid password for:", email);
          return null;
        }

        // Successful login — reset limit so legitimate user isn't locked out
        resetLoginRateLimit(email);
        console.log("[AUTH] Login successful for:", email);

        await logEvent({
          userId: user.id,
          role: user.role,
          action: "USER_LOGIN",
          details: { email }
        });

        // Issue 13: role is now typed via next-auth.d.ts — no cast needed here
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Issue 13: JWT interface is augmented in src/types/next-auth.d.ts
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // Issue 13: Session.user interface is augmented — no cast needed
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
  },
  secret: (() => {
    if (!process.env.NEXTAUTH_SECRET) {
      throw new Error(
        "[Auth] NEXTAUTH_SECRET environment variable is not set. " +
        "Server cannot start safely without a signing secret."
      );
    }
    return process.env.NEXTAUTH_SECRET;
  })(),
};
