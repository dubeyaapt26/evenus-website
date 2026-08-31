// ---------------------------------------------------------------------------
// Renders the design handoff's .dc.html prototypes to static HTML.
//
// ⚠️ WHY RENDER THEM RATHER THAN RETYPE THEM.
// The handoff says "recreate pixel-for-pixel", and the most reliable way to hit
// that is to use the designer's own markup as the source rather than a
// transcription of it. Retyping 50 KB of hand-tuned spacing is how a build ends
// up 90% faithful in a way nobody can point at.
//
// So: evaluate each file's logic class to get its real values, expand the
// template directives, substitute the holes, and emit the markup unchanged.
// What is NOT carried over is the runtime — support.js is explicitly not part
// of the deliverable, and every interaction is reimplemented in src/dc/site.js
// as plain DOM code.
//
// This is a renderer for THESE files, not a general implementation of the
// format. It handles what the handoff actually uses: {{dotted.paths}},
// <sc-for>, <sc-if>, <dc-import>, <helmet> and one logic class per file.
// ---------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;

/** Dotted lookup, plus the literals the prototypes use. */
function lookup(path, scope) {
  const p = path.trim();
  if (p === 'true') return true;
  if (p === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(p)) return Number(p);
  if (/^["'].*["']$/.test(p)) return p.slice(1, -1);
  let v = scope;
  for (const key of p.split('.')) {
    if (v == null) return undefined;
    v = v[key];
  }
  return v;
}

/**
 * Runs a file's `class Component extends DCLogic` and returns renderVals().
 *
 * The classes are plain JS with no imports, so a stub base class with `props`
 * and `state` is enough. Lifecycle methods are deliberately NOT called — they
 * touch `document`, and their behaviour is reimplemented in site.js instead.
 */
function evaluateLogic(source) {
  const m = /<script[^>]*data-dc-script[^>]*>([\s\S]*?)<\/script>/.exec(source);
  if (!m) return {};

  const propsAttr = /data-props="([^"]*)"/.exec(source);
  let props = {};
  if (propsAttr) {
    const json = propsAttr[1]
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
    try {
      for (const [k, v] of Object.entries(JSON.parse(json))) props[k] = v?.default;
    } catch { /* a prototype-only editor hint; defaults simply stay undefined */ }
  }

  const factory = new Function('DCLogic', 'props', `
    ${m[1]}
    const c = new Component();
    c.props = props;
    if (!c.state) c.state = {};
    return typeof c.renderVals === 'function' ? c.renderVals() : {};
  `);
  class DCLogic {
    constructor() { this.props = {}; this.state = {}; }
    setState(patch) { Object.assign(this.state, patch); }
    forceUpdate() {}
  }
  return factory(DCLogic, props) || {};
}

/** Finds the matching close for a tag that may nest inside itself. */
function matchTag(html, tag, openEnd) {
  const re = new RegExp(`<${tag}\\b[^>]*>|</${tag}>`, 'g');
  re.lastIndex = openEnd;
  let depth = 1, m;
  while ((m = re.exec(html))) {
    depth += m[0][1] === '/' ? -1 : 1;
    if (depth === 0) return { inner: html.slice(openEnd, m.index), after: re.lastIndex };
  }
  throw new Error(`unclosed <${tag}>`);
}

function expand(html, scope, resolveImport) {
  // --- <sc-for list="{{items}}" as="item"> ---------------------------------
  for (;;) {
    const open = /<sc-for\b([^>]*)>/.exec(html);
    if (!open) break;
    const attrs = open[1];
    const listPath = (/list="\{\{\s*([^}]+?)\s*\}\}"/.exec(attrs) || [])[1];
    const as = (/as="([^"]*)"/.exec(attrs) || [, 'item'])[1];
    const { inner, after } = matchTag(html, 'sc-for', open.index + open[0].length);
    const list = lookup(listPath ?? '', scope);
    const rendered = (Array.isArray(list) ? list : [])
      .map((item, i) => expand(inner, { ...scope, [as]: item, $index: i }, resolveImport))
      .join('');
    html = html.slice(0, open.index) + rendered + html.slice(after);
  }

  // --- <sc-if value="{{cond}}"> -------------------------------------------
  for (;;) {
    const open = /<sc-if\b([^>]*)>/.exec(html);
    if (!open) break;
    const condPath = (/value="\{\{\s*([^}]+?)\s*\}\}"/.exec(open[1]) || [])[1];
    const { inner, after } = matchTag(html, 'sc-if', open.index + open[0].length);
    const keep = Boolean(lookup(condPath ?? '', scope));
    html = html.slice(0, open.index) +
      (keep ? expand(inner, scope, resolveImport) : '') +
      html.slice(after);
  }

  // --- <dc-import name="SiteHeader" active="home"> -------------------------
  html = html.replace(/<dc-import\b([^>]*)>\s*<\/dc-import>/g, (_m, attrs) => {
    const name = (/name="([^"]*)"/.exec(attrs) || [])[1];
    const propsIn = {};
    for (const a of attrs.matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) {
      if (['name', 'hint-size'].includes(a[1])) continue;
      const key = a[1].replace(/-([a-z])/g, (_x, c) => c.toUpperCase());
      const hole = HOLE.exec(a[2]); HOLE.lastIndex = 0;
      propsIn[key] = hole ? lookup(hole[1], scope) : a[2];
    }
    return resolveImport(name, propsIn);
  });

  // --- {{ holes }} ---------------------------------------------------------
  return html.replace(HOLE, (_m, path) => {
    const v = lookup(path, scope);
    return v == null || v === false ? '' : String(v);
  });
}

/**
 * @returns {{helmet: string, body: string}}
 */
export function renderDC(dir, file, overrides = {}, propOverrides = {}, transform = null) {
  const source = readFileSync(join(dir, file), 'utf8');
  const helmet = (/<helmet>([\s\S]*?)<\/helmet>/.exec(source) || [, ''])[1].trim();
  let body = /<x-dc>([\s\S]*?)<\/x-dc>/.exec(source)[1]
    .replace(/<helmet>[\s\S]*?<\/helmet>/, '')
    .trim();

  let scope = { ...evaluateLogic(source), ...propOverrides, ...overrides };

  // ⚠️ The prototypes render ONLY the open accordion answer, because the
  // closed ones are behind an <sc-if>. A static page has to contain every
  // answer or no amount of JavaScript can reveal them — so the caller opens
  // them all here and the runtime collapses them on load.
  if (transform) scope = transform(scope) || scope;

  const resolveImport = (name, propsIn) => renderDC(dir, `${name}.dc.html`, {}, propsIn).body;

  body = expand(body, scope, resolveImport);
  // The runtime script is a prototype artefact; the deliverable ships site.js.
  body = body.replace(/<script[^>]*data-dc-script[^>]*>[\s\S]*?<\/script>/g, '');
  return { helmet, body: body.trim() };
}
