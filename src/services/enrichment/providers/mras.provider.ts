import { CompanyRegistryProvider, RegistryCandidate } from "./registry.interface";

export class MrasSearchProvider implements CompanyRegistryProvider {
  sourceName = "mras";

  async searchByName(input: {
    companyName: string;
    province?: string;
    city?: string;
  }): Promise<RegistryCandidate[]> {
    // Mocking an ISED MRAS search.
    // In production, this would make an outbound HTTP request to the CBR-REC registry.
    console.log(`[MRAS Mock] Searching for "${input.companyName}" in MRAS...`);

    const fallbackCandidate: RegistryCandidate = {
      legalName: input.companyName.toUpperCase() + " INC.",
      jurisdiction: input.province || "Ontario",
      registrySource: this.sourceName,
      registryNumber: "MRAS-" + Math.floor(Math.random() * 90000) + 10000,
      status: "Active",
      sourceUrl: "https://ised-isde.canada.ca/cbr-rec/mock-page",
    };

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    // 80% chance we find something
    if (Math.random() > 0.2) {
      return [fallbackCandidate];
    }

    return [];
  }

  async getDetails(input: {
    jurisdiction: string;
    registryNumber?: string;
    businessNumber?: string;
    sourceUrl?: string;
    legalName?: string;
  }): Promise<RegistryCandidate | null> {
    console.log(`[MRAS Mock] Fetching details for registryNumber: ${input.registryNumber}`);
    
    await new Promise((resolve) => setTimeout(resolve, 600));

    if (!input.registryNumber) return null;

    return {
      legalName: input.legalName || "Unknown Corporate Entity INC.",
      jurisdiction: input.jurisdiction,
      registrySource: this.sourceName,
      registryNumber: input.registryNumber,
      status: "Active",
      registeredAddress: "123 Mockingbird Lane, Toronto, ON",
      incorporationDate: new Date("2020-01-01")
    };
  }
}
