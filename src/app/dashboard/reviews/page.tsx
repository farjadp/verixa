// ============================================================================
// Hardware Source: src/app/dashboard/reviews/page.tsx
// Route: /dashboard/reviews
// Version: 1.0.0 — 2026-04-08
// Why: Authenticated consultant/dashboard route for profile management, booking operations, and workspace workflows.
// Domain: Authenticated Dashboard
// Env / Identity: React Server Component
// Owner: Verixa Web
// Notes: Assumes authenticated session context; unauthorized users must be redirected before data access.
// ============================================================================
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Star, MessageSquare, CheckCircle, Clock, AlertCircle, Info, Hash } from "lucide-react";
import { format } from "date-fns";
import ReviewReplyEditor from "@/components/ui/ReviewReplyEditor";

export default async function ConsultantReviewsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/login");
  }

  const profile = await prisma.consultantProfile.findUnique({
    where: { userId: (session.user as any).id }
  });

  if (!profile) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-orange-50 border border-orange-200 text-orange-800 p-6 rounded-2xl">
          <h2 className="font-bold text-lg mb-1">Profile Required</h2>
          <p className="text-sm">You need an active consultant profile to view reviews.</p>
        </div>
      </div>
    );
  }

  const reviews = await prisma.review.findMany({
    where: { consultantProfileId: profile.id },
    include: {
      user: { select: { name: true, image: true, email: true } },
      booking: { select: { type: { select: { title: true } } } }
    },
    orderBy: { createdAt: 'desc' }
  });

  const avgRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) 
    : "Unrated";

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-[#1A1F2B]">Client Reviews</h1>
          <p className="text-gray-500 text-sm mt-1">Manage and read the feedback from your successful consultations.</p>
        </div>
        <div className="bg-white border border-gray-100 shadow-sm px-6 py-3 rounded-2xl flex items-center gap-4">
           <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Average Rating</p>
              <div className="flex items-center gap-1 text-[#1A1F2B] font-black text-2xl">
                 <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                 {avgRating} <span className="text-sm font-medium text-gray-400 ml-1">({reviews.length})</span>
              </div>
           </div>
        </div>
      </div>

      {/* REVIEWS LIST */}
      <div className="space-y-4">
         {reviews.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-200 rounded-3xl p-12 text-center text-gray-400">
               <MessageSquare className="w-12 h-12 mx-auto opacity-40 mb-4" />
               <p className="font-bold text-lg text-[#1A1F2B]">No reviews yet</p>
               <p className="text-sm mt-1">Complete upcoming consultations to start collecting client feedback.</p>
            </div>
         ) : (
            reviews.map(review => {
               const isUnverifiedGuest = !review.userId;
               const reviewerName = isUnverifiedGuest ? (review.guestName || "Unverified Guest") : (review.user?.name || "Anonymous Client");
               const meta = review.metadata as any;

               return (
                  <div key={review.id} className="bg-white border border-[#e5e7eb] shadow-sm rounded-3xl p-6 relative overflow-hidden group">
                     {review.status === "PENDING_MODERATION" && (
                        <div className="absolute top-0 left-0 w-full h-1 bg-orange-400"></div>
                     )}
                     <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex gap-5 w-full">
                           <div className={`w-14 h-14 rounded-full border flex items-center justify-center text-xl font-black font-serif shrink-0 capitalize shadow-sm ${isUnverifiedGuest ? 'bg-orange-50 border-orange-100 text-orange-700' : 'bg-[#F5F7FA] border-gray-100 text-[#1A1F2B]'}`}>
                              {!isUnverifiedGuest && review.user?.image ? (
                                 <img src={review.user.image} alt="User" className="w-full h-full rounded-full object-cover" />
                              ) : (
                                 reviewerName[0] || 'U'
                              )}
                           </div>
                           <div className="flex-1">
                              <div className="flex items-center flex-wrap gap-2">
                                <h4 className="font-bold text-[#1A1F2B] text-lg">{reviewerName}</h4>
                                {isUnverifiedGuest && (
                                  <span className="text-[10px] font-bold tracking-widest uppercase bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-100 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> Unverified Guest Identity
                                  </span>
                                )}
                                {review.status === "PUBLISHED" ? (
                                  <span className="text-[10px] font-bold tracking-widest uppercase bg-green-50 text-green-600 px-2 py-0.5 rounded border border-green-100 flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" /> Public
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold tracking-widest uppercase bg-orange-50 text-orange-600 px-2 py-0.5 rounded border border-orange-100">
                                    Pending Review
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-3 mt-1.5 flex-row">
                                 <div className="flex items-center gap-1">
                                   {[...Array(5)].map((_, i) => (
                                     <Star key={i} className={`w-4 h-4 ${i < review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200"}`} />
                                   ))}
                                 </div>
                                 <span className="text-xs font-bold text-gray-400 flex items-center gap-1">
                                   <Clock className="w-3.5 h-3.5" />
                                   {format(review.createdAt, "MMM d, yyyy")}
                                 </span>
                                 {isUnverifiedGuest && review.guestEmail && (
                                    <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded border">
                                       {review.guestEmail}
                                    </span>
                                 )}
                              </div>
                              
                              {review.comment && (
                                <div className="mt-4 text-[15px] text-gray-600 leading-relaxed max-w-3xl bg-[#F8F9FA] p-4 rounded-2xl border border-gray-100">
                                  "{review.comment}"
                                </div>
                              )}

                              <div className="mt-4 pt-4 border-t border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                 {isUnverifiedGuest ? (
                                    <div className="flex flex-col gap-1.5">
                                      <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                                        <Info className="w-3.5 h-3.5" /> Metadata Telemetry
                                      </div>
                                      <div className="flex flex-col gap-1 text-[11px] text-gray-500 font-mono bg-gray-50 p-2.5 rounded-lg border border-gray-100 break-all max-w-xl">
                                        <div><span className="text-gray-400 font-bold">IP_ADDR:</span> {meta?.ip || 'N/A'}</div>
                                        <div><span className="text-gray-400 font-bold">SYS_UA:</span> {meta?.userAgent || 'N/A'}</div>
                                        {meta?.secChUaPlatform && <div><span className="text-gray-400 font-bold">OS_PLATFORM:</span> {meta.secChUaPlatform.replace(/"/g, '')}</div>}
                                      </div>
                                    </div>
                                 ) : (
                                    <div className="flex flex-col gap-1.5">
                                       {review.booking?.type?.title ? (
                                          <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                                             Verified Service: <span className="text-[#2FA4A9]">{review.booking.type.title}</span>
                                          </div>
                                       ) : (
                                          <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                                             Verified User Account
                                          </div>
                                       )}
                                    </div>
                                 )}
                              </div>
                              <ReviewReplyEditor reviewId={review.id} initialReply={review.replyText} repliedAt={review.repliedAt} />
                           </div>
                        </div>
                     </div>
                  </div>
               );
            })
         )}
      </div>

    </div>
  );
}
