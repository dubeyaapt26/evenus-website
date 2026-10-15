// ---------------------------------------------------------------------------
// The words on /features/. The cards under each group come from the catalog;
// this is everything around them. FAQ answers are written once, here, and the
// page and the FAQPage structured data are both built from this list, so the
// two can never disagree.
// ---------------------------------------------------------------------------

export const HUB = {
  h1: 'EvenUS features: everything the app does for a couple',
  seoTitle: 'EvenUS Features: Couples App for Chores and Money',
  description: 'Every EvenUS feature in one place: shared expenses, chore time, the mental load, the household balance, weekly ideas and private check-ins.',
  updated: '2026-10-15',
  answer: 'EvenUS is a mobile app for couples who live together. It measures how time, money and the mental load are actually shared at home, explains the picture in plain words, and suggests one thing to move between you each week. These are its 66 features, in eight groups, each with a step-by-step page.',
};

HUB.intro = `
<h2 id="what-is-evenus">What is EvenUS?</h2>
<p><strong>EvenUS is a calm, no-blame app for two people who share a home.</strong> Most arguments about housework and money are not really about the dishes or the electricity bill. They are about whether the whole arrangement feels fair, and nobody can see the whole arrangement, because half of it happens in someone's head. EvenUS records the parts both of you can agree on, adds them up the same way on both phones, and turns the result into a conversation starter rather than a verdict.</p>
<p>It looks at three things, kept separate on purpose:</p>
<ul>
  <li><strong>Time.</strong> How many hours each of you has left in a week once sleep, paid work, travel, housework and childcare are counted. See <a href="/features/time-of-your-own/">Time of your own</a>.</li>
  <li><strong>Money.</strong> Shared costs split the way you chose, by income, half each or another method, with one running figure for what is still to even up. See <a href="/features/shared-expenses/">Shared expenses</a> and <a href="/features/money-mode/">How costs split</a>.</li>
  <li><strong>The mental load.</strong> The planning and remembering behind a household, from school forms to renewals, counted as hours inside the time figure once you have both answered a few private questions. See <a href="/features/mental-load-map/">Who keeps track of what</a>.</li>
</ul>
<p>What EvenUS deliberately leaves out matters as much. It never connects to a bank. It has no streaks, badges, points or leaderboards. It has no button for nudging your partner and no notification about something someone did not do. Neither of you can edit or dispute the other's entries, and nobody is ever shown as doing the most. Hours are never converted into money. The aim is fewer fights, not a better scoreboard.</p>

<h2 id="how-the-score-works">How does the fairness score work?</h2>
<p><strong>The household balance (the fairness score) is one number from 0 to 100 describing how the week was arranged between you, with every part of it explained on the same screen.</strong> It combines two separate balances: a time balance, built from the free hours each of you has left, and a money balance, built from what is still to even up against the split you both chose. By default time counts for 60% and money for 40%, shown on the screen as “Time 60%, money 40%”.</p>
<p>A few rules keep it honest. Only time you actually log counts, never an estimate, and days when one of you is <a href="/features/away-mode/">away</a> are left out of the comparison rather than counted against anyone. Planning and remembering count once both of you have answered the questions, so one phone never sees a different number from the other. When one of you has less free time and the other pays more, that is treated as a trade and the two gaps partly cancel. Early in the week, or when little has been logged, the number waits rather than guessing. And it describes the arrangement, never a person: no sentence on the screen names who is ahead.</p>
<p>The full explanation, with a worked example, is on the <a href="/features/fairness-score/">household balance page</a>. The reasoning behind it is in <a href="/blog/how-the-evenus-fairness-score-really-works-effort-money-mental-load-explained/">how the EvenUS fairness score works</a>, and you can try the time calculation without an account in the <a href="/calculator/">household fairness calculator</a>.</p>
<p>A number on its own changes nothing, so every measuring feature has an acting one beside it: <a href="/features/weekly-idea/">this week's idea</a> suggests one thing to move, the <a href="/features/sunday-talk/">Sunday talk</a> gives you ten minutes to look at the week together, and the <a href="/features/private-checkin/">private check-in</a> lets each of you say how the week felt without starting a conversation you did not choose.</p>

<h2 id="pricing">What does EvenUS cost?</h2>
<p><strong>Every household starts with a 7-day free week inside the app, with no card needed, and nothing is charged when it ends.</strong> The free week is once per person, and a change of partner never starts a new one. If you subscribe during it, the free days end and billing starts that day. After that, EvenUS Pro is $9.99 a month or $79.99 a year (US dollar reference prices; the app stores show the price for your country). One subscription covers both of you, whoever pays. Six features are part of EvenUS Pro and are marked on their cards below. Everything else keeps working after the free week, and nothing you have recorded is ever locked away: you can always read it, add expenses, tick chores off, export it and delete your account.</p>
`;

HUB.compare = `
<h2 id="compare">How is EvenUS different from a chore app or an expense-splitting app?</h2>
<p><strong>Chore apps count tasks and expense apps count money; EvenUS puts time, money and the mental load side by side and asks whether the arrangement as a whole is fair.</strong> The table compares EvenUS with the two kinds of app couples most often use instead. It describes categories, not named products, and features vary from app to app, so check the one you use.</p>
<div class="fx-table-wrap" role="region" aria-label="Comparison table" tabindex="0">
<table class="fx-table">
  <thead><tr><th scope="col">What it does</th><th scope="col">EvenUS</th><th scope="col">Typical chore app</th><th scope="col">Typical expense-splitting app</th></tr></thead>
  <tbody>
    <tr><th scope="row">Measures free time left each week</th><td class="us">Yes, in real hours, after paid work, travel, housework and care</td><td>Usually counts tasks or points</td><td>No</td></tr>
    <tr><th scope="row">Counts the planning and remembering</th><td class="us">Yes, as hours, once both partners answer</td><td>Not usually</td><td>No</td></tr>
    <tr><th scope="row">Splits shared costs by income</th><td class="us">Yes, one of four methods you choose</td><td>No</td><td>Often equal or custom shares</td></tr>
    <tr><th scope="row">One running figure to even up</th><td class="us">Yes, carried across weeks and months</td><td>No</td><td>Yes, usually per group</td></tr>
    <tr><th scope="row">Suggests one thing to move each week</th><td class="us">Yes, tried for two weeks, then kept or swapped back</td><td>Some rotate chores automatically</td><td>No</td></tr>
    <tr><th scope="row">Private check-in the partner never sees</th><td class="us">Yes, enforced by the server's rules</td><td>No</td><td>No</td></tr>
    <tr><th scope="row">Streaks, points or leaderboards</th><td class="us">None, by design</td><td>Common</td><td>Rare</td></tr>
    <tr><th scope="row">Connects to your bank</th><td class="us">Never; statement files are read on the phone</td><td>No</td><td>Some do</td></tr>
    <tr><th scope="row">Price for a couple</th><td class="us">7-day free week, then $9.99 a month or $79.99 a year for both</td><td>Varies, often free with paid extras</td><td>Varies, often free with paid extras</td></tr>
  </tbody>
</table>
</div>
<p>If you already use Splitwise for the two of you, <a href="/features/splitwise-import/">Import from Splitwise</a> brings your history across, including the payments between you. For a longer look at the alternatives, see <a href="/blog/best-chore-tracking-apps/">the best chore tracking apps for couples</a> and <a href="/blog/evenus-vs-honeydue-vs-flatastic/">EvenUS vs Honeydue vs Flatastic</a>.</p>
`;

HUB.faqs = [
  { q: 'What is EvenUS?', a: 'EvenUS is a mobile app for couples who live together. It measures how time, money and the mental load are shared at home, explains the result in plain words without blaming either person, and suggests one thing to move between you each week.' },
  { q: 'How does EvenUS measure fairness between partners?', a: 'It compares the free hours each of you has left in a week once paid work, travel, housework, childcare and planning are counted, and separately checks shared costs against the split you chose. The two are combined into the household balance, 60% time and 40% money by default, with every part explained.' },
  { q: 'Is EvenUS free?', a: 'Every household gets a 7-day free week in the app with no card needed, and nothing is charged when it ends. After that, EvenUS Pro is $9.99 a month or $79.99 a year. Most features keep working without a subscription, and your records are never locked.' },
  { q: 'Do both partners need to pay?', a: 'No. One subscription covers both partners in a household, whoever pays for it. Your partner sees the same subscription status on their phone, but never your store account or how you paid.' },
  { q: 'Does EvenUS connect to my bank account?', a: 'No, never. You add expenses yourself, by typing a line, scanning a receipt or importing a bank statement file. A statement file is read on your phone, only the payments you tick become expenses, and the file is never uploaded.' },
  { q: 'Can my partner see everything I enter in EvenUS?', a: 'Your partner sees the shared household: expenses, chores, bills and reminders. Your private check-in answers are never visible to them, which the server rules enforce, and personal spending can show only as "A personal expense" with its amount if you hide the detail.' },
  { q: 'Does EvenUS track the mental load?', a: 'Yes. Each of you privately answers a few questions about who keeps track of each area of the house. Once both of you have finished, the planning hours count inside each person\'s time, and areas you see differently are shown side by side without deciding who is right.' },
  { q: 'Does EvenUS work in India?', a: 'Yes. Households can use rupees, with the Indian lakh format, settle up through any UPI app, import statements from HDFC, ICICI, SBI, Axis and Kotak, use the 1 April tax year, track household help, and type into Tell EvenUS in Hindi or Hinglish.' },
  { q: 'Which languages does the EvenUS app support?', a: 'English, Hindi, Spanish, French, German and Portuguese. Each partner chooses their own language, and notifications reach each of you in yours. Tell EvenUS understands all six, plus Hinglish typed in Latin letters.' },
  { q: 'Is EvenUS available on iPhone and Android?', a: 'EvenUS is built for iPhone and Android, with Apple Watch and Wear OS support. It is in closed testing and not yet on the App Store or Google Play. To be told when it is, email support@evenus.app.' },
];

HUB.faqHtml = `
<h2 id="faq">Frequently asked questions about EvenUS</h2>
<div class="fx-faq">
${HUB.faqs.map((f) => `<h3>${f.q}</h3>\n<p>${f.a.replace(/"/g, '&quot;')}</p>`).join('\n')}
</div>
`;
