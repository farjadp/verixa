import { redirect } from "next/navigation";

// The old setup page was static (fixed "35%" progress, "Identity & Registry
// Verified" for everyone, a hardcoded date). The dashboard home now has a
// real setup checklist.
export default function SetupPage() {
  redirect("/dashboard");
}
