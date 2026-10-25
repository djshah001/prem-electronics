import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Mail, Megaphone, MessageCircle, Pause, Play, RefreshCw, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../api/axiosClient';

type Channel = 'email' | 'whatsapp';
type Campaign = {
  id: string;
  name: string;
  channel: Channel;
  status: string;
  scheduledAt?: string;
  recipientSnapshotAt?: string;
  whatsappTemplateLanguage?: string;
};
type CampaignRow = { campaign: Campaign; templateName: string | null; templateVersion: number | null };
type EmailTemplate = { id: string; name: string; category: string; status: string; activeVersionId?: string };
type Audience = { channel: Channel; eligible: number; samples: string[]; rule: string };

const indiaTime = (value?: string) => value
  ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(value))
  : 'Not scheduled';

export default function CampaignManager() {
  const qc = useQueryClient();
  const [channel, setChannel] = useState<Channel>('email');
  const [name, setName] = useState('');
  const [templateVersionId, setTemplateVersionId] = useState('');
  const [whatsappTemplateName, setWhatsappTemplateName] = useState('');
  const [whatsappLanguage, setWhatsappLanguage] = useState('en');
  const [bodyVariables, setBodyVariables] = useState('{{customerName}}, {{campaignName}}');
  const [schedule, setSchedule] = useState('');

  const campaigns = useQuery({ queryKey: ['campaigns'], queryFn: () => api.get<CampaignRow[]>('/campaigns') });
  const templates = useQuery({ queryKey: ['email-templates'], queryFn: () => api.get<EmailTemplate[]>('/email-master/templates') });
  const audience = useQuery({ queryKey: ['campaign-audience', channel], queryFn: () => api.get<Audience>(`/campaigns/audience-preview?channel=${channel}`) });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['campaigns'] });
    void qc.invalidateQueries({ queryKey: ['campaign-audience'] });
  };

  const create = useMutation({
    mutationFn: () => api.post<Campaign>('/campaigns', channel === 'email'
      ? { channel, name: name.trim(), templateVersionId }
      : {
          channel,
          name: name.trim(),
          templateName: whatsappTemplateName.trim(),
          templateLanguage: whatsappLanguage.trim(),
          bodyVariables: bodyVariables.split(',').map((value) => value.trim()).filter(Boolean),
        }),
    onSuccess: () => { setName(''); refresh(); toast.success(`${channel === 'whatsapp' ? 'WhatsApp' : 'Email'} campaign draft created.`); },
    onError: (error: any) => toast.error(error?.message ?? 'Create failed.'),
  });
  const action = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) => api.post(`/campaigns/${id}/${action}`, action === 'schedule' ? { scheduledAt: new Date(schedule).toISOString() } : undefined),
    onSuccess: (result: any, variables) => { refresh(); toast.success(variables.action === 'test' ? `Test status: ${result.data.status}` : `Campaign ${variables.action} completed.`); },
    onError: (error: any) => toast.error(error?.message ?? 'Action failed.'),
  });

  const marketingTemplates = (templates.data?.data ?? []).filter((template) => template.category === 'marketing' && template.status === 'published' && template.activeVersionId);
  const rows = campaigns.data?.data ?? [];
  const canCreate = Boolean(name.trim()) && (channel === 'email' ? Boolean(templateVersionId) : Boolean(whatsappTemplateName.trim() && whatsappLanguage.trim()));

  return <div className="p-4 sm:p-8 space-y-6">
    <div><h1 className="text-3xl font-black">Campaigns</h1><p className="text-sm text-muted-foreground">Consent-first email and WhatsApp campaigns with immutable recipient snapshots and UTC scheduling shown in Asia/Kolkata.</p></div>

    <section className="grid md:grid-cols-3 gap-4">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex gap-2 mb-4">
          {(['email', 'whatsapp'] as Channel[]).map((value) => <button key={value} onClick={() => setChannel(value)} className={`rounded-lg px-3 py-2 text-sm capitalize ${channel === value ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>{value}</button>)}
        </div>
        <p className="text-sm text-muted-foreground">Eligible {channel} recipients</p>
        <p className="text-3xl font-black">{audience.data?.data.eligible ?? '—'}</p>
        <p className="mt-2 text-xs">{audience.data?.data.rule}</p>
        {!!audience.data?.data.samples.length && <p className="mt-2 text-xs text-muted-foreground">Sample: {audience.data.data.samples.join(', ')}</p>}
      </div>

      <div className="md:col-span-2 rounded-xl border border-border bg-card p-5">
        <h2 className="font-bold">Create {channel === 'whatsapp' ? 'WhatsApp' : 'email'} campaign draft</h2>
        <div className="mt-3 grid gap-3">
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Campaign name" className="rounded-lg border border-border bg-background px-3 py-2" />
          {channel === 'email' ? <select value={templateVersionId} onChange={(event) => setTemplateVersionId(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2">
            <option value="">Published marketing template</option>
            {marketingTemplates.map((template) => <option key={template.id} value={template.activeVersionId}>{template.name}</option>)}
          </select> : <>
            <div className="grid sm:grid-cols-[1fr_120px] gap-2">
              <input value={whatsappTemplateName} onChange={(event) => setWhatsappTemplateName(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} placeholder="Approved template name" className="rounded-lg border border-border bg-background px-3 py-2" />
              <input value={whatsappLanguage} onChange={(event) => setWhatsappLanguage(event.target.value)} placeholder="Language" className="rounded-lg border border-border bg-background px-3 py-2" />
            </div>
            <input value={bodyVariables} onChange={(event) => setBodyVariables(event.target.value)} placeholder="Body values, comma separated" className="rounded-lg border border-border bg-background px-3 py-2" />
            <p className="text-xs text-muted-foreground">Enter body variables in the exact order expected by the approved MSG91 template. Supported placeholders: {'{{customerName}}'} and {'{{campaignName}}'}.</p>
          </>}
          <button disabled={!canCreate || create.isPending} onClick={() => create.mutate()} className="justify-self-start rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50">Create draft</button>
        </div>
      </div>
    </section>

    <section className="rounded-xl border border-border bg-card overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/50"><tr><th className="p-3 text-left">Campaign</th><th className="p-3 text-left">Channel</th><th className="p-3 text-left">Template</th><th className="p-3 text-left">Schedule (IST)</th><th className="p-3 text-left">Actions</th></tr></thead><tbody>
      {rows.map(({ campaign, templateName, templateVersion }) => <tr key={campaign.id} className="border-t border-border">
        <td className="p-3"><strong>{campaign.name}</strong><span className="block text-xs uppercase text-muted-foreground">{campaign.status}</span></td>
        <td className="p-3"><span className="inline-flex items-center gap-1 capitalize">{campaign.channel === 'whatsapp' ? <MessageCircle className="w-4 h-4" /> : <Mail className="w-4 h-4" />}{campaign.channel}</span></td>
        <td className="p-3">{templateName ?? '—'}{templateVersion ? ` v${templateVersion}` : campaign.whatsappTemplateLanguage ? ` (${campaign.whatsappTemplateLanguage})` : ''}</td>
        <td className="p-3">{indiaTime(campaign.scheduledAt)}</td>
        <td className="p-3"><div className="flex flex-wrap gap-1">
          {campaign.status === 'draft' && <button title="Refresh audience snapshot" onClick={() => action.mutate({ id: campaign.id, action: 'snapshot' })} className="rounded border border-border p-2"><RefreshCw className="w-4 h-4" /></button>}
          <button title={`Send test to signed-in admin's ${campaign.channel === 'whatsapp' ? 'verified phone' : 'email'}`} onClick={() => action.mutate({ id: campaign.id, action: 'test' })} className="rounded border border-border p-2">{campaign.channel === 'whatsapp' ? <MessageCircle className="w-4 h-4" /> : <Mail className="w-4 h-4" />}</button>
          {['draft', 'paused'].includes(campaign.status) && <button title="Start" onClick={() => action.mutate({ id: campaign.id, action: 'start' })} className="rounded border border-border p-2"><Play className="w-4 h-4" /></button>}
          {campaign.status === 'running' && <button title="Pause" onClick={() => action.mutate({ id: campaign.id, action: 'pause' })} className="rounded border border-border p-2"><Pause className="w-4 h-4" /></button>}
          {!['completed', 'cancelled'].includes(campaign.status) && <button title="Cancel" onClick={() => confirm('Cancel this campaign and its unsent jobs?') && action.mutate({ id: campaign.id, action: 'cancel' })} className="rounded border border-red-500/30 p-2 text-red-500"><XCircle className="w-4 h-4" /></button>}
        </div></td>
      </tr>)}
    </tbody></table></div></section>

    <section className="rounded-xl border border-border bg-card p-5"><h2 className="font-bold"><CalendarClock className="inline w-4 h-4 mr-2" />Schedule a draft or paused campaign</h2><div className="mt-3 flex flex-wrap gap-2"><input type="datetime-local" value={schedule} onChange={(event) => setSchedule(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2" />{rows.filter(({ campaign }) => ['draft', 'paused'].includes(campaign.status)).map(({ campaign }) => <button key={campaign.id} disabled={!schedule} onClick={() => action.mutate({ id: campaign.id, action: 'schedule' })} className="rounded-lg border border-border px-3 py-2 text-sm">Schedule {campaign.name}</button>)}</div><p className="mt-2 text-xs text-muted-foreground">Audience delivery remains disabled until the matching email or WhatsApp delivery flag is enabled. Explicit tests only target the signed-in administrator.</p></section>
    {!rows.length && <div className="grid min-h-40 place-items-center text-muted-foreground"><Megaphone className="w-10 h-10" /></div>}
  </div>;
}
