import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { logEvent } from "./logger";

export const authOptions: NextAuthOptions = {
  // @ts-ignore - Prisma adapter types might complain depending on version mismatch
  adapter: PrismaAdapter(prisma),
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
        console.log("[AUTH] Attempting login for:", email);

        const user = await prisma.user.findUnique({
          where: { email }
        });

        if (!user) {
          console.log("[AUTH] User not found in database:", email);
          return null;
        }

        if (!user.hashedPassword) {
          console.log("[AUTH] User missing hashed password:", email);
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.hashedPassword);

        if (!isValid) {
          console.log("[AUTH] Invalid password for:", email);
          return null;
        }

        console.log("[AUTH] Login successful for:", email);

        await logEvent({
          userId: user.id,
          role: user.role,
          action: "USER_LOGIN",
          details: { email }
        });

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
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET || "SUPER_SECRET_KEY_FOR_JWT_SIGNING_MVP_ONLY",
};
