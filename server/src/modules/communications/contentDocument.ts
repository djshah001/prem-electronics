import { z } from 'zod';
import sanitizeHtml from 'sanitize-html';

const ALLOWED_NODES = new Set(['doc', 'body', 'container', 'section', 'div', 'paragraph', 'heading', 'text', 'bulletList', 'orderedList', 'listItem', 'blockquote', 'hardBreak', 'horizontalRule', 'divider', 'button', 'image', 'twoColumns', 'threeColumns', 'fourColumns', 'columnsColumn', 'table', 'tableRow', 'tableCell', 'tableHeader']);
const ALLOWED_MARKS = new Set(['bold', 'italic', 'underline', 'strike', 'code', 'link', 'sup', 'uppercase', 'preservedStyle']);
const nodeSchema: z.ZodType<Record<string, unknown>> = z.lazy(() => z.object({
  type: z.string().refine((type) => ALLOWED_NODES.has(type), 'Unsupported document node.'),
  text: z.string().max(50_000).optional(),
  attrs: z.record(z.string(), z.unknown()).optional(),
  marks: z.array(z.object({ type: z.string().refine((type) => ALLOWED_MARKS.has(type), 'Unsupported mark.'), attrs: z.record(z.string(), z.unknown()).optional() })).max(20).optional(),
  content: z.array(nodeSchema).max(500).optional(),
}).strict());

export const structuredDocumentSchema = nodeSchema.superRefine((document, context) => {
  if (document.type !== 'doc') context.addIssue({ code: z.ZodIssueCode.custom, message: 'Document root must be doc.' });
  let count = 0;
  const visit = (node: Record<string, any>, depth: number) => {
    count += 1;
    if (depth > 20) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Document nesting is too deep.' });
    if (count > 2_000) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Document is too large.' });
    const url = String(node.attrs?.href ?? node.attrs?.src ?? '');
    if (url && !/^(https?:|mailto:|tel:|\/|{{\s*[a-zA-Z0-9_.]+\s*}})/i.test(url)) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Document contains an unsafe URL.' });
    (node.content ?? []).forEach((child: Record<string, any>) => visit(child, depth + 1));
  };
  visit(document as Record<string, any>, 0);
});

const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
const safeUrl = (value: unknown) => /^(https?:|mailto:|tel:|\/|{{\s*[a-zA-Z0-9_.]+\s*}})/i.test(String(value ?? '')) ? escape(value) : '#';
const style = (attrs: Record<string, any> = {}) => {
  const pairs: string[] = [];
  if (['left', 'center', 'right'].includes(attrs.textAlign)) pairs.push(`text-align:${attrs.textAlign}`);
  if (typeof attrs.backgroundColor === 'string' && /^#[0-9a-f]{3,8}$/i.test(attrs.backgroundColor)) pairs.push(`background-color:${attrs.backgroundColor}`);
  if (typeof attrs.color === 'string' && /^#[0-9a-f]{3,8}$/i.test(attrs.color)) pairs.push(`color:${attrs.color}`);
  return pairs.length ? ` style="${pairs.join(';')}"` : '';
};

const renderNode = (node: Record<string, any>): string => {
  const children = () => (node.content ?? []).map(renderNode).join('');
  if (node.type === 'text') {
    let output = escape(node.text);
    for (const mark of node.marks ?? []) {
      if (mark.type === 'bold') output = `<strong>${output}</strong>`;
      else if (mark.type === 'italic') output = `<em>${output}</em>`;
      else if (mark.type === 'underline') output = `<u>${output}</u>`;
      else if (mark.type === 'strike') output = `<s>${output}</s>`;
      else if (mark.type === 'code') output = `<code>${output}</code>`;
      else if (mark.type === 'link') output = `<a href="${safeUrl(mark.attrs?.href)}">${output}</a>`;
    }
    return output;
  }
  switch (node.type) {
    case 'doc': case 'body': return children();
    case 'container': return `<div style="max-width:600px;margin:0 auto">${children()}</div>`;
    case 'section': case 'div': return `<div${style(node.attrs)}>${children()}</div>`;
    case 'paragraph': return `<p${style(node.attrs)}>${children() || '&nbsp;'}</p>`;
    case 'heading': { const level = Math.min(Math.max(Number(node.attrs?.level ?? 2), 1), 4); return `<h${level}${style(node.attrs)}>${children()}</h${level}>`; }
    case 'bulletList': return `<ul>${children()}</ul>`;
    case 'orderedList': return `<ol>${children()}</ol>`;
    case 'listItem': return `<li>${children()}</li>`;
    case 'blockquote': return `<blockquote>${children()}</blockquote>`;
    case 'hardBreak': return '<br>';
    case 'horizontalRule': case 'divider': return '<hr>';
    case 'button': return `<p style="text-align:${['left', 'right'].includes(node.attrs?.textAlign) ? node.attrs.textAlign : 'center'}"><a href="${safeUrl(node.attrs?.href)}" style="display:inline-block;padding:12px 22px;border-radius:7px;background:#2563eb;color:#fff;text-decoration:none">${children() || escape(node.attrs?.text || 'Open')}</a></p>`;
    case 'image': return `<img src="${safeUrl(node.attrs?.src)}" alt="${escape(node.attrs?.alt)}" style="max-width:100%;height:auto">`;
    case 'twoColumns': case 'threeColumns': case 'fourColumns': return `<table role="presentation" width="100%"><tr>${children()}</tr></table>`;
    case 'columnsColumn': return `<td style="vertical-align:top">${children()}</td>`;
    case 'table': return `<table role="presentation" width="100%">${children()}</table>`;
    case 'tableRow': return `<tr>${children()}</tr>`;
    case 'tableCell': return `<td>${children()}</td>`;
    case 'tableHeader': return `<th>${children()}</th>`;
    default: return '';
  }
};

const textNode = (node: Record<string, any>): string => {
  if (node.type === 'text') return String(node.text ?? '');
  const content = (node.content ?? []).map(textNode).join(['paragraph', 'heading', 'listItem', 'blockquote'].includes(node.type) ? '\n' : '');
  return node.type === 'button' && node.attrs?.href ? `${content}: ${String(node.attrs.href)}` : content;
};

export function renderStructuredDocument(document: unknown, mode: 'email' | 'blog' = 'email') {
  const parsed = structuredDocumentSchema.parse(document);
  const fragment = sanitizeHtml(renderNode(parsed), {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'hr']),
    allowedAttributes: { '*': ['style'], a: ['href'], img: ['src', 'alt'], table: ['role', 'width'] },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  });
  const html = mode === 'blog' ? fragment : `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Prem Electronics</title></head><body style="margin:0;background:#f4f4f5;font-family:Arial,sans-serif;color:#18181b"><div style="display:none;max-height:0;overflow:hidden">{{preheader}}</div><div style="max-width:600px;margin:24px auto;background:#fff;padding:28px;border-radius:12px"><div style="font-size:20px;font-weight:700;color:#1d4ed8;margin-bottom:22px">Prem Electronics</div>${fragment}<hr><p style="font-size:12px;color:#71717a">Prem Electronics · Transactional and account communication.</p></div></body></html>`;
  return { html, text: textNode(parsed).replace(/\n{3,}/g, '\n\n').trim() };
}

export function substituteVariables(value: string, variables: Record<string, unknown>, required: string[] = []) {
  const missing = required.filter((key) => variables[key] === undefined || variables[key] === null || variables[key] === '');
  if (missing.length) throw new Error(`Missing required variables: ${missing.join(', ')}`);
  return value.replace(/{{\s*([a-zA-Z0-9_.]+)\s*}}/g, (_match, key: string) => {
    const resolved = key.split('.').reduce<unknown>((current, part) => current && typeof current === 'object' ? (current as Record<string, unknown>)[part] : undefined, variables);
    return escape(resolved ?? '');
  });
}

export function documentFromPlainContent(heading: string, paragraphs: string[], button?: { text: string; href: string }) {
  const text = (value: string) => ({ type: 'text', text: value });
  return { type: 'doc' as const, content: [
    { type: 'heading', attrs: { level: 2 }, content: [text(heading)] },
    ...paragraphs.map((paragraph) => ({ type: 'paragraph', content: [text(paragraph)] })),
    ...(button ? [{ type: 'button', attrs: { href: button.href }, content: [text(button.text)] }] : []),
  ] };
}
