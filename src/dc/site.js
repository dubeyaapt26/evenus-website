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

  /* ---------------------------------------------------------------------
   * Beta sign-up (src/beta.mjs). Posts JSON to the joinBeta function and
   * says what happened in the form's own status line. Nothing is kept in the
   * browser.
   * ------------------------------------------------------------------- */
  function betaForms() {
    Array.prototype.forEach.call(document.querySelectorAll('form[data-beta]'), function (form) {
      var msg = form.querySelector('.beta-msg');
      var go = form.querySelector('.beta-go');
      function say(kind, text) { msg.setAttribute('data-kind', kind); msg.textContent = text; }
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var email = (form.elements.email.value || '').trim();
        var picked = form.querySelector('input[name=platform]:checked');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { say('err', 'Please enter a full email address.'); form.elements.email.focus(); return; }
        if (!picked) { say('err', 'Which phone do you use? Pick one so we send the right invite.'); return; }
        if (!form.elements.consent.checked) { say('err', 'Tick the box so we may email you the invite.'); return; }
        go.disabled = true;
        say('', 'Sending…');
        fetch(form.getAttribute('action'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email, platform: picked.value,
            withPartner: form.elements.withPartner.checked, consent: true,
            source: form.getAttribute('data-source'), website: form.elements.website.value,
          }),
        }).then(function (r) {
          if (r.ok) {
            form.classList.add('done');
            say('ok', picked.value === 'ios'
              ? 'You’re on the list. We’ll email your TestFlight invite for iPhone.'
              : 'You’re on the list. We’ll email your invite to the Google Play beta' + (picked.value === 'both' ? ' and TestFlight for iPhone.' : '.'));
            if (window.gtag) window.gtag('event', 'sign_up', { method: 'beta', source: form.getAttribute('data-source') });
          } else if (r.status === 429) {
            say('err', 'Too many sign-ups from this connection today. Please try again tomorrow, or email support@evenus.app.');
          } else {
            say('err', 'That didn’t go through. Check the address, or email support@evenus.app and we’ll add you.');
          }
        }).catch(function () {
          say('err', 'Couldn’t reach us just now. Please try again, or email support@evenus.app.');
        }).then(function () { go.disabled = false; });
      });
    });
  }

  /* ---------------------------------------------------------------------
   * Mental load quiz (src/quiz/page.mjs). Everything happens here, in the
   * browser: answers are never sent or stored. A partner link carries the
   * first person's answers after "#", which browsers keep to themselves.
   * Code: one character per question, 0–5 as the answer index, "x" skipped.
   * ------------------------------------------------------------------- */
  function quiz() {
    var form = document.querySelector('form[data-quiz]');
    if (!form) return;
    var out = document.getElementById('qz-out');
    var err = form.querySelector('.qz-err');
    var qs = Array.prototype.slice.call(form.querySelectorAll('.qz-q'));
    var W = [1, 0.75, 0.5, 0.25, 0];
    var partner = null;
    var m = /[#&]p=([0-5x]+)/.exec(location.hash || '');
    if (m && m[1].length === qs.length) {
      partner = m[1].split('');
      document.getElementById('qz-partner').hidden = false;
    }
    var skipBox = form.querySelector('[data-skip-kids]');
    var kidsArea = form.querySelector('[data-kids]');
    function kidsSkipped() { return !!(skipBox && skipBox.checked); }
    if (skipBox) skipBox.addEventListener('change', function () { kidsArea.classList.toggle('skipped', kidsSkipped()); });

    function areaOf(q) { return q.closest('.qz-area'); }
    function answers() {
      return qs.map(function (q) {
        if (kidsSkipped() && areaOf(q).hasAttribute('data-kids')) return 'x';
        var c = q.querySelector('input:checked');
        return c ? c.value : null;
      });
    }
    // Share of the jobs that apply, as the person answering sees it.
    // mirror: their answers read as YOUR share ("My partner" from them = you).
    function share(a, idx, mirror) {
      var sum = 0, n = 0;
      idx.forEach(function (i) {
        var v = a[i];
        if (v === 'x' || v === null || Number(v) > 4) return;
        sum += W[mirror ? 4 - Number(v) : Number(v)]; n++;
      });
      return n ? Math.round((sum / n) * 100) : null;
    }
    function band(s) {
      if (s >= 70) return 'Most of the noticing and planning in your home runs through you at the moment.';
      if (s >= 55) return 'A little more of the noticing and planning runs through you than through your partner.';
      if (s > 45) return 'You share the noticing and planning roughly evenly.';
      if (s > 30) return 'A little more of the noticing and planning runs through your partner than through you.';
      return 'Most of the noticing and planning in your home runs through your partner at the moment.';
    }
    function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
    function bar(label, pct, cls) {
      var row = el('div', 'qz-bar');
      var b = el('b', null, pct + '%');
      row.appendChild(document.createTextNode(label + ': '));
      row.appendChild(b);
      var t = el('div', 'qz-track'); var f = el('div', 'qz-fill' + (cls ? ' ' + cls : '')); f.style.width = pct + '%';
      t.appendChild(f); row.appendChild(t);
      return row;
    }
    function textOf(i) { return qs[i].querySelector('.qz-text').textContent.replace(/^\d+\.\s*Who usually does this\?\s*/, '').replace(/\.$/, ''); }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var a = answers();
      var missing = a.map(function (v, i) { return v === null ? i : -1; }).filter(function (i) { return i >= 0; });
      if (missing.length) {
        err.hidden = false;
        err.textContent = missing.length === 1 ? 'One question is still unanswered (number ' + (missing[0] + 1) + ').'
          : missing.length + ' questions are still unanswered, starting with number ' + (missing[0] + 1) + '.';
        qs[missing[0]].scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
        var first = qs[missing[0]].querySelector('input'); if (first) first.focus({ preventScroll: true });
        return;
      }
      err.hidden = true;
      var all = qs.map(function (_q, i) { return i; });
      var mine = share(a, all, false);
      out.innerHTML = '';
      var box = el('div', 'qz-result');
      if (mine === null) {
        box.appendChild(el('p', null, 'None of the questions apply to your home, so there is nothing to compare. Try answering the ones closest to your life.'));
        out.appendChild(box); out.focus(); return;
      }
      box.appendChild(el('div', 'qz-big', mine + '%'));
      box.appendChild(el('p', null, 'Your share of the noticing, planning and remembering, across the questions that apply to your home. ' + band(mine)));
      var bars = el('div', 'qz-bars');
      Array.prototype.forEach.call(form.querySelectorAll('.qz-area'), function (area) {
        var idx = qs.map(function (q, i) { return areaOf(q) === area ? i : -1; }).filter(function (i) { return i >= 0; });
        var s = share(a, idx, false);
        if (s !== null) bars.appendChild(bar(area.querySelector('legend').textContent, s));
      });
      box.appendChild(bars);

      if (partner) {
        var theirs = share(partner, all, true);
        var cmp = el('div', 'qz-share');
        cmp.appendChild(el('h2', null, 'Your two views side by side'));
        cmp.lastChild.style.cssText = 'margin:0 0 6px;font-size:22px;letter-spacing:-.02em;color:#F7F5EF';
        if (theirs !== null) {
          var both = el('div', 'qz-bars');
          both.appendChild(bar('Your share, as you see it', mine));
          both.appendChild(bar('Your share, as your partner sees it', theirs, 'p'));
          cmp.appendChild(both);
          var gap = Math.abs(mine - theirs);
          cmp.appendChild(el('p', null, gap < 10 ? 'You see the split in much the same way, which makes it easier to talk about.'
            : 'You see the split differently, by ' + gap + ' points. That is common, and it usually means some of the work is invisible to one of you.'));
        }
        var bothMine = [], differ = [];
        all.forEach(function (i) {
          var x = a[i], y = partner[i];
          if (x === 'x' || y === 'x' || Number(x) > 4 || Number(y) > 4) return;
          if (Number(x) <= 1 && Number(y) <= 1) bothMine.push(i);
          else if (Math.abs(Number(x) - (4 - Number(y))) >= 2) differ.push(i);
        });
        function list(title, items) {
          if (!items.length) return;
          cmp.appendChild(el('p', null, title));
          cmp.lastChild.style.margin = '18px 0 0';
          var ul = el('ul', 'qz-list');
          items.slice(0, 6).forEach(function (i) { ul.appendChild(el('li', null, textOf(i))); });
          cmp.appendChild(ul);
        }
        list('You each feel these are mostly yours. Worth asking what each of you does for them:', bothMine);
        list('You see these differently:', differ);
        box.appendChild(cmp);
      }

      var code = a.join('');
      var link = location.origin + location.pathname + '#p=' + code;
      var sh = el('div', 'qz-share');
      sh.appendChild(el('p', null, partner ? 'Want your partner to see this comparison too? Send them your link.'
        : 'Now send the quiz to your partner. They answer from their side and see both of your views together. Your answers are in the link, so send it only to them.'));
      sh.lastChild.style.margin = '0 0 10px';
      var inp = el('input'); inp.type = 'text'; inp.readOnly = true; inp.value = link; inp.setAttribute('aria-label', 'Link for your partner');
      sh.appendChild(inp);
      var copy = el('button', 'qz-copy', 'Copy the link'); copy.type = 'button';
      copy.addEventListener('click', function () {
        inp.select();
        var done = function () { copy.textContent = 'Copied'; };
        if (navigator.clipboard) navigator.clipboard.writeText(link).then(done, function () { document.execCommand('copy'); done(); });
        else { document.execCommand('copy'); done(); }
      });
      sh.appendChild(copy);
      if (navigator.share) {
        var s2 = el('button', 'qz-copy', 'Share…'); s2.type = 'button'; s2.style.marginLeft = '8px';
        s2.addEventListener('click', function () { navigator.share({ title: 'The mental load quiz for couples', text: 'I took this. Answer it from your side and we can compare:', url: link }).catch(function () {}); });
        sh.appendChild(s2);
      }
      box.appendChild(sh);
      out.appendChild(box);
      out.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      out.focus({ preventScroll: true });
      if (window.gtag) window.gtag('event', 'quiz_complete', { partner: partner ? 1 : 0 });
    });
  }

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }
  ready(function () { calculator(); accordions(); blogFilter(); reveal(); consentBanner(); betaForms(); quiz(); });
})();
