import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Loader2, Search, ShieldCheck } from 'lucide-react';
import { api } from '../../api/axiosClient';
import type { BusinessAddress, BusinessProfile, GstVerification } from '../../types';
import { toast } from 'sonner';

const blankAddress: BusinessAddress = { city: '', state: '', stateCode: '', pincode: '', country: 'India', source: 'customer' };

export function BusinessProfileForm({ initialGstin = '', onSaved }: { initialGstin?: string; onSaved?: (profile: BusinessProfile) => void }) {
  const qc = useQueryClient();
  const lookupSequence = useRef(0);
  const [gstin, setGstin] = useState(initialGstin);
  const [verification, setVerification] = useState<GstVerification | null>(null);
  const [nickname, setNickname] = useState('');
  const [billingAddress, setBillingAddress] = useState<BusinessAddress>(blankAddress);
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const lookup = useMutation({
    mutationFn: async () => {
      const sequence = ++lookupSequence.current;
      const normalized = gstin.replace(/\s+/g, '').toUpperCase();
      const response = await api.post<GstVerification>('/businesses/gstin-lookup', { gstin: normalized });
      return { sequence, normalized, response };
    },
    onSuccess: ({ sequence, normalized, response }) => {
      if (sequence !== lookupSequence.current || normalized !== gstin.replace(/\s+/g, '').toUpperCase()) return;
      setVerification(response.data);
      setBillingAddress(response.data.principalAddress
        ? { ...response.data.principalAddress }
        : { ...blankAddress, state: response.data.stateName, stateCode: response.data.stateCode });
    },
    onError: (error: { message?: string }) => {
      setVerification(null);
      toast.error(error.message ?? 'Could not verify this GSTIN.');
    },
  });

  const save = useMutation({
    mutationFn: () => api.post<BusinessProfile>('/businesses', {
      verificationId: verification!.id, nickname: nickname || undefined, billingAddress,
      contactPerson: contactPerson || undefined, contactPhone: contactPhone || undefined,
      contactEmail: contactEmail || undefined, isDefault,
    }),
    onSuccess: (response) => {
      toast.success('Business profile saved.');
      qc.invalidateQueries({ queryKey: ['businesses'] });
      onSaved?.(response.data);
      setVerification(null);
      setGstin('');
    },
    onError: (error: { message?: string }) => toast.error(error.message ?? 'Could not save business profile.'),
  });

  const setAddress = (key: keyof BusinessAddress, value: string) => setBillingAddress((current) => ({ ...current, [key]: value, source: 'customer' }));
  const canSave = verification?.registrationStatus === 'active' && billingAddress.city && billingAddress.state && /^\d{2}$/.test(billingAddress.stateCode) && /^\d{6}$/.test(billingAddress.pincode);

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="gstin" className="block text-sm font-medium mb-1.5">GSTIN</label>
        <div className="flex gap-2">
          <input id="gstin" value={gstin} onChange={(event) => { setGstin(event.target.value.toUpperCase()); setVerification(null); lookupSequence.current += 1; }} maxLength={18}
            placeholder="27AAPFU0939F1ZV" className="flex-1 px-3 py-2.5 rounded-xl bg-background border border-border font-mono uppercase" />
          <button type="button" disabled={lookup.isPending || !gstin.trim()} onClick={() => lookup.mutate()}
            className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50 flex items-center gap-2">
            {lookup.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Fetch company details
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Format and checksum are validated before the configured provider is called.</p>
      </div>

      {verification && (
        <div className="space-y-4 rounded-xl border border-border p-4 bg-background/60">
          <div className="flex items-start gap-3">
            <ShieldCheck className={verification.registrationStatus === 'active' ? 'w-5 h-5 text-green-500' : 'w-5 h-5 text-destructive'} />
            <div>
              <p className="font-semibold">{verification.legalName}</p>
              {verification.tradeName && <p className="text-sm text-muted-foreground">{verification.tradeName}</p>}
              <p className="text-xs mt-1">GSTIN <span className="font-mono">{verification.gstin}</span> · Status <span className="font-semibold uppercase">{verification.registrationStatus}</span> · {verification.taxpayerType ?? 'Type unavailable'}</p>
              <p className="text-xs text-muted-foreground">Verified via {verification.provider}{verification.cached ? ' (fresh cache)' : ''}; expires {new Date(verification.expiresAt).toLocaleString()}.</p>
            </div>
          </div>

          {verification.registrationStatus !== 'active' ? (
            <p className="text-sm text-destructive">This registration cannot be used for company checkout.</p>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 gap-3">
                <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Business nickname (optional)" className="px-3 py-2 rounded-lg bg-card border border-border" />
                <input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder="Contact person (optional)" className="px-3 py-2 rounded-lg bg-card border border-border" />
                <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="Contact phone (optional)" className="px-3 py-2 rounded-lg bg-card border border-border" />
                <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="Contact email (optional)" className="px-3 py-2 rounded-lg bg-card border border-border" />
              </div>
              <div>
                <p className="text-sm font-semibold mb-2">Invoice billing address</p>
                <p className="text-xs text-muted-foreground mb-2">This can differ from the registered and delivery addresses. Customer-edited fields are stored as customer supplied.</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {([
                    ['building', 'Building / unit'], ['street', 'Street'], ['locality', 'Locality'], ['city', 'City'],
                    ['district', 'District'], ['state', 'State'], ['stateCode', 'GST state code'], ['pincode', 'PIN code'],
                  ] as Array<[keyof BusinessAddress, string]>).map(([key, label]) => (
                    <input key={key} value={String(billingAddress[key] ?? '')} onChange={(e) => setAddress(key, e.target.value)} placeholder={label}
                      className="px-3 py-2 rounded-lg bg-card border border-border" />
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} /> Use as my default company</label>
              <button type="button" disabled={!canSave || save.isPending} onClick={() => save.mutate()}
                className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50 flex items-center gap-2">
                <Building2 className="w-4 h-4" /> {save.isPending ? 'Saving…' : 'Save verified business'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
