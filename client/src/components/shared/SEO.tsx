import { useEffect } from 'react';

export interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogType?: 'website' | 'article' | 'product';
  ogImage?: string;
  canonicalUrl?: string;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
}

export function SEO({
  title,
  description,
  keywords,
  ogType = 'website',
  ogImage,
  canonicalUrl,
  jsonLd,
}: SEOProps) {
  useEffect(() => {
    const baseTitle = 'Prem Electronics — Premium Electronics at Best Prices in India';
    document.title = title ? `${title} | Prem Electronics` : baseTitle;

    const setMeta = (name: string, content: string | undefined, isProperty = false) => {
      if (!content) return;
      const attr = isProperty ? 'property' : 'name';
      let element = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attr, name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    if (description) {
      setMeta('description', description);
      setMeta('og:description', description, true);
      setMeta('twitter:description', description);
    }

    if (keywords) {
      setMeta('keywords', keywords);
    }

    const fullTitle = title ? `${title} | Prem Electronics` : baseTitle;
    setMeta('og:title', fullTitle, true);
    setMeta('twitter:title', fullTitle);
    setMeta('og:type', ogType, true);

    const currentUrl = canonicalUrl || window.location.href;
    setMeta('og:url', currentUrl, true);

    if (ogImage) {
      setMeta('og:image', ogImage, true);
      setMeta('twitter:image', ogImage);
      setMeta('twitter:card', 'summary_large_image');
    } else {
      setMeta('twitter:card', 'summary');
    }

    let canonicalTag = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (currentUrl) {
      if (!canonicalTag) {
        canonicalTag = document.createElement('link');
        canonicalTag.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalTag);
      }
      canonicalTag.setAttribute('href', currentUrl);
    }

    const scriptId = 'prem-structured-data';
    let scriptTag = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (jsonLd) {
      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.id = scriptId;
        scriptTag.type = 'application/ld+json';
        document.head.appendChild(scriptTag);
      }
      scriptTag.textContent = JSON.stringify(jsonLd);
    } else if (scriptTag) {
      scriptTag.remove();
    }

    return () => {
      const activeScript = document.getElementById(scriptId);
      if (activeScript) activeScript.remove();
    };
  }, [title, description, keywords, ogType, ogImage, canonicalUrl, jsonLd]);

  return null;
}

