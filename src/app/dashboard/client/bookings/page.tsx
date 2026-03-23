import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ClientBookingsList from "./ClientBookingsList";

export default async function ClientBookingsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user?.email) {
    redirect("/login");
  }

  // Ensure Role is USER to prevent Consultants from poking here, though it wouldn't hurt.
  if ((session.user as any).role === "CONSULTANT") {
    redirect("/dashboard");
  }

  const bookings = await prisma.booking.findMany({
    where: { 
      userEmail: session.user.email 
    },
    include: {
      profile: true,
      type: true
    },
    orderBy: {
      scheduledStart: "desc"
    }
  });

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-bold text-[#1A1A1A]">My Bookings</h1>
        <p className="text-gray-500 mt-2">Manage your consultations, view meeting links, and check request statuses.</p>
      </div>

      <ClientBookingsList bookings={bookings} />

    </div>
  );
}
