// ---------------------------------------------------------------------------
// The calculator's build-time side.
//
//   checkGolden()      the port (engine.js) against the golden table the app's
//                      own engine produced (compare-app.mts). Any difference
//                      fails the build.
//   checkHomeDemo()    the homepage widget's static figures (rendered from the
//                      design file) are what the engine says for its sliders.
//                      A design edit that drifts from the formula fails here.
//   calculatorDemo()   the /calculator/ page's version of the widget: the
//                      homepage's six sliders plus commuting, children,
//                      childcare, planning areas, the split method and who
//                      paid, opened on figures the engine painted at build.
// ---------------------------------------------------------------------------

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
export const engine = require('./engine.js');
export const ENGINE_SOURCE = readFileSync(join(here, 'engine.js'), 'utf8');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function checkGolden() {
  const { cases } = JSON.parse(readFileSync(join(here, 'golden.json'), 'utf8'));
  if (!Array.isArray(cases) || cases.length < 50) throw new Error(`calculator: golden table has ${cases?.length ?? 0} cases, needs 50`);
  const bad = [];
  for (const [i, c] of cases.entries()) {
    const p = engine.compute(c.input);
    const got = {
      freeA: p.free.alex, freeB: p.free.sam, timeBalance: p.timeBalance, timePending: p.timePending,
      moneyBalance: p.moneyBalance, overall: p.overall, outstanding: p.outstanding, guardrail: p.guardrail,
      tradeCap: p.offsetting ? p.tradeCeiling : null,
    };
    for (const k of Object.keys(c.expect)) {
      if (JSON.stringify(got[k]) !== JSON.stringify(c.expect[k])) bad.push(`case ${i} ${k}: app ${JSON.stringify(c.expect[k])}, site ${JSON.stringify(got[k])}`);
    }
  }
  if (bad.length) throw new Error('calculator: the website engine no longer matches the app\'s golden table:\n  ' + bad.slice(0, 10).join('\n  '));
  return cases.length;
}

/** The homepage widget's inputs, as the design file sets them. */
export const HOME = { incomeA: 4500, incomeB: 4200, paidA: 42, paidB: 34, choresA: 8, choresB: 23, mode: 'proportional', children: [], planning: {} };
export function homeInput() { return { ...HOME, ...engine.asAgreed(HOME, 1000) }; }

const outText = (html, key) => {
  const m = new RegExp(`data-out="${key}"[^>]*>([^<]*)<`).exec(html);
  return m ? m[1] : null;
};

export function checkHomeDemo(html) {
  const v = engine.view(homeInput());
  const want = { score: v.score, freeA: v.freeA, freeB: v.freeB, headline: v.headline, split: v.split.replace('·', '·') };
  const bad = Object.entries(want).filter(([k, w]) => outText(html, k) !== w).map(([k, w]) => `${k}: design "${outText(html, k)}", engine "${w}"`);
  if (!new RegExp(`stroke-dashoffset="${v.ring}" data-out="ring"`).test(html)) bad.push(`ring: engine ${v.ring}`);
  if (bad.length) throw new Error('calculator: the homepage widget opens on figures the app formula does not give:\n  ' + bad.join('\n  '));
  return v;
}

/** What /calculator/ opens on: the homepage week, with the everyday planning areas shared. */
export const CALC = {
  ...HOME, commuteA: 0, commuteB: 0, childcareA: 0, childcareB: 0, spentA: 450, spentB: 420,
  planning: Object.fromEntries(engine.DOMAINS.map((d) => [d.key, 'shared'])),
};
const calcInput = () => ({ ...CALC, planning: Object.fromEntries(engine.DOMAINS.filter((d) => d.when === 'always').map((d) => [d.key, 'shared'])) });

const LABEL = 'display:flex;justify-content:space-between;gap:12px;font-size:13.5px;font-weight:600;margin-bottom:6px';
const SUB = 'font-size:12.5px;color:#5E645F;font-weight:500';
const FIELD = 'width:100%;min-height:44px;font:inherit;font-size:14.5px;color:#1B1F1D;background:#fff;border:1px solid #B9B3A5;border-radius:12px;padding:0 12px;box-sizing:border-box';
const LEGEND = 'font-size:13.5px;font-weight:600;padding:0;margin-bottom:10px';

const HOLDER_WORDS = [
  ['alex', 'Just Alex'], ['mostlyAlex', 'Mostly Alex'], ['shared', 'Genuinely shared'], ['mostlySam', 'Mostly Sam'],
  ['sam', 'Just Sam'], ['outsourced', 'We pay someone'], ['na', "Doesn't apply to us"],
];
const MODE_OPTIONS = [
  ['proportional', 'Proportional to income'],
  ['equal', 'Half each'],
  ['equal_remainder', 'Half each, then level what is left'],
  ['residual', 'A floor each, then by income'],
];

function sliders(label, key, max, value, outKey) {
  return `<div>
            <div style="${LABEL}"><span>${label}</span><span style="${SUB}" data-out="${outKey}">${value}h · ${value}h</span></div>
            <input type="range" min="0" max="${max}" step="0.5" value="${value}" data-calc="${key}A" style="width:100%;accent-color:#6FB3A2">
            <input type="range" min="0" max="${max}" step="0.5" value="${value}" data-calc="${key}B" style="width:100%;accent-color:#F0A48A">
          </div>`;
}

function extras() {
  const bands = Object.entries(engine.CHILD_BANDS);
  const child = (i) => `<div style="flex:1 1 140px">
              <label for="calc-child-${i}" style="display:block;font-size:12.5px;color:#5E645F;margin-bottom:4px">Child ${i + 1}</label>
              <select id="calc-child-${i}" data-calc-child style="${FIELD}">
                <option value="none" selected>None</option>
                ${bands.map(([k, b]) => `<option value="${k}">${esc(b.label)}</option>`).join('')}
              </select>
            </div>`;
  const plan = (d) => `<div data-plan-row ${d.when === 'always' ? '' : 'hidden '}style="padding:8px 0;border-top:1px solid #EFEBE1">
              <label for="calc-plan-${d.key}" style="display:flex;justify-content:space-between;gap:10px;font-size:13.5px;margin-bottom:6px"><span>${esc(d.label)}</span><span style="color:#5E645F">about ${d.hours} h a week</span></label>
              <select id="calc-plan-${d.key}" data-plan="${d.key}" data-when="${d.when}" style="${FIELD}">
                ${HOLDER_WORDS.map(([v, w]) => `<option value="${v}"${v === 'shared' ? ' selected' : ''}>${esc(w)}</option>`).join('')}
              </select>
            </div>`;
  const money = (x, who, value) => `<div style="flex:1 1 140px">
              <label for="calc-spent${x}" style="display:block;font-size:12.5px;color:#5E645F;margin-bottom:4px">Paid by ${who} ($)</label>
              <input id="calc-spent${x}" type="number" inputmode="decimal" min="0" step="1" value="${value}" data-calc="spent${x}" style="${FIELD}">
            </div>`;
  return `<div class="calc-x" style="display:flex;flex-direction:column;gap:22px;margin-top:22px">
          ${sliders('Commute, hours a week', 'commute', 20, 0, 'commute')}
          <fieldset style="border:0;margin:0;padding:0;min-width:0">
            <legend style="${LEGEND}">Children living with you</legend>
            <div style="display:flex;flex-wrap:wrap;gap:10px">${[0, 1, 2].map(child).join('')}</div>
            <p style="margin:8px 0 0;font-size:12.5px;line-height:1.5;color:#5E645F">Each child adds the app's estimate of hands-on care for their age, shared evenly. Every child after the one needing the most care adds 60% of their own estimate.</p>
          </fieldset>
          <div data-childcare hidden>
            ${sliders('Childcare logged, hours a week', 'childcare', 40, 0, 'childcare')}
            <p style="margin:8px 0 0;font-size:12.5px;line-height:1.5;color:#5E645F">Logged childcare counts as your time and replaces your own share of the estimate, never your partner's.</p>
          </div>
          <details style="border:1px solid #EDE8DC;border-radius:16px;padding:0 14px">
            <summary style="min-height:44px;display:flex;align-items:center;font-size:13.5px;font-weight:600;cursor:pointer">Planning areas: who keeps track?</summary>
            <p style="margin:0 0 8px;font-size:12.5px;line-height:1.5;color:#5E645F">Each area carries the app's estimated hours a week. The answers match the app's survey: "Mostly" counts 75% to one of you, "We pay someone" 10% each.</p>
            ${engine.DOMAINS.map(plan).join('')}
          </details>
          <fieldset style="border:0;margin:0;padding:0;min-width:0">
            <legend style="${LEGEND}">Shared costs this week</legend>
            <div style="display:flex;flex-wrap:wrap;gap:10px">${money('A', 'Alex', CALC.spentA)}${money('B', 'Sam', CALC.spentB)}</div>
          </fieldset>
        </div>`;
}

/** Puts a computed figure into the element carrying data-out="key". */
function paint(html, key, text) {
  const re = new RegExp(`(data-out="${key}"[^>]*>)[^<]*(<)`);
  if (!re.test(html)) throw new Error(`calculator: output "${key}" not found`);
  return html.replace(re, (_m, a, b) => a + esc(text) + b);
}

export function calculatorDemo(demo) {
  const must = (find, replace, name) => {
    const n = demo.split(find).length - 1;
    if (n !== 1) throw new Error(`calculator page: anchor "${name}" found ${n} times`);
    demo = demo.replace(find, replace);
  };

  // The intro: on this page it is the calculator, not a link to it.
  demo = demo.replace(/(<p style="margin:18px 0 0;[^"]*">)The calculation the app runs[\s\S]*?<\/p>/, (_m, open) =>
    `${open}The same calculation the app runs, for one complete week with nothing carried over from earlier weeks. Each partner's time and the shared costs, separately.</p>`);
  if (!/one complete week with nothing carried over from earlier weeks\. Each partner/.test(demo)) throw new Error('calculator page: intro paragraph not found');

  // The split-method row becomes a choice, and the extra inputs go above it.
  const row = /<div style="display:flex;align-items:center;gap:12px;margin-top:26px;padding-top:20px;border-top:1px solid #EFEBE1">[\s\S]*?Proportional to income<\/span>\s*<\/div>/;
  if (!row.test(demo)) throw new Error('calculator page: split-method row not found');
  demo = demo.replace(row, `${extras()}
        <div style="margin-top:26px;padding-top:20px;border-top:1px solid #EFEBE1">
          <label for="calc-mode" style="display:block;font-size:12.5px;color:#5E645F;margin-bottom:6px">Split method for shared costs</label>
          <select id="calc-mode" data-calc-mode style="${FIELD}">
            ${MODE_OPTIONS.map(([v, w]) => `<option value="${v}"${v === 'proportional' ? ' selected' : ''}>${esc(w)}</option>`).join('')}
          </select>
        </div>`);

  // The result card: the mode's name, both balances, what evens it up, a note.
  must('<div style="font-size:12px;color:rgba(247,245,239,.55);margin-top:4px">Proportional to income</div>',
    '<div style="font-size:12px;color:rgba(247,245,239,.55);margin-top:4px" data-out="mode">Proportional to income</div>', 'mode');
  must('<div style="margin-top:26px;background:rgba(111,179,162,.14)',
    `<div style="margin-top:24px;padding-top:20px;border-top:1px solid rgba(247,245,239,.14)">
          <div style="font-size:15px;font-weight:700" data-out="balances">.</div>
          <div style="font-size:13px;color:rgba(247,245,239,.7);margin-top:6px" data-out="owed">.</div>
          <p style="font-size:13px;line-height:1.5;color:rgba(247,245,239,.7);margin:10px 0 0" data-out="note" hidden>.</p>
        </div>
        <div style="margin-top:26px;background:rgba(111,179,162,.14)`, 'balances');

  // Open on the engine's own figures for the page's defaults.
  const v = engine.view(calcInput());
  for (const k of ['score', 'headline', 'suggestion', 'freeA', 'freeB', 'split', 'mode', 'balances', 'owed', 'note']) demo = paint(demo, k, v[k]);
  demo = demo.replace(/stroke-dashoffset="\d+" data-out="ring"/, `stroke-dashoffset="${v.ring}" data-out="ring"`);
  demo = demo.replace(/width:\d+%" data-out="barA"/, `width:${v.barA}" data-out="barA"`);
  demo = demo.replace(/width:\d+%" data-out="barB"/, `width:${v.barB}" data-out="barB"`);
  if (v.note) demo = demo.replace('data-out="note" hidden', 'data-out="note"');
  return { demo, view: v };
}
