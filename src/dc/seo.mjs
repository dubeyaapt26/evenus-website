// Search-result titles and descriptions, separate from what the page shows.
//
// ⚠️ THE H1 IS NOT THE <title>. The recovered posts carry headlines written
// for a WordPress feed: 90 to 127 characters, the keyword in the back half,
// "The Architecture of ..." six times over. Google cuts a title at roughly
// 580px, about 60 characters, so most of them were truncated in the result
// before the words anyone searches for appeared. Each entry below is the
// phrase a person actually types, front-loaded, and still a fair summary of
// the page. The on-page headline and the BlogPosting headline are unchanged.
//
// A slug with no entry keeps its own title.

export const SEO_TITLES = {
  '7-signs-carrying-mental-load': '7 Signs You Carry the Mental Load at Home',
  'adhd-autism-in-couples': 'ADHD & Autism in Couples: Dividing Chores Fairly',
  'best-tools-to-track-and-share-domestic-responsibilities-fairly': 'Best Apps to Share Household Responsibilities (2026)',
  'beyond-the-fridge-whiteboard': 'A Chore System Adults Actually Use',
  'budgeting-for-couples': 'Budgeting for Couples: A Step-by-Step Template',
  'building-a-family-ledger': 'Family Ledger: How Couples Track Shared Money',
  'building-your-foundation': 'How to Save for a House Together as a Couple',
  'calculating-fair-financial-splits': 'How to Calculate a Fair Financial Split',
  'celebrating-small-wins': 'Showing Appreciation for Housework Every Day',
  'cognitive-labor-vs-physical-chores': 'Cognitive Labor vs Physical Chores',
  'complete-step-by-step': 'How to Set Up EvenUS With Your Partner',
  'cost-of-household-manager-parental-burnout': 'The Household Manager Role and Parental Burnout',
  'creating-a-family-mission-statement-for-finance-and-chores': 'Family Mission Statement for Money and Chores',
  'creating-your-relationship-fairness-score': 'How to Measure Fairness in a Relationship',
  'cross-cultural-couples': 'Cross-Cultural Couples: Merging Household Expectations',
  'different-standards-mess': 'Different Cleanliness Standards in a Relationship',
  'digital-minimalism-for-couples': 'Digital Minimalism for Couples',
  'dividing-labor-without-blame-or-guilt': 'How to Talk to Your Partner About Splitting Chores',
  'emotional-labor-in-marriage': 'Emotional Labor in Marriage: Examples and Why It Matters',
  'emotional-labor-in-relationships': 'Emotional Labor in Relationships: Who Carries It?',
  'emotional-labor-vs-mental-load-differences': 'Emotional Labor vs Mental Load: The Difference',
  'evenus-vs-honeydue-vs-flatastic': 'EvenUS vs Honeydue vs Flatastic (2026)',
  'evenus-vs-traditional-spreadsheets': 'Couples Budget Spreadsheet vs App: EvenUS Compared',
  'fair-expense-division-for-couples-with-unequal-earnings': 'Splitting Expenses With Unequal Incomes: 3 Examples',
  'financial-equity-in-couples': 'Financial Equity in Couples: Beyond 50/50',
  'financial-infidelity-in-relationships': 'Financial Infidelity in Relationships',
  'financial-transparency': 'Financial Transparency in a Relationship',
  'from-arguments-to-90-percent-harmony': 'How Couples Stop Arguing About Chores and Money',
  'from-conflict-to-collaboration-equity-at-home': 'Equity at Home: From Conflict to Collaboration',
  'from-conflict-to-collaboration': 'A Weekly Cleaning Routine for Couples',
  'gentle-reminders': 'Chore Reminders Without Nagging Your Partner',
  'hidden-resentment-caused-by-unequal-invisible-labor': 'Resentment From Unequal Invisible Labor',
  'household-equity-after-a-job-loss': 'Splitting Chores After a Job Loss or Move',
  'household-management-when-one-partner-has-a-chronic-illness': 'Running a Home When a Partner Has Chronic Illness',
  'how-to-add-chores': 'How to Add Chores, Bills and Tasks in EvenUS',
  'how-to-balance-the-mental-load-when-both-partners-work-full-time': 'Mental Load When Both Partners Work Full-Time',
  'how-to-divide-household-chores-equitably-without-starting-a-fight': 'How to Divide Household Chores Fairly Without a Fight',
  'how-to-explain-the-mental-load-to-a-partner': 'How to Explain the Mental Load to Your Partner',
  'how-to-manage-household-finances-without-losing-your-identity': 'Managing Household Finances Without Losing Yourself',
  'how-to-move-toward-proactive-partnering': '"I Shouldn\'t Have to Ask": Proactive Partnering',
  'how-to-offload-your-mental-to-do-list-for-the-week': 'Sunday Reset: Offload Your Mental To-Do List',
  'how-to-split-bills': 'How to Split Bills as a Couple (2026 Guide)',
  'how-to-turn-on-gentle-reminders': 'How to Set Up Gentle Reminders in EvenUS',
  'how-unequal-chores-and-mental-load-affect-intimacy-and-happiness': 'How Unequal Chores Affect Intimacy and Happiness',
  'income-aware-splits-heres-exactly-how-it-calculates-fair-shares': 'How Income-Based Bill Splits Are Calculated',
  'income-disparity-in-relationships': 'Splitting Bills When One Partner Earns More',
  'income-proportional-bill-splitting': 'Income-Proportional Bill Splitting for Couples',
  'invisible-labor-checklist': 'Invisible Labor Checklist: 25 Hidden Household Tasks',
  'invisible-labor': 'Invisible Labor in Relationships',
  'leveraging-ai-for-better-relationship-insights-and-balance': 'Using AI for Relationship Insights and Balance',
  'live-household-balance': 'Live Household Balance Dashboard',
  'long-distance-to-living-together': 'Moving In Together After Long Distance',
  'manage-household-finances-without-a-joint-bank-account': 'Couple Finances Without a Joint Bank Account',
  'managing-debt-as-a-couple': 'Managing Debt as a Couple: Loans and Credit Cards',
  'managing-mental-load-overload': 'Mental Load Overload: Strategies for Busy Couples',
  'mental-load-in-relationships': 'Mental Load in Relationships: How to Share It',
  'mental-load-tracker': 'Mental Load Tracker: Measuring the Invisible Work',
  'new-parents-guide': 'New Parents: Splitting Chores, Baby Care and Money',
  'no-more-who-did-more-fights-how-evenus-brings-real-peace-to-couples': 'Ending "Who Did More?" Fights as a Couple',
  'outsourcing-the-argument': 'Why Couples Use an App for Household Tasks',
  'paired-vs-evenus': 'Paired vs EvenUS: Which Couples App Do You Need?',
  'pregnancy-postpartum': 'Postpartum Mental Load: Sharing the First Year',
  'preventing-burnout-from-mental-load-in-long-term-relationships': 'Preventing Mental Load Burnout in Relationships',
  'quantifying-the-invisible': 'Why Tracking the Mental Load Helps Couples',
  'rent-splitting-method': 'Splitting Rent 50/50 vs Proportional: Which Is Fair?',
  'retirement-planning-for-couples': 'Retirement for Couples: Sharing the Household in Your 60s',
  'score-destroys-modern-relationships': 'Keeping Score in a Relationship: Why It Backfires',
  'shared-to-do-lists-for-couples': 'Shared To-Do List Apps for Couples: 5 Features',
  'sharing-cognitive-labor': 'Sharing Cognitive Labor: A Guide for Couples',
  'step-parenting-fair-chore-and-finance-division-without-drama': 'Blended Families: Splitting Chores and Money Fairly',
  'the-10-minute-daily-sync': 'A 10-Minute Daily Check-In Routine for Couples',
  'the-architecture-of-a-fair-marriage': 'What Makes a Fair Marriage at Home',
  'the-architecture-of-a-personalized-marriage': 'Designing a Fair Household System as a Couple',
  'the-architecture-of-domestic-peace-in-modern-household': 'Domestic Peace in a Modern Household: A Guide',
  'the-architecture-of-domestic-peace': 'Relationship Tech for Busy Shared Households',
  'the-architecture-of-equality': '5 Steps to Rebalance Workload in a Relationship',
  'the-architecture-of-equity': 'Dividing Chores When Work Hours and Incomes Differ',
  'the-architecture-of-resentment': 'Fixing the Hidden Imbalances Behind Resentment',
  'the-blueprint-for-domestic-peace': 'How to Stop Weekly Fights About Money and Chores',
  'the-chore-wars': '10 Household Chores Couples Fight About Most',
  'the-difference-between-helping-out-and-taking-ownership': 'Helping Out vs Taking Ownership at Home',
  'the-digital-co-ceo': 'Using Technology to Balance Household Chores',
  'the-efficiency-of-intimacy-reclaiming': 'Automate Household Admin, Win Back 5 Hours a Week',
  'the-fair-play-system-vs-digital-apps': 'The Fair Play Method vs Chore Apps for Couples',
  'the-invisible-second-shift': 'The Second Shift: Why Delegating Chores Backfires',
  'the-one-who-books-everything': 'Household Admin Is Invisible Work',
  'the-silent-relationship-killer-why-mental-load-matters-more-than-you-think': 'Why the Mental Load Matters More Than You Think',
  'the-silent-resentment': 'Healing Resentment From Unshared Invisible Work',
  'tiny-changes-boost-score': '7 Small Changes That Balance Household Work',
  'tips-to-eliminate-money-related-conflicts': '5 Tips to Stop Money Fights in Marriage',
  'tools-to-track-shared-expenses-for-unmarried-couples': 'Shared Expense Apps for Unmarried Couples',
  'tracking-shared-expenses': 'Tracking Shared Expenses: Why Spreadsheets Fail',
  'ultimate-mental-load-checklist-partners': 'Mental Load Checklist for Couples',
  'using-the-live-calculator': 'Relationship Balance Calculator: How to Use It',
  'weaponized-incompetence': 'Weaponized Incompetence: How to Handle It',
  'why-50-50-splitting-is-usually-unfair-in-2026-and-what-actually-works': 'Why 50/50 Bill Splitting Is Usually Unfair',
  'why-asking-for-help-is-the-problem': 'Why "Just Ask for Help" Is Part of the Problem',
  'why-every-modern-couple-needs-a-household-coo': 'Why Every Couple Needs a Household COO',
  'why-moms-carry-most-of-the-mental-load': 'Why Moms Carry Most of the Mental Load',
  'why-paper-to-do-lists-are-ruining-your-household-efficiency': 'Why Paper To-Do Lists Fail Busy Households',
  'yours-mine-and-ours-bank-accounts': 'Yours, Mine and Ours: Joint vs Separate Accounts',
};

/**
 * The full <title>. The brand suffix goes on only when it fits.
 *
 * ⚠️ A suffix that pushes the title past the cut is worse than no suffix: the
 * ellipsis lands on the keyword, and Google rewrites the brand in anyway when
 * it wants one.
 */
export function fullTitle(title, max = 60) {
  const withBrand = `${title} · EvenUS`;
  return withBrand.length <= max ? withBrand : title;
}

/**
 * A meta description that is not cut mid-word in the result.
 *
 * Trims to the last whole sentence under the limit; failing that, the last
 * whole word, with an ellipsis. Short ones pass through untouched.
 */
export function metaDescription(text, max = 158) {
  const s = String(text).replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '));
  if (stop > 90) return cut.slice(0, stop + 1);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:]$/, '') + '…';
}

/**
 * Entities the WordPress export left half-decoded.
 *
 * ⚠️ VISIBLE ON THE PAGE, not just in the <title>. The archive encoded
 * apostrophes as &#039;, something upstream decoded &quot; but not those, and
 * esc() then encoded the ampersand again, so readers saw "Shouldn&#039;t" in
 * the headline. Titles and excerpts are plain text and go through esc() on the
 * way out, so they must arrive here fully decoded.
 */
export function decodeText(s) {
  return String(s)
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#8217;|&rsquo;/g, '’').replace(/&#8216;|&lsquo;/g, '‘')
    .replace(/&#8220;|&ldquo;/g, '“').replace(/&#8221;|&rdquo;/g, '”')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

/** A headline is not a sentence: no trailing full stop, and a capital first letter. */
export function tidyTitle(s) {
  s = decodeText(s).trim().replace(/\.$/, '');
  return s.charAt(0).toUpperCase() + s.slice(1);
}
