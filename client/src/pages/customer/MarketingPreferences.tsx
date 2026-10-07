import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../../api/axiosClient';

export default function MarketingPreferences() {
  const qc = useQueryClient(); const preference = useQuery({ queryKey: ['marketing-preference'], queryFn: () => api.get<{ optedIn: boolean; provenance: string }>('/marketing/preference') }); const [optedIn, setOptedIn] = useState(false);
  useEffect(() => { if (preference.data) setOptedIn(preference.data.data.optedIn); }, [preference.data]);
  const save = useMutation({ mutationFn: () => api.put('/marketing/preference', { optedIn }), onSuccess: () => { void qc.invalidateQueries({ queryKey: ['marketing-preference'] }); toast.success('Marketing preference saved.'); } });
  return <div className="mx-auto max-w-2xl p-4 sm:p-8"><section className="rounded-xl border border-border bg-card p-6"><h1 className="text-2xl font-black">Marketing preferences</h1><p className="mt-2 text-sm text-muted-foreground">Transactional account and order emails are unaffected.</p><label className="mt-6 flex items-start gap-3"><input type="checkbox" checked={optedIn} onChange={(event) => setOptedIn(event.target.checked)} className="mt-1" /><span><strong>Send me promotions and product news</strong><span className="block text-sm text-muted-foreground">Consent is optional and can be withdrawn at any time.</span></span></label><button onClick={() => save.mutate()} className="mt-6 rounded-lg bg-primary px-4 py-2 text-primary-foreground">Save preference</button></section></div>;
}
