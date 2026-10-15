/* EvenUS fairness engine, website port.
 *
 * A self-contained copy of the arithmetic the EvenUS app runs for ONE
 * complete week with nothing carried in from earlier weeks (no running
 * balance, no hold from earlier weeks, nobody away, no leave, no calendar).
 * The app's code is the source of truth:
 *
 *   evenus/src/lib/time.ts       calculateTimeSummary, timeBreakdown, timeBalance
 *   evenus/src/lib/children.ts   householdCareSplit, baseCareHoursPerWeek
 *   evenus/src/lib/domains.ts    DOMAINS, countedMentalLoad
 *   evenus/src/lib/money.ts      contributionWeights, allocateCents, roundMoney
 *   evenus/src/lib/fairness.ts   calculateFinancialSummary, outstandingScore,
 *                                compositeScore, buildFairnessReport
 *
 * ⚠️ DO NOT "TIDY" THE ARITHMETIC. The order of every addition matches the
 * app so the floating-point results are bit-identical, and a rounding at
 * x.5 lands the same way. `node src/calc/compare-app.mjs` (npm run
 * test:engine) runs thousands of random weeks through this file and the
 * app's real engine and fails on a single point of difference; the build
 * re-checks a stored golden table of 50 of them (src/calc/golden.json).
 *
 * Runs in a browser (window.EvenusEngine) and in Node (module.exports).
 */
(function (root) {
  'use strict';

  var A = 'alex';
  var B = 'sam';
  var MEMBERS = [A, B];

  var HOURS_IN_WEEK = 168;
  var DEFAULT_SLEEP_PER_NIGHT = 8;
  var DEFAULT_PERSONAL_PER_DAY = 2;
  var DEFAULT_COMMUTE_DAYS = 5;
  var K_TIME = 2.0;
  var SAME_HOURS = 0.05;
  var HOLD_COMBINED_MIN_MINUTES = 60;
  var SCORE_CURVE = 0.7;
  var TRADE_CAP = 90;
  var TRADE_MIN_IMBALANCE = 0.05;
  var OUTSTANDING_NOTHING = 1;
  var OUTSTANDING_INCOME_SHARE = 0.25;
  var OUTSTANDING_FLOOR_USD = 100;
  var DEFAULT_FLOOR_FRACTION = 0.25;
  var BURNOUT_FLOOR_HOURS = 14;
  var MAX_MONEY = 1e12;

  /** Age bands the calculator offers, at an age inside each band (children.ts baseCareHoursPerWeek). */
  var CHILD_BANDS = {
    under1: { label: 'Under 1', age: 0.5 },
    '1to2': { label: '1 to 2', age: 2 },
    '3to5': { label: '3 to 5', age: 4.5 },
    '6to11': { label: '6 to 11', age: 9 },
    '12to15': { label: '12 to 15', age: 14 },
    '16to17': { label: '16 to 17', age: 17 },
    adult: { label: '18 or over', age: 19.5 },
  };

  /** domains.ts DOMAINS, in the app's order, with their weekly hours. */
  var DOMAINS = [
    { key: 'meal_planning', hours: 2.5, label: 'Meal planning', when: 'always' },
    { key: 'grocery_management', hours: 1.5, label: 'Groceries and supplies', when: 'always' },
    { key: 'home_maintenance', hours: 1.5, label: 'Home upkeep and repairs', when: 'always' },
    { key: 'finances_admin', hours: 1.5, label: 'Money admin and bills', when: 'always' },
    { key: 'social_calendar', hours: 1.5, label: 'Social calendar', when: 'always' },
    { key: 'gifts_occasions', hours: 1.0, label: 'Gifts and occasions', when: 'always' },
    { key: 'travel_planning', hours: 1.0, label: 'Travel and holidays', when: 'always' },
    { key: 'insurance_legal', hours: 0.5, label: 'Insurance and paperwork', when: 'always' },
    { key: 'school_admin', hours: 3.0, label: 'School admin', when: 'school' },
    { key: 'child_health', hours: 1.5, label: "Children's health", when: 'children' },
    { key: 'child_activities', hours: 2.0, label: "Children's activities", when: 'school' },
  ];

  /** How an answer splits a domain's hours: [answerer, partner] (domains.ts SPLIT). */
  var SPLIT = {
    ME: [1.0, 0.0],
    MOSTLY_ME: [0.75, 0.25],
    SHARED: [0.5, 0.5],
    MOSTLY_THEM: [0.25, 0.75],
    THEM: [0.0, 1.0],
    OUTSOURCED: [0.1, 0.1],
    NOT_APPLICABLE: [0, 0],
  };

  /**
   * The calculator asks once per area who holds it; both partners are taken
   * to answer the same way, each from their own side.
   */
  var HOLDERS = {
    alex: ['ME', 'THEM'],
    mostlyAlex: ['MOSTLY_ME', 'MOSTLY_THEM'],
    shared: ['SHARED', 'SHARED'],
    mostlySam: ['MOSTLY_THEM', 'MOSTLY_ME'],
    sam: ['THEM', 'ME'],
    outsourced: ['OUTSOURCED', 'OUTSOURCED'],
    na: ['NOT_APPLICABLE', 'NOT_APPLICABLE'],
  };

  var MODES = ['proportional', 'equal', 'equal_remainder', 'residual'];

  // --- small helpers, as the app has them ---------------------------------

  function finiteIn(n, lo, hi, fallback) {
    var v = typeof n === 'number' ? n : Number(n);
    if (!isFinite(v)) return fallback;
    return Math.max(lo, Math.min(hi, v));
  }
  function safeMoney(n) {
    var v = typeof n === 'number' ? n : Number(n);
    if (!isFinite(v) || v <= 0) return 0;
    return Math.min(v, MAX_MONEY);
  }
  function normaliseZero(n) { return (n === 0) ? 0 : n; }
  function roundMoney(v) {
    var n = typeof v === 'number' ? v : Number(v);
    if (!isFinite(n)) return 0;
    var f = 100;
    var r = Math.sign(n) * Math.round(Math.abs(n) * f * (1 + Number.EPSILON * 4)) / f;
    return r === 0 ? 0 : r;
  }
  function moneyOf(v) { return roundMoney(safeMoney(v)); }
  function cents(n) { return normaliseZero(Math.round(n * 100) / 100); }
  function clampScore(n) { return Math.max(0, Math.min(100, Math.round(n))); }

  function hash32(s) {
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  function allocateCents(total, parts, tieKeys) {
    if (parts.length === 0) return [];
    var unit = 100;
    var clean = parts.map(function (p) { return isFinite(p) ? p : 0; });
    var target = Math.round(total * unit);
    var cs = clean.map(function (p) { return p * unit; });
    var floors = cs.map(function (c) { return Math.floor(c + 1e-9); });
    var leftover = target - floors.reduce(function (s, n) { return s + n; }, 0);
    var rank = tieKeys && tieKeys.length === parts.length ? tieKeys.map(hash32) : null;
    var order = cs.map(function (c, i) { return { i: i, frac: c - floors[i] }; })
      .sort(function (a, b) {
        var d = b.frac - a.frac;
        if (Math.abs(d) > 1e-9) return d;
        if (rank && rank[a.i] !== rank[b.i]) return rank[a.i] - rank[b.i];
        return a.i - b.i;
      });
    var out = floors.slice();
    var k = 0;
    while (leftover !== 0 && k < order.length * 4) {
      var idx = order[k % order.length].i;
      out[idx] += leftover > 0 ? 1 : -1;
      leftover += leftover > 0 ? -1 : 1;
      k++;
    }
    return out.map(function (c) { return normaliseZero(c / unit); });
  }

  /** Hours as whole minutes: what one week of logs adds up to. */
  function minutesOf(hours) { return Math.round(finiteIn(hours, 0, HOURS_IN_WEEK, 0) * 60); }

  // --- time ------------------------------------------------------------------

  /** time.ts commuteFromWeeklyHours + commuteHoursPerWeek: N hours a week, five days. */
  function commuteHours(hoursPerWeek) {
    var hours = finiteIn(hoursPerWeek, 0, HOURS_IN_WEEK, 0);
    var days = DEFAULT_COMMUTE_DAYS;
    var each = Math.round(((hours * 60) / (2 * days)) * 100) / 100;
    each = finiteIn(each, 0, 24 * 60, 0);
    if (each <= 0) return 0;
    return (each * 2 * days) / 60;
  }

  function baseCareHoursPerWeek(age) {
    if (age === null) return 12;
    if (age < 1) return 60;
    if (age < 3) return 45;
    if (age < 6) return 32;
    if (age < 12) return 22;
    if (age < 16) return 12;
    if (age < 18) return 8;
    return 3;
  }

  /** children.ts householdCareSplit, for children of you both, living with you full time. */
  function careSplit(children) {
    var byMember = {};
    MEMBERS.forEach(function (id) { byMember[id] = 0; });
    var list = children.map(function (band) {
      var b = CHILD_BANDS[band];
      return { h: baseCareHoursPerWeek(b ? b.age : null) * 1 * 1 };
    }).filter(function (x) { return x.h > 0; });
    var each = list.map(function (x) { return x.h; }).sort(function (a, b) { return b - a; });
    var total = each.length === 0 ? 0 : each[0] + 0.6 * each.slice(1).reduce(function (s, h) { return s + h; }, 0);
    var sum = list.reduce(function (s, x) { return s + x.h; }, 0);
    if (total <= 0 || sum <= 0) return { total: total, byMember: byMember };
    var scale = total / sum;
    var share = 1 / MEMBERS.length;
    list.forEach(function (x) {
      MEMBERS.forEach(function (id) { byMember[id] += x.h * scale * share; });
    });
    return { total: total, byMember: byMember };
  }

  /** domains.ts countedMentalLoad, both partners finished and answering alike. */
  function planningHours(planning) {
    var hours = {};
    MEMBERS.forEach(function (id) { hours[id] = 0; });
    var counted = [];
    DOMAINS.forEach(function (d) {
      var holder = planning && planning[d.key];
      var pair = HOLDERS[holder];
      if (!pair || pair[0] === 'NOT_APPLICABLE') return;
      var totals = {};
      MEMBERS.forEach(function (id) { totals[id] = 0; });
      // Alex's answer, then Sam's: each says how it splits from their side.
      var sa = SPLIT[pair[0]];
      totals[A] += d.hours * sa[0];
      totals[B] += d.hours * sa[1];
      var sb = SPLIT[pair[1]];
      totals[B] += d.hours * sb[0];
      totals[A] += d.hours * sb[1];
      MEMBERS.forEach(function (id) { hours[id] += totals[id] / 2; });
      counted.push(d.key);
    });
    return { hours: hours, domains: counted, totalHours: hours[A] + hours[B] };
  }

  /** time.ts timeBalance. */
  function timeBalance(input) {
    var disc = input.map(function (n) { return finiteIn(n, 0, HOURS_IN_WEEK, 0); });
    var total = disc.reduce(function (s, n) { return s + n; }, 0);
    var spread = Math.max.apply(null, disc) - Math.min.apply(null, disc);
    if (total === 0 || spread < SAME_HOURS) return 100;
    var imbalance = spread / total;
    return Math.max(0, Math.min(100, Math.round(100 * (1 - imbalance * K_TIME))));
  }

  // --- money -----------------------------------------------------------------

  /** money.ts contributionWeights (no obligations, no allowance). */
  function weightsFor(input) {
    var mode = MODES.indexOf(input.mode) >= 0 ? input.mode : 'proportional';
    var out = {};
    var inc = {};
    inc[A] = Math.max(0, safeMoney(input.incomeA));
    inc[B] = Math.max(0, safeMoney(input.incomeB));
    if (mode === 'equal' || mode === 'equal_remainder') {
      MEMBERS.forEach(function (id) { out[id] = 1 / MEMBERS.length; });
      return out;
    }
    var keep = 0;
    if (mode === 'residual') {
      var total = MEMBERS.reduce(function (s, id) { return s + safeMoney(inc[id]); }, 0);
      keep = Math.round((total / MEMBERS.length) * DEFAULT_FLOOR_FRACTION);
    } else {
      keep = safeMoney(undefined);
    }
    var sum = 0;
    MEMBERS.forEach(function (id) {
      out[id] = Math.max(0, safeMoney(inc[id]) - keep);
      sum += out[id];
    });
    MEMBERS.forEach(function (id) { out[id] = sum > 0 ? out[id] / sum : 1 / MEMBERS.length; });
    return out;
  }

  /** The week's shared costs: one entry per partner who paid, on the household's own split. */
  function expensesFor(input) {
    var list = [];
    if (safeMoney(input.spentA) > 0) list.push({ id: 'calc-alex', amount: input.spentA, paidBy: A });
    if (safeMoney(input.spentB) > 0) list.push({ id: 'calc-sam', amount: input.spentB, paidBy: B });
    return list;
  }

  /** fairness.ts outstandingScore through scoreFromShares. */
  function outstandingScore(outstanding, scale) {
    var owed = Math.max(0, (isFinite(outstanding) ? Math.abs(outstanding) : 0) - OUTSTANDING_NOTHING);
    if (owed <= 0) return 100;
    if (!(scale > 0)) return 0;
    var f = Math.min(1, owed / scale);
    var actual = { a: 0.5 + f / 2, b: 0.5 - f / 2 };
    var ideal = { a: 0.5, b: 0.5 };
    var dev = Math.abs(actual.a - ideal.a) + Math.abs(actual.b - ideal.b);
    if (dev === 0) return 100;
    var maxDeviation = 2 * (1 - 0.5);
    var fraction = Math.min(dev / maxDeviation, 1);
    var score = 100 * (1 - Math.pow(fraction, SCORE_CURVE));
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  function outstandingAmount(balance) {
    var c = 0;
    MEMBERS.forEach(function (id) { c += Math.abs(Math.round((balance[id] || 0) * 100)); });
    return c / 200;
  }

  function finance(input, weights) {
    var contributions = {};
    MEMBERS.forEach(function (id) { contributions[id] = { actualPaid: 0, expectedShare: 0, deviation: 0 }; });
    var totalSpent = 0;
    var swingC = 0;
    expensesFor(input).forEach(function (e) {
      var effective = roundMoney(Math.max(0, moneyOf(e.amount) - moneyOf(undefined)));
      var raw = {};
      MEMBERS.forEach(function (id) { raw[id] = 0; });
      var remaining = effective - 0;
      MEMBERS.forEach(function (id) { raw[id] += remaining * (weights[id] || 0); });
      var parts = allocateCents(effective, MEMBERS.map(function (id) { return raw[id] || 0; }),
        MEMBERS.map(function (id) { return e.id + '|' + id; }));
      var expected = {};
      MEMBERS.forEach(function (id, i) { expected[id] = parts[i]; });
      totalSpent += effective - 0;
      contributions[e.paidBy].actualPaid += effective - 0;
      MEMBERS.forEach(function (id) { contributions[id].expectedShare += expected[id] - 0; });
      swingC += MEMBERS.reduce(function (s, id) { return s + (id !== e.paidBy ? Math.round(expected[id] * 100) : 0); }, 0);
    });
    swingC += Math.max(0, 0);
    MEMBERS.forEach(function (id) {
      var c = contributions[id];
      c.actualPaid = cents(c.actualPaid);
      c.expectedShare = cents(c.expectedShare);
      c.deviation = cents(c.actualPaid - c.expectedShare);
    });
    var spent = cents(totalSpent) <= 0 ? 0 : cents(totalSpent);

    // Nothing carried in: the balance at the week's end is the week's own.
    var outstanding = {};
    MEMBERS.forEach(function (id) {
      var before = Math.round(0 * 100) + Math.round(0 * 100);
      var dev = Math.round((contributions[id].deviation || 0) * 100);
      outstanding[id] = normaliseZero((before + dev) / 100);
    });
    // A new pair's first period (D1): twice the week's own swing counts in the scale.
    var swing = safeMoney(swingC / 100) + safeMoney(0);
    var income = 0;
    MEMBERS.forEach(function (id) { income += safeMoney(id === A ? input.incomeA : input.incomeB); });
    var scale = cents(Math.max(safeMoney(Math.max(0, 2 * swing)), income * OUTSTANDING_INCOME_SHARE, OUTSTANDING_FLOOR_USD));
    var owedAmount = outstandingAmount(outstanding);
    return {
      totalSpent: spent,
      contributions: contributions,
      outstanding: outstanding,
      scale: scale,
      owed: owedAmount,
      score: outstandingScore(owedAmount, scale),
    };
  }

  // --- the composite -----------------------------------------------------------

  function compositeScore(input) {
    var wt = 0.6;
    var wm = 0.4;
    if (!input.money) { wt = 1; wm = 0; } else if (input.timePending) { wt = 0; wm = 1; }
    var sum = wt + wm;
    wt /= sum;
    wm /= sum;
    // Re-audit 13 (C5): the ring is the weighted average of the two cards as
    // SHOWN (each rounded on its own), never rounded from the unrounded gaps.
    function shown(score, c) {
      var s = isFinite(score) ? Math.max(0, Math.min(100, score)) : 100;
      var k = isFinite(c) ? Math.max(0, Math.min(1, c)) : 0;
      return Math.round(100 - k * (100 - s));
    }
    var shownTime = input.timePending ? 100 : shown(input.time.score, input.time.confidence);
    var shownMoney = input.money ? shown(input.money.score, input.money.confidence) : 100;
    var unsignedScore = clampScore(wt * shownTime + wm * shownMoney + 1e-9);
    // Round 21 (re-audit 14 C-N4): every trade term from the SHOWN cards too —
    // each axis's signed gap is (100 − card) / 100 in its direction — so the
    // ring depends on the two cards beside it alone, and a wider money gap
    // never raises it.
    function signedShown(card, favours) {
      return (favours === null ? 0 : favours === A ? 1 : -1) * (100 - card) / 100;
    }
    var ut = input.timePending ? 0 : signedShown(shownTime, input.time.favours);
    var um = input.money ? signedShown(shownMoney, input.money.favours) : 0;
    var opposite = ut * um < 0;
    var offsetting = opposite && Math.abs(ut) >= TRADE_MIN_IMBALANCE && Math.abs(um) >= TRADE_MIN_IMBALANCE;
    var matchedRaw = wt * shownTime + wm * 100 + 1e-9;
    var score = unsignedScore;
    var ceilingRaw = null;
    if (opposite) {
      var phase = Math.min(1, Math.min(Math.abs(ut), Math.abs(um)) / TRADE_MIN_IMBALANCE);
      var cap = matchedRaw - phase * Math.max(0, matchedRaw - TRADE_CAP);
      ceilingRaw = Math.min(matchedRaw, cap);
      var cancelledRaw = 100 * (1 - Math.abs(wt * ut + wm * um));
      score = Math.max(unsignedScore, clampScore(Math.min(cancelledRaw, matchedRaw, cap)));
    }
    // What the app's trade sentence quotes as the most a trade can score (G10):
    // TRADE_CAP, or less when keeping to the agreed split would score lower,
    // and never below the score actually shown.
    var tradeCeiling = Math.max(unsignedScore,
      ceilingRaw === null ? Math.min(TRADE_CAP, clampScore(matchedRaw)) : clampScore(ceilingRaw));
    return { score: score, offsetting: offsetting, weights: { time: wt, money: wm }, tradeCeiling: tradeCeiling };
  }

  // --- one week ---------------------------------------------------------------

  function compute(input) {
    input = input || {};
    var children = (input.children || []).filter(function (c) { return CHILD_BANDS[c]; });

    // Logged minutes: household work and childcare are both logs.
    var choreMin = {}; var childMin = {};
    choreMin[A] = minutesOf(input.choresA); choreMin[B] = minutesOf(input.choresB);
    childMin[A] = minutesOf(input.childcareA); childMin[B] = minutesOf(input.childcareB);
    var loggedHours = {}; var childLogged = {};
    MEMBERS.forEach(function (id) {
      loggedHours[id] = (choreMin[id] + childMin[id]) / 60;
      childLogged[id] = childMin[id] > 0 ? Math.min(loggedHours[id], childMin[id] / 60) : 0;
    });
    // A complete week, both home all of it: rates are the week's own logs.
    var rateWeeks = Math.max(7, 2) / 7;
    var choreLine = {}; var childCredit = {};
    MEMBERS.forEach(function (id) {
      choreLine[id] = loggedHours[id] / rateWeeks;
      childCredit[id] = Math.min(choreLine[id], childLogged[id] / rateWeeks);
    });
    var loggedTotalMinutes = 0;
    MEMBERS.forEach(function (id) { loggedTotalMinutes += loggedHours[id] * 60; });
    var hold = loggedTotalMinutes < HOLD_COMBINED_MIN_MINUTES ? 'logging' : null;

    var care = careSplit(children);
    var careBy = {};
    MEMBERS.forEach(function (id) { careBy[id] = care.byMember[id] || 0; });
    var ownCovered = {};
    MEMBERS.forEach(function (id) { ownCovered[id] = childCredit[id] - Math.min(0, childCredit[id]); });
    var careTotal = MEMBERS.reduce(function (s, id) { return s + careBy[id]; }, 0);
    var careHere = {};
    MEMBERS.forEach(function (id) {
      var othersLogged = MEMBERS.reduce(function (s, o) { return o === id ? s : s + ownCovered[o]; }, 0);
      careHere[id] = Math.max(0, Math.min(careBy[id] - ownCovered[id], careTotal - othersLogged));
    });

    var mental = planningHours(input.planning);

    var people = {};
    MEMBERS.forEach(function (id) {
      var x = id === A ? 'A' : 'B';
      var sleep = finiteIn(input['sleep' + x] != null ? input['sleep' + x] : DEFAULT_SLEEP_PER_NIGHT, 0, 24, DEFAULT_SLEEP_PER_NIGHT) * 7;
      var personal = finiteIn(input['personal' + x] != null ? input['personal' + x] : DEFAULT_PERSONAL_PER_DAY, 0, 24, DEFAULT_PERSONAL_PER_DAY) * 7;
      var available = Math.max(0, HOURS_IN_WEEK - sleep - personal);
      var paidWork = finiteIn(input['paid' + x] || 0, 0, HOURS_IN_WEEK, 0) * 1;
      var commute = commuteHours(input['commute' + x]) * 1;
      var chores = finiteIn(choreLine[id], 0, HOURS_IN_WEEK, 0);
      var careH = finiteIn(careHere[id] + Math.max(0, 0 - 0), 0, HOURS_IN_WEEK, 0);
      var planning = finiteIn(mental.hours[id] || 0, 0, HOURS_IN_WEEK, 0);
      var calendar = finiteIn(0, 0, HOURS_IN_WEEK, 0);
      var committed = paidWork + commute + chores + careH + planning + calendar;
      people[id] = {
        available: available, sleep: sleep, personal: personal, paidWork: paidWork, commute: commute,
        chores: chores, care: careH, planning: planning, committed: committed,
        free: Math.max(0, available - committed),
        overcommitted: Math.max(0, committed - available),
      };
    });

    var discA = people[A].free;
    var discB = people[B].free;
    var timeScore = timeBalance([discA, discB]);
    var timeFavours = Math.abs(discA - discB) >= 0.05 ? (discA > discB ? A : B) : null;
    var timePending = hold !== null;
    var timeConfidence = timePending ? 0 : Math.max(0, Math.min(1, Math.min(1, 7 / 7)));

    var weights = weightsFor(input);
    var fin = finance(input, weights);
    var outA = fin.outstanding[A];
    var outB = fin.outstanding[B];
    var moneyFavours = fin.owed >= OUTSTANDING_NOTHING && Math.abs(outA - outB) >= 0.01 ? (outA < outB ? A : B) : null;
    var outstandingSomething = MEMBERS.some(function (id) { return Math.round((fin.outstanding[id] || 0) * 100) !== 0; });
    var moneyInUse = fin.totalSpent > 0 || outstandingSomething;
    var fullMoneyGap = 100 - outstandingScore(fin.owed, fin.scale);
    var moneyConfidence = !moneyInUse ? 0 : fullMoneyGap > 0 ? 1 : 1;

    var composite = compositeScore({
      time: { score: timeScore, favours: timeFavours, confidence: timeConfidence },
      money: moneyInUse ? { score: fin.score, favours: moneyFavours, confidence: moneyConfidence } : null,
      timePending: timePending,
    });
    var noOverall = timePending && !moneyInUse;

    var guardrail = null;
    if (!timePending) {
      if (discA < BURNOUT_FLOOR_HOURS && discB < BURNOUT_FLOOR_HOURS) guardrail = 'BOTH_OVERLOADED';
      else if (discA < BURNOUT_FLOOR_HOURS || discB < BURNOUT_FLOOR_HOURS) guardrail = 'BURNOUT_FLOOR';
    } else {
      guardrail = 'THIN_DATA';
    }

    var settle = null;
    var c = Math.round(outA * 100);
    if (Math.abs(c) >= OUTSTANDING_NOTHING * 100) {
      settle = c > 0 ? { from: B, to: A, amount: c / 100 } : { from: A, to: B, amount: -c / 100 };
    }

    return {
      people: people,
      free: { alex: discA, sam: discB },
      timeBalance: timeScore,
      timePending: timePending ? hold : null,
      timeFavours: timeFavours,
      planningHours: mental.totalHours,
      planningAreas: mental.domains.length,
      careHours: care.total,
      weights: weights,
      totalSpent: fin.totalSpent,
      expected: { alex: fin.contributions[A].expectedShare, sam: fin.contributions[B].expectedShare },
      moneyInUse: moneyInUse,
      moneyBalance: moneyInUse ? fin.score : null,
      outstanding: settle,
      outstandingScale: fin.scale,
      overall: noOverall ? null : composite.score,
      offsetting: composite.offsetting,
      tradeCeiling: composite.tradeCeiling,
      guardrail: guardrail,
    };
  }

  /** Shared costs paid exactly in the household's split, for a weekly total (whole units). */
  function asAgreed(input, total) {
    var w = weightsFor(input);
    var a = Math.round(total * w[A]);
    return { spentA: a, spentB: total - a };
  }

  var NAMES = { alex: 'Alex', sam: 'Sam' };
  function money(n) {
    var whole = Math.round(n * 100) % 100 === 0;
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 });
  }
  var MODE_WORDS = {
    proportional: 'Proportional to income',
    equal: 'Half each',
    equal_remainder: 'Half each, then level what is left',
    residual: 'A floor each, then by income',
  };

  /**
   * Everything the calculator shows, as text, from one week's result. Used by
   * the page script and by the build (so the static HTML opens on the same
   * figures the script paints). The suggestion copy is the design's own.
   */
  function view(input) {
    var r = compute(input);
    var fa = Math.round(r.free.alex);
    var fb = Math.round(r.free.sam);
    var max = Math.max(fa, fb, 1);
    var gap = Math.max(fa, fb) - Math.min(fa, fb);
    var ahead = r.free.alex >= r.free.sam ? 'Alex' : 'Sam';
    var behind = ahead === 'Alex' ? 'Sam' : 'Alex';
    var pA = Math.round(r.weights.alex * 100);
    var headline, suggestion;
    if (r.timePending) {
      headline = 'Time is compared once an hour of housework is logged.';
      suggestion = 'With under an hour logged between you, the app waits rather than guess. Add the housework you each did this week.';
    } else if (gap <= 2) {
      headline = 'Within ' + gap + (gap === 1 ? ' hour' : ' hours') + ' of even.';
      suggestion = 'Nothing to swap. Keep the rhythm you have. EvenUS will stay quiet this week.';
    } else if (gap <= 7) {
      headline = ahead + ' has ' + gap + ' more free hours.';
      suggestion = ahead + ", take Thursday's dinner and dishes. It's about two hours and closes most of the gap without touching the weekend.";
    } else {
      headline = ahead + ' has ' + gap + ' more free hours.';
      suggestion = ahead + ', take over the weekly shop and meal planning. That is the piece ' + behind +
        ' is carrying invisibly, and it is worth roughly half this gap.';
    }
    var timeLine = r.timePending ? 'Time balance: waiting' : 'Time balance ' + r.timeBalance;
    var moneyLine = r.moneyInUse ? 'Money balance ' + r.moneyBalance : 'Money: nothing shared';
    var owed = r.outstanding
      ? money(r.outstanding.amount) + ' from ' + NAMES[r.outstanding.from] + ' to ' + NAMES[r.outstanding.to] + ' evens it up'
      : r.moneyInUse ? 'Nothing to even up' : 'No shared costs entered';
    var note = r.guardrail === 'BOTH_OVERLOADED'
      ? 'You both have under 14 free hours. The app says that first: moving work between two stretched people just moves the strain.'
      : r.guardrail === 'BURNOUT_FLOOR'
        ? 'One of you has under 14 free hours this week. The app says so before anything else.'
        : r.offsetting
          ? 'Time and money lean towards different people, so the two gaps partly cancel: a trade like this can score at most ' + r.tradeCeiling + '.'
          : '';
    return {
      result: r,
      score: r.overall === null ? '–' : String(r.overall),
      ring: String(Math.round(440 - 4.4 * (r.overall === null ? 0 : r.overall))),
      headline: headline,
      suggestion: suggestion,
      freeA: fa + (fa === 1 ? ' free hour' : ' free hours'),
      freeB: fb + (fb === 1 ? ' free hour' : ' free hours'),
      barA: Math.round((fa / max) * 100) + '%',
      barB: Math.round((fb / max) * 100) + '%',
      split: pA + '% · ' + (100 - pA) + '%',
      mode: MODE_WORDS[input.mode] || MODE_WORDS.proportional,
      balances: timeLine + ' · ' + moneyLine,
      owed: owed,
      note: note,
    };
  }

  var api = {
    compute: compute,
    view: view,
    asAgreed: asAgreed,
    weightsFor: weightsFor,
    DOMAINS: DOMAINS,
    CHILD_BANDS: CHILD_BANDS,
    HOLDERS: HOLDERS,
    MODES: MODES,
    MEMBERS: MEMBERS,
    available: HOURS_IN_WEEK - 7 * DEFAULT_SLEEP_PER_NIGHT - 7 * DEFAULT_PERSONAL_PER_DAY,
  };
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  else root.EvenusEngine = api;
})(typeof self !== 'undefined' ? self : this);
