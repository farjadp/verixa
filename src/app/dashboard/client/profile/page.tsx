import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ClientProfileForm from "./ClientProfileForm";

export default async function ClientProfilePage() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      clientProfile: true
    }
  });

  if (!user) redirect("/login");

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold text-[#1A1A1A]">Immigration Profile</h1>
        <p className="text-gray-500 mt-2">
          Your immigration resume. Providing this information helps us recommend the best consultants for your specific case and saves time during your actual consultation sessions.
        </p>
      </div>

      <div className="bg-white rounded-[32px] border border-[#f5ecd8] p-8 shadow-sm">
         <ClientProfileForm initialData={user.clientProfile} />
      </div>
    </div>
  );
}
