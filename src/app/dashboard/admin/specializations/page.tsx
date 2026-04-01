import { getSpecializations, getSpecializationPlanLimits } from "@/actions/specializations.actions";
import SpecializationsClient from "./SpecializationsClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Immigration Specializations | Admin | Verixa",
};

export default async function SpecializationsAdminPage() {
  const [categories, planLimits] = await Promise.all([
    getSpecializations(),
    getSpecializationPlanLimits(),
  ]);

  return <SpecializationsClient initialCategories={categories} planLimits={planLimits} />;
}
