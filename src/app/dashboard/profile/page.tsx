// ============================================================================
// Hardware Source: src/app/dashboard/profile/page.tsx
// Route: /dashboard/profile
// Version: 1.0.0 — 2026-04-08
// Why: Authenticated consultant/dashboard route for profile management, booking operations, and workspace workflows.
// Domain: Authenticated Dashboard
// Env / Identity: React Server Component
// Owner: Verixa Web
// Notes: Assumes authenticated session context; unauthorized users must be redirected before data access.
// ============================================================================
import { getMyConsultantProfile } from "@/actions/consultant.actions";
import ProfileForm from "./ProfileForm";

export default async function ProfileManagementPage() {
  let initialData = null;
  
  try {
    initialData = await getMyConsultantProfile();
  } catch (err: any) {
    return (
      <main className="p-8 max-w-4xl mx-auto">
        <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-200">
          <h2 className="font-bold text-lg">Access Denied</h2>
          <p className="mt-2 text-sm">{err.message}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-serif text-[#1A1F2B]">Profile Management</h1>
        <p className="text-gray-500 text-sm mt-1">Manage exactly how clients see you on the Verixa directory.</p>
      </div>

      <ProfileForm 
        profile={initialData.profile} 
        unlimitedMessengers={initialData.canHaveUnlimitedMessengers} 
        unlimitedSpecializations={initialData.canHaveUnlimitedSpecializations}
        bioFeature={initialData.bioFeature}
      />
    </main>
  );
}
