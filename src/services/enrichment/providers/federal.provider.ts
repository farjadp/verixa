import { CompanyRegistryProvider, RegistryCandidate } from "./registry.interface";

export class FederalCorporationProvider implements CompanyRegistryProvider {
  sourceName = "federal_api";

  async searchByName(input: { companyName: string }): Promise<RegistryCandidate[]> {
    console.log(`[Federal Mock] Searching for "${input.companyName}" in ISED Federal API...`);
    
    await new Promise((resolve) => setTimeout(resolve, 600));

    // 50% chance we find something
    if (Math.random() > 0.5) {
      return [{
        legalName: input.companyName.toUpperCase() + " LTD.",
        jurisdiction: "Federal",
        registrySource: this.sourceName,
        registryNumber: Math.floor(Math.random() * 9000000) + 1000000 + "",
        status: "Active",
      }];
    }

    return [];
  }

  async getDetails(input: {
    jurisdiction?: string;
    registryNumber?: string;
    businessNumber?: string;
    sourceUrl?: string;
    legalName?: string;
  }): Promise<RegistryCandidate | null> {
    await new Promise((resolve) => setTimeout(resolve, 400));
    
    if (!input.registryNumber) return null;

    return {
      legalName: input.legalName || "Unknown Federal Entity LTD.",
      jurisdiction: "Federal",
      registrySource: this.sourceName,
      registryNumber: input.registryNumber,
      businessNumber: "123456789RC0001",
      status: "Active",
      registeredAddress: "456 Federal Way, Ottawa, ON",
      incorporationDate: new Date("2015-06-12"),
      sourceUrl: `https://api.ised-isde.canada.ca/en/docs?api=corporations&id=${input.registryNumber}`
    };
  }
}
