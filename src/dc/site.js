/* EvenUS — evenus.app
 *
 * The interactions from the design handoff, reimplemented as plain DOM code.
 * The prototype runtime (support.js) is not part of the deliverable.
 *
 * No dependencies, no build step. Runs once at DOMContentLoaded and exits.
 */
(function () {
  'use strict';

  var reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------------
   * Fairness calculator
   *
   * The formula is the handoff's, unchanged. The defaults are calibrated so
   * the demo opens on exactly the state the rest of the page depicts —
   * 18 vs 11 free hours, a 7-hour gap, score 87. Changing FREE_BUDGET or the
   * 1.85 multiplier means updating the hero chip, the phone mockups and the
   * profile card figures to match.
   * ------------------------------------------------------------------- */
  var FREE_BUDGET = 68; // 168h week − 56h sleep − 44h unavoidable personal time

  function calculator() {
    var inputs = document.querySelectorAll('[data-calc]');
    if (!inputs.length) return;

    var state = { incomeA: 4500, incomeB: 4200, paidA: 42, paidB: 34, homeA: 8, homeB: 23 };
    var out = {};
    Array.prototype.forEach.call(document.querySelectorAll('[data-out]'), function (el) {
      out[el.getAttribute('data-out')] = el;
    });

    function free(paid, home) { return Math.max(0, Math.round(FREE_BUDGET - paid - home)); }
    function money(n) { return '$' + n.toLocaleString('en-US'); }
    function set(key, text) { if (out[key]) out[key].textContent = text; }

    function paint() {
      var dA = free(state.paidA, state.homeA);
      var dB = free(state.paidB, state.homeB);
      var max = Math.max(dA, dB, 1);
      var gap = Math.abs(dA - dB);
      var score = Math.max(28, Math.min(99, Math.round(100 - gap * 1.85)));
      var total = state.incomeA + state.incomeB;
      var pA = Math.round((state.incomeA / total) * 100);
      var ahead = dA >= dB ? 'Alex' : 'Sam';
      var behind = dA >= dB ? 'Sam' : 'Alex';

      var headline, suggestion;
      if (gap <= 2) {
        headline = 'Within ' + gap + ' hours of even.';
        suggestion = 'Nothing to swap. Keep the rhythm you have — EvenUS will stay quiet this week.';
      } else if (gap <= 7) {
        headline = ahead + ' has ' + gap + ' more free hours.';
        suggestion = ahead + ", take Thursday's dinner and dishes. It's about two hours and closes " +
          'most of the gap without touching the weekend.';
      } else {
        headline = ahead + ' has ' + gap + ' more free hours.';
        suggestion = ahead + ', take over the weekly shop and meal planning. That is the piece ' +
          behind + ' is carrying invisibly, and it is worth roughly half this gap.';
      }

      set('income', money(state.incomeA) + ' · ' + money(state.incomeB));
      set('paid', state.paidA + 'h · ' + state.paidB + 'h');
      set('home', state.homeA + 'h · ' + state.homeB + 'h');
      set('score', String(score));
      set('headline', headline);
      set('suggestion', suggestion);
      set('freeA', dA + ' free hours');
      set('freeB', dB + ' free hours');
      set('split', pA + '% · ' + (100 - pA) + '%');

      if (out.ring) out.ring.setAttribute('stroke-dashoffset', String(Math.round(440 - 4.4 * score)));
      if (out.barA) out.barA.style.width = Math.round((dA / max) * 100) + '%';
      if (out.barB) out.barB.style.width = Math.round((dB / max) * 100) + '%';
    }

    Array.prototype.forEach.call(inputs, function (el) {
      var key = el.getAttribute('data-calc');
      // Accessible names: the design gives each pair one shared group label.
      var group = el.closest('div');
      var label = group && group.querySelector('span');
      var who = /A$/.test(key) ? 'Alex' : 'Sam';
      el.setAttribute('aria-label', (label ? label.textContent.trim() : key) + ' — ' + who);
      el.addEventListener('input', function () {
        state[key] = Number(el.value);
        paint();
      });
    });

    paint();
  }

  /* ---------------------------------------------------------------------
   * Accordions — single-open, first item open, clicking the open one closes it.
   * Every answer is in the DOM; this collapses them on load.
   * ------------------------------------------------------------------- */
  function accordions() {
    var triggers = document.querySelectorAll('[data-accordion]');
    if (!triggers.length) return;

    var items = Array.prototype.map.call(triggers, function (btn, i) {
      var panel = btn.nextElementSibling;
      var id = 'acc-panel-' + i;
      if (panel) {
        panel.id = id;
        panel.setAttribute('role', 'region');
      }
      btn.setAttribute('aria-expanded', 'false');
      if (panel) btn.setAttribute('aria-controls', id);
      btn.addEventListener('click', function () { open(i === current ? -1 : i); });
      return { btn: btn, panel: panel, mark: btn.querySelector('span:last-child') };
    });

    var current = -1;
    function open(n) {
      current = n;
      items.forEach(function (it, i) {
        var on = i === n;
        if (it.panel) it.panel.hidden = !on;
        it.btn.setAttribute('aria-expanded', on ? 'true' : 'false');
        if (it.mark) it.mark.textContent = on ? '−' : '+';
      });
    }
    open(0);
  }

  /* ---------------------------------------------------------------------
   * Blog category filter
   * ------------------------------------------------------------------- */
  function blogFilter() {
    var pills = document.querySelectorAll('[data-filter]');
    var rows = document.querySelectorAll('[data-cat]');
    if (!pills.length || !rows.length) return;

    function apply(cat) {
      Array.prototype.forEach.call(rows, function (row) {
        row.hidden = !(cat === 'All' || row.getAttribute('data-cat') === cat);
      });
      Array.prototype.forEach.call(pills, function (pill) {
        var on = pill.getAttribute('data-filter') === cat;
        pill.setAttribute('aria-pressed', on ? 'true' : 'false');
        pill.style.background = on ? '#1B1F1D' : 'transparent';
        pill.style.color = on ? '#F7F5EF' : '#5E645F';
        pill.style.borderColor = on ? '#1B1F1D' : '#DAD4C6';
      });
      var count = document.querySelector('[data-filter-count]');
      if (count) {
        var n = Array.prototype.filter.call(rows, function (r) { return !r.hidden; }).length;
        count.textContent = n + (n === 1 ? ' piece' : ' pieces');
      }
    }

    Array.prototype.forEach.call(pills, function (pill) {
      pill.addEventListener('click', function () { apply(pill.getAttribute('data-filter')); });
    });
    apply('All');
  }

  /* ---------------------------------------------------------------------
   * Scroll reveal. The 4-second failsafe is deliberate: an IntersectionObserver
   * that never fires would leave the whole page invisible, which is a far worse
   * failure than no animation.
   * ------------------------------------------------------------------- */
  function reveal() {
    var nodes = document.querySelectorAll('[data-reveal]');
    if (!nodes.length || reduced || !('IntersectionObserver' in window)) return;

    Array.prototype.forEach.call(nodes, function (n) {
      n.style.opacity = '0';
      n.style.transform = 'translateY(22px)';
      n.style.transition = 'opacity .85s ease, transform .95s cubic-bezier(.2,.75,.25,1)';
    });

    var show = function (n) { n.style.opacity = '1'; n.style.transform = 'none'; };
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { show(e.target); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });

    Array.prototype.forEach.call(nodes, function (n) { io.observe(n); });
    setTimeout(function () { Array.prototype.forEach.call(nodes, show); }, 4000);
  }

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }
  ready(function () { calculator(); accordions(); blogFilter(); reveal(); });
})();
