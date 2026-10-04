import sanitizeHtml from 'sanitize-html';
import { env } from '../../config/env.js';

const allowedImageHosts = new Set([
  new URL(env.CLIENT_URL).host,
  ...env.BLOG_IMAGE_HOSTS,
]);

export const isAllowedBlogImageSource = (source?: string | null) => {
  if (!source) return false;
  if (source.startsWith('/uploads/') || source.startsWith('/assets/')) return true;
  try {
    const url = new URL(source);
    return url.protocol === 'https:' && allowedImageHosts.has(url.host);
  } catch {
    return false;
  }
};

export const BLOG_ALLOWED_FORMATTING: {
  tags: string[];
  attributes: Record<string, string[]>;
} = {
  tags: [
    'p', 'br', 'strong', 'em', 'u', 's', 'blockquote', 'code', 'pre',
    'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'a', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td', 'caption', 'hr',
  ],
  attributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    th: ['colspan', 'rowspan', 'scope'],
    td: ['colspan', 'rowspan'],
  },
};

export const sanitizeBlogHtml = (html: string) => sanitizeHtml(html, {
  allowedTags: [...BLOG_ALLOWED_FORMATTING.tags],
  allowedAttributes: BLOG_ALLOWED_FORMATTING.attributes,
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: { img: ['https'] },
  allowProtocolRelative: false,
  enforceHtmlBoundary: true,
  transformTags: {
    a: (_tagName, attributes) => {
      const href = attributes.href ?? '';
      const external = /^https?:\/\//i.test(href);
      return {
        tagName: 'a',
        attribs: {
          ...attributes,
          ...(external ? { target: '_blank', rel: 'noopener noreferrer nofollow' } : {}),
        },
      };
    },
  },
  exclusiveFilter: (frame) => frame.tag === 'img' && !isAllowedBlogImageSource(frame.attribs.src),
});

export const blogTextContent = (html: string) => sanitizeHtml(html, {
  allowedTags: [],
  allowedAttributes: {},
}).replace(/\s+/g, ' ').trim();
