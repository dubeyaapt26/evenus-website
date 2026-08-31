// ---------------------------------------------------------------------------
// Adds the hooks the runtime needs to the rendered design markup.
//
// The prototypes bind through the DC runtime, which is explicitly not part of
// the deliverable. Rather than retype 46 KB of hand-tuned markup with ids in
// it — which would fork the build from the design it is supposed to reproduce —
// the rendered output is annotated here.
//
// ⚠️ EVERY ANCHOR IS ASSERTED, AND THE ASSERTION EARNED ITS KEEP IMMEDIATELY:
// `stroke-dashoffset="57"` matches twice, because a phone mockup draws the same
// ring, and `>87<` matches four times. Hooks are therefore scoped to the
// section they belong to. A calculator that silently stops updating because a
// colour changed is exactly the failure this prevents, and it is invisible in a
// screenshot.
// ---------------------------------------------------------------------------

/** Runs `fn` over one <section id="..."> and splices the result back. */
function inSection(html, id, fn) {
  const open = html.indexOf(`<section id="${id}"`);
  if (open === -1) throw new Error(`section #${id} not found in the design`);
  const re = /<section\b[^>]*>|<\/section>/g;
  re.lastIndex = html.indexOf('>', open) + 1;
  let depth = 1, m, end = -1;
  while ((m = re.exec(html))) {
    depth += m[0][1] === '/' ? -1 : 1;
    if (depth === 0) { end = m.index; break; }
  }
  if (end === -1) throw new Error(`section #${id} is unclosed`);
  return html.slice(0, open) + fn(html.slice(open, end)) + html.slice(end);
}

function must(html, find, replace, name) {
  const i = html.indexOf(find);
  if (i === -1) throw new Error(`hook "${name}": anchor not found`);
  if (html.indexOf(find, i + 1) !== -1) throw new Error(`hook "${name}": anchor is not unique in its section`);
  return html.slice(0, i) + replace + html.slice(i + find.length);
}

const tag = (html, find, attr, name) =>
  must(html, find, find.replace(/">$|"$/, `" ${attr}` + (find.endsWith('>') ? '>' : '')), name);

export function hookHome(html) {
  html = inSection(html, 'demo', (s) => {
    // The prototype's own handler already names the state key it drives.
    s = s.replace(
      /onInput="e => this\.setState\(\{ (\w+): this\.num\(e\) \}\)"/g,
      (_m, key) => `data-calc="${key}"`
    );
    const n = (s.match(/data-calc="/g) || []).length;
    if (n !== 6) throw new Error(`hook "sliders": expected 6 range inputs, found ${n}`);

    s = must(s, '<span style="color:#5E645F;font-weight:500">$4,500 · $4,200</span>',
      '<span style="color:#5E645F;font-weight:500" data-out="income">$4,500 · $4,200</span>', 'income');
    s = must(s, '<span style="color:#5E645F;font-weight:500">42h · 34h</span>',
      '<span style="color:#5E645F;font-weight:500" data-out="paid">42h · 34h</span>', 'paid');
    s = must(s, '<span style="color:#5E645F;font-weight:500">8h · 23h</span>',
      '<span style="color:#5E645F;font-weight:500" data-out="home">8h · 23h</span>', 'home');
    s = must(s, 'stroke-dashoffset="57"', 'stroke-dashoffset="57" data-out="ring"', 'ring');
    s = must(s, 'line-height:1">87</div>', 'line-height:1" data-out="score">87</div>', 'score');
    s = must(s, 'line-height:1.25">Alex has 7 more free hours.</div>',
      'line-height:1.25" data-out="headline">Alex has 7 more free hours.</div>', 'headline');
    s = must(s, 'font-weight:600">18 free hours</span>',
      'font-weight:600" data-out="freeA">18 free hours</span>', 'freeA');
    s = must(s, 'font-weight:600">11 free hours</span>',
      'font-weight:600" data-out="freeB">11 free hours</span>', 'freeB');
    s = must(s, 'background:#6FB3A2;transition:width .5s cubic-bezier(.2,.8,.2,1);width:100%"',
      'background:#6FB3A2;transition:width .5s cubic-bezier(.2,.8,.2,1);width:100%" data-out="barA"', 'barA');
    s = must(s, 'background:#F0A48A;transition:width .5s cubic-bezier(.2,.8,.2,1);width:61%"',
      'background:#F0A48A;transition:width .5s cubic-bezier(.2,.8,.2,1);width:61%" data-out="barB"', 'barB');
    s = must(s, 'margin-top:7px">52% · 48%</div>', 'margin-top:7px" data-out="split">52% · 48%</div>', 'split');

    // The suggestion is the last text block inside the sage-tinted panel.
    const p = s.indexOf('background:rgba(111,179,162,.14)');
    if (p === -1) throw new Error('hook "suggestion": panel not found');
    const rest = s.slice(p);
    const mm = /(<div style="font-size:1[45](\.5)?px;line-height:1\.[456]\d*[^"]*">)([\s\S]*?)(<\/div>)/.exec(rest);
    if (!mm) throw new Error('hook "suggestion": text node not found');
    s = s.slice(0, p) + rest.slice(0, mm.index) +
        mm[1].replace(/">$/, '" data-out="suggestion">') + mm[3] + mm[4] +
        rest.slice(mm.index + mm[0].length);
    return s;
  });

  // Accordion triggers carry a handler unique to them.
  const before = (html.match(/onClick="\(\) => this\.setState\(st => \(\{ open/g) || []).length;
  if (before === 0) throw new Error('hook "accordion": no triggers found');
  html = html.replace(/onClick="\(\) => this\.setState\(st => \(\{ open[^"]*"/g, 'data-accordion');

  return stripPrototypeHandlers(html);
}

export function hookBlog(html) {
  return stripPrototypeHandlers(html);
}

/** Nothing that referenced the prototype runtime may reach the deliverable. */
export function stripPrototypeHandlers(html) {
  return html.replace(/\s(onClick|onInput|onChange)="[^"]*"/g, '');
}
