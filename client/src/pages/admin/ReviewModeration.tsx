import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { MessageSquare, ThumbsUp, ThumbsDown, Star, CheckCircle } from 'lucide-react';
import { api } from '../../api/axiosClient';
import type { Review, PaginationMeta } from '../../types';
import { toast } from 'sonner';
import { clsx } from 'clsx';

export default function ReviewModeration() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-pending-reviews', page],
    queryFn: () => api.get<Review[]>('/admin/reviews/pending', { page, limit: 15 } as Record<string, unknown>),
    placeholderData: (prev) => prev,
  });

  const reviews = data?.data ?? [];
  const meta = data?.meta as PaginationMeta | undefined;

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/reviews/${id}/approve`, {}),
    onSuccess: () => { toast.success('Review approved!'); qc.invalidateQueries({ queryKey: ['admin-pending-reviews'] }); },
    onError: (e: any) => toast.error(e?.message || 'Failed to approve'),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/reviews/${id}/reject`),
    onSuccess: () => { toast.success('Review rejected and removed.'); qc.invalidateQueries({ queryKey: ['admin-pending-reviews'] }); },
    onError: (e: any) => toast.error(e?.message || 'Failed to reject'),
  });

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-black font-['Outfit'] flex items-center gap-2">
          <MessageSquare className="w-7 h-7 text-primary" /> Review Moderation
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {meta?.total ?? 0} pending review{(meta?.total ?? 0) !== 1 ? 's' : ''} awaiting approval
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-36 bg-card rounded-2xl border border-border animate-pulse" />)}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-24 bg-card rounded-2xl border border-border">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold font-['Outfit'] mb-2">All reviews moderated</h3>
          <p className="text-muted-foreground text-sm">There are no pending reviews at the moment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review, i) => (
            <motion.div key={review.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card rounded-2xl border border-border p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {review.userName?.charAt(0).toUpperCase() ?? '?'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{review.userName ?? 'Anonymous'}</p>
                      <p className="text-xs text-muted-foreground">on <span className="text-foreground">{review.productTitle ?? review.productId}</span></p>
                    </div>
                    <div className="flex items-center gap-0.5 ml-auto sm:ml-0">
                      {[...Array(5)].map((_, j) => (
                        <Star key={j} className={clsx('w-3.5 h-3.5', j < review.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30')} />
                      ))}
                    </div>
                    {review.isVerifiedBuyer && (
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-medium">Verified Buyer</span>
                    )}
                  </div>
                  {review.title && <p className="font-semibold text-foreground mb-1">{review.title}</p>}
                  {review.body && <p className="text-sm text-muted-foreground leading-relaxed">{review.body}</p>}
                  <p className="text-xs text-muted-foreground mt-2">{new Date(review.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button id={`approve-review-${review.id}`}
                    onClick={() => approveMutation.mutate(review.id)}
                    disabled={approveMutation.isPending}
                    className="flex items-center gap-1.5 px-4 py-2 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60">
                    <ThumbsUp className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button id={`reject-review-${review.id}`}
                    onClick={() => rejectMutation.mutate(review.id)}
                    disabled={rejectMutation.isPending}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60">
                    <ThumbsDown className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex justify-center gap-3 mt-6">
          <button disabled={!meta.hasPrevPage} onClick={() => setPage(p => p - 1)} className="px-4 py-2 bg-card border border-border rounded-lg text-sm disabled:opacity-40">Previous</button>
          <span className="px-4 py-2 text-sm text-muted-foreground">Page {meta.page} of {meta.totalPages}</span>
          <button disabled={!meta.hasNextPage} onClick={() => setPage(p => p + 1)} className="px-4 py-2 bg-card border border-border rounded-lg text-sm disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
