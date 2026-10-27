import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Edit3, MapPin, Plus, Star, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../api/axiosClient';
import type { Address } from '../../types';

type AddressForm = Omit<Address, 'id' | 'userId'>;
const emptyForm: AddressForm = {
  type: 'shipping', fullName: '', phone: '', street: '', city: '', state: '', pincode: '', country: 'India', isDefault: false,
};

export default function Addresses() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AddressForm>(emptyForm);

  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['addresses'], queryFn: () => api.get<Address[]>('/users/addresses') });
  const addresses = data?.data ?? [];

  const closeForm = () => { setShowForm(false); setEditingId(null); setForm(emptyForm); };
  const set = <K extends keyof AddressForm>(key: K, value: AddressForm[K]) => setForm((current) => ({ ...current, [key]: value }));

  const saveMutation = useMutation({
    mutationFn: () => editingId ? api.put<Address>(`/users/addresses/${editingId}`, form) : api.post<Address>('/users/addresses', form),
    onSuccess: async () => {
      toast.success(editingId ? 'Address updated.' : 'Address added.'); closeForm();
      await queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
    onError: (error: { message?: string }) => toast.error(error.message ?? 'Could not save the address.'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/addresses/${id}`),
    onSuccess: async () => { toast.success('Address removed.'); await queryClient.invalidateQueries({ queryKey: ['addresses'] }); },
    onError: (error: { message?: string }) => toast.error(error.message ?? 'Could not remove the address.'),
  });
  const makeDefaultMutation = useMutation({
    mutationFn: (id: string) => api.put(`/users/addresses/${id}`, { isDefault: true }),
    onSuccess: async () => { toast.success('Default address updated.'); await queryClient.invalidateQueries({ queryKey: ['addresses'] }); },
  });

  const startEdit = (address: Address) => {
    setForm({ type: address.type, fullName: address.fullName, phone: address.phone, street: address.street, city: address.city, state: address.state, pincode: address.pincode, country: address.country, isDefault: address.isDefault });
    setEditingId(address.id); setShowForm(true);
  };

  const fieldClass = 'mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5';
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-7">
        <div><h1 className="text-3xl font-black font-['Outfit'] flex items-center gap-2"><MapPin className="w-7 h-7 text-primary" /> My Addresses</h1><p className="text-sm text-muted-foreground mt-1">Manage shipping and billing addresses used at checkout.</p></div>
        <button onClick={() => { closeForm(); setShowForm(true); }} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"><Plus className="w-4 h-4" /> Add address</button>
      </div>

      {showForm && <form onSubmit={(event) => { event.preventDefault(); saveMutation.mutate(); }} className="mb-7 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-center justify-between mb-5"><h2 className="font-bold text-lg">{editingId ? 'Edit address' : 'New address'}</h2><button type="button" onClick={closeForm} aria-label="Close address form"><X className="w-5 h-5" /></button></div>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="text-sm font-medium">Full name<input required minLength={2} maxLength={100} value={form.fullName} onChange={(e) => set('fullName', e.target.value)} className={fieldClass} /></label>
          <label className="text-sm font-medium">Phone<input required minLength={10} maxLength={20} value={form.phone} onChange={(e) => set('phone', e.target.value)} className={fieldClass} /></label>
          <label className="text-sm font-medium sm:col-span-2">Street address<input required minLength={5} maxLength={255} value={form.street} onChange={(e) => set('street', e.target.value)} className={fieldClass} /></label>
          <label className="text-sm font-medium">City<input required value={form.city} onChange={(e) => set('city', e.target.value)} className={fieldClass} /></label>
          <label className="text-sm font-medium">State<input required value={form.state} onChange={(e) => set('state', e.target.value)} className={fieldClass} /></label>
          <label className="text-sm font-medium">PIN code<input required minLength={6} maxLength={10} value={form.pincode} onChange={(e) => set('pincode', e.target.value)} className={fieldClass} /></label>
          <label className="text-sm font-medium">Country<input required value={form.country} onChange={(e) => set('country', e.target.value)} className={fieldClass} /></label>
          <label className="text-sm font-medium">Address type<select value={form.type} onChange={(e) => set('type', e.target.value as AddressForm['type'])} className={fieldClass}><option value="shipping">Shipping</option><option value="billing">Billing</option><option value="both">Shipping & billing</option></select></label>
          <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium"><input type="checkbox" checked={form.isDefault} onChange={(e) => set('isDefault', e.target.checked)} /> Use as default</label>
        </div>
        <div className="flex gap-3 mt-6"><button disabled={saveMutation.isPending} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"><Check className="inline w-4 h-4 mr-2" />{saveMutation.isPending ? 'Saving…' : 'Save address'}</button><button type="button" onClick={closeForm} className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold">Cancel</button></div>
      </form>}

      {isLoading ? <div className="py-16 text-center text-muted-foreground">Loading addresses…</div>
        : isError ? <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center"><p>Could not load your addresses.</p><button onClick={() => refetch()} className="mt-3 text-primary font-semibold">Try again</button></div>
        : addresses.length === 0 ? <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground"><MapPin className="w-10 h-10 mx-auto mb-3 opacity-50" /><p>No saved addresses yet.</p></div>
        : <div className="grid md:grid-cols-2 gap-4">{addresses.map((address) => <article key={address.id} className="relative rounded-2xl border border-border bg-card p-5">
          {address.isDefault && <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"><Star className="w-3 h-3 fill-current" />Default</span>}
          <p className="font-bold pr-24">{address.fullName}</p><p className="text-sm text-muted-foreground mt-1">{address.phone}</p><p className="text-sm mt-3 leading-6">{address.street}<br />{address.city}, {address.state} {address.pincode}<br />{address.country}</p><span className="inline-block mt-3 rounded-md bg-muted px-2 py-1 text-xs capitalize">{address.type}</span>
          <div className="flex flex-wrap gap-3 mt-5 pt-4 border-t border-border"><button onClick={() => startEdit(address)} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary"><Edit3 className="w-4 h-4" />Edit</button>{!address.isDefault && <button onClick={() => makeDefaultMutation.mutate(address.id)} className="inline-flex items-center gap-1.5 text-sm font-medium"><Star className="w-4 h-4" />Make default</button>}<button onClick={() => { if (window.confirm('Remove this address?')) deleteMutation.mutate(address.id); }} className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-destructive"><Trash2 className="w-4 h-4" />Remove</button></div>
        </article>)}</div>}
    </div>
  );
}
