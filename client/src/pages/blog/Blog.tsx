import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, BookOpen, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../api/axiosClient';
import type { Blog, PaginationMeta } from '../../types';

export default function BlogPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['blogs', page, search],
    queryFn: () => api.get<Blog[]>('/blogs', { page, limit: 9, ...(search && { search }) } as Record<string, unknown>),
    placeholderData: (prev) => prev,
  });

  const blogs = data?.data ?? [];
  const meta = data?.meta as PaginationMeta | undefined;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="gradient-primary py-16 sm:py-20 text-center text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-20 w-40 h-40 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-20 w-60 h-60 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <BookOpen className="w-6 h-6" />
            <span className="text-sm font-medium opacity-80">Prem Electronics Blog</span>
          </div>
          <h1 className="text-5xl font-black font-['Outfit'] mb-4">Tech Insights & Reviews</h1>
          <p className="text-white/70 max-w-xl mx-auto">Expert guides, product reviews, and the latest tech news to help you make informed decisions.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Search */}
        <div className="relative max-w-md mx-auto mb-10">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search articles..."
            className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-2xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm" />
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => <div key={i} className="h-72 bg-card rounded-2xl animate-pulse" />)}
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No articles found</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogs.map((blog, i) => (
              <motion.article key={blog.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                className="bg-card rounded-2xl border border-border overflow-hidden group hover:border-primary/30 transition-all duration-300 card-glow">
                <Link to={`/blog/${blog.slug}`}>
                  <div className="aspect-[16/9] overflow-hidden bg-gradient-to-br from-primary/20 to-purple-500/20">
                    {blog.imageUrl
                      ? <img src={blog.imageUrl} alt={blog.coverAlt ?? blog.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      : <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-10 h-10 text-primary/40" /></div>}
                  </div>
                </Link>
                <div className="p-5">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                    <Calendar className="w-3 h-3" />
                    {new Date(blog.publishedAt ?? blog.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                    {blog.authorName && <span className="ml-1">· by {blog.authorName}</span>}
                  </div>
                  <Link to={`/blog/${blog.slug}`}>
                    <h2 className="text-base font-bold font-['Outfit'] text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                      {blog.title}
                    </h2>
                  </Link>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {blog.excerpt ?? blog.seoDescription ?? blog.content.replace(/<[^>]*>/g, '').slice(0, 120) + '...'}
                  </p>
                  <Link to={`/blog/${blog.slug}`} className="text-primary text-sm font-semibold hover:underline">
                    Read more →
                  </Link>
                </div>
              </motion.article>
            ))}
          </div>
        )}

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex justify-center gap-3 mt-10">
            <button disabled={!meta.hasPrevPage} onClick={() => setPage(p => p - 1)} className="px-5 py-2 bg-card border border-border rounded-xl text-sm disabled:opacity-40 hover:border-primary/40 transition-colors">← Previous</button>
            <span className="px-5 py-2 text-sm text-muted-foreground">Page {meta.page} of {meta.totalPages}</span>
            <button disabled={!meta.hasNextPage} onClick={() => setPage(p => p + 1)} className="px-5 py-2 bg-card border border-border rounded-xl text-sm disabled:opacity-40 hover:border-primary/40 transition-colors">Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}
