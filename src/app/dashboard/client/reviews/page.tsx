// ============================================================================
// Hardware Source: dashboard/client/reviews/page.tsx
// Route: /dashboard/client/reviews
// Version: 1.0.0 — 2026-03-23
// Why: Route entry for /dashboard/client/reviews (structured for SEO, trust, and conversion)
// Env / Identity: React Server Component
// Owner: Verixa Web
// Notes: Keep structure consistent; every section must support Traffic -> Trust -> Booking
// ============================================================================

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ClientReviewsList from "./ClientReviewsList";

export default async function ClientReviewsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  });

  if (!user) redirect("/login");

  // Fetch Submitted Reviews
  const submittedReviews = await prisma.review.findMany({
    where: { userId: user.id },
    include: {
      profile: true,
      booking: true
    },
    orderBy: { createdAt: "desc" }
  });

  // Fetch Unreviewed Completed Bookings (Pending Reviews)
  const unreviewedBookings = await prisma.booking.findMany({
    where: { 
      userEmail: session.user.email,
      status: "COMPLETED",
      review: null // booking has no review linked
    },
    include: {
      profile: true,
      type: true
    },
    orderBy: { scheduledStart: "desc" }
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold text-[#1A1F2B]">My Reviews</h1>
        <p className="text-gray-500 mt-2">Manage your feedback. Reviews help build a trusted community for everyone.</p>
      </div>

      <ClientReviewsList 
        submittedReviews={submittedReviews} 
        unreviewedBookings={unreviewedBookings} 
      />
    </div>
  );
}
