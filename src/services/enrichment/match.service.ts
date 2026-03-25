import { RegistryCandidate } from "./providers/registry.interface";

export class CompanyMatchService {
  normalizeName(name: string): string {
    let normalized = name.toUpperCase();
    
    // Strip suffixes
    const suffixes = [" INC.", " INC", " LTD.", " LTD", " CORP.", " CORP", " CORPORATION"];
    for (const suffix of suffixes) {
      if (normalized.endsWith(suffix)) {
        normalized = normalized.slice(0, -suffix.length);
      }
    }
    
    // Remove punctuation
    normalized = normalized.replace(/[.,-]/g, " ");
    
    // Trim extra spaces
    normalized = normalized.replace(/\s+/g, " ").trim();
    
    return normalized;
  }

  scoreCandidate(input: {
    consultantProvince?: string;
    consultantCity?: string;
    normalizedInputName: string;
    candidate: RegistryCandidate;
  }): number {
    let score = 0;
    
    const normalizedCandidateName = this.normalizeName(input.candidate.legalName);
    
    // 1. Name Match
    if (normalizedCandidateName === input.normalizedInputName) {
      score += 50;
    } else if (
      normalizedCandidateName.includes(input.normalizedInputName) || 
      input.normalizedInputName.includes(normalizedCandidateName)
    ) {
      // Fuzzy inclusion check
      score += 30;
    }
    
    // 2. Province Match
    const candidateProv = input.candidate.jurisdiction.toLowerCase();
    const inputProv = input.consultantProvince?.toLowerCase() || "";
    if (inputProv && (candidateProv.includes(inputProv) || inputProv.includes(candidateProv))) {
      score += 10;
    } else if (input.candidate.jurisdiction.toLowerCase() === "federal") {
      // Federal gets a small implicit bump because it covers all provinces
      score += 5;
    }

    // 3. Status
    if (input.candidate.status?.toLowerCase() === "active") {
      score += 5;
    }
    
    return score;
  }

  chooseBestCandidate(input: {
    normalizedInputName: string;
    consultantProvince?: string;
    candidates: RegistryCandidate[];
  }): { bestMatch: RegistryCandidate | null; confidenceScore: number; isAmbiguous: boolean } {
    if (input.candidates.length === 0) {
      return { bestMatch: null, confidenceScore: 0, isAmbiguous: false };
    }

    const scored = input.candidates.map(candidate => {
      const score = this.scoreCandidate({
        consultantProvince: input.consultantProvince,
        normalizedInputName: input.normalizedInputName,
        candidate
      });
      return { candidate, score };
    });

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    const best = scored[0];
    
    // Define Confidence thresholds based on the plan
    // >= 85 Strong
    // 70-84 Probable
    // 50-69 Weak/Ambiguous
    // < 50 Reject
    
    const isAmbiguous = best.score < 70 && best.score >= 50;

    return {
      bestMatch: best.score >= 50 ? best.candidate : null,
      confidenceScore: best.score,
      isAmbiguous,
    };
  }
}
