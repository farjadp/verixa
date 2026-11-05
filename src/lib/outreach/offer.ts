export interface FoundingOffer {
  planName: string;
  freeMonths: number;
  priceAfterCents: number;
  currency: string;
  remainingSlots: number | null;
  deadline: Date | null;
}

/**
 * The live founding offer, managed by the founder in the admin.
 * Returns null while no offer source exists. Per the spec, touch 3 is then skipped
 * and the sequence ends after touch 2. Task 18 wires this to getActiveFoundingOffer()
 * once the admin plans/offers branch is merged.
 */
export async function getFoundingOfferForOutreach(): Promise<FoundingOffer | null> {
  return null;
}
