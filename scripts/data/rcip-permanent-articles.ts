// Rural Community Immigration Program (RCIP becomes permanent) article series.
// Facts come from: IRCC news release and backgrounder (2026-11-09), IRCC program
// pages (modified 2026-11-09), Canada Gazette Part II SOR/2026-217 (published
// 2026-11-04), and MLT Aikins' summary of the 2027-2029 Levels Plan (2026-11-10).
// Seeded by: npx tsx scripts/seed-scheduled-articles.ts --series rcip [--apply]
import type { SeriesArticle } from "./levels-2027-2029-articles";

const SRC = `
## Sources

- [IRCC news release: Canada creates a permanent immigration pathway to help rural communities attract and retain talent (Nov 9, 2026)](https://www.canada.ca/en/immigration-refugees-citizenship/news/2026/11/canada-creates-a-permanent-immigration-pathway-to-help-rural-communities-attract-and-retain-talent0.html)
- [IRCC backgrounder: Overview of the Rural Community Immigration Program](https://www.canada.ca/en/immigration-refugees-citizenship/news/2026/11/overview-of-the-rural-community-immigration-program.html)
- [IRCC: Rural Community Immigration Program](https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-franco-pilots/rural-immigration-program.html)
- [IRCC: Rural Community Immigration Pilot, job offer and community recommendation](https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-franco-pilots/rural-immigration/job-offer.html)
- [Canada Gazette, Part II: Regulations Amending the Immigration and Refugee Protection Regulations (Rural Community Immigration), SOR/2026-217](https://gazette.gc.ca/rp-pr/p2/2026/2026-11-04/html/sor-dors217-eng.html)
- [MLT Aikins: Federal government announces its immigration levels plan](https://www.mltaikins.com/insights/federal-government-announces-its-immigration-levels-plan/)
- [CBC News: RCIP program becomes permanent](https://www.cbc.ca/news/canada/thunder-bay/rcip-program-becomes-permanent-9.7416619)

*Prepared by Verixa from official Government of Canada publications. This article is general information, not legal advice. Confirm details on the official IRCC site and speak with a licensed immigration consultant (RCIC) or lawyer about your situation.*
`;

const COMMUNITIES = `| Province | Communities |
|---|---|
| Ontario | North Bay, Sudbury, Timmins, Sault Ste. Marie, Thunder Bay |
| Manitoba | Steinbach, Altona/Rhineland, Brandon |
| British Columbia | West Kootenay, North Okanagan Shuswap, Peace Liard |
| Saskatchewan | Moose Jaw |
| Alberta | Claresholm |
| Nova Scotia | Pictou County |`;

export const ARTICLES: SeriesArticle[] = [
  {
    slug: "rural-community-immigration-program-permanent-2027",
    title: "Canada Makes the Rural Community Immigration Pilot Permanent: What Changes on January 1, 2027",
    summary:
      "The Rural Community Immigration Pilot becomes a permanent program on January 1, 2027. The same 14 communities stay in, admission targets rise to 6,500 by 2029, and pilot recommendations must be used before they expire.",
    category: "UPDATES_POLICY",
    targetKeyword: "Rural Community Immigration Program permanent",
    seoTitle: "RCIP Is Now Permanent: What Changes in January 2027",
    seoDesc:
      "Canada's Rural Community Immigration Pilot becomes a permanent program on January 1, 2027. The 14 communities, the 2027–2029 targets, and the transition deadlines.",
    publishAt: "NOW",
    tier: "major",
    content: `On November 9, 2026, Immigration Minister Lena Metlege Diab announced in Pictou County, Nova Scotia, that the **Rural Community Immigration Pilot (RCIP)** will become a **permanent program**. The new **Rural Community Immigration Program** opens on **January 1, 2027**, and the pilot closes the same day.

This is not just an extension. Regulations registered on October 22, 2026, and published in the *Canada Gazette* on November 4, 2026 (SOR/2026-217), create a new permanent economic immigration class in the Immigration and Refugee Protection Regulations. Until now, the rural route ran as a pilot under ministerial instructions with an end date.

## What stays the same

- **The 14 communities.** All current pilot communities are expected to continue in the permanent program.
- **The model.** It is still community- and employer-led. You need a job offer from a designated employer and a recommendation from the community before you can apply for permanent residence.
- **The core requirements.** One year of related work experience, a language test, education and settlement funds. See our [eligibility checklist](/blog/rural-community-immigration-program-eligibility-checklist-2027).

${COMMUNITIES}

## The numbers

The 2027–2029 Immigration Levels Plan sets admission targets for the permanent program:

| | 2027 | 2028 | 2029 |
|---|---|---|---|
| Rural Community Immigration Program | 5,500 | 6,000 | 6,500 |

These targets also cover remaining admissions under the current pilot and the earlier Rural and Northern Immigration Pilot, so they are not all new spots. Targets for 2028 and 2029 are notional and will be confirmed or adjusted by November 1, 2027. For context on the wider plan, see [Canada's 2027–2029 Immigration Levels Plan explained](/blog/canada-2027-2029-immigration-levels-plan-explained).

IRCC's track record figures:

- From January 2025 to August 2026, pilot communities designated more than **1,950 employers**, who issued more than **4,700 job offers and community recommendations**.
- The earlier Rural and Northern Immigration Pilot (2019–2024) involved more than 2,800 employers and admitted more than 12,500 candidates and family members.
- Health care, education, and sales and services were the main sectors filled in 2025 and 2026.

## Transition deadlines

| Date | What happens |
|---|---|
| December 31, 2026 | Last date for a pilot community recommendation |
| January 1, 2027 | Pilot closes; permanent program opens |
| Before expiry | Pilot recommendations must be used to apply for PR before they expire |
| June 30, 2027 | Pilot ministerial instructions stop applying (per the regulatory impact statement) |

Two practical points:

- **A pilot recommendation does not carry over.** The regulations say a certificate issued under the pilot's ministerial instructions cannot satisfy the new program's requirement. If you hold one, apply under the pilot before it expires.
- **Applications already received keep processing.** IRCC says it will continue to process pilot applications it has received.

## Will more communities be added?

IRCC plans to expand to more communities, but has not named any or set a timeline. The backgrounder describes a rural community as having a population under 200,000 and a score of 0.20 or more on Statistics Canada's Index of Remoteness. Criteria for new communities will be announced later.

## What this means

- **For candidates:** the rural route is no longer at risk of ending with a pilot. But spots are small (5,500 in 2027 across 14 communities) and always tied to a designated employer.
- **For employers in these communities:** permanent rules give more certainty for hiring plans. Designation comes with obligations, covered in our guide to [job offer and employer rules](/blog/rural-community-immigration-program-job-offer-rules).
- **For pilot applicants:** do not wait. A recommendation dated by December 31, 2026, must be used before it expires.

## What to do now

1. If you have a pilot recommendation, check its expiry date and submit your PR application in time.
2. If you are job hunting, check the designated employer lists on the community websites.
3. Ignore anyone selling "guaranteed" RCIP jobs. Employers that charge candidates fees can lose their designation.
${SRC}`,
  },
  {
    slug: "rural-community-immigration-program-job-offer-rules",
    title: "Rural Community Immigration Program: Job Offer, Wage and Employer Rules for 2027",
    summary:
      "Under the permanent Rural Community Immigration Program, a job offer must be full-time, non-seasonal and indefinite, pay at least the Job Bank wage, and keep 75% of hours in the community. Here are the rules for candidates and employers.",
    category: "IMMIGRATION_GUIDES",
    targetKeyword: "RCIP job offer requirements",
    seoTitle: "RCIP Job Offer Rules 2027: Wage, Hours, Employers",
    seoDesc:
      "What makes a valid Rural Community Immigration Program job offer: full-time, non-seasonal, Job Bank wage, 75% of hours in the community, and designated-employer duties.",
    publishAt: "2026-11-11T13:00:00.000Z",
    tier: "major",
    content: `The [Rural Community Immigration Program](/blog/rural-community-immigration-program-permanent-2027) becomes permanent on January 1, 2027. Its gateway is the job offer. Without a valid offer from a designated employer, a community cannot recommend you, and without a recommendation you cannot apply for permanent residence.

The rules below come from the new regulations (SOR/2026-217) and IRCC's program pages.

## How the process works

1. A community designates employers in its priority sectors and posts them on its website.
2. A designated employer offers you a job.
3. The **employer** sends the community recommendation application to the community.
4. The community checks that the job is in a priority sector or occupation, the offer is genuine, and you meet the program requirements.
5. If recommended, you receive a certificate and apply to IRCC for permanent residence.

## What makes a valid job offer

| Requirement | Rule |
|---|---|
| Employer | A designated employer, actively operating the business |
| Ownership | Not majority-owned or controlled by you or your spouse or partner |
| Type of job | Non-seasonal, full-time, continuous and indeterminate (no end date) |
| Location | At least 75% of work hours in the designated community |
| Sector | On the community's priority sector or occupation list |
| Language | Cannot require a language other than English or French |
| Genuineness | Consistent with the employer's real needs, with terms it can fulfill |
| Fit | You must be qualified and likely to accept and do the job |

### Wage

The offer must pay within or above the Job Bank wage range for the occupation. For a recommendation, the wage must be at least the highest of:

- the minimum wage that applies,
- the lowest Job Bank wage for that occupation, and
- any higher wage the community sets for its local market.

Check the Job Bank wage for your NOC code in the community's region before you accept.

### Work experience must match the job

Your past experience must be in a TEER category similar to the job offer:

| Job offer TEER | Accepted experience TEER |
|---|---|
| 0 or 1 | 0, 1, 2 or 3 |
| 2 | 1, 2, 3 or 4 |
| 3 or 4 | 2, 3 or 4 |
| 5 | Same 5-digit NOC code |

Registered nurse experience (NOC 31301) can support an offer in NOC 33102 or NOC 44101.

## The recommendation certificate

- Valid until the **first anniversary** of issue, or until it is revoked, whichever comes first.
- It **must be revoked** if you did not meet the criteria when it was issued, stop meeting them before you become a permanent resident, or if the employer loses its designation.
- It can be amended to reflect a new eligible job offer.

## Rules for employers

To be designated, a business generally needs:

- **Two or more years** of continuous operation under the same ownership in the community, or operations elsewhere that the community considers a substantial contribution to its economy.
- A business in a **priority sector or occupation**.
- A representative who completes **intercultural competency training** and **onboarding training**.
- A commitment to **support the settlement** of each hire and their family, including access to settlement services.
- Compliance with worker protection laws.

Some businesses cannot be designated, including those partly owned by immigration lawyers, Quebec notaries or licensed immigration consultants, and certain recruitment businesses. A community may revoke a designation for reasons that include misrepresentation, breaking worker protection laws, or **charging fees to foreign nationals**.

## Red flags for candidates

- An "employer" asks you to pay for the job offer or the recommendation. This is grounds for revoking the employer's designation.
- The job is seasonal, part-time, or mostly outside the community.
- The wage is below the Job Bank figure for the occupation.
- The employer is not on the community's published designated list.

## What to do now

Find the community's designated employer list, check the job's NOC code and TEER, and compare the wage with Job Bank. Before signing, confirm the offer meets every row in the table above. Next: the [full eligibility checklist](/blog/rural-community-immigration-program-eligibility-checklist-2027).
${SRC}`,
  },
  {
    slug: "rural-community-immigration-program-eligibility-checklist-2027",
    title: "Rural Community Immigration Program Eligibility Checklist: Work Experience, Language and Funds",
    summary:
      "Who qualifies for the permanent Rural Community Immigration Program: 1,560 hours of work in three years, CLB 4 to 6 by TEER, an education credential, settlement funds from $10,507, and an exemption for local graduates.",
    category: "IMMIGRATION_GUIDES",
    targetKeyword: "Rural Community Immigration Program eligibility",
    seoTitle: "RCIP Eligibility 2027: Experience, CLB, Funds",
    seoDesc:
      "Check if you qualify for the Rural Community Immigration Program: 1,560 hours of experience, CLB 4–6 by TEER, education, settlement funds and the local graduate exemption.",
    publishAt: "2026-11-12T13:00:00.000Z",
    tier: "minor",
    content: `The permanent [Rural Community Immigration Program](/blog/rural-community-immigration-program-permanent-2027) opens on January 1, 2027. To apply for permanent residence you need six things. Use this checklist before you approach a community.

## The six requirements

1. A valid **community recommendation** certificate
2. A valid **job offer** from a designated employer in that community ([rules here](/blog/rural-community-immigration-program-job-offer-rules))
3. **One year (1,560 hours)** of related work experience in the past three years
4. A **language test** that meets the minimum for your job's TEER
5. A Canadian **education credential**, or a foreign one with an assessment
6. **Settlement funds**, unless you already work in Canada

You must also intend to live in the community.

## 1. Work experience

- At least **1,560 hours** in the past **3 years**. One full-time job, several part-time jobs or multiple jobs all count (for example, 30 hours a week for 12 months, or 15 hours a week for 24 months).
- Paid work only. Volunteer work, unpaid internships and self-employment do not count.
- You must have done the main duties in the NOC description of your occupation.
- The experience TEER must be similar to your job offer TEER. See the table in our [job offer guide](/blog/rural-community-immigration-program-job-offer-rules).

**Documents:** reference letters (dates, duties, hours, salary, contact details), contracts, pay stubs, and T4s or a Notice of Assessment if you worked in Canada.

### Exemption for local graduates

You do not need work experience if you graduated from a **public post-secondary institution in the recommending community** and:

| Credential | Conditions |
|---|---|
| Program of 2 years or longer | Studied full-time the whole program, graduated no more than 18 months before applying, lived in the community at least 16 of the last 24 months of study |
| Master's or higher (2 years or less) | Studied full-time the whole degree, graduated no more than 18 months before applying, lived in the community for the whole degree |

The exemption does not apply if more than half the program was language study or distance learning, or if a scholarship required you to return home.

## 2. Language

| Job offer TEER | Minimum CLB/NCLC (all four skills) |
|---|---|
| 0 or 1 | 6 |
| 2 or 3 | 5 |
| 4 or 5 | 4 |

Accepted tests: CELPIP-General, IELTS General Training or PTE Core for English; TEF Canada or TCF Canada for French. Results must be less than two years old when you apply.

## 3. Education

A Canadian degree, diploma or certificate, or a foreign credential at least equal to a Canadian secondary school diploma, with an Educational Credential Assessment less than five years old.

## 4. Settlement funds

| Family members | Funds needed (CAD) |
|---|---|
| 1 | $10,507 |
| 2 | $13,080 |
| 3 | $16,080 |
| 4 | $19,524 |
| 5 | $22,143 |
| 6 | $24,975 |
| 7 | $27,806 |

Add $2,831 for each extra family member. You do **not** need proof of funds if you already work in Canada with a valid work permit. Figures are IRCC's, updated July 29, 2025; check the official page before applying.

## Quick self-check

- [ ] I have, or can get, an offer from a designated employer in one of the 14 communities
- [ ] My 1,560 hours fit the TEER rule for that job, or I qualify as a local graduate
- [ ] My test scores meet the CLB minimum in all four skills
- [ ] My education is Canadian or assessed
- [ ] I have the funds, or I am working in Canada on a valid permit
- [ ] I plan to live in the community

## If you are in the pilot now

If you hold a pilot recommendation dated December 31, 2026, or earlier, use it to apply for PR before it expires. It cannot be used for the permanent program. IRCC also offers an optional work permit so you can work while your application is processed.
${SRC}`,
  },
];
