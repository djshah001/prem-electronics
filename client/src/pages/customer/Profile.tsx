import { useState } from 'react';
import { useAtom } from 'jotai';
import { useMutation } from '@tanstack/react-query';
import { Camera, Save, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../api/axiosClient';
import { userAtom } from '../../store/userAtom';
import type { User } from '../../types';

export default function Profile() {
  const [user, setUser] = useAtom(userAtom);
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');
  const mutation = useMutation({
    mutationFn: () => api.put<User>('/users/profile', { name: name.trim(), phone: phone.trim(), ...(avatarUrl.trim() ? { avatarUrl: avatarUrl.trim() } : {}) }),
    onSuccess: (response) => { setUser(response.data); toast.success('Profile updated.'); },
    onError: (error: { message?: string }) => toast.error(error.message ?? 'Could not update your profile.'),
  });
  if (!user) return null;
  return <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
    <div className="mb-7"><h1 className="text-3xl font-black font-['Outfit'] flex items-center gap-2"><UserRound className="w-7 h-7 text-primary" /> Profile Settings</h1><p className="text-sm text-muted-foreground mt-1">Keep your contact information current for orders and delivery updates.</p></div>
    <form onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }} className="rounded-2xl border border-border bg-card p-6 space-y-5">
      <div className="flex items-center gap-4 pb-5 border-b border-border"><div className="w-16 h-16 rounded-full overflow-hidden bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">{avatarUrl ? <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" /> : user.name.charAt(0).toUpperCase()}</div><div><p className="font-semibold">{user.email}</p><p className="text-xs text-muted-foreground">Email changes require support verification.</p></div></div>
      <label className="block text-sm font-medium">Full name<input required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5" /></label>
      <label className="block text-sm font-medium">Phone number<input maxLength={20} value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5" /></label>
      <label className="block text-sm font-medium">Avatar image URL<div className="relative mt-1"><Camera className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" /><input type="url" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="https://…" className="w-full rounded-xl border border-border bg-background pl-10 pr-3 py-2.5" /></div></label>
      <button disabled={mutation.isPending || name.trim().length < 2} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"><Save className="w-4 h-4" />{mutation.isPending ? 'Saving…' : 'Save changes'}</button>
    </form>
  </div>;
}
