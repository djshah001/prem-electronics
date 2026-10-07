import { useCallback, useEffect, useRef, useState } from 'react';
import { EmailEditor, type EmailEditorRef } from '@react-email/editor';
import '@react-email/editor/themes/default.css';

export type StructuredDocument = { type: 'doc'; content?: Array<Record<string, unknown>> };

export function StructuredContentEditor({ value, onChange, mode, onUploadImage }: {
  value: StructuredDocument | string;
  onChange: (document: StructuredDocument) => void;
  mode: 'EMAIL' | 'BLOG';
  onUploadImage?: (file: File) => Promise<{ url: string }>;
}) {
  const editorRef = useRef<EmailEditorRef>(null);
  const [view, setView] = useState<'visual' | 'json'>('visual');
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [canvas, setCanvas] = useState<'light' | 'dark'>('light');
  const [source, setSource] = useState(typeof value === 'string' ? '' : JSON.stringify(value, null, 2));
  const [sourceError, setSourceError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => { if (typeof value !== 'string') setSource(JSON.stringify(value, null, 2)); }, [value]);
  const syncEditorContent = useCallback((ref: EmailEditorRef) => {
    const editor = ref.editor;
    if (!editor || editor.isDestroyed) return;
    if (typeof value !== 'string' && JSON.stringify(ref.getJSON()) === JSON.stringify(value)) return;
    editor.commands.setContent(value, { emitUpdate: false });
  }, [value]);
  useEffect(() => {
    if (editorRef.current) syncEditorContent(editorRef.current);
  }, [syncEditorContent]);
  const applySource = () => {
    try {
      const parsed = JSON.parse(source) as StructuredDocument;
      if (parsed.type !== 'doc') throw new Error('Root type must be doc.');
      onChange(parsed); setSourceError(''); setRevision((current) => current + 1); setView('visual');
    } catch (error: any) { setSourceError(error?.message ?? 'Invalid JSON.'); }
  };
  return <div className="rounded-xl border border-border overflow-hidden bg-card">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-2">
      <div className="flex gap-1"><button type="button" onClick={() => setView('visual')} className={`rounded px-3 py-1.5 text-xs ${view === 'visual' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>Visual</button><button type="button" onClick={() => { setSource(typeof value === 'string' ? JSON.stringify(editorRef.current?.getJSON() ?? { type: 'doc', content: [] }, null, 2) : JSON.stringify(value, null, 2)); setView('json'); }} className={`rounded px-3 py-1.5 text-xs ${view === 'json' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>JSON source</button></div>
      <div className="flex gap-1"><button type="button" onClick={() => setDevice('desktop')} className="rounded bg-muted px-2 py-1 text-xs">Desktop</button><button type="button" onClick={() => setDevice('mobile')} className="rounded bg-muted px-2 py-1 text-xs">Mobile</button><button type="button" onClick={() => setCanvas(canvas === 'light' ? 'dark' : 'light')} className="rounded bg-muted px-2 py-1 text-xs">{canvas === 'light' ? 'Dark canvas' : 'Light canvas'}</button></div>
    </div>
    {view === 'json' ? <div className="p-3"><textarea aria-label="Structured JSON source" value={source} onChange={(event) => setSource(event.target.value)} className="min-h-[420px] w-full rounded-lg border border-border bg-background p-3 font-mono text-xs" />{sourceError && <p className="mt-2 text-sm text-red-500">{sourceError}</p>}<button type="button" onClick={applySource} className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">Apply valid JSON</button></div> : <div className={`mx-auto min-h-[430px] p-4 transition-all ${device === 'mobile' ? 'max-w-[390px]' : 'max-w-4xl'} ${canvas === 'dark' ? 'bg-zinc-900' : 'bg-white'}`}>
      <EmailEditor key={revision} ref={editorRef} content={value} placeholder={mode === 'BLOG' ? 'Write the article…' : 'Build the email…'} onUploadImage={onUploadImage} onReady={syncEditorContent} onUpdate={(ref) => { const document = ref.getJSON() as StructuredDocument; onChange(document); setSource(JSON.stringify(document, null, 2)); }} className="min-h-[390px] text-zinc-900" />
    </div>}
    <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">{mode === 'EMAIL' ? 'Email mode produces compatible HTML and plain text on the server.' : 'Blog mode stores the same structured JSON but publishes only a sanitized article fragment.'}</p>
  </div>;
}
