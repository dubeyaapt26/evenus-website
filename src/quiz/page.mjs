// ---------------------------------------------------------------------------
// /mental-load-quiz/ — the couples mental-load quiz.
//
// Why a tool and not another article: for "mental load quiz / test /
// inventory" searches the pages that rank are interactive tools (Momwell's
// partner inventory, a Tally quiz, FairShare's check-in), and they are the
// pages other sites link to. The site had 58 articles on the mental load and
// no tool.
//
// HOW IT WORKS. Twenty questions about the noticing, planning and
// remembering in a home, in five areas (children is skippable). Each answer is
// who usually does it, from "Me" to "My partner". The result is your share of
// what applies to you, overall and per area. Nothing is scored for or against
// anyone, and the copy names the arrangement, never a person (CLAUDE.md §8).
//
// THE PARTNER LINK. After your result you can send a link; your answers ride
// in the part of the address after "#", which browsers never send to a
// server. Your partner answers the same questions and sees both views side by
// side, including where you each feel a job is yours. Nothing is stored
// anywhere: the page has no server and keeps nothing in the browser.
//
// The questions are this site's own wording. They draw on the sociological
// idea of cognitive labour (anticipating needs, identifying options, deciding,
// monitoring — Daminger 2019), not on any other quiz's items.
// ---------------------------------------------------------------------------

export const QUIZ_PATH = '/mental-load-quiz/';

export const AREAS = [
  { id: 'home', name: 'Food and the home', qs: [
    'Notice when something is running low and get it on the list',
    'Decide what you will eat this week',
    'Spot that something in the home needs fixing, and arrange for it to be fixed',
    'Know when the laundry, cleaning or bins need doing, without being asked',
  ] },
  { id: 'money', name: 'Money and admin', qs: [
    'Keep track of bills, subscriptions and when they renew',
    'Notice when spending is drifting and bring it up',
    'Remember deadlines for insurance, tax, the car or passports',
    'Keep the paperwork findable: warranties, contracts, records',
  ] },
  { id: 'social', name: 'Family and social life', qs: [
    'Remember birthdays and sort out the presents',
    'Keep in touch with family and arrange visits',
    'Plan weekends, holidays and evenings out',
    'Reply to invitations and keep the shared calendar up to date',
  ] },
  { id: 'health', name: 'Health and care', qs: [
    'Book the doctor, dentist and other appointments',
    'Notice when someone in the home needs something: new shoes, a check-up, a rest',
    'Keep track of medicines, prescriptions and repeat orders',
    'Remember a pet’s food, vaccinations and care',
  ] },
  { id: 'kids', name: 'Children', kids: true, qs: [
    'Know the school’s dates, forms and what to bring each day',
    'Rearrange childcare, lifts and pick-ups when plans change',
    'Notice when the children have outgrown clothes or need something new',
    'Keep track of the children’s activities, homework and appointments',
  ] },
];

/** Answer values: index into this list. "Doesn't apply" (5) is left out of every share. */
export const ANSWERS = ['Me', 'Mostly me', 'Both of us equally', 'Mostly my partner', 'My partner', 'Doesn’t apply to us'];

const FAQ = [
  ['What is the mental load?', 'The mental load is the noticing, planning, remembering and deciding behind running a home: knowing the milk is low, that a birthday is coming, that a form is due. It is separate from doing the task, and because it leaves no visible trace it is easy for the person carrying it to feel tired without being able to point to why.'],
  ['How is the result worked out?', 'Each answer counts as a share of that job: “Me” is all of it, “Mostly me” three quarters, “Both of us equally” half, “Mostly my partner” a quarter and “My partner” none. Your result is the average across the questions that apply to your home, overall and for each area. “Doesn’t apply to us” is left out entirely.'],
  ['What is a fair result?', 'Anything around 50% means the noticing and planning is roughly shared. A result well above or below that is not a verdict: one of you may have taken on more for a good reason, such as working fewer paid hours. What matters is whether you have both agreed to the arrangement, and whether it still suits you.'],
  ['Why should my partner take it too?', 'Because the most useful part is where your two answers differ. It is common for both people to feel a job is theirs, or for one person not to know a job exists at all. Neither of you is wrong: the gap shows what is invisible, which is the thing to talk about.'],
  ['Are my answers stored anywhere?', 'No. The quiz runs in your browser and the page keeps nothing. If you send the partner link, your answers are coded in the part of the address after the # sign, which browsers do not send to any server. Whoever has the link can see your answers, so send it only to your partner.'],
  ['Is this a scientific test?', 'No. It is a structured way to start a conversation, not a validated psychological measure, and it does not diagnose anything. The questions draw on research into cognitive household labour, which divides it into anticipating needs, finding options, deciding and keeping an eye on how things are going.'],
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const H2 = 'font-size:clamp(24px,3vw,34px);line-height:1.12;letter-spacing:-.03em;font-weight:700;color:#1B1F1D;margin:40px 0 18px';
const P = 'margin:0 0 18px';

export function quizFaqLd() {
  return { '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) };
}

export function quizBody({ header, footer, url, betaForm, base }) {
  let qn = 0;
  const fieldsets = AREAS.map((a) => `
      <fieldset class="qz-area" data-area="${a.id}"${a.kids ? ' data-kids' : ''}>
        <legend>${esc(a.name)}</legend>
        ${a.kids ? `<p class="qz-note">Only if you have children at home. <label class="qz-skip"><input type="checkbox" data-skip-kids> We don’t have children at home</label></p>` : ''}
        ${a.qs.map((q) => {
          const i = qn++;
          return `<div class="qz-q" role="radiogroup" aria-labelledby="qz-q${i}">
          <p id="qz-q${i}" class="qz-text"><span class="qz-n">${i + 1}.</span> Who usually does this? ${esc(q)}.</p>
          <div class="qz-opts">${ANSWERS.map((ans, v) => `<label><input type="radio" name="q${i}" value="${v}"${a.kids ? ' data-kq' : ''}> ${esc(ans)}</label>`).join('')}</div>
        </div>`;
        }).join('')}
      </fieldset>`).join('');

  return `<div style="min-height:100vh;background:#F7F5EF;overflow-x:hidden">
${header}
  <style>
  .qz-wrap{max-width:780px}
  .qz-area{margin:0 0 28px;padding:24px clamp(18px,3vw,28px);border:1px solid #EDE8DC;border-radius:24px;background:#fff}
  .qz-area legend{padding:0 8px;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#2E6A5C}
  .qz-note{margin:0 0 6px;font-size:14.5px;color:#5E645F}
  .qz-skip{display:inline-flex;gap:8px;align-items:center;margin-left:6px;font-weight:600;color:#1B1F1D;cursor:pointer}
  .qz-q{padding:16px 0;border-top:1px solid #F0ECE2}
  .qz-q:first-of-type{border-top:0}
  .qz-text{margin:0 0 10px;font-size:16.5px;line-height:1.5;color:#1B1F1D;font-weight:600}
  .qz-n{color:#686D68;font-weight:500}
  .qz-opts{display:flex;flex-wrap:wrap;gap:8px}
  .qz-opts label{display:inline-flex;align-items:center;gap:7px;min-height:40px;padding:0 14px;border:1px solid #DAD4C6;border-radius:99px;font-size:14px;color:#4B504B;cursor:pointer;background:#FBFAF6}
  .qz-opts label:has(input:checked){border-color:#2E6A5C;background:#E6F1ED;color:#1B1F1D;font-weight:600}
  .qz-opts input{accent-color:#2E6A5C;margin:0}
  .qz-area.skipped .qz-q{opacity:.4;pointer-events:none}
  .qz-go{min-height:52px;padding:0 28px;font:inherit;font-size:16px;font-weight:600;color:#F7F5EF;background:#1B1F1D;border:0;border-radius:99px;cursor:pointer}
  .qz-go:hover{background:#2E6A5C}
  .qz-err{margin:12px 0 0;color:#8F4A31;font-weight:600;font-size:14.5px}
  .qz-result{margin:8px 0 0;padding:clamp(22px,4vw,36px);border-radius:24px;background:#1B1F1D;color:#F7F5EF}
  .qz-big{font-size:clamp(48px,8vw,84px);font-weight:700;letter-spacing:-.04em;line-height:1}
  .qz-result p{color:#E3E0D7;font-size:16.5px;line-height:1.6}
  .qz-bars{margin:20px 0 0;display:grid;gap:12px}
  .qz-bar{font-size:14.5px;color:#E3E0D7}
  .qz-bar b{color:#F7F5EF}
  .qz-track{height:10px;border-radius:99px;background:rgba(247,245,239,.18);margin-top:6px;overflow:hidden}
  .qz-fill{height:100%;border-radius:99px;background:#8FD0BE}
  .qz-fill.p{background:#F0A27F}
  .qz-share{margin-top:22px;padding-top:20px;border-top:1px solid rgba(247,245,239,.18)}
  .qz-share input{width:100%;min-height:46px;padding:0 14px;font:inherit;font-size:14px;border-radius:12px;border:1px solid #4B504B;background:#2A2F2C;color:#F7F5EF}
  .qz-copy{margin-top:10px;min-height:46px;padding:0 22px;font:inherit;font-weight:600;border-radius:99px;border:0;background:#F7F5EF;color:#1B1F1D;cursor:pointer}
  .qz-list{margin:10px 0 0;padding-left:20px;color:#E3E0D7;font-size:15.5px;line-height:1.55}
  .qz-faq h3{font-size:19px;letter-spacing:-.015em;color:#1B1F1D;margin:26px 0 8px}
  </style>
  <section style="max-width:1180px;margin:0 auto;padding:clamp(48px,7vw,88px) 28px 8px">
    <nav aria-label="Breadcrumb" style="font-size:12.5px;color:#686D68;margin-bottom:18px"><a href="${url('/')}" style="color:#686D68">Home</a></nav>
    <h1 style="margin:0;max-width:900px;font-size:clamp(34px,5vw,64px);line-height:1.03;letter-spacing:-.035em;font-weight:700;text-wrap:balance">The mental load quiz for couples</h1>
    <p style="margin:22px 0 0;max-width:640px;font-size:17.5px;line-height:1.6;color:#5E645F;text-wrap:pretty">Twenty questions about who notices, plans and remembers in your home. It takes about four minutes. Then send it to your partner and see where your two answers differ, which is usually the interesting part. Nothing is stored and there is no sign-up.</p>
    <img src="${url('/img/quiz/mental-load-quiz.webp')}" width="1152" height="512" alt="Two partners at a kitchen table comparing answer cards, with a calendar, a shopping bag and a bill floating around them" style="display:block;width:100%;max-width:900px;height:auto;margin:32px 0 0;border-radius:24px" fetchpriority="high">
  </section>

  <section style="max-width:1180px;margin:0 auto;padding:24px 28px 8px">
    <div class="qz-wrap">
      <div id="qz-partner" hidden style="margin:0 0 24px;padding:18px 22px;border-radius:18px;background:#E6F1ED;color:#1B1F1D;font-size:16px;line-height:1.55"><strong>Your partner has taken this quiz.</strong> Answer the same questions from your side, and you will see both of your answers next to each other. Your partner’s answers are not shown until you finish.</div>
      <form id="qz" data-quiz novalidate>
        ${fieldsets}
        <button class="qz-go" type="submit">See my result</button>
        <p class="qz-err" role="alert" hidden></p>
      </form>
      <div id="qz-out" aria-live="polite" tabindex="-1"></div>
      <noscript><p style="margin:16px 0 0;color:#4B504B">The quiz works out your result in your browser, which needs JavaScript. Every question is above, so you can still talk them through together.</p></noscript>
    </div>
  </section>

  <section style="max-width:1180px;margin:0 auto;padding:16px 28px 8px">
    <div class="qz-wrap" style="font-size:16.5px;line-height:1.68;color:#4B504B">
      <h2 style="${H2}">What this quiz measures</h2>
      <p style="${P}">Most chore lists count the doing: the washing up, the school run, the shopping. This quiz counts the part before the doing: noticing that something needs to happen, working out what to do about it, and remembering to check it got done. Researchers call it cognitive household labour, and the sociologist Allison Daminger describes it in four steps: anticipating a need, identifying the options, deciding, and monitoring the result (<em>American Sociological Review</em>, 2019).</p>
      <p style="${P}">That part tends to collect with one person, because it is quicker for whoever already holds the information to keep holding it. It is also hard to see from the outside, which is why the two of you can honestly remember the same week differently.</p>
      <h2 style="${H2}">How to read your result</h2>
      <p style="${P}">Your result is the share of the noticing and planning that you feel sits with you, across the questions that apply to your home. Around 50% means it is roughly shared. A result of 70% or more means most of it runs through you at the moment; 30% or less means most of it runs through your partner.</p>
      <p style="${P}">A number on its own is not a judgement about either of you. Plenty of couples agree an uneven split on purpose, for example when one of you works fewer paid hours. The useful questions are whether you both chose it, whether it still suits you, and whether you see it the same way. If you want the time side as well, the <a href="${url('/calculator/')}">household fairness calculator</a> adds paid work, housework and childcare, and <a href="${url('/blog/what-is-the-mental-load/')}">what the mental load is</a> explains the idea in full.</p>
      <h2 style="${H2}">When you and your partner answer differently</h2>
      <p style="${P}">It is very common for both partners to answer “Me” to the same job. Usually you are each holding a different part of it: one remembers the birthday, the other buys the present. Sometimes one of you did not know a job existed at all. Treat each difference as a question to ask (“what does that one involve for you?”) rather than a point to settle. <a href="${url('/blog/how-to-explain-the-mental-load-to-a-partner/')}">How to explain the mental load to a partner</a> has words for that conversation.</p>
      <div class="qz-faq">
        <h2 style="${H2}">Questions about the quiz</h2>
        ${FAQ.map(([q, a]) => `<h3>${esc(q)}</h3><p style="${P}">${esc(a)}</p>`).join('\n        ')}
      </div>
    </div>
  </section>

  <section aria-labelledby="quiz-beta" style="max-width:1180px;margin:0 auto;padding:24px 28px clamp(64px,8vw,110px)">
    <div style="max-width:780px;background:#fff;border:1px solid #EDE8DC;border-radius:24px;padding:clamp(22px,4vw,36px)">
      <h2 id="quiz-beta" style="font-size:clamp(22px,2.6vw,30px);line-height:1.15;letter-spacing:-.03em;font-weight:700;color:#1B1F1D;margin:0 0 10px">See it week by week, not once</h2>
      <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#4B504B">The quiz is a snapshot. The EvenUS app asks each of you privately who keeps track of each area, counts that time alongside chores and money, and suggests one thing to try each week. It is in closed testing now.</p>
      ${betaForm('quiz', { base })}
    </div>
  </section>
${footer}
</div>`;
}
