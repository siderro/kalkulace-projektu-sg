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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
