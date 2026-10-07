import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Mail, Megaphone, Pause, Play, RefreshCw, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../api/axiosClient';

type Campaign = { id: string; name: string; status: string; scheduledAt?: string; recipientSnapshotAt?: string };
type CampaignRow = { campaign: Campaign; templateName: string; templateVersion: number };
type EmailTemplate = { id: string; name: string; category: string; status: string; activeVersionId?: string };
const indiaTime = (value?: string) => value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(value)) : 'Not scheduled';

export default function CampaignManager() {
  const qc = useQueryClient();
  const campaigns = useQuery({ queryKey: ['campaigns'], queryFn: () => api.get<CampaignRow[]>('/campaigns') });
  const templates = useQuery({ queryKey: ['email-templates'], queryFn: () => api.get<EmailTemplate[]>('/email-master/templates') });
  const audience = useQuery({ queryKey: ['campaign-audience'], queryFn: () => api.get<{ eligible: number; samples: string[]; rule: string }>('/campaigns/audience-preview') });
  const [name, setName] = useState(''); const [templateVersionId, setTemplateVersionId] = useState(''); const [schedule, setSchedule] = useState('');
  const refresh = () => { void qc.invalidateQueries({ queryKey: ['campaigns'] }); void qc.invalidateQueries({ queryKey: ['campaign-audience'] }); };
  const create = useMutation({ mutationFn: () => api.post<Campaign>('/campaigns', { name, templateVersionId }), onSuccess: () => { setName(''); refresh(); toast.success('Campaign draft created.'); }, onError: (error: any) => toast.error(error?.message ?? 'Create failed.') });
  const action = useMutation({ mutationFn: ({ id, action }: { id: string; action: string }) => api.post(`/campaigns/${id}/${action}`, action === 'schedule' ? { scheduledAt: new Date(schedule).toISOString() } : undefined), onSuccess: (result: any, variables) => { refresh(); toast.success(variables.action === 'test' ? `Test status: ${result.data.status}` : `Campaign ${variables.action} completed.`); }, onError: (error: any) => toast.error(error?.message ?? 'Action failed.') });
  const marketingTemplates = (templates.data?.data ?? []).filter((template) => template.category === 'marketing' && template.status === 'published' && template.activeVersionId);
  const rows = campaigns.data?.data ?? [];

  return <div className="p-4 sm:p-8 space-y-6">
    <div><h1 className="text-3xl font-black">Campaigns</h1><p className="text-sm text-muted-foreground">Consent-first audiences, immutable recipient snapshots, UTC scheduling shown in Asia/Kolkata.</p></div>
    <section className="grid md:grid-cols-3 gap-4">
      <div className="rounded-xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">Eligible opted-in recipients</p><p className="text-3xl font-black">{audience.data?.data.eligible ?? '—'}</p><p className="mt-2 text-xs">{audience.data?.data.rule}</p></div>
      <div className="md:col-span-2 rounded-xl border border-border bg-card p-5"><h2 className="font-bold">Create campaign draft</h2><div className="mt-3 grid sm:grid-cols-[1fr_1fr_auto] gap-2"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Campaign name" className="rounded-lg border border-border bg-background px-3 py-2" /><select value={templateVersionId} onChange={(event) => setTemplateVersionId(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2"><option value="">Published marketing template</option>{marketingTemplates.map((template) => <option key={template.id} value={template.activeVersionId}>{template.name}</option>)}</select><button disabled={!name || !templateVersionId} onClick={() => create.mutate()} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground">Create</button></div></div>
    </section>
    <section className="rounded-xl border border-border bg-card overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/50"><tr><th className="p-3 text-left">Campaign</th><th className="p-3 text-left">Template</th><th className="p-3 text-left">Schedule (IST)</th><th className="p-3 text-left">Actions</th></tr></thead><tbody>
      {rows.map(({ campaign, templateName, templateVersion }) => <tr key={campaign.id} className="border-t border-border"><td className="p-3"><strong>{campaign.name}</strong><span className="block text-xs uppercase text-muted-foreground">{campaign.status}</span></td><td className="p-3">{templateName} v{templateVersion}</td><td className="p-3">{indiaTime(campaign.scheduledAt)}</td><td className="p-3"><div className="flex flex-wrap gap-1">
        {campaign.status === 'draft' && <button title="Refresh audience snapshot" onClick={() => action.mutate({ id: campaign.id, action: 'snapshot' })} className="rounded border border-border p-2"><RefreshCw className="w-4 h-4" /></button>}
        <button title="Send test to signed-in admin" onClick={() => action.mutate({ id: campaign.id, action: 'test' })} className="rounded border border-border p-2"><Mail className="w-4 h-4" /></button>
        {['draft','paused'].includes(campaign.status) && <button title="Start" onClick={() => action.mutate({ id: campaign.id, action: 'start' })} className="rounded border border-border p-2"><Play className="w-4 h-4" /></button>}
        {campaign.status === 'running' && <button title="Pause" onClick={() => action.mutate({ id: campaign.id, action: 'pause' })} className="rounded border border-border p-2"><Pause className="w-4 h-4" /></button>}
        {!['completed','cancelled'].includes(campaign.status) && <button title="Cancel" onClick={() => confirm('Cancel this campaign and its unsent jobs?') && action.mutate({ id: campaign.id, action: 'cancel' })} className="rounded border border-red-500/30 p-2 text-red-500"><XCircle className="w-4 h-4" /></button>}
      </div></td></tr>)}
    </tbody></table></div></section>
    <section className="rounded-xl border border-border bg-card p-5"><h2 className="font-bold"><CalendarClock className="inline w-4 h-4 mr-2" />Schedule a draft or paused campaign</h2><div className="mt-3 flex flex-wrap gap-2"><input type="datetime-local" value={schedule} onChange={(event) => setSchedule(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2" />{rows.filter(({ campaign }) => ['draft','paused'].includes(campaign.status)).map(({ campaign }) => <button key={campaign.id} disabled={!schedule} onClick={() => action.mutate({ id: campaign.id, action: 'schedule' })} className="rounded-lg border border-border px-3 py-2 text-sm">Schedule {campaign.name}</button>)}</div><p className="mt-2 text-xs text-muted-foreground">The browser time is converted to UTC before storage. Audience delivery remains disabled until CAMPAIGN_DELIVERY_ENABLED=true; explicit admin test sends are separate.</p></section>
    {!rows.length && <div className="grid min-h-40 place-items-center text-muted-foreground"><Megaphone className="w-10 h-10" /></div>}
  </div>;
}
