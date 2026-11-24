// ============================================================
// Markdown nabídky → HTML (náhled v aplikaci a podklad pro Google Doc)
// ============================================================

import { Marked } from 'marked';

// Syrové HTML z textů (reference, poznámky…) se jen zobrazí jako text
const marked = new Marked({
  gfm: true,
  breaks: false,
  renderer: {
    html: ({ text }) => escapeHtml(text),
  },
});

export function offerMarkdownToHtml(markdown: string): string {
  return marked.parse(markdown, { async: false });
}

// Samostatný HTML dokument pro import do Google Docs: styly inline, Docs je jinak ignoruje
export function offerHtmlDocument(markdown: string, title: string): string {
  // Docs při importu zahazuje výchozí okraje, mezery mezi bloky je nutné zapsat inline
  const body = offerMarkdownToHtml(markdown)
    .replace(/<p>/g, '<p style="margin:0 0 8pt 0">')
    .replace(/<ul>/g, '<ul style="margin:0 0 8pt 0">')
    .replace(/<ol>/g, '<ol style="margin:0 0 8pt 0">')
    .replace(/<h1>/g, '<h1 style="margin:0 0 10pt 0">')
    .replace(/<h2>/g, '<h2 style="margin:20pt 0 6pt 0">')
    .replace(/<h3>/g, '<h3 style="margin:16pt 0 6pt 0">')
    .replace(/<table>/g, '<table style="border-collapse:collapse;width:100%;margin:0 0 8pt 0">')
    .replace(/<th>/g, '<th style="border:1px solid #bbb;padding:4px 8px;background:#f1f3f4;text-align:left">')
    .replace(/<th align="(\w+)">/g, '<th style="border:1px solid #bbb;padding:4px 8px;background:#f1f3f4;text-align:$1">')
    .replace(/<td>/g, '<td style="border:1px solid #bbb;padding:4px 8px">')
    .replace(/<td align="(\w+)">/g, '<td style="border:1px solid #bbb;padding:4px 8px;text-align:$1">');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>` +
    `<body style="font-family:Arial,sans-serif;font-size:11pt">${body}</body></html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
