import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, User, Link2 } from 'lucide-react';
import { api } from '../../api/axiosClient';
import type { Blog } from '../../types';
import { toast } from 'sonner';
import { useEffect, useMemo } from 'react';
import { cn } from '../../lib/utils';
import { SEO } from '../../components/shared/SEO';

export default function BlogDetails() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['blog', slug],
    queryFn: () => api.get<Blog>(`/blogs/${slug}`),
    enabled: !!slug,
  });

  const blog = data?.data;
  useEffect(() => {
    if (blog?.redirectedFrom && blog.slug !== slug) {
      navigate(`/blog/${blog.slug}`, { replace: true });
    }
  }, [blog?.redirectedFrom, blog?.slug, navigate, slug]);

  const jsonLd = useMemo(() => {
    if (!blog) return undefined;
    return {
      '@context': 'https://schema.org/',
      '@type': 'BlogPosting',
      headline: blog.title,
      description: blog.seoDescription || blog.excerpt || blog.title,
      image: blog.imageUrl ? [blog.imageUrl] : [],
      datePublished: blog.publishedAt,
      dateModified: blog.updatedAt,
      author: {
        '@type': 'Organization',
        name: 'Prem Electronics',
      },
    };
  }, [blog]);

  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
  const title = blog?.title ?? '';

  const share = {
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(pageUrl)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`,
    linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(pageUrl)}&title=${encodeURIComponent(title)}`,
    copy: () => { navigator.clipboard.writeText(pageUrl); toast.success('Link copied!'); },
  };

  if (isLoading) return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-16 animate-pulse">
        <div className="h-8 bg-muted rounded-xl mb-4 w-3/4" />
        <div className="h-4 bg-muted rounded-xl mb-2 w-1/2" />
        <div className="aspect-[16/9] bg-muted rounded-2xl mb-8" />
        {[...Array(6)].map((_, i) => <div key={i} className="h-4 bg-muted rounded mb-2" />)}
      </div>
    </div>
  );

  if (isError || !blog) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <p className="text-4xl mb-4">📰</p>
        <h1 className="text-2xl font-bold font-['Outfit'] mb-2">Article not found</h1>
        <p className="text-muted-foreground mb-6">This article may have been removed or the link is incorrect.</p>
        <Link to="/blog" className="px-5 py-2.5 gradient-primary text-white rounded-xl font-semibold text-sm">Back to Blog</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={blog.seoTitle || blog.title}
        description={blog.seoDescription || blog.excerpt || blog.title}
        ogType="article"
        ogImage={blog.imageUrl || undefined}
        jsonLd={jsonLd}
      />
      {/* Hero */}
      {blog.imageUrl && (
        <div className="relative h-72 md:h-96 overflow-hidden">
          <img src={blog.imageUrl} alt={blog.coverAlt ?? blog.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        </div>
      )}

      <div className={cn("max-w-3xl mx-auto px-4 py-10 relative z-10", blog.imageUrl ? "-mt-20" : "pt-8")}>
        {/* Back */}
        <Link to="/blog" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Blog
        </Link>

        <motion.article initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl md:text-5xl font-black font-['Outfit'] text-foreground mb-4 leading-tight">{blog.title}</h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-8">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {new Date(blog.publishedAt ?? blog.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            {blog.authorName && (
              <div className="flex items-center gap-1.5">
                <User className="w-4 h-4" />
                {blog.authorName}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="prose prose-invert max-w-none prose-headings:font-['Outfit'] prose-a:text-primary"
            dangerouslySetInnerHTML={{ __html: blog.content }} />

          {/* Share */}
          <div className="mt-12 pt-8 border-t border-border">
            <p className="text-sm font-semibold text-muted-foreground mb-4">Share this article</p>
            <div className="flex gap-3 flex-wrap">
              {[
                { label: 'Twitter', icon: Link2, href: share.twitter, color: 'hover:bg-[#1DA1F2]/10 hover:text-[#1DA1F2]' },
                { label: 'Facebook', icon: Link2, href: share.facebook, color: 'hover:bg-[#1877F2]/10 hover:text-[#1877F2]' },
                { label: 'LinkedIn', icon: Link2, href: share.linkedin, color: 'hover:bg-[#0A66C2]/10 hover:text-[#0A66C2]' },
              ].map(({ label, icon: Icon, href, color }) => (
                <a key={label} href={href} target="_blank" rel="noreferrer"
                  className={`flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl text-sm font-medium text-muted-foreground transition-all ${color}`}>
                  <Icon className="w-4 h-4" /> {label}
                </a>
              ))}
              <button onClick={share.copy}
                className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl text-sm font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all">
                <Link2 className="w-4 h-4" /> Copy Link
              </button>
            </div>
          </div>

          {/* Back CTA */}
          <div className="mt-10 text-center">
            <Link to="/blog" className="inline-flex items-center gap-2 px-6 py-3 bg-card border border-border rounded-2xl text-sm font-semibold hover:border-primary/40 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Browse More Articles
            </Link>
          </div>
        </motion.article>
      </div>
    </div>
  );
}
