/**
 * NextAuth type augmentation — Issue 13
 *
 * Without this file every file that reads session.user.role or session.user.id
 * has to cast with `(session.user as any).role`. TypeScript does not know about
 * these fields because the default NextAuth Session type only includes name/email/image.
 *
 * With this augmentation:
 *   const role = session.user.role;   // ✅ typed, no cast needed
 *   const id   = session.user.id;     // ✅ typed, no cast needed
 */
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
  }

  // The User object returned from the authorize() callback
  interface User {
    id: string;
    role: string;
    email?: string | null;
    name?: string | null;
  }
}

declare module "next-auth/jwt" {
  // Extends the JWT token so we can read role from the token in middleware
  interface JWT {
    id: string;
    role: string;
  }
}
