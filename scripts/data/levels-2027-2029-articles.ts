// Source articles for the 2027-2029 Levels Plan + Budget 2026 series.
// Facts come from: IRCC levels page, IRCC supplementary levels 2027-2029 page,
// Budget 2026 chapter 3 (section 3.4). Seeded by scripts/seed-scheduled-articles.ts.

export interface SeriesArticle {
  slug: string;
  title: string;
  summary: string;
  category: "UPDATES_POLICY" | "IMMIGRATION_GUIDES";
  targetKeyword: string;
  seoTitle: string;
  seoDesc: string;
  /** ISO UTC. The first article goes live at seed time; the rest are published by the scheduled-publish cron. */
  publishAt: string | "NOW";
  tier: "major" | "minor";
  content: string;
}

const SRC = `
## Sources

- [IRCC: Immigration levels plan](https://www.canada.ca/en/immigration-refugees-citizenship/corporate/immigration-system/levels.html)
- [IRCC: Supplementary information, 2027-2029 Immigration Levels Plan](https://www.canada.ca/en/immigration-refugees-citizenship/corporate/immigration-system/levels/supplementary-immigration-levels-2027-2029.html)
- [Budget 2026, Chapter 3: A more affordable life](https://budget.canada.ca/2026/report-rapport/chap3-en.html)

*Prepared by Verixa from official Government of Canada publications. This article is general information, not legal advice. Confirm details on the official IRCC site and speak with a licensed immigration consultant (RCIC) or lawyer about your situation.*
`;

export const ARTICLES: SeriesArticle[] = [
  {
    slug: "canada-2027-2029-immigration-levels-plan-explained",
    title: "Canada's 2027–2029 Immigration Levels Plan: Every Target, Explained",
    summary:
      "Canada holds permanent resident admissions at 380,000 a year and new temporary arrivals at 370,000 through 2029. Here is the full category breakdown and what it means for applicants.",
    category: "UPDATES_POLICY",
    targetKeyword: "Canada immigration levels plan 2027-2029",
    seoTitle: "Canada Immigration Levels Plan 2027–2029: All Targets",
    seoDesc:
      "380,000 PR admissions and 370,000 temporary arrivals a year through 2029. See the economic, family and refugee targets and what they mean for you.",
    publishAt: "NOW",
    tier: "major",
    content: `Canada's 2027–2029 Immigration Levels Plan keeps the overall numbers steady: **380,000 permanent resident admissions** and **370,000 new temporary resident arrivals** in each of 2027, 2028 and 2029. The government says stable levels give predictability, ease pressure on housing and services, and keep the temporary population down.

## The headline numbers

| | 2027 | 2028 | 2029 |
|---|---|---|---|
| Permanent residents | 380,000 | 380,000 | 380,000 |
| New temporary arrivals | 370,000 | 370,000 | 370,000 |
| of which workers | 220,000 | 220,000 | 220,000 |
| of which students | 150,000 | 150,000 | 150,000 |

The permanent resident range is 352,500 to 422,000. The temporary range is 355,000 to 385,000. Targets for 2028 and 2029 are notional: IRCC confirms or adjusts them each year.

## Permanent residents by category

| Category | Target per year | Share |
|---|---|---|
| Economic | 244,700 | 64.4% |
| Family | 81,000 | 21.3% |
| Refugees and protected persons | 49,300 | about 13% |
| Humanitarian, compassionate and other | 5,000 | about 1.3% |

Economic immigration is the clear priority. Within it, the Federal High Skilled programs (which include Express Entry) are set at 100,000 and the Provincial Nominee Program at 95,000 each year. Priority sectors named by the government include education, healthcare, construction, AI and digital innovation, defence, energy and critical minerals.

## Francophone immigration outside Quebec

The share of French-speaking admissions outside Quebec rises each year: 9.5% in 2027 (31,825), 10.5% in 2028 (35,175) and 12% in 2029 (40,200).

## What this means in practice

- **Competition stays high.** Flat targets mean no extra room. Candidates compete for the same 100,000 federal high-skilled and 95,000 provincial spots every year.
- **Economic and in-demand profiles lead.** With roughly two of every three admissions economic, labour-market fit matters more than ever.
- **French is an advantage.** A rising Francophone target outside Quebec favours candidates with French ability.
- **Quebec is separate.** Quebec sets its own levels. Its plan is due in fall 2026, and the Quebec Skilled Workers and Business target is listed as to be determined.

## What to do now

Check which category and program you fit, confirm your eligibility on the official IRCC pages, and watch for the Annual Report to Parliament and each year's confirmed targets.
${SRC}`,
  },
  {
    slug: "budget-2026-immigration-measures-200000-pathway",
    title: "Budget 2026 Immigration Measures: The 200,000-Person Pathway and What It Costs",
    summary:
      "Budget 2026 funds the new levels plan, a one-time pathway for up to 200,000 temporary residents to become permanent residents, and Temporary Foreign Worker Program reform.",
    category: "UPDATES_POLICY",
    targetKeyword: "Budget 2026 Canada immigration",
    seoTitle: "Budget 2026 Immigration: 200,000 PR Pathway Explained",
    seoDesc:
      "Up to 200,000 temporary residents could become permanent residents by end of 2027. Funding, TFWP reform and what is still unclear.",
    publishAt: "2026-11-06T07:00:00.000Z",
    tier: "major",
    content: `Budget 2026 puts money behind the 2027–2029 Immigration Levels Plan and adds a one-time pathway for people already in Canada. The immigration measures sit in Chapter 3, section 3.4 ("Growing our skilled workforce to build Canada Strong").

## The money

| Measure | Funding |
|---|---|
| Implement the 2027–2029 Levels Plan (IRCC) | $56.9 million over four years from 2027-28, plus $205.4 million in future years |
| Transition long-standing temporary residents to permanent residence | $302.3 million over four years from 2027-28, plus $90.6 million in future years |
| Reform the Temporary Foreign Worker Program (ESDC) | $151.5 million over five years from 2026-27 |

Further items in the annex include $98 million gross for asylum processing (2026-27 to 2030-31), $90 million gross for enhanced biometrics collection in immigration screening, and $82 million for the Migrant Worker Support Program.

## The 200,000-person pathway

Up to **200,000 long-standing temporary residents could become permanent residents by the end of 2027**. The budget specifies that this includes **100,000 workers who are eligible for Express Entry or a Provincial Nominee Program**.

What the budget does not yet tell us: the eligibility criteria and selection method for the rest, and how these admissions count against the 380,000 annual target. Watch IRCC announcements and the Annual Report to Parliament for those details. Until then, treat any "am I eligible" claim you read as unconfirmed.

## Why the government says it is acting

The budget points to sharp falls in new arrivals between January and August 2026 compared with the same period in 2024: new international student arrivals down 71% (to 156,440), new worker arrivals down 57% (to 170,455), and new asylum claims down 68%.

Chart 3.1 in the budget shows the longer picture:

| | 2023 | 2024 | 2027–2029 target |
|---|---|---|---|
| New temporary resident arrivals | 971,815 | 686,010 | 370,000 per year |
| Permanent resident admissions | 471,820 | 483,655 | 380,000 per year |

## Temporary Foreign Worker Program reform

The $151.5 million aims to align the program with regional labour needs, improve processing times and strengthen employer compliance. Employers should expect closer compliance attention.

## What to do now

If you are a temporary resident, keep your status valid and your records organized (work history, language results, education assessments). Do not rely on the pathway until IRCC publishes criteria. Speak with a licensed consultant or lawyer about your options.
${SRC}`,
  },
  {
    slug: "express-entry-pnp-2027-2029-economic-immigration-targets",
    title: "Express Entry and Provincial Nominee Targets for 2027–2029: Where the Economic Spots Are",
    summary:
      "Of 244,700 economic admissions a year, Federal High Skilled gets 100,000 and the PNP 95,000. Here is the program-by-program split and how to read it.",
    category: "IMMIGRATION_GUIDES",
    targetKeyword: "Express Entry PNP targets 2027-2029",
    seoTitle: "Express Entry & PNP Targets 2027–2029 by Program",
    seoDesc:
      "Federal High Skilled 100,000, PNP 95,000, plus Atlantic, rural and pilot targets for 2027–2029. See the full economic table.",
    publishAt: "2026-11-06T19:00:00.000Z",
    tier: "major",
    content: `Economic immigration is 64.4% of Canada's plan: **244,700 permanent resident admissions each year** from 2027 to 2029. Here is how those spots are itemized.

## Economic targets by program

| Program | 2027 | 2028 | 2029 |
|---|---|---|---|
| Federal High Skilled (includes Express Entry) | 100,000 | 100,000 | 100,000 |
| Provincial Nominee Program | 95,000 | 95,000 | 95,000 |
| Federal Economic Pilots | 7,900 | 6,175 | 7,400 |
| Atlantic Immigration Program | 6,000 | 6,000 | 6,000 |
| Rural Community Immigration Program | 5,500 | 6,000 | 6,500 |
| Federal Business | 1,500 | 2,725 | 1,000 |
| Quebec Skilled Workers and Business | to be determined | to be determined | to be determined |

The itemized programs add up to 215,900 each year. The remaining 28,800 of the 244,700 is not itemized in the published table, and Quebec's share is still to be determined.

## How to read it

- **Express Entry and the PNP carry the load.** Together they are 195,000 of 244,700 spots, about 80% of the economic class.
- **Flat, not growing.** The PNP stays at 95,000 even though the plan describes provincial programs as increasing modestly compared with earlier years. Check the official table for your province rather than assuming growth.
- **Smaller streams move.** Rural Community Immigration climbs from 5,500 to 6,500. Federal Business swings between 1,500, 2,725 and 1,000.
- **Ranges matter.** Federal High Skilled has a range of 87,000 to 123,000, and the PNP 83,000 to 106,000, so actual admissions can differ from the target.

## What the government says it is prioritizing

Express Entry has been made more targeted to labour-market needs. Priority sectors include education, healthcare, construction, AI and digital innovation, defence, energy and critical minerals. The levels page also says admissions will increase under the Provincial Nominee Program and the Atlantic Immigration Program relative to earlier plans.

## What to do now

1. Confirm which stream you actually qualify for on the IRCC or provincial site.
2. Check whether your occupation matches an in-demand category.
3. Build language scores, including French if possible, since Francophone targets are rising.
4. Keep documents current. Draws can move quickly.
${SRC}`,
  },
  {
    slug: "study-permits-150000-students-2027-2029",
    title: "Study Permits in the 2027–2029 Plan: 150,000 New Students a Year",
    summary: "New international student arrivals are set at 150,000 a year through 2029, about 40% of all new temporary arrivals.",
    category: "UPDATES_POLICY",
    targetKeyword: "Canada international student cap 2027",
    seoTitle: "Canada 2027–2029 Student Target: 150,000 a Year",
    seoDesc: "International student arrivals are set at 150,000 a year through 2029. What is counted, what is not, and what applicants should do.",
    publishAt: "2026-11-09T13:00:00.000Z",
    tier: "minor",
    content: `The 2027–2029 Levels Plan sets **150,000 new international student arrivals each year**. Students make up about 40% of the 370,000 new temporary arrivals; workers are about 60%.

## What the target covers

It counts new arrivals. IRCC lists several groups with no targets: visitors, permit extensions, in-Canada study and work applications, and asylum claimants. That means people already studying in Canada who extend or switch are not counted against the 150,000.

## Context from Budget 2026

Between January and August 2026, new international student arrivals were down 71% compared with the same period in 2024, to 156,440. The 150,000 target is roughly in line with that lower level.

## What students should do

- Apply early and make sure your acceptance and financial proof are complete.
- If you are already in Canada, track permit expiry dates closely.
- Remember that 2028 and 2029 targets are notional and may be adjusted.
${SRC}`,
  },
  {
    slug: "temporary-foreign-workers-vs-international-mobility-program-2027-2029",
    title: "Work Permits in the 2027–2029 Plan: IMP 170,000 vs TFWP 50,000",
    summary: "Of 220,000 new worker arrivals a year, 170,000 are under the International Mobility Program and 50,000 under the Temporary Foreign Worker Program.",
    category: "IMMIGRATION_GUIDES",
    targetKeyword: "International Mobility Program vs Temporary Foreign Worker Program",
    seoTitle: "IMP vs TFWP 2027–2029: Work Permit Targets Explained",
    seoDesc: "220,000 new workers a year: 170,000 IMP and 50,000 TFWP. How the two programs differ and what Budget 2026 changes.",
    publishAt: "2026-11-15T13:00:00.000Z",
    tier: "minor",
    content: `The plan sets **220,000 new temporary worker arrivals a year**, split between two programs.

| Program | Annual target |
|---|---|
| International Mobility Program (IMP) | 170,000 |
| Temporary Foreign Worker Program (TFWP) | 50,000 |

## The difference

The TFWP generally requires an employer to obtain a Labour Market Impact Assessment, handled with Employment and Social Development Canada. The IMP covers work permits that are exempt from that requirement for reasons such as reciprocity, benefit to Canada or international agreements.

## What is excluded

IMP targets exclude seasonal or short-duration streams, and TFWP targets exclude seasonal workers who stay under one year.

## Budget 2026 changes

The budget gives $151.5 million over five years from 2026-27 to reform the TFWP: better alignment with regional labour needs, faster processing and stronger employer compliance. New worker arrivals from January to August 2026 were down 57% from the same period in 2024.

## What to do

Employers should audit compliance records now. Workers should confirm which program their permit falls under before planning a move to permanent residence.
${SRC}`,
  },
  {
    slug: "family-class-sponsorship-targets-2027-2029",
    title: "Family Sponsorship in the 2027–2029 Plan: 66,000 Spouses and 15,000 Parents",
    summary: "Family class admissions are 81,000 a year: 66,000 for spouses, partners and children and 15,000 for parents and grandparents.",
    category: "IMMIGRATION_GUIDES",
    targetKeyword: "Canada family sponsorship targets 2027",
    seoTitle: "Canada Family Sponsorship Targets 2027–2029",
    seoDesc: "81,000 family class spots a year: spouses, partners and children 66,000; parents and grandparents 15,000.",
    publishAt: "2026-11-21T13:00:00.000Z",
    tier: "minor",
    content: `Family reunification makes up about 21.3% of permanent resident admissions.

| Category | Target (range) |
|---|---|
| Spouses, Partners and Children | 66,000 (61,000–75,000) |
| Parents and Grandparents | 15,000 (12,000–18,000) |
| **Total family** | **81,000 (76,000–89,000)** |

The targets are identical in 2027, 2028 and 2029.

## Takeaways

- Spousal sponsorship holds steady and remains the largest family stream.
- The Parents and Grandparents target of 15,000 is small relative to demand, so intake rules and invitation processes matter more than the plan figure.
- Quebec runs its own selection for its sponsors and levels.

Check current intake and eligibility on IRCC before relying on the plan numbers.
${SRC}`,
  },
  {
    slug: "francophone-immigration-outside-quebec-targets-2027-2029",
    title: "Francophone Immigration Outside Quebec: 9.5% to 12% by 2029",
    summary: "Targets rise from 31,825 in 2027 to 40,200 in 2029. What the French-speaking share means for applicants.",
    category: "UPDATES_POLICY",
    targetKeyword: "Francophone immigration outside Quebec 2029",
    seoTitle: "Francophone Immigration Targets Outside Quebec 2027–2029",
    seoDesc: "9.5% in 2027, 10.5% in 2028, 12% in 2029. See the numbers and why French skills matter.",
    publishAt: "2026-11-27T13:00:00.000Z",
    tier: "minor",
    content: `The plan raises the share of French-speaking permanent resident admissions outside Quebec every year.

| Year | Share | Admissions |
|---|---|---|
| 2027 | 9.5% | 31,825 |
| 2028 | 10.5% | 35,175 |
| 2029 | 12% | 40,200 |

## Why it matters

A growing target creates more room for candidates who can demonstrate French ability, and gives French-speaking candidates an additional lever alongside their economic profile. The government also lists Express Entry changes aimed at labour-market needs.

## What to do

Take an approved French test, keep results valid, and ask a licensed advisor how French points apply to your program. The 2028 and 2029 figures remain notional.
${SRC}`,
  },
  {
    slug: "refugees-protected-persons-targets-2027-2029",
    title: "Refugees and Protected Persons in the 2027–2029 Plan: 49,300 a Year",
    summary: "Canada plans 49,300 refugee and protected-person admissions a year, plus a one-time transition for up to 115,000 protected persons in 2026 and 2027.",
    category: "UPDATES_POLICY",
    targetKeyword: "Canada refugee targets 2027-2029",
    seoTitle: "Canada Refugee & Protected Persons Targets 2027–2029",
    seoDesc: "49,300 a year: protected persons, government-assisted and privately sponsored refugees, plus Budget 2025 one-time initiatives.",
    publishAt: "2026-12-03T13:00:00.000Z",
    tier: "minor",
    content: `Refugees and protected persons are about 13% of admissions.

| Program | Annual target |
|---|---|
| Protected persons in Canada and dependants abroad | 20,000 |
| Government-assisted refugees | 11,750 |
| Privately sponsored refugees | 17,550 |
| **Total** | **49,300** |

Humanitarian, compassionate and other admissions add 5,000 a year.

## One-time initiatives

IRCC notes Budget 2025 one-time initiatives running through 2026 and 2027: up to 115,000 protected persons in Canada and their in-Canada dependants, and 33,000 work permit holders, may transition to permanent residence. These sit alongside the annual targets.

## Related funding

Budget 2026 lists $98 million gross for asylum processing over 2026-27 to 2030-31. New asylum claims were down 68% from January to August 2026 compared with 2024.
${SRC}`,
  },
  {
    slug: "atlantic-rural-immigration-programs-2027-2029",
    title: "Atlantic and Rural Immigration Programs: What the 2027–2029 Targets Say",
    summary: "The Atlantic Immigration Program holds at 6,000 a year and the Rural Community Immigration Program grows from 5,500 to 6,500.",
    category: "IMMIGRATION_GUIDES",
    targetKeyword: "Atlantic Immigration Program Rural Community Immigration targets",
    seoTitle: "Atlantic & Rural Immigration Targets 2027–2029",
    seoDesc: "AIP 6,000 a year; RCIP 5,500, 6,000, 6,500. Community-driven routes to permanent residence compared.",
    publishAt: "2026-12-10T13:00:00.000Z",
    tier: "minor",
    content: `Two employer- and community-driven programs offer routes outside the big Express Entry pool.

| Program | 2027 | 2028 | 2029 |
|---|---|---|---|
| Atlantic Immigration Program | 6,000 | 6,000 | 6,000 |
| Rural Community Immigration Program | 5,500 | 6,000 | 6,500 |

## Reading the numbers

- AIP ranges are 5,000 to 8,500 in 2027 and 5,000 to 7,000 in later years.
- RCIP rises each year, a steady expansion of rural intake.
- Both are small next to the 95,000 PNP target, so spots are limited and tied to designated employers or communities.

## What to do

Look at the designated employers and participating communities, and confirm your job offer and settlement plan match program rules.
${SRC}`,
  },
  {
    slug: "time-limited-2027-pr-measure-who-may-benefit",
    title: "The Time-Limited 2027 PR Measure: Who It Targets and What Is Still Unknown",
    summary: "IRCC describes a time-limited 2027 measure with two cohorts: in-Canada workers and their families, and people who have waited many years in the humanitarian cohort.",
    category: "UPDATES_POLICY",
    targetKeyword: "Canada time-limited PR measure 2027",
    seoTitle: "Canada's Time-Limited 2027 PR Measure Explained",
    seoDesc: "Two cohorts, a 200,000-person ceiling in Budget 2026, and unanswered eligibility questions. What is known and what is not.",
    publishAt: "2026-12-18T13:00:00.000Z",
    tier: "minor",
    content: `IRCC's supplementary information describes a time-limited permanent residence measure that applies in 2027, with two cohorts: in-Canada workers and their family members, and individuals in Canada who have waited many years under the humanitarian cohort.

## Link to Budget 2026

Budget 2026 funds a pathway for up to 200,000 long-standing temporary residents to become permanent residents by the end of 2027, including 100,000 workers eligible for Express Entry or a PNP. The two descriptions appear related, but the published sources do not spell out how each applies.

## What is unknown

- Eligibility criteria for the remaining cohorts
- Selection and application process
- Whether admissions count toward the 380,000 target

## What to do

Maintain valid status, keep records of work, language and education, and wait for IRCC to publish rules. Avoid anyone selling guaranteed spots.
${SRC}`,
  },
  {
    slug: "levels-plan-2027-2029-what-is-confirmed-what-to-watch",
    title: "Levels Plan 2027–2029: What Is Confirmed, What Is Notional, and What to Watch",
    summary: "A checklist of confirmed numbers, notional years, pending details and key dates to track as the plan rolls out.",
    category: "IMMIGRATION_GUIDES",
    targetKeyword: "Canada immigration levels plan what to watch",
    seoTitle: "Levels Plan 2027–2029: What to Watch Next",
    seoDesc: "Confirmed vs notional targets, Quebec's plan, the Annual Report to Parliament and the 2027 measures.",
    publishAt: "2026-12-25T13:00:00.000Z",
    tier: "minor",
    content: `A quick reference for planning around the 2027–2029 plan.

## Confirmed

- 380,000 permanent resident admissions and 370,000 new temporary arrivals in 2027
- Budget 2026 funding for the plan, the one-time pathway and TFWP reform

## Notional

- Permanent resident targets for 2028 and 2029 are confirmed or adjusted each year.
- Temporary resident targets for 2028 and 2029 are confirmed or adjusted by November 1 of the preceding year.

## Pending

- Quebec's own levels plan, due in fall 2026
- Eligibility and selection rules for the 200,000-person pathway
- Quebec Skilled Workers and Business targets

## Watch list

1. IRCC news releases and Express Entry draws
2. The Annual Report to Parliament on Immigration
3. Provincial nominee program updates
4. Any change to the notional 2028 and 2029 figures

Plan around confirmed figures and revisit your strategy when each update lands.
${SRC}`,
  },
];
