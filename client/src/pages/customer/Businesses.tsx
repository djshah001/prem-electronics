import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { api } from '../../api/axiosClient';
import type { BusinessProfile } from '../../types';
import { BusinessProfileForm } from '../../components/shared/BusinessProfileForm';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';

export default function Businesses() {
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const signupGstin = searchParams.get('gstin') ?? '';
  const [showAdd, setShowAdd] = useState(searchParams.get('setup') === '1');
  const [reverifyGstin, setReverifyGstin] = useState(signupGstin);
  const [editing, setEditing] = useState<BusinessProfile | null>(null);
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['businesses'], queryFn: () => api.get<BusinessProfile[]>('/businesses') });
  const profiles = data?.data ?? [];
  const update = useMutation({
    mutationFn: ({ profile, changes }: { profile: BusinessProfile; changes: Record<string, unknown> }) => api.patch<BusinessProfile>(`/businesses/${profile.id}`, { version: profile.version, ...changes }),
    onSuccess: () => { setEditing(null); qc.invalidateQueries({ queryKey: ['businesses'] }); toast.success('Business profile updated.'); },
    onError: (error: { message?: string }) => toast.error(error.message ?? 'Could not update the profile.'),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/businesses/${id}`),
    onSuccess: () => { toast.success('Business profile removed. Existing invoices are unchanged.'); qc.invalidateQueries({ queryKey: ['businesses'] }); },
    onError: (error: { message?: string }) => toast.error(error.message ?? 'Could not remove the profile.'),
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-16 sm:mt-20 py-8">
      <div className="flex items-center justify-between gap-4 mb-7">
        <div><h1 className="text-3xl font-black font-['Outfit']">Business profiles</h1><p className="text-sm text-muted-foreground">Manage verified GST registrations and invoice billing details.</p></div>
        <button onClick={() => { setShowAdd((value) => !value); setReverifyGstin(''); }} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center gap-2"><Plus className="w-4 h-4" /> Add business</button>
      </div>
      {(showAdd || reverifyGstin) && <div className="bg-card border border-border rounded-2xl p-6 mb-6"><BusinessProfileForm key={reverifyGstin || 'new'} initialGstin={reverifyGstin} onSaved={() => { setShowAdd(false); setReverifyGstin(''); }} /></div>}
      {editing && <div className="bg-card border border-border rounded-2xl p-6 mb-6 space-y-4">
        <div><h2 className="font-bold">Edit {editing.legalName}</h2><p className="text-xs text-muted-foreground">Verified legal identity and GSTIN are read-only. These contact and billing changes do not require reverification.</p></div>
        <div className="grid sm:grid-cols-2 gap-3">
          <input value={editing.nickname ?? ''} onChange={(e) => setEditing({ ...editing, nickname: e.target.value })} placeholder="Nickname" className="px-3 py-2 rounded-lg bg-background border border-border" />
          <input value={editing.contactPerson ?? ''} onChange={(e) => setEditing({ ...editing, contactPerson: e.target.value })} placeholder="Contact person" className="px-3 py-2 rounded-lg bg-background border border-border" />
          <input value={editing.contactPhone ?? ''} onChange={(e) => setEditing({ ...editing, contactPhone: e.target.value })} placeholder="Contact phone" className="px-3 py-2 rounded-lg bg-background border border-border" />
          <input type="email" value={editing.contactEmail ?? ''} onChange={(e) => setEditing({ ...editing, contactEmail: e.target.value })} placeholder="Contact email" className="px-3 py-2 rounded-lg bg-background border border-border" />
          {(['building', 'street', 'locality', 'city', 'district', 'state', 'stateCode', 'pincode'] as const).map((field) => <input key={field} value={editing.billingAddress[field] ?? ''} onChange={(e) => setEditing({ ...editing, billingAddress: { ...editing.billingAddress, [field]: e.target.value, source: 'customer' } })} placeholder={field} className="px-3 py-2 rounded-lg bg-background border border-border" />)}
        </div>
        <div className="flex gap-3"><button onClick={() => setEditing(null)} className="px-4 py-2 rounded-xl border border-border text-sm">Cancel</button><button disabled={update.isPending} onClick={() => update.mutate({ profile: editing, changes: { nickname: editing.nickname || null, contactPerson: editing.contactPerson || null, contactPhone: editing.contactPhone || null, contactEmail: editing.contactEmail || null, billingAddress: editing.billingAddress } })} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">Save changes</button></div>
      </div>}
      {isLoading && <p className="text-muted-foreground">Loading businesses…</p>}
      {isError && <button onClick={() => refetch()} className="text-primary">Could not load businesses. Retry</button>}
      {!isLoading && profiles.length === 0 && !showAdd && <div className="text-center p-12 rounded-2xl border border-dashed border-border"><Building2 className="w-10 h-10 mx-auto text-muted-foreground mb-3" /><p className="font-semibold">No saved business profiles</p><p className="text-sm text-muted-foreground">Add one now or continue using personal checkout.</p></div>}
      <div className="grid md:grid-cols-2 gap-4">
        {profiles.map((profile) => <article key={profile.id} className="rounded-2xl border border-border bg-card p-5">
          <div className="flex justify-between gap-3"><div><h2 className="font-bold">{profile.nickname || profile.tradeName || profile.legalName}</h2><p className="text-sm text-muted-foreground">{profile.legalName}</p><p className="font-mono text-xs mt-1">{profile.gstin}</p></div>{profile.isDefault && <span className="h-fit text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">Default</span>}</div>
          <p className="text-sm mt-3">{profile.billingAddress.street && `${profile.billingAddress.street}, `}{profile.billingAddress.city}, {profile.billingAddress.state} – {profile.billingAddress.pincode}</p>
          <p className="text-xs text-muted-foreground mt-2">Verified {new Date(profile.verifiedAt).toLocaleDateString()} · Version {profile.version}</p>
          <div className="flex flex-wrap gap-3 mt-4 text-sm">
            {!profile.isDefault && <button onClick={() => update.mutate({ profile, changes: { isDefault: true } })} className="text-primary hover:underline">Make default</button>}
            <button onClick={() => setEditing(profile)} className="text-primary hover:underline">Edit billing/contact</button>
            <button onClick={() => { setReverifyGstin(profile.gstin); setShowAdd(false); }} className="text-primary hover:underline flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5" /> Reverify GSTIN</button>
            <button onClick={() => window.confirm('Remove this business profile? Existing order and invoice snapshots will remain unchanged.') && remove.mutate(profile.id)} className="text-destructive hover:underline flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Remove</button>
          </div>
        </article>)}
      </div>
    </div>
  );
}
