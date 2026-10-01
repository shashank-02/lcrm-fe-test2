import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronRight, Download, Eye, FileText, Folder, FolderPlus, Home, Pencil, Plus, RefreshCw, Search, Trash2, Upload, Image as ImageIcon, FileSpreadsheet, Presentation, EyeOff } from 'lucide-react';
import { Badge, Button, Confirm, Empty, Field, Input, Modal, PageHeader, PillSelect, Select, Spinner, Textarea, Toggle } from '@/components/ui';
import { api, apiUrl, downloadFile, errorMessage, qs } from '@/lib/api';
import { fmtBytes, fmtDateTime } from '@/lib/utils';
import { useBootstrap } from '@/store/bootstrap';
import { useCan } from '@/store/auth';
import { AudiencePicker, audienceLabel, emptyAudience } from '@/components/AudiencePicker';
import type { Audience, DocFolder, DocItem } from '@/types';

const typeIcon = (t: string) => (['png', 'jpg', 'jpeg', 'webp'].includes(t) ? ImageIcon : ['xls', 'xlsx', 'csv'].includes(t) ? FileSpreadsheet : ['ppt', 'pptx'].includes(t) ? Presentation : FileText);

export default function FilesPage() {
  const { boot } = useBootstrap(); const can = useCan(); const manage = can('files.manage');
  const [folderId, setFolderId] = useState<string>('root'); const [search, setSearch] = useState(''); const [type, setType] = useState(''); const [teamId, setTeamId] = useState(''); const [role, setRole] = useState(''); const [uploadedBy, setUploadedBy] = useState('');
  const folders = useQuery({ queryKey: ['doc-folders'], queryFn: async () => (await api.get<{ data: DocFolder[] }>('/documents/folders')).data.data });
  const params = { folderId: search ? undefined : folderId, search, type, teamId, role, uploadedBy, includeInactive: manage ? 'true' : undefined };
  const docs = useQuery({ queryKey: ['documents', params], queryFn: async () => (await api.get<{ data: DocItem[] }>(`/documents${qs(params)}`)).data.data, placeholderData: (p) => p });
  const [addFolder, setAddFolder] = useState<DocFolder | null | 'new'>(null); const [addDoc, setAddDoc] = useState<DocItem | null | 'new'>(null); const [replace, setReplace] = useState<DocItem | null>(null); const [view, setView] = useState<DocItem | null>(null); const [del, setDel] = useState<{ kind: 'doc' | 'folder'; id: string; name: string } | null>(null);
  const refetch = () => { folders.refetch(); docs.refetch(); };
  const remove = useMutation({ mutationFn: (d: { kind: 'doc' | 'folder'; id: string }) => api.delete(d.kind === 'doc' ? `/documents/${d.id}` : `/documents/folders/${d.id}`), onSuccess: () => { toast.success('Deleted'); setDel(null); refetch(); }, onError: (e) => toast.error(errorMessage(e)) });
  const crumbs = useMemo(() => { const out: DocFolder[] = []; let cur = folders.data?.find((f) => f.id === folderId); while (cur) { out.unshift(cur); cur = folders.data?.find((f) => f.id === cur!.parentId); } return out; }, [folders.data, folderId]);
  const subFolders = (folders.data ?? []).filter((f) => (folderId === 'root' ? !f.parentId : f.parentId === folderId));
  const rows: { kind: 'folder' | 'doc'; item: DocFolder | DocItem }[] = [...(search ? [] : subFolders.map((f) => ({ kind: 'folder' as const, item: f }))), ...(docs.data ?? []).map((d) => ({ kind: 'doc' as const, item: d }))];
  const types = Array.from(new Set((docs.data ?? []).map((d) => d.docType))).filter(Boolean);
  return (
    <div>
      <PageHeader title="Files" subtitle="Official documents: rules, policies, SOPs, product guidelines and circulars." actions={manage && <><Button size="sm" onClick={() => setAddFolder('new')}><FolderPlus size={15} /> Add a folder</Button><Button size="sm" variant="primary" onClick={() => setAddDoc('new')}><Plus size={15} /> Add document</Button></>} />
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <nav className="flex items-center gap-1 text-[13px] mr-2" aria-label="Breadcrumb"><button className="inline-flex items-center gap-1 text-ink-2 hover:text-ink" onClick={() => setFolderId('root')}><Home size={14} /> Files</button>{crumbs.map((c) => <span key={c.id} className="inline-flex items-center gap-1"><ChevronRight size={13} className="text-ink-3" /><button className="hover:text-ink text-ink-2" onClick={() => setFolderId(c.id)}>{c.name}</button></span>)}</nav>
        <div className="relative w-full sm:w-[240px]"><Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search documents" className="pl-8 h-8 text-[13px]" /></div>
        {types.length > 0 && <PillSelect label="Type" value={type} onChange={setType} options={types.map((t) => ({ value: t, label: t.toUpperCase() }))} />}
        {boot.teams.length > 0 && <PillSelect label="Team" value={teamId} onChange={setTeamId} options={boot.teams.map((t) => ({ value: t.id, label: t.name }))} />}
        {manage && <><PillSelect label="Role" value={role} onChange={setRole} options={[{ value: 'agents', label: 'Agents' }, { value: 'managers', label: 'Managers / TLs' }, { value: 'admins', label: 'Admins' }]} /><PillSelect label="Uploaded by" value={uploadedBy} onChange={setUploadedBy} options={boot.users.map((u) => ({ value: u.id, label: u.name }))} /></>}
      </div>
      <div className="card overflow-x-auto">
        {folders.isLoading || docs.isLoading ? <div className="py-10 flex justify-center"><Spinner /></div> : !rows.length ? <Empty title={search ? 'No documents match' : 'This folder is empty'} icon={<Folder size={26} />} hint={manage ? 'Upload a document or create a sub-folder.' : 'Documents shared with you will appear here.'} /> : (
          <table className="w-full min-w-[720px]"><thead><tr><th className="th w-14">S.No</th><th className="th">Name</th><th className="th">Type</th><th className="th">Visible to</th><th className="th">Uploaded</th><th className="th w-40">Actions</th></tr></thead>
            <tbody>{rows.map((r, i) => {
              if (r.kind === 'folder') { const f = r.item as DocFolder; return <tr key={f.id} className="hover:bg-surface-2/60 cursor-pointer" onClick={() => setFolderId(f.id)}><td className="td tabular-nums">{i + 1}</td><td className="td font-medium"><span className="inline-flex items-center gap-2"><Folder size={16} className="text-warning" /> {f.name}</span></td><td className="td text-ink-3">Folder</td><td className="td text-ink-2">{audienceLabel(f.audience, boot.teams, boot.users)}</td><td className="td tabular-nums text-ink-2">{fmtDateTime(f.createdAt)}</td><td className="td" onClick={(e) => e.stopPropagation()}><span className="inline-flex gap-0.5"><Button size="icon" variant="ghost" title="Open" onClick={() => setFolderId(f.id)}><ChevronRight size={14} /></Button>{manage && <><Button size="icon" variant="ghost" title="Edit folder" onClick={() => setAddFolder(f)}><Pencil size={14} /></Button><Button size="icon" variant="ghost" className="text-ink-3 hover:text-danger" title="Delete folder" onClick={() => setDel({ kind: 'folder', id: f.id, name: f.name })}><Trash2 size={14} /></Button></>}</span></td></tr>; }
              const d = r.item as DocItem; const Icon = typeIcon(d.docType);
              return <tr key={d.id} className={`hover:bg-surface-2/60 ${d.isActive ? '' : 'opacity-50'}`}><td className="td tabular-nums">{i + 1}</td><td className="td"><button className="inline-flex items-center gap-2 font-medium hover:text-primary text-left" onClick={() => setView(d)}><Icon size={16} className="text-primary shrink-0" /><span><span className="block">{d.name}{!d.isActive && <Badge className="ml-2">Hidden</Badge>}</span>{d.description && <span className="block text-[12px] text-ink-3 font-normal max-w-[360px] truncate">{d.description}</span>}</span></button></td><td className="td"><Badge>{d.docType.toUpperCase()}</Badge><span className="text-ink-3 text-[12px] ml-1.5">{fmtBytes(d.size)}</span></td><td className="td text-ink-2 max-w-[260px] truncate" title={audienceLabel(d.audience, boot.teams, boot.users)}>{audienceLabel(d.audience, boot.teams, boot.users)}</td><td className="td"><span className="tabular-nums text-ink-2">{fmtDateTime(d.createdAt)}</span><span className="block text-[12px] text-ink-3">by {d.uploadedBy}{d.version > 1 && ` · v${d.version}`}</span></td>
                <td className="td"><span className="inline-flex gap-0.5"><Button size="icon" variant="ghost" title="View" onClick={() => setView(d)}><Eye size={14} /></Button>{manage && <><Button size="icon" variant="ghost" title="Edit details & visibility" onClick={() => setAddDoc(d)}><Pencil size={14} /></Button><Button size="icon" variant="ghost" title="Replace file" onClick={() => setReplace(d)}><RefreshCw size={14} /></Button>{can('files.download') && <Button size="icon" variant="ghost" title="Download" onClick={() => downloadFile(`/documents/${d.id}/download`, d.fileName).catch((e) => toast.error(errorMessage(e)))}><Download size={14} /></Button>}<Button size="icon" variant="ghost" className="text-ink-3 hover:text-danger" title="Delete" onClick={() => setDel({ kind: 'doc', id: d.id, name: d.name })}><Trash2 size={14} /></Button></>}</span></td></tr>;
            })}</tbody></table>)}
      </div>
      <FolderModal folder={addFolder === 'new' ? null : addFolder} parentId={folderId === 'root' ? null : folderId} open={addFolder !== null} onClose={() => setAddFolder(null)} onSaved={refetch} folders={folders.data ?? []} />
      <DocumentModal doc={addDoc === 'new' ? null : addDoc} folderId={folderId === 'root' ? null : folderId} open={addDoc !== null} onClose={() => setAddDoc(null)} onSaved={refetch} folders={folders.data ?? []} />
      <ReplaceModal doc={replace} onClose={() => setReplace(null)} onSaved={refetch} />
      <DocumentViewer doc={view} onClose={() => setView(null)} />
      <Confirm open={!!del} onClose={() => setDel(null)} onConfirm={() => del && remove.mutate(del)} loading={remove.isPending} danger title={`Delete "${del?.name}"?`} body={del?.kind === 'folder' ? 'Only empty folders can be deleted.' : 'The file is removed from storage and can no longer be viewed by anyone.'} confirmLabel="Delete" />
    </div>
  );
}

function FolderModal({ folder, parentId, open, onClose, onSaved, folders }: { folder: DocFolder | null; parentId: string | null; open: boolean; onClose: () => void; onSaved: () => void; folders: DocFolder[] }) {
  const [name, setName] = useState(''); const [parent, setParent] = useState<string>(''); const [aud, setAud] = useState<Audience>(emptyAudience());
  useEffect(() => { if (open) { setName(folder?.name ?? ''); setParent(folder?.parentId ?? parentId ?? ''); setAud(folder?.audience ?? emptyAudience()); } }, [open, folder, parentId]);
  const save = useMutation({ mutationFn: () => folder ? api.patch(`/documents/folders/${folder.id}`, { name, parentId: parent || null, audience: aud }) : api.post('/documents/folders', { name, parentId: parent || null, audience: aud }), onSuccess: () => { toast.success(folder ? 'Folder updated' : 'Folder created'); onSaved(); onClose(); }, onError: (e) => toast.error(errorMessage(e)) });
  return (
    <Modal open={open} onClose={onClose} title={folder ? 'Edit folder' : 'Add a folder'} width="max-w-md" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!name.trim()} loading={save.isPending} onClick={() => save.mutate()}>{folder ? 'Save' : 'Create folder'}</Button></>}>
      <div className="space-y-3">
        <Field label="Folder name" required><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
        <Field label="Parent folder"><Select value={parent} onChange={(e) => setParent(e.target.value)}><option value="">Files (top level)</option>{folders.filter((f) => f.id !== folder?.id).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</Select></Field>
        <AudiencePicker value={aud} onChange={setAud} />
        <p className="text-[12px] text-ink-3">Folder visibility controls who can browse into it. Each document still has its own visibility.</p>
      </div>
    </Modal>
  );
}

function DocumentModal({ doc, folderId, open, onClose, onSaved, folders }: { doc: DocItem | null; folderId: string | null; open: boolean; onClose: () => void; onSaved: () => void; folders: DocFolder[] }) {
  const { boot } = useBootstrap(); const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(''); const [desc, setDesc] = useState(''); const [folder, setFolder] = useState(''); const [aud, setAud] = useState<Audience>(emptyAudience()); const [file, setFile] = useState<File | null>(null); const [active, setActive] = useState(true);
  useEffect(() => { if (open) { setName(doc?.name ?? ''); setDesc(doc?.description ?? ''); setFolder(doc?.folderId ?? folderId ?? ''); setAud(doc?.audience ?? emptyAudience()); setFile(null); setActive(doc?.isActive ?? true); } }, [open, doc, folderId]);
  useEffect(() => { if (file && !name) setName(file.name.replace(/\.[^.]+$/, '')); }, [file]); // eslint-disable-line react-hooks/exhaustive-deps
  const allowed = boot.org?.settings.files?.allowedTypes ?? []; const maxMb = boot.org?.settings.files?.maxSizeMb ?? 25;
  const save = useMutation({
    mutationFn: async () => {
      if (doc) return api.patch(`/documents/${doc.id}`, { name, description: desc, folderId: folder || null, audience: aud, isActive: active });
      if (!file) throw new Error('Choose a file to upload');
      if (file.size > maxMb * 1024 * 1024) throw new Error(`File exceeds the ${maxMb} MB limit`);
      const fd = new FormData(); fd.append('file', file); fd.append('name', name); fd.append('description', desc); fd.append('folderId', folder); fd.append('audience', JSON.stringify(aud));
      return api.post('/documents', fd);
    },
    onSuccess: () => { toast.success(doc ? 'Document updated' : 'Document uploaded'); onSaved(); onClose(); }, onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <Modal open={open} onClose={onClose} title={doc ? 'Edit document' : 'Add document'} width="max-w-lg" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!name.trim() || (!doc && !file)} loading={save.isPending} onClick={() => save.mutate()}><Upload size={14} /> {doc ? 'Save' : 'Upload'}</Button></>}>
      <div className="space-y-3">
        <Field label="Document name" required><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
        {!doc && <Field label="Upload document" required hint={`Allowed: ${allowed.join(', ').toUpperCase()} · up to ${maxMb} MB`}><input ref={fileRef} type="file" className="hidden" accept={allowed.map((a) => `.${a}`).join(',')} onChange={(e) => setFile(e.target.files?.[0] ?? null)} /><Button onClick={() => fileRef.current?.click()} className="w-full justify-start"><Upload size={14} /> {file ? `${file.name} (${fmtBytes(file.size)})` : 'Choose file'}</Button></Field>}
        <Field label="Folder"><Select value={folder} onChange={(e) => setFolder(e.target.value)}><option value="">Files (top level)</option>{folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</Select></Field>
        <AudiencePicker value={aud} onChange={setAud} />
        <Field label="Description"><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} className="min-h-[64px]" /></Field>
        {doc && <Toggle checked={active} onChange={setActive} label="Visible (inactive documents are hidden from everyone except admins)" />}
      </div>
    </Modal>
  );
}

function ReplaceModal({ doc, onClose, onSaved }: { doc: DocItem | null; onClose: () => void; onSaved: () => void }) {
  const ref = useRef<HTMLInputElement>(null); const [file, setFile] = useState<File | null>(null);
  useEffect(() => { setFile(null); }, [doc]);
  const m = useMutation({ mutationFn: async () => { const fd = new FormData(); fd.append('file', file!); return api.post(`/documents/${doc!.id}/replace`, fd); }, onSuccess: () => { toast.success('Document replaced'); onSaved(); onClose(); }, onError: (e) => toast.error(errorMessage(e)) });
  if (!doc) return null;
  return (
    <Modal open onClose={onClose} title={`Replace "${doc.name}"`} description={`Current file: ${doc.fileName} (v${doc.version})`} width="max-w-sm" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!file} loading={m.isPending} onClick={() => m.mutate()}>Replace</Button></>}>
      <input ref={ref} type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /><Button onClick={() => ref.current?.click()} className="w-full justify-start"><Upload size={14} /> {file ? file.name : 'Choose new file'}</Button>
      <p className="text-[12px] text-ink-3 mt-3">Visibility and details are kept; only the file changes. Old links stop working immediately.</p>
    </Modal>
  );
}

/** View-only viewer: streams through a short-lived signed token; no download unless the API says so. */
export function DocumentViewer({ doc, onClose }: { doc: DocItem | null; onClose: () => void }) {
  const q = useQuery({ queryKey: ['doc-view', doc?.id], queryFn: async () => (await api.get<{ data: { token: string; url: string; mimeType: string; fileName: string; canDownload: boolean } }>(`/documents/${doc!.id}/view-token`)).data.data, enabled: !!doc, staleTime: 0, gcTime: 0 });
  if (!doc) return null;
  const src = q.data ? `${apiUrl(q.data.url)}?token=${encodeURIComponent(q.data.token)}${q.data.mimeType === 'application/pdf' ? '#toolbar=0&navpanes=0' : ''}` : '';
  const isImg = q.data?.mimeType.startsWith('image/'); const isPdf = q.data?.mimeType === 'application/pdf'; const isText = q.data?.mimeType.startsWith('text/');
  return (
    <Modal open onClose={onClose} title={doc.name} description={<span className="inline-flex items-center gap-1.5"><EyeOff size={12} /> View only · {doc.fileName} · {fmtBytes(doc.size)}</span>} width="max-w-5xl"
      footer={<>{q.data?.canDownload && <Button className="mr-auto" onClick={() => downloadFile(`/documents/${doc.id}/download`, doc.fileName).catch((e) => toast.error(errorMessage(e)))}><Download size={14} /> Download</Button>}<Button onClick={onClose}>Close</Button></>}>
      <div className="min-h-[60vh] bg-surface-2 rounded-md grid place-items-center overflow-hidden" onContextMenu={(e) => e.preventDefault()}>
        {q.isLoading ? <Spinner /> : q.isError ? <p className="text-danger text-[13px]">{errorMessage(q.error, 'Access denied')}</p> : isImg ? <img src={src} alt={doc.name} className="max-h-[70vh] max-w-full object-contain select-none" draggable={false} /> : isPdf || isText ? <iframe title={doc.name} src={src} sandbox="" className="w-full h-[70vh] bg-white" /> : (
          <div className="text-center p-8"><FileText size={36} className="mx-auto text-ink-3 mb-3" /><p className="font-medium">Preview not available for .{doc.docType.toUpperCase()} in the browser</p><p className="text-[13px] text-ink-3 mt-1 max-w-sm">This document type is view-only and cannot be rendered inline. {q.data?.canDownload ? 'Use Download to open it.' : 'Ask an administrator if you need a PDF version.'}</p></div>)}
      </div>
    </Modal>
  );
}
