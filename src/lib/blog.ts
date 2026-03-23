export type BlogCategory = {
  slug: string;
  title: string;
  description: string;
};

export type BlogFAQ = {
  question: string;
  answer: string;
};

export type BlogGlossaryTerm = {
  term: string;
  definition: string;
};

export type BlogInternalLink = {
  label: string;
  href: string;
};

export type BlogComparison = {
  title: string;
  leftLabel: string;
  rightLabel: string;
  rows: { topic: string; left: string; right: string }[];
  conclusion: string;
};

export type BlogPost = {
  slug: string;
  title: string;
  category: string;
  summary: string[];
  publishedAt: string;
  updatedAt?: string;
  keywords: string[];
  directAnswer: string[];
  deepExplanation: string[];
  steps: string[];
  risks: string[];
  comparison?: BlogComparison;
  ctaInline: string;
  ctaEnd: string;
  faq: BlogFAQ[];
  glossary: BlogGlossaryTerm[];
  internalLinks: BlogInternalLink[];
};

export const blogCategories: BlogCategory[] = [
  {
    slug: "immigration-guides",
    title: "Immigration Guides",
    description: "Step-by-step pathways, eligibility basics, and clear next actions."
  },
  {
    slug: "consultant-insights",
    title: "Consultant Insights",
    description: "How to choose, evaluate, and work with licensed RCICs."
  },
  {
    slug: "case-based-content",
    title: "Case-Based Content",
    description: "Real-world scenarios, common pitfalls, and outcomes."
  },
  {
    slug: "updates-policy",
    title: "Updates & Policy",
    description: "Regulatory updates, policy changes, and practical impacts."
  }
];

export const blogPosts: BlogPost[] = [
  {
    slug: "how-to-choose-a-licensed-immigration-consultant-canada-2026",
    title: "How to Choose a Licensed Immigration Consultant in Canada (2026 Guide)",
    category: "consultant-insights",
    summary: [
      "A licensed consultant must be an RCIC in good standing with the CICC.",
      "You should verify license status, scope of service, and pricing before paying anything.",
      "The safest route is a verified marketplace with transparent profiles and reviews.",
      "This guide gives a simple checklist and the mistakes to avoid."
    ],
    publishedAt: "2026-03-23",
    keywords: [
      "choose immigration consultant",
      "licensed RCIC",
      "CICC verification",
      "RCIC Canada"
    ],
    directAnswer: [
      "Choose a consultant who is an active RCIC, has a clear scope of service, and provides written terms.",
      "Verify the license number on the official register, then compare experience and pricing.",
      "If you want a faster and safer path, use a verified directory like Verixa."
    ],
    deepExplanation: [
      "In Canada, immigration consulting is regulated. An RCIC is licensed by the College of Immigration and Citizenship Consultants (CICC).",
      "Many complaints come from unlicensed advisors or unclear service boundaries. A strong selection process prevents wasted money and risk.",
      "Your consultant should explain what they will do, what they will not do, and how you can reach them during your case."
    ],
    steps: [
      "Confirm the consultant is an RCIC in good standing with the CICC.",
      "Check the services they offer and whether they match your immigration goal.",
      "Ask for pricing and a written service agreement.",
      "Review their experience with cases similar to yours.",
      "Book a paid consultation and evaluate communication quality."
    ],
    risks: [
      "Paying someone who is not licensed or not in good standing.",
      "Vague pricing or missing written agreements.",
      "Promises of guaranteed outcomes.",
      "Poor communication after payment."
    ],
    comparison: {
      title: "RCIC vs Immigration Lawyer (Quick Comparison)",
      leftLabel: "RCIC",
      rightLabel: "Lawyer",
      rows: [
        { topic: "Regulator", left: "CICC", right: "Provincial law society" },
        { topic: "Typical scope", left: "Applications and consulting", right: "Legal strategy and litigation" },
        { topic: "Best for", left: "Standard cases and guidance", right: "Complex or legal disputes" },
        { topic: "Cost range", left: "Often lower", right: "Often higher" }
      ],
      conclusion: "For most standard cases, an RCIC is sufficient. For legal disputes or court issues, a lawyer may be required."
    },
    ctaInline: "Looking for a verified consultant? Browse licensed RCICs on Verixa and compare profiles in minutes.",
    ctaEnd: "Find verified RCICs on Verixa and book a consultation with confidence.",
    faq: [
      {
        question: "Is it illegal to use an unlicensed consultant in Canada?",
        answer: "Only licensed RCICs or lawyers can legally provide paid immigration advice. Using unlicensed advisors can put your case at risk."
      },
      {
        question: "How do I verify a consultant’s license?",
        answer: "You can search the official public register by name or license number and confirm active status."
      },
      {
        question: "Do I need a consultant for a simple application?",
        answer: "Not always, but a consultant can reduce mistakes and help you avoid delays."
      }
    ],
    glossary: [
      { term: "RCIC", definition: "Regulated Canadian Immigration Consultant." },
      { term: "CICC", definition: "College of Immigration and Citizenship Consultants." },
      { term: "Service agreement", definition: "A written contract outlining scope, fees, and responsibilities." }
    ],
    internalLinks: [
      { label: "Search licensed consultants", href: "/search" },
      { label: "Browse a consultant profile", href: "/consultant/R999999" },
      { label: "See booking flow", href: "/consultant/R999999/book" },
      { label: "RCIC vs Immigration Lawyer", href: "/blog/rcic-vs-immigration-lawyer-which-one-do-you-need" }
    ]
  },
  {
    slug: "rcic-vs-immigration-lawyer-which-one-do-you-need",
    title: "RCIC vs Immigration Lawyer: Which One Do You Need?",
    category: "consultant-insights",
    summary: [
      "Both RCICs and lawyers can provide immigration advice, but their roles differ.",
      "RCICs are best for standard applications, while lawyers are critical for legal disputes.",
      "Cost, complexity, and risk level should guide the decision.",
      "This comparison makes the choice clear in 5 minutes."
    ],
    publishedAt: "2026-03-23",
    keywords: [
      "rcic vs lawyer",
      "immigration consultant vs lawyer",
      "which to choose"
    ],
    directAnswer: [
      "If your case is straightforward, an RCIC is usually the best choice.",
      "If your case involves refusals, misrepresentation issues, or legal hearings, you should speak with an immigration lawyer.",
      "When in doubt, start with a paid consultation and ask about legal complexity."
    ],
    deepExplanation: [
      "RCICs are regulated consultants who focus on applications, guidance, and case preparation.",
      "Lawyers are regulated by provincial law societies and handle legal strategy and litigation.",
      "The right choice depends on risk, complexity, and your budget."
    ],
    steps: [
      "List your case type and any prior refusals or legal issues.",
      "Estimate your budget range.",
      "Start with a consultation from a verified RCIC.",
      "If legal complexity is identified, book a lawyer consult."
    ],
    risks: [
      "Choosing a consultant for a case that should be handled by a lawyer.",
      "Paying high legal fees for a simple case.",
      "Delaying action due to uncertainty."
    ],
    comparison: {
      title: "RCIC vs Lawyer",
      leftLabel: "RCIC",
      rightLabel: "Lawyer",
      rows: [
        { topic: "Regulator", left: "CICC", right: "Law Society" },
        { topic: "Focus", left: "Applications & guidance", right: "Legal strategy & hearings" },
        { topic: "Typical cost", left: "Moderate", right: "Higher" },
        { topic: "Best for", left: "Standard cases", right: "Complex legal cases" }
      ],
      conclusion: "Start with an RCIC for standard applications; switch to a lawyer if legal risks appear."
    },
    ctaInline: "Not sure who you need? Start by comparing licensed RCICs on Verixa.",
    ctaEnd: "Find a verified RCIC on Verixa and book a first consultation.",
    faq: [
      {
        question: "Can an RCIC represent me in court?",
        answer: "No. Only lawyers can represent clients in court or in certain legal proceedings."
      },
      {
        question: "Are RCICs cheaper than lawyers?",
        answer: "Typically yes, but it depends on the scope and complexity of the case."
      },
      {
        question: "Can I use both?",
        answer: "Yes. Some clients start with an RCIC and involve a lawyer if legal issues arise."
      }
    ],
    glossary: [
      { term: "Law Society", definition: "Provincial regulator for lawyers in Canada." },
      { term: "Misrepresentation", definition: "Providing false or misleading information in an immigration application." }
    ],
    internalLinks: [
      { label: "Browse consultants", href: "/search" },
      { label: "See how booking works", href: "/consultant/R999999/book" },
      { label: "How to choose a licensed consultant", href: "/blog/how-to-choose-a-licensed-immigration-consultant-canada-2026" }
    ]
  },
  {
    slug: "immigration-consultant-cost-canada-what-to-expect",
    title: "Immigration Consultant Cost in Canada: What to Expect",
    category: "immigration-guides",
    summary: [
      "Consultant fees vary by program, complexity, and service scope.",
      "A transparent quote and written agreement are non-negotiable.",
      "Cheap services often hide risks or incomplete deliverables.",
      "This guide explains typical fee ranges and warning signs."
    ],
    publishedAt: "2026-03-23",
    keywords: [
      "immigration consultant cost",
      "RCIC fees",
      "consultant pricing Canada"
    ],
    directAnswer: [
      "Costs depend on the program and the amount of work required.",
      "Expect higher fees for complex cases, appeals, or family bundles.",
      "Always ask for a written service agreement and a breakdown of fees."
    ],
    deepExplanation: [
      "Pricing differences are often explained by the scope of work, timeline, and how much documentation is required.",
      "A fair quote should include application prep, document review, and communication expectations.",
      "Avoid anyone who refuses to provide a written scope or fee breakdown."
    ],
    steps: [
      "Ask for a written quote with line-item fees.",
      "Confirm what is included and what is excluded.",
      "Compare 2–3 consultants for the same case type.",
      "Choose based on clarity and trust, not just lowest price."
    ],
    risks: [
      "Hidden fees after you have paid the deposit.",
      "Overpaying for services you do not need.",
      "Paying unlicensed advisors to save money."
    ],
    ctaInline: "Want transparent pricing? Compare verified consultants on Verixa.",
    ctaEnd: "Find consultants with clear pricing and book a consultation on Verixa.",
    faq: [
      {
        question: "Are deposits normal?",
        answer: "Yes, but the agreement should explain how deposits are applied and refunded."
      },
      {
        question: "Is there a standard fee list?",
        answer: "No. Fees vary by consultant and case complexity."
      },
      {
        question: "Can I pay in installments?",
        answer: "Some consultants offer payment plans; confirm in writing."
      }
    ],
    glossary: [
      { term: "Scope of work", definition: "The exact services and tasks the consultant will perform." },
      { term: "Retainer", definition: "An upfront payment to secure services." }
    ],
    internalLinks: [
      { label: "Search consultants", href: "/search" },
      { label: "Consultant profile example", href: "/consultant/R999999" },
      { label: "How to choose a licensed consultant", href: "/blog/how-to-choose-a-licensed-immigration-consultant-canada-2026" }
    ]
  },
  {
    slug: "immigration-consultant-in-toronto-how-to-find-a-verified-rcic",
    title: "Immigration Consultant in Toronto: How to Find a Verified RCIC",
    category: "case-based-content",
    summary: [
      "Location-based searches often surface unverified results.",
      "You should verify license status before any payment.",
      "This article gives a city-specific checklist and fast filters.",
      "Use Verixa to search verified consultants in Toronto."
    ],
    publishedAt: "2026-03-23",
    keywords: [
      "immigration consultant toronto",
      "RCIC Toronto",
      "verified consultant Toronto"
    ],
    directAnswer: [
      "Search by city, then confirm the consultant’s license is active.",
      "Prioritize consultants with clear scope, pricing transparency, and fast response time.",
      "Use Verixa to compare verified RCICs in Toronto."
    ],
    deepExplanation: [
      "Programmatic SEO pages should answer a local intent clearly and quickly.",
      "City-specific pages should still emphasize verification, service fit, and pricing clarity.",
      "A reliable directory reduces risk and speeds up decision making."
    ],
    steps: [
      "Filter by city or province when searching.",
      "Confirm license status and active standing.",
      "Check service fit for your pathway.",
      "Book a paid consultation to validate communication and expertise."
    ],
    risks: [
      "Paying an unlicensed advisor listed on generic directories.",
      "Choosing someone with no experience in your pathway.",
      "Ignoring language or communication fit."
    ],
    ctaInline: "Looking for a verified Toronto RCIC? Start with Verixa.",
    ctaEnd: "Search verified RCICs in Toronto on Verixa and book a call.",
    faq: [
      {
        question: "Is it better to choose a local consultant?",
        answer: "Local can help with in-person meetings, but expertise matters more than location."
      },
      {
        question: "Can I use a consultant in another province?",
        answer: "Yes, RCICs can serve clients across Canada."
      }
    ],
    glossary: [
      { term: "Verified", definition: "License and status confirmed against official records." },
      { term: "RCIC", definition: "Regulated Canadian Immigration Consultant." }
    ],
    internalLinks: [
      { label: "Search consultants", href: "/search" },
      { label: "View a profile", href: "/consultant/R999999" },
      { label: "Consultant cost in Canada", href: "/blog/immigration-consultant-cost-canada-what-to-expect" }
    ]
  },
  {
    slug: "how-to-avoid-immigration-consultant-fraud",
    title: "How to Avoid Immigration Consultant Fraud in Canada",
    category: "consultant-insights",
    summary: [
      "Most fraud happens when clients skip verification.",
      "Licensed RCICs must follow strict rules and provide written agreements.",
      "This guide lists red flags and safe verification steps.",
      "A verified marketplace reduces risk."
    ],
    publishedAt: "2026-03-23",
    keywords: [
      "immigration consultant fraud",
      "verify RCIC",
      "avoid scams"
    ],
    directAnswer: [
      "Always verify that the advisor is a licensed RCIC or a lawyer.",
      "Do not pay anyone who refuses a written contract or promises guaranteed approval.",
      "Use verified sources and keep all communications documented."
    ],
    deepExplanation: [
      "Fraud often relies on urgency, vague promises, and fake credentials.",
      "Licensed consultants are required to disclose fees, scope, and complaint channels.",
      "Verification is the single most effective protection step."
    ],
    steps: [
      "Check license status on the public register.",
      "Request a written service agreement.",
      "Pay only through documented channels.",
      "Avoid anyone who claims guaranteed outcomes."
    ],
    risks: [
      "Losing money to unlicensed operators.",
      "Submitting inaccurate information unknowingly.",
      "Permanent application bans due to misrepresentation."
    ],
    ctaInline: "Want a safer path? Search verified RCICs on Verixa.",
    ctaEnd: "Find verified consultants on Verixa before you pay anyone.",
    faq: [
      {
        question: "Is it normal for consultants to ask for cash?",
        answer: "No. Use traceable payment methods and request receipts."
      },
      {
        question: "Can I file a complaint?",
        answer: "Yes, the regulator provides complaint channels for licensed RCICs."
      }
    ],
    glossary: [
      { term: "Misrepresentation", definition: "Providing false or misleading information in an application." },
      { term: "License status", definition: "Whether the consultant is active, suspended, or inactive." }
    ],
    internalLinks: [
      { label: "Search verified consultants", href: "/search" },
      { label: "Consultant profiles", href: "/consultant/R999999" },
      { label: "RCIC vs Immigration Lawyer", href: "/blog/rcic-vs-immigration-lawyer-which-one-do-you-need" }
    ]
  },
  {
    slug: "immigration-policy-updates-what-changed-this-year",
    title: "Immigration Policy Updates: What Changed This Year",
    category: "updates-policy",
    summary: [
      "Policy changes affect timelines, eligibility, and documentation needs.",
      "You should review updates before submitting any application.",
      "This overview explains how to adapt quickly.",
      "Use a licensed consultant to confirm impact on your case."
    ],
    publishedAt: "2026-03-23",
    keywords: [
      "immigration policy updates",
      "Canada immigration changes",
      "program updates"
    ],
    directAnswer: [
      "If a policy change affects your program, update your documents and timelines immediately.",
      "Do not submit an application based on outdated requirements.",
      "Confirm the impact with a licensed consultant."
    ],
    deepExplanation: [
      "Immigration programs change throughout the year, often with short notice.",
      "Updated requirements can include new forms, thresholds, or eligibility rules.",
      "The safest response is to verify the current requirements before submitting."
    ],
    steps: [
      "Identify your specific program and stream.",
      "Check the latest requirements and deadlines.",
      "Adjust documents or eligibility claims if required.",
      "Consult a licensed RCIC if you are unsure."
    ],
    risks: [
      "Applying with outdated requirements.",
      "Missing new documentation rules.",
      "Delays or refusals due to incorrect assumptions."
    ],
    ctaInline: "Unsure about an update? Talk to a verified RCIC on Verixa.",
    ctaEnd: "Find a licensed consultant on Verixa to review policy changes for your case.",
    faq: [
      {
        question: "How often do policies change?",
        answer: "Some programs update yearly, others change multiple times per year."
      },
      {
        question: "Should I wait if rules are unclear?",
        answer: "Only if the delay reduces risk. A licensed consultant can advise quickly."
      }
    ],
    glossary: [
      { term: "Stream", definition: "A specific pathway within an immigration program." },
      { term: "Eligibility", definition: "The rules you must meet to apply." }
    ],
    internalLinks: [
      { label: "Search consultants", href: "/search" },
      { label: "Consultant profiles", href: "/consultant/R999999" },
      { label: "How to avoid fraud", href: "/blog/how-to-avoid-immigration-consultant-fraud" }
    ]
  }
];

export const blogCategoryMap = new Map(
  blogCategories.map((category) => [category.slug, category])
);

export function getBlogPost(slug: string) {
  return blogPosts.find((post) => post.slug === slug) || null;
}

export function getBlogPostsByCategory(categorySlug: string) {
  return blogPosts.filter((post) => post.category === categorySlug);
}

export function getBlogCategoriesWithCounts() {
  return blogCategories.map((category) => ({
    ...category,
    count: blogPosts.filter((post) => post.category === category.slug).length
  }));
}

export function getBlogToc(post: BlogPost) {
  const base = [
    { id: "summary", title: "Summary" },
    { id: "direct-answer", title: "Direct Answer" },
    { id: "deep-explanation", title: "Deep Explanation" },
    { id: "practical-steps", title: "Practical Steps" },
    { id: "risks-mistakes", title: "Risks and Mistakes" }
  ];

  if (post.comparison) {
    base.push({ id: "comparison", title: "Comparison" });
  }

  base.push(
    { id: "cta", title: "Find a Consultant" },
    { id: "faq", title: "FAQ" },
    { id: "glossary", title: "Mini Glossary" },
    { id: "internal-links", title: "Internal Links" }
  );

  return base;
}
