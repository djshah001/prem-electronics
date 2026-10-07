import assert from 'node:assert/strict';
import test from 'node:test';
import { documentFromPlainContent, renderStructuredDocument, structuredDocumentSchema, substituteVariables } from './contentDocument.js';

test('structured documents render safe email HTML and plain text', () => {
  const document = documentFromPlainContent('Order {{orderNumber}}', ['Hi {{customerName}}'], { text: 'Open order', href: 'https://example.test/orders/{{orderNumber}}' });
  const rendered = renderStructuredDocument(document);
  const html = substituteVariables(rendered.html, { orderNumber: 'PE-42', customerName: 'Asha', preheader: 'Order update' }, ['orderNumber', 'customerName']);
  assert.match(html, /PE-42/);
  assert.match(html, /Asha/);
  assert.doesNotMatch(html, /<script/i);
  assert.match(rendered.text, /Order \{\{orderNumber\}\}/);
});

test('structured document validation rejects arbitrary executable nodes and URLs', () => {
  assert.equal(structuredDocumentSchema.safeParse({ type: 'doc', content: [{ type: 'script', text: 'alert(1)' }] }).success, false);
  assert.equal(structuredDocumentSchema.safeParse({ type: 'doc', content: [{ type: 'button', attrs: { href: 'javascript:alert(1)' } }] }).success, false);
});

test('required variables fail closed', () => {
  assert.throws(() => substituteVariables('Hi {{customerName}}', {}, ['customerName']), /Missing required variables/);
});

