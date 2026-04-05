"use client";

import { useState } from "react";
import { replyToReview } from "@/actions/reviews.actions";
import { CornerDownRight, Check, Loader2, Edit3, MessageSquareText } from "lucide-react";
import { format } from "date-fns";

export default function ReviewReplyEditor({
  reviewId,
  initialReply,
  repliedAt
}: {
  reviewId: string;
  initialReply: string | null;
  repliedAt: Date | null;
}) {
  const [isEditing, setIsEditing] = useState(!initialReply);
  const [replyText, setReplyText] = useState(initialReply || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (replyText.trim() === initialReply?.trim() && !isEditing) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await replyToReview(reviewId, replyText);
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || "Failed to submit reply");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isEditing && initialReply) {
    return (
      <div className="mt-4 ml-6 p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-start gap-4">
        <div className="mt-1 bg-white border border-gray-200 p-1.5 rounded-full text-gray-400">
          <CornerDownRight className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <h5 className="text-sm font-bold text-gray-900">Your Response</h5>
            <div className="flex items-center gap-3">
              {repliedAt && <span className="text-[11px] text-gray-400 font-medium">{format(new Date(repliedAt), "MMM d, yyyy")}</span>}
              <button 
                onClick={() => setIsEditing(true)}
                className="text-[11px] font-bold text-[#2FA4A9] uppercase tracking-wider flex items-center gap-1 hover:text-[#258d92]"
              >
                <Edit3 className="w-3 h-3" /> Edit
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line bg-transparent">
            {initialReply}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 ml-6 p-4 bg-[#F8FAFC] rounded-2xl border border-gray-100">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquareText className="w-4 h-4 text-[#2FA4A9]" />
        <h5 className="text-sm font-bold text-gray-900">Reply to this review</h5>
      </div>
      
      <textarea
        value={replyText}
        onChange={(e) => setReplyText(e.target.value)}
        placeholder="Thank the client for their feedback..."
        className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm min-h-[100px] resize-none focus:outline-none focus:ring-2 focus:ring-[#2FA4A9]/20 focus:border-[#2FA4A9] transition-all whitespace-pre-line"
      />
      
      {error && <p className="text-red-500 text-xs mt-2 font-medium">{error}</p>}
      
      <div className="mt-3 flex justify-end gap-2">
        {initialReply && (
          <button
            onClick={() => {
              setReplyText(initialReply);
              setIsEditing(false);
            }}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || (!replyText.trim() && !initialReply)}
          className="px-4 py-2 bg-[#2FA4A9] hover:bg-[#258d92] text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</>
          ) : (
            <><Check className="w-3.5 h-3.5" /> Post Reply</>
          )}
        </button>
      </div>
    </div>
  );
}
