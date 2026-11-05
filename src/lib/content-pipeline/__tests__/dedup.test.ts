import { describe, it, expect } from "vitest";
import {
  checkDuplicate,
  dedupKeyFor,
  dedupWithinBatch,
  jaccard,
  normalizeText,
  normalizeUrl,
  rankCandidates,
  scoreCandidate,
  tokenize,
  type Candidate,
} from "@/lib/content-pipeline/dedup";
import { tagImmigrationPaths } from "@/lib/content-pipeline/paths";

const NOW = new Date("2026-11-04T12:00:00Z");

function cand(over: Partial<Candidate> & { title: string }): Candidate {
  return {
    sourceUrl: `https://www.canada.ca/en/news/${encodeURIComponent(over.title)}.html`,
    sourceName: "IRCC",
    sourceTrust: 100,
    publishedAt: NOW,
    snippet: "",
    paths: tagImmigrationPaths(over.title),
    ...over,
  };
}

describe("normalizeText / tokenize / jaccard", () => {
  it("lowercases, strips accents and punctuation", () => {
    expect(normalizeText("Québec’s  PEQ: Changes!")).toBe("quebec s peq changes");
  });

  it("keeps non-Latin letters (Persian)", () => {
    expect(normalizeText("اکسپرس انتری!")).toBe("اکسپرس انتری");
  });

  it("drops stopwords and short words", () => {
    expect([...tokenize("Canada announces the new Express Entry draw")]).toEqual(["express", "entry", "draw"]);
  });

  it("jaccard is 1 for identical sets and 0 for disjoint/empty sets", () => {
    expect(jaccard(new Set(["a", "b"]), new Set(["a", "b"]))).toBe(1);
    expect(jaccard(new Set(["a"]), new Set(["b"]))).toBe(0);
    expect(jaccard(new Set(), new Set(["b"]))).toBe(0);
  });
});

describe("normalizeUrl / dedupKeyFor", () => {
  it("ignores protocol, www, query, hash and trailing slash", () => {
    expect(normalizeUrl("https://www.canada.ca/en/news/x.html?utm=1#top")).toBe(normalizeUrl("http://canada.ca/en/news/x.html/"));
  });

  it("keys by URL when present, else by topic slug", () => {
    expect(dedupKeyFor({ sourceUrl: "https://www.cicnews.com/a-b/", title: "x" })).toBe("url:cicnews.com/a-b");
    expect(dedupKeyFor({ sourceUrl: null, title: "Express Entry Draw #300" })).toBe("topic:express-entry-draw-300");
  });
});

describe("checkDuplicate", () => {
  const existing = [
    { title: "Express Entry draw invites 4,000 CEC candidates", slug: "express-entry-draw-invites-4000-cec-candidates", targetKeyword: "Express Entry draw" },
    { title: "Parents and Grandparents Program 2026 intake opens", slug: "pgp-2026-intake", targetKeyword: "PGP 2026" },
  ];

  it("flags an exact slug match", () => {
    const r = checkDuplicate({ title: "Express Entry Draw Invites 4000 CEC Candidates" }, existing);
    expect(r).toMatchObject({ duplicate: true, reason: "slug" });
  });

  it("flags an identical normalized title with a different slug", () => {
    const r = checkDuplicate({ title: "Parents and Grandparents Program 2026 Intake Opens!" }, existing);
    expect(r).toMatchObject({ duplicate: true, reason: "title", matchedSlug: "pgp-2026-intake" });
  });

  it("flags a reworded title above the similarity threshold", () => {
    const r = checkDuplicate({ title: "Parents & Grandparents Program intake 2026 now opens" }, existing);
    expect(r.duplicate).toBe(true);
    expect(r.reason).toBe("similar-title");
  });

  it("flags same target keyword with moderate title overlap", () => {
    const r = checkDuplicate({ title: "Latest Express Entry draw targets CEC", keyword: "express entry draw" }, existing);
    expect(r).toMatchObject({ duplicate: true, reason: "keyword" });
  });

  it("does not flag a different topic on the same program family", () => {
    const r = checkDuplicate({ title: "Ontario OINP opens new French-speaking skilled worker stream" }, existing);
    expect(r.duplicate).toBe(false);
  });

  it("does not flag when there are no existing posts", () => {
    expect(checkDuplicate({ title: "Anything" }, []).duplicate).toBe(false);
  });
});

describe("dedupWithinBatch", () => {
  it("removes same-URL and near-identical titles, keeping the first", () => {
    const a = cand({ title: "Study permit cap for 2027 announced", sourceUrl: "https://canada.ca/a" });
    const b = cand({ title: "Study permit cap 2027 announced", sourceUrl: "https://cicnews.com/b" });
    const c = cand({ title: "Study permit cap for 2027 announced", sourceUrl: "https://www.canada.ca/a/" });
    const d = cand({ title: "New refugee resettlement targets", sourceUrl: "https://canada.ca/d" });
    expect(dedupWithinBatch([a, b, c, d]).map((x) => x.sourceUrl)).toEqual(["https://canada.ca/a", "https://canada.ca/d"]);
  });
});

describe("scoreCandidate / rankCandidates", () => {
  it("scores fresh, trusted, on-topic items higher", () => {
    const fresh = cand({ title: "Express Entry draw results" });
    const old = cand({ title: "Express Entry draw results", publishedAt: new Date("2026-09-01T00:00:00Z") });
    const lowTrust = cand({ title: "Express Entry draw results", sourceTrust: 20 });
    expect(scoreCandidate(fresh, NOW)).toBeGreaterThan(scoreCandidate(old, NOW));
    expect(scoreCandidate(fresh, NOW)).toBeGreaterThan(scoreCandidate(lowTrust, NOW));
  });

  it("drops off-topic candidates with no immigration path", () => {
    const off = cand({ title: "Minister attends hockey game", paths: [] });
    expect(rankCandidates([off], NOW)).toEqual([]);
  });

  it("spreads the top picks across different immigration paths", () => {
    const ee1 = cand({ title: "Express Entry draw A", sourceTrust: 100 });
    const ee2 = cand({ title: "Express Entry draw B", sourceTrust: 99 });
    const fam = cand({ title: "Spousal sponsorship processing update", sourceTrust: 60 });
    const ranked = rankCandidates([ee1, ee2, fam], NOW);
    expect(ranked.slice(0, 2).map((c) => c.paths[0])).toEqual(["express_entry", "family"]);
    expect(ranked).toHaveLength(3);
  });
});

describe("tagImmigrationPaths", () => {
  it("covers the main immigration paths", () => {
    expect(tagImmigrationPaths("New CRS cutoff in latest Express Entry ITA round")).toContain("express_entry");
    expect(tagImmigrationPaths("BC PNP tech draw")).toContain("pnp");
    expect(tagImmigrationPaths("Changes to the study permit cap and PAL letters")).toContain("study");
    expect(tagImmigrationPaths("Open work permit for spouses of PGWP holders")).toEqual(expect.arrayContaining(["family", "work"]));
    expect(tagImmigrationPaths("Asylum claim processing")).toContain("refugee");
    expect(tagImmigrationPaths("Citizenship test goes online")).toContain("citizenship");
    expect(tagImmigrationPaths("Québec PEQ suspended")).toContain("quebec");
  });

  it("only falls back to 'general' when nothing specific matches", () => {
    expect(tagImmigrationPaths("Immigration levels plan 2027-2029")).toEqual(["general"]);
    expect(tagImmigrationPaths("Express Entry and immigration")[0]).toBe("express_entry");
  });

  it("matches acronyms case-sensitively (ITA, PAL, eTA)", () => {
    expect(tagImmigrationPaths("italian food festival")).not.toContain("express_entry");
    expect(tagImmigrationPaths("my pal and I")).not.toContain("study");
  });
});
