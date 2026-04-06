import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// This middleware runs on every matched request BEFORE it reaches any
// page component or API handler. It is the last line of defense for route
// protection and cannot be bypassed by component-level auth checks.

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Admin routes: require ADMIN role ────────────────────────────────────
  if (pathname.startsWith("/dashboard/admin")) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      // Not logged in → redirect to login, preserving the intended URL
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if ((token as any).role !== "ADMIN") {
      // Logged in but not admin → redirect to their own dashboard
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  }

  // ── Consultant / user dashboard: require any authenticated user ──────────
  if (pathname.startsWith("/dashboard")) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  // ── All other routes: pass through ──────────────────────────────────────
  return NextResponse.next();
}

export const config = {
  // Match all /dashboard/** paths. Exclude Next.js internals and static files
  // to avoid the middleware running unnecessarily on every static asset.
  matcher: ["/dashboard/:path*"],
};
