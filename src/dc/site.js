/* EvenUS · evenus.app
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
   * The arithmetic is the APP'S, ported in src/calc/engine.js (prepended to
   * this file by the build as window.EvenusEngine) and checked against the
   * app's real engine (npm run test:engine; the build re-checks a golden
   * table). One complete week, nothing carried over. Nothing here does any
   * sums of its own: it reads the inputs, asks the engine, paints the text.
   *
   * The homepage has six sliders and no "who paid" input, so its shared
   * costs are taken as paid in the split shown ($1,000 a week). The
   * /calculator/ page adds commuting, children, childcare, planning areas,
   * the split method and what each of you paid.
   * ------------------------------------------------------------------- */
  function calculator() {
    var E = window.EvenusEngine;
    var inputs = document.querySelectorAll('[data-calc]');
    if (!inputs.length || !E) return;

    var out = {};
    Array.prototype.forEach.call(document.querySelectorAll('[data-out]'), function (el) {
      out[el.getAttribute('data-out')] = el;
    });
    function set(key, text) { if (out[key]) out[key].textContent = text; }
    function money(n) { return '$' + n.toLocaleString('en-US'); }
    function hours(n) { return n + 'h'; }
    function num(el) { var v = Number(el.value); return isFinite(v) && v > 0 ? v : 0; }
    var all = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };
    var modeEl = document.querySelector('[data-calc-mode]');
    var childEls = all('[data-calc-child]');
    var planEls = all('[data-plan]');
    var hasSpent = !!document.querySelector('[data-calc="spentA"]');

    function read() {
      var s = {};
      Array.prototype.forEach.call(inputs, function (el) { s[el.getAttribute('data-calc')] = num(el); });
      var children = childEls.map(function (el) { return el.value; }).filter(function (v) { return v && v !== 'none'; });
      var school = children.some(function (c) { return c !== 'under1' && c !== '1to2' && c !== 'adult'; });
      var minors = children.some(function (c) { return c !== 'adult'; });
      var planning = {};
      planEls.forEach(function (el) {
        var when = el.getAttribute('data-when');
        var open = when === 'always' || (when === 'school' ? school : minors);
        var row = el.closest('[data-plan-row]');
        if (row) row.hidden = !open;
        if (open) planning[el.getAttribute('data-plan')] = el.value;
      });
      var careRow = document.querySelector('[data-childcare]');
      if (careRow) careRow.hidden = children.length === 0;
      var input = {
        incomeA: s.incomeA, incomeB: s.incomeB, paidA: s.paidA, paidB: s.paidB,
        commuteA: s.commuteA || 0, commuteB: s.commuteB || 0,
        choresA: s.homeA, choresB: s.homeB,
        childcareA: children.length ? s.childcareA || 0 : 0,
        childcareB: children.length ? s.childcareB || 0 : 0,
        children: children, planning: planning,
        mode: modeEl ? modeEl.value : 'proportional',
        spentA: s.spentA || 0, spentB: s.spentB || 0,
      };
      if (!hasSpent) {
        var agreed = E.asAgreed(input, 1000);
        input.spentA = agreed.spentA;
        input.spentB = agreed.spentB;
      }
      return { s: s, input: input };
    }

    function paint() {
      var r = read();
      var s = r.s;
      var v = E.view(r.input);
      set('income', money(s.incomeA) + ' \u00b7 ' + money(s.incomeB));
      set('paid', hours(s.paidA) + ' \u00b7 ' + hours(s.paidB));
      set('home', hours(s.homeA) + ' \u00b7 ' + hours(s.homeB));
      set('commute', hours(s.commuteA || 0) + ' \u00b7 ' + hours(s.commuteB || 0));
      set('childcare', hours(s.childcareA || 0) + ' \u00b7 ' + hours(s.childcareB || 0));
      set('score', v.score);
      set('headline', v.headline);
      set('suggestion', v.suggestion);
      set('freeA', v.freeA);
      set('freeB', v.freeB);
      set('split', v.split);
      set('mode', v.mode);
      set('balances', v.balances);
      set('owed', v.owed);
      set('note', v.note);
      if (out.note) out.note.hidden = !v.note;
      if (out.ring) out.ring.setAttribute('stroke-dashoffset', v.ring);
      if (out.barA) out.barA.style.width = v.barA;
      if (out.barB) out.barB.style.width = v.barB;
    }

    Array.prototype.forEach.call(inputs, function (el) {
      var key = el.getAttribute('data-calc');
      if (!el.getAttribute('aria-label') && !el.id) {
        // Accessible names: the design gives each pair one shared group label.
        var group = el.closest('div');
        var label = group && group.querySelector('span');
        var who = /A$/.test(key) ? 'Alex' : 'Sam';
        el.setAttribute('aria-label', (label ? label.textContent.trim() : key) + ': ' + who);
      }
      el.addEventListener('input', paint);
    });
    [modeEl].concat(childEls, planEls).forEach(function (el) { if (el) el.addEventListener('change', paint); });

    paint();
  }

  /* ---------------------------------------------------------------------
   * Accordions: single-open, first item open, clicking the open one closes it.
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


  /* ---------------------------------------------------------------------
   * Analytics consent (Google Consent Mode v2).
   *
   * The page head already told Google "denied" for everything before the tag
   * loaded, and replayed a stored "granted" if there was one. This only asks
   * the question once, remembers the answer, and lets the privacy page reopen
   * it. Advertising storage is never granted: there are no ads on this site.
   *
   * Non-modal on purpose: it does not take focus or block the page, because a
   * reader who ignores it has said no, and that is a fine answer.
   * ------------------------------------------------------------------- */
  var CONSENT_KEY = 'evenus-analytics-consent';
  function readChoice() { try { return localStorage.getItem(CONSENT_KEY); } catch (e) { return null; } }
  function saveChoice(v) { try { localStorage.setItem(CONSENT_KEY, v); } catch (e) { /* private mode */ } }

  function consentBanner() {
    var box = null;
    function close() { if (box) { box.remove(); box = null; } }
    function choose(granted) {
      saveChoice(granted ? 'granted' : 'denied');
      if (typeof window.gtag === 'function') {
        window.gtag('consent', 'update', { analytics_storage: granted ? 'granted' : 'denied' });
      }
      // The invite page loads no tag at all until this moment (JOIN_ANALYTICS in build.mjs).
      if (granted && typeof window.evenusConsentGranted === 'function') window.evenusConsentGranted();
      close();
    }
    function button(label, primary, fn) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.style.cssText = 'font:inherit;font-size:14px;font-weight:600;min-height:44px;padding:0 20px;border-radius:99px;cursor:pointer;' +
        (primary ? 'background:#1B1F1D;color:#F7F5EF;border:1px solid #1B1F1D' : 'background:#fff;color:#1B1F1D;border:1px solid #B9B3A5');
      b.addEventListener('click', fn);
      return b;
    }
    function open() {
      if (box) return;
      box = document.createElement('section');
      box.setAttribute('aria-label', 'Cookie choice');
      box.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;z-index:100;max-width:560px;margin:0 auto;' +
        'background:#fff;color:#1B1F1D;border:1px solid #DAD4C6;border-radius:18px;padding:18px 20px;' +
        'box-shadow:0 10px 30px rgba(27,31,29,.12);font-size:14.5px;line-height:1.55';
      var p = document.createElement('p');
      p.style.margin = '0';
      p.innerHTML = 'May we count your visit with Google Analytics? It sets cookies only if you accept, and nothing changes on the site if you decline. <a href="' +
        (document.documentElement.getAttribute('data-base') || '') + '/privacy/#cookies" style="color:#2E6A5C;text-decoration:underline;text-underline-offset:2px">How we use it</a>';
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;margin-top:14px';
      row.appendChild(button('Accept', true, function () { choose(true); }));
      row.appendChild(button('Decline', false, function () { choose(false); }));
      box.appendChild(p);
      box.appendChild(row);
      document.body.appendChild(box);
    }
    Array.prototype.forEach.call(document.querySelectorAll('[data-consent-open]'), function (b) {
      b.addEventListener('click', open);
    });
    if (!readChoice()) open();
  }

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }
  ready(function () { calculator(); accordions(); blogFilter(); reveal(); consentBanner(); });
})();
