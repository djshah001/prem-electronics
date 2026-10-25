import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api/axiosClient';

export default function Unsubscribe() {
  const [params] = useSearchParams(); const token = params.get('token') ?? ''; const [done, setDone] = useState(false);
  const confirmation = useQuery({ queryKey: ['unsubscribe', token], queryFn: () => api.get<{ email: string; campaignName: string; alreadyUnsubscribed: boolean }>('/unsubscribe', { token }), enabled: token.length > 20, retry: false });
  const unsubscribe = useMutation({ mutationFn: () => api.post<{ unsubscribed: boolean; email: string }>('/unsubscribe', { token }), onSuccess: () => setDone(true) });
  const data = confirmation.data?.data;
  return <main className="mx-auto max-w-lg px-4 mt-16 sm:mt-20 py-16"><section className="rounded-2xl border border-border bg-card p-8 text-center"><h1 className="text-2xl font-black">Marketing email preference</h1>{confirmation.isPending && <p className="mt-4 text-muted-foreground">Checking your link…</p>}{confirmation.isError && <p className="mt-4 text-red-500">This unsubscribe link is invalid or expired.</p>}{data && !done && <><p className="mt-4 text-muted-foreground">Unsubscribe <strong>{data.email}</strong> from Prem Electronics marketing messages?</p>{data.alreadyUnsubscribed ? <p className="mt-5 text-emerald-600">This address is already unsubscribed.</p> : <button onClick={() => unsubscribe.mutate()} className="mt-6 rounded-lg bg-primary px-5 py-2.5 text-primary-foreground">Confirm unsubscribe</button>}</>}{done && <p className="mt-5 text-emerald-600">You are unsubscribed. Repeating this action is safe.</p>}<Link to="/" className="mt-6 block text-sm text-primary">Return to Prem Electronics</Link></section></main>;
}
