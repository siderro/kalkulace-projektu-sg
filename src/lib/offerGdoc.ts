// ============================================================
// Markdown nabídky → požadavky Google Docs API (batchUpdate)
// Obsah se vkládá do kopie Šablony ŠG a používá její pojmenované styly
// (Název, Nadpis 1–3, Normální text), takže vzhled určuje šablona.
// ============================================================

import { Lexer, type Token, type Tokens } from 'marked';

type DocsRequest = Record<string, unknown>;

interface Span {
  start: number; // offset v textu
  end: number;
  bold?: boolean;
  italic?: boolean;
  link?: string;
}

interface RichText {
  text: string;
  spans: Span[];
}

// Markdown nadpis → pojmenovaný styl šablony
const HEADING_STYLES = ['TITLE', 'HEADING_1', 'HEADING_2', 'HEADING_3', 'HEADING_4', 'HEADING_5'];

const NO_INDENT = { magnitude: 0, unit: 'PT' };
const HEADER_BACKGROUND = { color: { rgbColor: { red: 0.945, green: 0.953, blue: 0.957 } } };

// Řádkové prvky (tučné, kurzíva, odkaz, zalomení) → text a rozsahy formátu
function inlineText(tokens: Token[] | undefined, fallback = ''): RichText {
  const out: RichText = { text: '', spans: [] };
  if (!tokens) {
    out.text = fallback;
    return out;
  }
  const walk = (list: Token[], format: Omit<Span, 'start' | 'end'>) => {
    for (const t of list) {
      const start = out.text.length;
      switch (t.type) {
        case 'strong':
          walk((t as Tokens.Strong).tokens, { ...format, bold: true });
          break;
        case 'em':
          walk((t as Tokens.Em).tokens, { ...format, italic: true });
          break;
        case 'link':
          walk((t as Tokens.Link).tokens, { ...format, link: (t as Tokens.Link).href });
          break;
        case 'br':
          // Vertikální tabulátor = zalomení řádku uvnitř odstavce
          out.text += '\u000b';
          break;
        case 'codespan':
          out.text += (t as Tokens.Codespan).text;
          break;
        default:
          if ('tokens' in t && t.tokens) walk(t.tokens, format);
          // zalomení řádku ve zdrojovém Markdownu je jen mezera (nový řádek by v Docs založil odstavec)
          else out.text += decodeEntities('text' in t ? String(t.text) : t.raw).replace(/\n/g, ' ');
      }
      if ((format.bold || format.italic || format.link) && out.text.length > start) {
        out.spans.push({ start, end: out.text.length, ...format });
      }
    }
  };
  walk(tokens, {});
  return out;
}

// marked v textu escapuje &, <, > a uvozovky
function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function textStyleRequests(rich: RichText, at: number): DocsRequest[] {
  return rich.spans.map((s) => {
    const textStyle: Record<string, unknown> = {};
    if (s.bold) textStyle.bold = true;
    if (s.italic) textStyle.italic = true;
    if (s.link) textStyle.link = { url: s.link };
    return {
      updateTextStyle: {
        range: { startIndex: at + s.start, endIndex: at + s.end },
        textStyle,
        fields: Object.keys(textStyle).join(','),
      },
    };
  });
}

// Vložený text přebírá styl, odrážku i formát odstavce, před který se vkládá – vše se proto nastaví výslovně
// (odebrání odrážky přidá odsazení, proto se odsazení nuluje až po něm)
function resetParagraphs(start: number, end: number, namedStyleType: string, extra: Record<string, unknown> = {}): DocsRequest[] {
  const paragraphStyle = { namedStyleType, indentStart: NO_INDENT, indentFirstLine: NO_INDENT, ...extra };
  return [
    { deleteParagraphBullets: { range: { startIndex: start, endIndex: end } } },
    { updateParagraphStyle: { range: { startIndex: start, endIndex: end }, paragraphStyle, fields: Object.keys(paragraphStyle).join(',') } },
  ];
}

// Formát textu jen podle pojmenovaného stylu šablony
function resetText(start: number, end: number): DocsRequest[] {
  return end > start ? [{ updateTextStyle: { range: { startIndex: start, endIndex: end }, textStyle: {}, fields: '*' } }] : [];
}

// Odstavce vložené na pozici `at`: text, styl odstavce, zrušení zděděného formátu, tučné úseky
function paragraphsRequests(paragraphs: RichText[], namedStyleType: string, at: number, bullets?: string): DocsRequest[] {
  const text = paragraphs.map((p) => p.text + '\n').join('');
  const end = at + text.length;
  const requests: DocsRequest[] = [
    { insertText: { location: { index: at }, text } },
    ...resetParagraphs(at, end, namedStyleType),
    ...resetText(at, end),
  ];
  if (bullets) {
    requests.push({ createParagraphBullets: { range: { startIndex: at, endIndex: end }, bulletPreset: bullets } });
  }
  let offset = at;
  for (const p of paragraphs) {
    requests.push(...textStyleRequests(p, offset));
    offset += p.text.length + 1;
  }
  return requests;
}

// Tabulka vložená na pozici `at`. Nejdřív čistý prázdný odstavec (tabulka by jinak převzala odsazení
// odrážek za ní), Docs pak před tabulku vloží další prázdný odstavec, tabulka začíná na at + 1.
// Buňky se plní od poslední, aby se indexy dřívějších buněk neposouvaly.
function tableRequests(table: Tokens.Table, at: number): DocsRequest[] {
  const rows = [table.header, ...table.rows];
  const columns = table.header.length;
  const tableStart = at + 1;
  const requests: DocsRequest[] = [
    { insertText: { location: { index: at }, text: '\n' } },
    ...resetParagraphs(at, at + 1, 'NORMAL_TEXT'),
    { insertTable: { location: { index: at }, rows: rows.length, columns } },
    ...resetParagraphs(at, at + 1, 'NORMAL_TEXT'),
  ];
  for (let r = rows.length - 1; r >= 0; r--) {
    for (let c = columns - 1; c >= 0; c--) {
      const cell = rows[r][c];
      const rich = inlineText(cell?.tokens, cell?.text ?? '');
      const cellAt = tableStart + 3 + r * (2 * columns + 1) + 2 * c;
      const align = table.align[c];
      const alignment = align === 'right' ? 'END' : align === 'center' ? 'CENTER' : 'START';
      requests.push(...resetParagraphs(cellAt, cellAt + 1, 'NORMAL_TEXT', { alignment }));
      if (!rich.text) continue;
      requests.push({ insertText: { location: { index: cellAt }, text: rich.text } });
      requests.push(...resetText(cellAt, cellAt + rich.text.length));
      if (r === 0) rich.spans.push({ start: 0, end: rich.text.length, bold: true });
      requests.push(...textStyleRequests(rich, cellAt));
    }
  }
  requests.push({
    updateTableCellStyle: {
      tableRange: { tableCellLocation: { tableStartLocation: { index: tableStart }, rowIndex: 0, columnIndex: 0 }, rowSpan: 1, columnSpan: columns },
      tableCellStyle: { backgroundColor: HEADER_BACKGROUND },
      fields: 'backgroundColor',
    },
  });
  return requests;
}

function blockRequests(token: Token, at: number): DocsRequest[] {
  switch (token.type) {
    case 'heading': {
      const t = token as Tokens.Heading;
      return paragraphsRequests([inlineText(t.tokens, t.text)], HEADING_STYLES[Math.min(t.depth, 6) - 1], at);
    }
    case 'paragraph': {
      const t = token as Tokens.Paragraph;
      return paragraphsRequests([inlineText(t.tokens, t.text)], 'NORMAL_TEXT', at);
    }
    case 'list': {
      const t = token as Tokens.List;
      const items = t.items.map((item) => inlineText(item.tokens.flatMap((x) => ('tokens' in x && x.tokens ? x.tokens : [x])), item.text));
      return paragraphsRequests(items, 'NORMAL_TEXT', at, t.ordered ? 'NUMBERED_DECIMAL_ALPHA_ROMAN' : 'BULLET_DISC_CIRCLE_SQUARE');
    }
    case 'table':
      return tableRequests(token as Tokens.Table, at);
    case 'blockquote':
      return [...(token as Tokens.Blockquote).tokens].reverse().flatMap((t) => blockRequests(t, at));
    case 'code':
    case 'html': {
      const text = 'text' in token ? String(token.text) : token.raw;
      return text.trim() ? paragraphsRequests([{ text: text.trim(), spans: [] }], 'NORMAL_TEXT', at) : [];
    }
    default:
      // mezery a oddělovače se nevkládají
      return [];
  }
}

// Všechny bloky se vkládají na stejnou pozici v opačném pořadí – indexy uvnitř bloku pak stačí počítat od `at`
export function offerDocRequests(markdown: string, at: number): DocsRequest[] {
  const tokens = new Lexer({ gfm: true }).lex(markdown);
  return [...tokens].reverse().flatMap((t) => blockRequests(t, at));
}
