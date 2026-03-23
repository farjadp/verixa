"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCircle2, Circle, AlertCircle, ArrowRight, Video } from "lucide-react";
import { markNotificationAsRead, markAllNotificationsAsRead } from "@/actions/notification.actions";
import { Notification } from "@prisma/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ClientNotificationList({ initialNotifications, userRole }: { initialNotifications: Notification[], userRole: string }) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const router = useRouter();

  const handleMarkAsRead = async (id: string, relatedEntityId: string | null) => {
    // Optimistic UI
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    await markNotificationAsRead(id);
    
    if (relatedEntityId) {
       const basePath = userRole === "CONSULTANT" ? "/dashboard/consultant/bookings" : "/dashboard/client/bookings";
       router.push(`${basePath}/${relatedEntityId}`);
    }
  };

  const handleMarkAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    await markAllNotificationsAsRead();
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="bg-white border border-[#f5ecd8] rounded-3xl overflow-hidden shadow-sm">
      <div className="p-6 border-b border-[#f5ecd8] flex items-center justify-between">
        <h2 className="text-xl font-bold font-serif text-[#1A1A1A] flex items-center gap-2">
           <Bell className="w-5 h-5 text-[#C29967]" />
           Notifications
           {unreadCount > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full ml-1">{unreadCount}</span>}
        </h2>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllAsRead} className="text-sm font-bold text-[#C29967] hover:text-[#a07a4f]">
            Mark all as read
          </button>
        )}
      </div>

      <div className="divide-y divide-[#f5ecd8]">
        {notifications.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
             <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
             <p className="font-bold text-[#1A1A1A] text-lg">You're all caught up!</p>
             <p className="text-sm mt-1">No new notifications at this time.</p>
          </div>
        ) : (
          notifications.map(n => (
            <div 
              key={n.id} 
              onClick={() => handleMarkAsRead(n.id, n.relatedEntityId)}
              className={`p-6 flex items-start gap-4 transition-colors cursor-pointer ${n.isRead ? "bg-white hover:bg-gray-50" : "bg-[#FDFCFB] hover:bg-[#F6F3F0]"}`}
            >
              <div className="mt-1">
                 {!n.isRead ? (
                   <div className="w-10 h-10 rounded-full bg-[#C29967]/10 text-[#C29967] flex items-center justify-center">
                     <AlertCircle className="w-5 h-5" />
                   </div>
                 ) : (
                   <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center">
                     <CheckCircle2 className="w-5 h-5" />
                   </div>
                 )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className={`font-bold text-sm ${n.isRead ? 'text-gray-700' : 'text-[#1A1A1A]'}`}>
                    {n.title}
                  </h3>
                  <span className="text-xs text-gray-400 font-medium whitespace-nowrap ml-4">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className={`text-sm ${n.isRead ? 'text-gray-500' : 'text-gray-700'}`}>
                  {n.message}
                </p>
                {n.relatedEntityId && (
                  <div className="mt-3 flex items-center gap-1 text-xs font-bold text-[#C29967] uppercase tracking-wider">
                    View Associated Booking <ArrowRight className="w-3 h-3" />
                  </div>
                )}
              </div>
              {!n.isRead && <div className="w-2 h-2 rounded-full bg-red-500 mt-2 shrink-0" />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
