import { useState } from 'react';
import { useAtom } from 'jotai';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, KeyRound, MessageCircle, Save, ShieldCheck, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../api/axiosClient';
import { userAtom } from '../../store/userAtom';
import type { OtpChallengeResponse, User } from '../../types';

export default function Profile() {
  const queryClient = useQueryClient();
  const [user, setUser] = useAtom(userAtom);
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');
  const [currentChallenge, setCurrentChallenge] = useState<OtpChallengeResponse | null>(null);
  const [newChallenge, setNewChallenge] = useState<OtpChallengeResponse | null>(null);
  const [currentCode, setCurrentCode] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [currentProof, setCurrentProof] = useState('');
  const [newProof, setNewProof] = useState('');
  const mobilePreference = useQuery({
    queryKey: ['mobile-marketing-preference'],
    queryFn: () => api.get<{ whatsappOptedIn: boolean }>('/marketing/mobile-preference'),
  });
  const whatsappPreferenceMutation = useMutation({
    mutationFn: (whatsappOptedIn: boolean) => api.put('/marketing/mobile-preference', { whatsappOptedIn }),
    onSuccess: (_response, whatsappOptedIn) => {
      void queryClient.invalidateQueries({ queryKey: ['mobile-marketing-preference'] });
      toast.success(whatsappOptedIn ? 'WhatsApp updates enabled.' : 'WhatsApp marketing disabled.');
    },
    onError: (error: { message?: string }) => toast.error(error.message ?? 'Could not save WhatsApp preference.'),
  });

  const profileMutation = useMutation({
    mutationFn: () => api.put<User>('/users/profile', { name: name.trim(), email: email.trim() || null, ...(avatarUrl.trim() ? { avatarUrl: avatarUrl.trim() } : {}) }),
    onSuccess: (response) => { setUser(response.data); toast.success('Profile updated.'); },
    onError: (error: { message?: string }) => toast.error(error.message ?? 'Could not update your profile.'),
  });

  const phoneMutation = useMutation({
    mutationFn: async (action: 'request-current' | 'verify-current' | 'request-new' | 'verify-new' | 'complete') => {
      if (action === 'request-current') return api.post<OtpChallengeResponse>('/auth/phone-change/request', { stage: 'current' });
      if (action === 'verify-current') return api.post<{ proof: string }>('/auth/phone-change/verify', { stage: 'current', challengeId: currentChallenge?.challengeId, code: currentCode });
      if (action === 'request-new') return api.post<OtpChallengeResponse>('/auth/phone-change/request', { stage: 'new', phone: `+91${newPhone.replace(/\D/g, '').slice(-10)}` });
      if (action === 'verify-new') return api.post<{ proof: string }>('/auth/phone-change/verify', { stage: 'new', challengeId: newChallenge?.challengeId, code: newCode });
      return api.post<{ user: User }>('/auth/phone-change/complete', { currentProof, newProof });
    },
    onSuccess: (response, action) => {
      if (action === 'request-current') setCurrentChallenge(response.data as OtpChallengeResponse);
      if (action === 'verify-current') setCurrentProof((response.data as { proof: string }).proof);
      if (action === 'request-new') setNewChallenge(response.data as OtpChallengeResponse);
      if (action === 'verify-new') setNewProof((response.data as { proof: string }).proof);
      if (action === 'complete') {
        setUser((response.data as { user: User }).user);
        setCurrentChallenge(null); setNewChallenge(null); setCurrentProof(''); setNewProof(''); setCurrentCode(''); setNewCode(''); setNewPhone('');
        toast.success('Login phone changed. Other sessions were signed out.');
      }
    },
    onError: (error: { message?: string }) => toast.error(error.message ?? 'Phone verification failed.'),
  });

  if (!user) return null;
  const codeInput = 'w-full rounded-xl border border-border bg-background px-3 py-2.5 text-center font-mono tracking-[0.35em]';

  return <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
    <div><h1 className="text-3xl font-black font-['Outfit'] flex items-center gap-2"><UserRound className="w-7 h-7 text-primary" /> Profile Settings</h1><p className="text-sm text-muted-foreground mt-1">Manage contact details separately from your verified login phone.</p></div>
    <form onSubmit={(event) => { event.preventDefault(); profileMutation.mutate(); }} className="rounded-2xl border border-border bg-card p-6 space-y-5">
      <div className="flex items-center gap-4 pb-5 border-b border-border"><div className="w-16 h-16 rounded-full overflow-hidden bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">{avatarUrl ? <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" /> : user.name.charAt(0).toUpperCase()}</div><div><p className="font-semibold">{user.email || 'No contact email added'}</p><p className="text-xs text-muted-foreground">Email is optional and is not a sign-in credential.</p></div></div>
      <label className="block text-sm font-medium">Full name<input required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5" /></label>
      <label className="block text-sm font-medium">Receipt email (optional)<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5" /></label>
      <label className="block text-sm font-medium">Avatar image URL<div className="relative mt-1"><Camera className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" /><input type="url" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="https://…" className="w-full rounded-xl border border-border bg-background pl-10 pr-3 py-2.5" /></div></label>
      <button disabled={profileMutation.isPending || name.trim().length < 2} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"><Save className="w-4 h-4" />{profileMutation.isPending ? 'Saving…' : 'Save changes'}</button>
    </form>

    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3"><MessageCircle className="w-5 h-5 text-emerald-600 mt-0.5" /><div><h2 className="font-bold">WhatsApp updates and offers</h2><p className="text-sm text-muted-foreground">Control promotional WhatsApp templates sent to your verified login number. Transactional SMS settings are not changed here.</p></div></div>
        <input aria-label="WhatsApp marketing consent" type="checkbox" checked={mobilePreference.data?.data.whatsappOptedIn ?? false} disabled={mobilePreference.isLoading || whatsappPreferenceMutation.isPending} onChange={(event) => whatsappPreferenceMutation.mutate(event.target.checked)} className="mt-1 h-5 w-5" />
      </div>
    </section>

    <section className="rounded-2xl border border-border bg-card p-6 space-y-5">
      <div className="flex gap-3"><KeyRound className="w-5 h-5 text-primary mt-0.5" /><div><h2 className="font-bold">Change login phone</h2><p className="text-sm text-muted-foreground">Verify both your current number and the new number. If you lost the old SIM, contact store support for a private recovery review.</p></div></div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border p-4 space-y-3"><p className="text-sm font-semibold">1. Current phone</p><p className="text-xs text-muted-foreground">{user.authPhoneE164 ?? 'Not mapped'}</p>{!currentChallenge && <button onClick={() => phoneMutation.mutate('request-current')} disabled={phoneMutation.isPending} className="text-sm text-primary font-semibold">Send current-phone OTP</button>}{currentChallenge && !currentProof && <><p className="text-xs text-muted-foreground">Sent to {currentChallenge.maskedDestination}</p><input aria-label="Current phone OTP" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={currentCode} onChange={(e) => setCurrentCode(e.target.value.replace(/\D/g, '').slice(0, 6))} className={codeInput} /><button onClick={() => phoneMutation.mutate('verify-current')} disabled={currentCode.length !== 6 || phoneMutation.isPending} className="text-sm text-primary font-semibold disabled:opacity-50">Verify current phone</button></>}{currentProof && <p className="flex items-center gap-1 text-sm text-emerald-600"><ShieldCheck className="w-4 h-4" /> Verified</p>}</div>
        <div className="rounded-xl border border-border p-4 space-y-3"><p className="text-sm font-semibold">2. New phone</p>{!newChallenge && <><div className="flex rounded-lg border border-border"><span className="px-3 py-2 border-r border-border">+91</span><input aria-label="New phone" inputMode="numeric" value={newPhone} onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} className="min-w-0 flex-1 bg-transparent px-3 outline-none" /></div><button onClick={() => phoneMutation.mutate('request-new')} disabled={newPhone.length !== 10 || phoneMutation.isPending} className="text-sm text-primary font-semibold disabled:opacity-50">Send new-phone OTP</button></>}{newChallenge && !newProof && <><p className="text-xs text-muted-foreground">Sent to {newChallenge.maskedDestination}</p><input aria-label="New phone OTP" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={newCode} onChange={(e) => setNewCode(e.target.value.replace(/\D/g, '').slice(0, 6))} className={codeInput} /><button onClick={() => phoneMutation.mutate('verify-new')} disabled={newCode.length !== 6 || phoneMutation.isPending} className="text-sm text-primary font-semibold disabled:opacity-50">Verify new phone</button></>}{newProof && <p className="flex items-center gap-1 text-sm text-emerald-600"><ShieldCheck className="w-4 h-4" /> Verified</p>}</div>
      </div>
      <button onClick={() => phoneMutation.mutate('complete')} disabled={!currentProof || !newProof || phoneMutation.isPending} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">Confirm login phone change</button>
    </section>
  </div>;
}
