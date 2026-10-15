// ---------------------------------------------------------------------------
// The website calculator against the APP'S REAL ENGINE.
//
//   npm run test:engine                       (2,500 random weeks, default)
//   npm run test:engine -- --cases 10000
//   npm run test:engine -- --write-golden     (also rewrites src/calc/golden.json)
//
// Imports evenus/src/lib/fairness.ts by relative path, at test time only:
// nothing from the app is shipped, and the build never needs the app repo.
// Each random week is turned into what the app would hold for it (a
// household, its chore logs as real start/end spans, the planning answers of
// both partners, the week's shared expenses) and scored with
// buildFairnessReport for the complete week. The port (src/calc/engine.js)
// must give the identical time balance, money balance, overall score, free
// hours, outstanding amount and guardrail: a single point of difference fails.
//
// The app repo is expected beside this one (../evenus); EVENUS_APP overrides.
// ---------------------------------------------------------------------------

import { createRequire } from 'node:module';
import { existsSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const site = resolve(here, '..', '..');
const appRoot = resolve(process.env.EVENUS_APP || join(site, '..', 'evenus'));
if (!existsSync(join(appRoot, 'src', 'lib', 'fairness.ts'))) {
  console.error(`❌ The app's engine is not at ${appRoot}/src/lib/fairness.ts (set EVENUS_APP).`);
  process.exit(1);
}

const require = createRequire(import.meta.url);
const port = require('./engine.js');
const app = await import(pathToFileURL(join(appRoot, 'src', 'lib', 'fairness.ts')).href);
const time = await import(pathToFileURL(join(appRoot, 'src', 'lib', 'time.ts')).href);
const { buildFairnessReport } = app;
const { commuteFromWeeklyHours } = time;

const args = process.argv.slice(2);
const N = Number(args[args.indexOf('--cases') + 1]) > 0 && args.includes('--cases') ? Number(args[args.indexOf('--cases') + 1]) : 2500;
const WRITE = args.includes('--write-golden');

// --- a seeded generator, so a failure can be replayed ------------------------
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(Number(process.env.SEED || 20261014));
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)];
const step = (lo: number, hi: number, s: number) => lo + Math.round((rnd() * (hi - lo)) / s) * s;
const chance = (p: number) => rnd() < p;

const BANDS = Object.keys(port.CHILD_BANDS);
const HOLDERS = Object.keys(port.HOLDERS);

function randomInput(i: number) {
  const children = chance(0.45) ? Array.from({ length: 1 + Math.floor(rnd() * 3) }, () => pick(BANDS)) : [];
  const planning: Record<string, string> = {};
  if (!chance(0.15)) {
    for (const d of port.DOMAINS) {
      if (d.when !== 'always' && children.length === 0) continue;
      planning[d.key] = pick(HOLDERS);
    }
  }
  // A spread of households: small and large logs, the hold's edge, zero incomes.
  const thin = chance(0.08);
  const input: any = {
    incomeA: chance(0.06) ? 0 : step(500, 15000, 50),
    incomeB: chance(0.06) ? 0 : step(500, 15000, 50),
    paidA: chance(0.1) ? 0 : step(0, 70, chance(0.2) ? 0.5 : 1),
    paidB: chance(0.1) ? 0 : step(0, 70, chance(0.2) ? 0.5 : 1),
    commuteA: chance(0.4) ? 0 : step(0, 20, 0.5),
    commuteB: chance(0.4) ? 0 : step(0, 20, 0.5),
    choresA: thin ? step(0, 1, 0.5) : step(0, 60, 0.5),
    choresB: thin ? step(0, 0.5, 0.5) : step(0, 60, 0.5),
    childcareA: children.length && chance(0.6) ? step(0, 40, 0.5) : 0,
    childcareB: children.length && chance(0.6) ? step(0, 40, 0.5) : 0,
    children,
    planning,
    mode: pick(port.MODES),
    spentA: chance(0.25) ? 0 : chance(0.3) ? step(0, 3000, 1) : Math.round(rnd() * 300000) / 100,
    spentB: chance(0.25) ? 0 : chance(0.3) ? step(0, 3000, 1) : Math.round(rnd() * 300000) / 100,
  };
  if (chance(0.15)) Object.assign(input, port.asAgreed(input, step(50, 4000, 10)));
  if (chance(0.1)) { input.sleepA = step(5, 10, 0.5); input.sleepB = step(5, 10, 0.5); }
  if (chance(0.1)) { input.personalA = step(0, 4, 0.5); input.personalB = step(0, 4, 0.5); }
  return input;
}

// --- what the app would hold for that week ----------------------------------
const START = Date.UTC(2026, 9, 5); // Monday 5 October 2026, 00:00 UTC
const DAY = 86_400_000;
const END = START + 7 * DAY - 1;
const YEAR = 365.25 * DAY;

/** Integer minutes spread over the seven days (what a week of logs adds up to). */
function perDay(total: number): number[] {
  const base = Math.floor(total / 7);
  const out = Array(7).fill(base);
  for (let k = 0; k < total - base * 7; k++) out[k] += 1;
  return out;
}

function appWeek(input: any) {
  const members = ['alex', 'sam'];
  const detail = (id: string, x: 'A' | 'B') => ({
    userId: id,
    name: id === 'alex' ? 'Alex' : 'Sam',
    monthlyIncome: input['income' + x],
    incomeFrequency: 'monthly',
    paidWorkHoursPerWeek: input['paid' + x],
    ...(input['sleep' + x] != null ? { sleepHoursPerNight: input['sleep' + x] } : {}),
    ...(input['personal' + x] != null ? { personalHoursPerDay: input['personal' + x] } : {}),
    ...commuteFromWeeklyHours(input['commute' + x] || 0),
  });
  const household: any = {
    id: 'calc', name: 'Calc', members,
    partnerDetails: { alex: detail('alex', 'A'), sam: detail('sam', 'B') },
    children: (input.children || []).map((band: string, i: number) => ({
      id: 'kid' + i,
      name: 'Kid ' + i,
      birthDate: new Date(END - port.CHILD_BANDS[band].age * YEAR).toISOString().slice(0, 10),
      relationshipTo: { alex: 'BIOLOGICAL', sam: 'BIOLOGICAL' },
      shapeChoice: 'OURS',
    })),
    domainsDone: members,
    moneyMode: input.mode,
    defaultCurrency: 'USD',
    fairnessWeights: { effort: 0.6, finance: 0.4 },
    childExpenseWeight: 0.3,
    timeZone: 'UTC',
    createdAt: START - 60 * DAY,
  };

  const logs: any[] = [];
  for (const [id, x] of [['alex', 'A'], ['sam', 'B']] as const) {
    const chores = perDay(Math.round(input['chores' + x] * 60));
    const care = perDay(Math.round((input['childcare' + x] || 0) * 60));
    for (let d = 0; d < 7; d++) {
      let at = START + d * DAY + 30 * 60_000;
      for (const [mins, cat] of [[chores[d], 'Cleaning'], [care[d], 'Childcare']] as const) {
        if (mins <= 0) continue;
        const end = at + mins * 60_000;
        logs.push({
          id: `${id}-${cat}-${d}`, choreId: cat === 'Childcare' ? 'c-care' : 'c-home', completedBy: id,
          startedAt: at, completedAt: end, minutes: mins, mentalLoad: false, categoryAtLog: cat,
        });
        at = end + 5 * 60_000;
      }
    }
  }

  const answers: any[] = [];
  for (const d of port.DOMAINS) {
    const pair = port.HOLDERS[input.planning?.[d.key]];
    if (!pair) continue;
    answers.push({ id: d.key + '-alex', domain: d.key, answeredBy: 'alex', ownership: pair[0], answeredAt: START });
    answers.push({ id: d.key + '-sam', domain: d.key, answeredBy: 'sam', ownership: pair[1], answeredAt: START });
  }

  const expenses: any[] = [];
  for (const [id, x] of [['alex', 'A'], ['sam', 'B']] as const) {
    if (!(input['spent' + x] > 0)) continue;
    expenses.push({
      id: 'calc-' + id, title: 'Shared costs', amount: input['spent' + x], currency: 'USD',
      date: START + 2 * DAY, paidBy: id, splitType: 'income_ratio', category: 'Other',
      isSettlement: false, createdBy: id,
    });
  }

  const r = buildFairnessReport(household, expenses, logs, START, END, { now: END, domainAnswers: answers });
  const out = r.outstanding ?? null;
  return {
    freeA: r.time.breakdowns.alex.discretionary,
    freeB: r.time.breakdowns.sam.discretionary,
    timeBalance: r.time.score,
    timePending: r.timePending ? r.timePendingReason ?? 'unknown' : null,
    moneyBalance: r.moneyInUse ? r.finance.score : null,
    overall: r.noOverall ? null : r.overallScore,
    outstanding: out ? { from: out.from, to: out.to, amount: out.amount } : null,
    guardrail: r.guardrail?.kind ?? null,
    // The ceiling the app's trade sentence quotes ("can score up to N").
    tradeCap: r.explanation?.trade ? Number((/up to (\d+)/.exec(r.explanation.trade) || [])[1]) : null,
  };
}

function portWeek(input: any) {
  const p = port.compute(input);
  return {
    freeA: p.free.alex,
    freeB: p.free.sam,
    timeBalance: p.timeBalance,
    timePending: p.timePending,
    moneyBalance: p.moneyBalance,
    overall: p.overall,
    outstanding: p.outstanding,
    guardrail: p.guardrail,
    tradeCap: p.offsetting ? p.tradeCeiling : null,
  };
}

// --- run --------------------------------------------------------------------
const FIELDS = ['freeA', 'freeB', 'timeBalance', 'timePending', 'moneyBalance', 'overall', 'outstanding', 'guardrail', 'tradeCap'] as const;
let mismatches = 0;
const stats = { pending: 0, noOverall: 0, money: 0, trade: 0, children: 0, planning: 0, guard: 0 };
const golden: any[] = [];
const shown: string[] = [];

for (let i = 0; i < N; i++) {
  const input = randomInput(i);
  const a = appWeek(input);
  const b = portWeek(input);
  const diff = FIELDS.filter((f) => JSON.stringify(a[f]) !== JSON.stringify(b[f]));
  if (diff.length) {
    mismatches++;
    if (shown.length < 5) shown.push(`case ${i}: ${diff.map((f) => `${f} app=${JSON.stringify(a[f])} site=${JSON.stringify(b[f])}`).join('; ')}\n   input ${JSON.stringify(input)}`);
  }
  if (a.timePending) stats.pending++;
  if (a.overall === null) stats.noOverall++;
  if (a.moneyBalance !== null) stats.money++;
  if (port.compute(input).offsetting) stats.trade++;
  if (input.children.length) stats.children++;
  if (Object.keys(input.planning).length) stats.planning++;
  if (a.guardrail) stats.guard++;
  // The golden table: an even spread of the run, plus every kind of case early.
  if (golden.length < 50 && (i % Math.floor(N / 50) === 0)) golden.push({ input, expect: a });
}

// The calculator's own opening states belong in the table too.
const openings = [
  { incomeA: 4500, incomeB: 4200, paidA: 42, paidB: 34, choresA: 8, choresB: 23, spentA: 450, spentB: 420, mode: 'proportional', children: [], planning: {} },
];
for (const input of openings) golden.splice(0, 1, { input, expect: appWeek(input) });

console.log(`\n  ${N} random weeks through the app's engine and the website port`);
console.log(`    time held (under an hour logged): ${stats.pending} · no overall: ${stats.noOverall} · money in use: ${stats.money}`);
console.log(`    trades: ${stats.trade} · with children: ${stats.children} · with planning areas: ${stats.planning} · guardrails: ${stats.guard}`);
if (mismatches) {
  console.error(`\n❌ ${mismatches} of ${N} differ:\n   ` + shown.join('\n   '));
  process.exit(1);
}
console.log(`  ✅ 0 mismatches: time balance, money balance, overall, free hours, outstanding, guardrail and trade ceiling identical in all ${N}`);

if (WRITE) {
  const file = join(here, 'golden.json');
  writeFileSync(file, JSON.stringify({
    note: 'Generated by src/calc/compare-app.mts from the EvenUS app engine (buildFairnessReport, one complete week, nothing carried). The build checks src/calc/engine.js against every case. Do not edit by hand.',
    generated: new Date().toISOString().slice(0, 10),
    cases: golden,
  }, null, 1) + '\n');
  console.log(`  wrote ${golden.length} golden cases -> src/calc/golden.json`);
}
