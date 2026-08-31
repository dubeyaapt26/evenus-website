// ---------------------------------------------------------------------------
// The markdown subset used by docs/legal/*.md.
//
// Lifted verbatim out of scripts/build-legal.mjs on 31 August 2026 so the site
// builder and the legal builder render identically. Not a general markdown
// implementation and not trying to be — it handles exactly what these
// documents use, and every rule in it earned its place by a document needing
// it. Do not extend it speculatively.
// ---------------------------------------------------------------------------

export /** Minimal markdown → HTML. Enough for these documents, and nothing more. */
function render(md) {
  const esc = (s) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const inline = (s) =>
    esc(s)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  const lines = md.split('\n');
  const html = [];
  let inTable = false;
  let inList = false;
  let inQuote = false;

  const closeList = () => {
    if (inList) {
      html.push('</ul>');
      inList = false;
    }
  };
  const closeTable = () => {
    if (inTable) {
      html.push('</tbody></table>');
      inTable = false;
    }
  };
  const closeQuote = () => {
    if (inQuote) {
      html.push('</blockquote>');
      inQuote = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^\s*$/.test(line)) {
      closeList();
      closeQuote();
      continue;
    }

    // Tables — separator rows are skipped, the first row becomes the head.
    if (/^\|/.test(line)) {
      const cells = line.split('|').slice(1, -1).map((c) => c.trim());
      if (cells.every((c) => /^:?-+:?$/.test(c) || c === '')) continue;
      if (!inTable) {
        closeList();
        html.push('<table><tbody>');
        inTable = true;
      }
      html.push('<tr>' + cells.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>');
      continue;
    }
    closeTable();

    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      closeList();
      closeQuote();
      html.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`);
      continue;
    }

    if (/^>\s?/.test(line)) {
      if (!inQuote) {
        html.push('<blockquote>');
        inQuote = true;
      }
      html.push(`<p>${inline(line.replace(/^>\s?/, ''))}</p>`);
      continue;
    }
    closeQuote();

    if (/^---+$/.test(line)) {
      closeList();
      html.push('<hr>');
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      if (!inList) {
        html.push('<ul>');
        inList = true;
      }
      const item = [line.replace(/^[-*]\s+/, '')];
      while (
        i + 1 < lines.length &&
        /^\s{2,}\S/.test(lines[i + 1]) &&
        !/^\s*[-*]\s/.test(lines[i + 1])
      ) {
        i++;
        item.push(lines[i].trim());
      }
      html.push(`<li>${inline(item.join(' '))}</li>`);
      continue;
    }
    closeList();

    // Join wrapped lines into one paragraph BEFORE inline formatting. Markdown
    // sources hard-wrap at ~80 columns, so **bold** and [links](x) routinely
    // straddle a line break — processing line-by-line renders the asterisks
    // literally, which is how a privacy policy ends up full of **.
    const para = [line];
    while (
      i + 1 < lines.length &&
      lines[i + 1].trim() !== '' &&
      !/^(#{1,4}\s|\||>|---+$|[-*]\s)/.test(lines[i + 1])
    ) {
      i++;
      para.push(lines[i]);
    }
    html.push(`<p>${inline(para.join(' '))}</p>`);
  }

  closeList();
  closeTable();
  closeQuote();
  return html.join('\n');
}
