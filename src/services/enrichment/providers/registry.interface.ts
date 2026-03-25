export interface RegistryCandidate {
  legalName: string;
  jurisdiction: string;
  registrySource: string;
  registryNumber?: string;
  businessNumber?: string;
  incorporationDate?: Date;
  registeredAddress?: string;
  status?: string;
  sourceUrl?: string;
  rawPayload?: any;
}

export interface CompanyRegistryProvider {
  /**
   * Identifies the primary source (e.g. 'mras', 'federal_api')
   */
  sourceName: string;

  /**
   * Search for potential candidate matches by company name.
   */
  searchByName(input: {
    companyName: string;
    province?: string;
    city?: string;
  }): Promise<RegistryCandidate[]>;

  /**
   * Fetch detailed public information for a given candidate matched by this provider.
   */
  getDetails(input: {
    jurisdiction: string;
    registryNumber?: string;
    businessNumber?: string;
    sourceUrl?: string;
  }): Promise<RegistryCandidate | null>;
}
