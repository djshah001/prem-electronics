import assert from 'node:assert/strict';
import test from 'node:test';
import { blogTextContent, sanitizeBlogHtml } from './blogSanitizer.js';

test('blog sanitizer removes executable and embedded content while preserving formatting', () => {
  const clean = sanitizeBlogHtml(`
    <h2 onclick="alert(1)">Safe heading</h2>
    <p>Readable <strong>formatted</strong> content.</p>
    <script>alert('xss')</script>
    <img src="https://images.unsplash.com/example.jpg" onerror="alert(1)" alt="Safe image">
    <img src="javascript:alert(1)" alt="Unsafe image">
    <a href="javascript:alert(1)">Bad link</a>
    <a href="https://example.com/article">External link</a>
    <iframe src="https://evil.example"></iframe><form><input></form>
  `);
  assert.match(clean, /<h2>Safe heading<\/h2>/);
  assert.match(clean, /<strong>formatted<\/strong>/);
  assert.match(clean, /images\.unsplash\.com/);
  assert.match(clean, /rel="noopener noreferrer nofollow"/);
  assert.doesNotMatch(clean, /<script|onerror=|onclick=|javascript:|<iframe|<form|<input/i);
  assert.equal(blogTextContent(clean).includes('Readable formatted content.'), true);
});
