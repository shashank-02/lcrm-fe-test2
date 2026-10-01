import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button, Checkbox, Confirm, Empty, Field, Input, Modal, Select, Spinner, Textarea, Toggle } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useInvalidateBootstrap } from '@/store/bootstrap';
import { cn } from '@/lib/utils';

export type FormFieldSpec = {
  key: string; label: string; type: 'text' | 'textarea' | 'number' | 'color' | 'boolean' | 'select' | 'multiselect' | 'tags';
  options?: { value: string; label: string }[]; required?: boolean; hint?: string; placeholder?: string; readOnlyOnEdit?: boolean; full?: boolean; showIf?: (v: Record<string, unknown>) => boolean;
};
export interface CrudSpec<T extends { id: string }> {
  title: string; description?: string; endpoint: string; entity: string;
  columns: { key: string; label: string; render?: (row: T) => ReactNode; className?: string }[];
  fields: FormFieldSpec[];
  defaults?: Record<string, unknown>;
  reorderable?: boolean;
  /** Turn form values into the API payload (e.g. nest conditions). */
  toPayload?: (v: Record<string, unknown>) => Record<string, unknown>;
  /** Turn a row into form values. */
  toForm?: (row: T) => Record<string, unknown>;
  canDelete?: (row: T) => boolean;
  extraActions?: (row: T, refetch: () => void) => ReactNode;
}

/** Table + modal form for any org-scoped config entity served by the backend crudRouter. */
export function ConfigCrudPage<T extends { id: string; isActive?: boolean; order?: number }>({ spec }: { spec: CrudSpec<T> }) {
  const invBoot = useInvalidateBootstrap();
  const q = useQuery({ queryKey: ['config', spec.endpoint], queryFn: async () => (await api.get<{ data: T[] }>(`${spec.endpoint}?includeInactive=true`)).data.data });
  const [editing, setEditing] = useState<T | null | 'new'>(null); const [del, setDel] = useState<T | null>(null);
  const done = () => { q.refetch(); invBoot(); };
  const remove = useMutation({ mutationFn: (id: string) => api.delete(`${spec.endpoint}/${id}`), onSuccess: () => { toast.success(`${spec.entity} deleted`); setDel(null); done(); }, onError: (e) => toast.error(errorMessage(e)) });
  const reorder = useMutation({ mutationFn: (ids: string[]) => api.post(`${spec.endpoint}/reorder`, { ids }), onSuccess: done, onError: (e) => toast.error(errorMessage(e)) });
  const rows = q.data ?? [];
  const move = (i: number, dir: -1 | 1) => { const ids = rows.map((r) => r.id); const j = i + dir; if (j < 0 || j >= ids.length) return; [ids[i], ids[j]] = [ids[j], ids[i]]; reorder.mutate(ids); };
  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-3"><div><h2 className="text-[16px] font-semibold">{spec.title}</h2>{spec.description && <p className="text-[13px] text-ink-3 mt-0.5">{spec.description}</p>}</div><Button variant="primary" size="sm" onClick={() => setEditing('new')}><Plus size={14} /> Add</Button></div>
      <div className="card overflow-auto">
        {q.isLoading ? <div className="py-10 flex justify-center"><Spinner /></div> : !rows.length ? <Empty title={`No ${spec.title.toLowerCase()} yet`} action={<Button variant="primary" size="sm" onClick={() => setEditing('new')}>Add the first one</Button>} /> : (
          <table className="w-full"><thead><tr>{spec.reorderable && <th className="th w-16"></th>}{spec.columns.map((c) => <th key={c.key} className="th">{c.label}</th>)}<th className="th w-24"></th></tr></thead>
            <tbody>{rows.map((r, i) => (
              <tr key={r.id} className={cn('hover:bg-surface-2/60', r.isActive === false && 'opacity-50')}>
                {spec.reorderable && <td className="td"><span className="inline-flex"><button className="p-0.5 text-ink-3 hover:text-ink disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={13} /></button><button className="p-0.5 text-ink-3 hover:text-ink disabled:opacity-30" disabled={i === rows.length - 1} onClick={() => move(i, 1)}><ArrowDown size={13} /></button></span></td>}
                {spec.columns.map((c) => <td key={c.key} className={cn('td', c.className)}>{c.render ? c.render(r) : String((r as Record<string, unknown>)[c.key] ?? '—')}</td>)}
                <td className="td"><span className="inline-flex gap-0.5 justify-end w-full">{spec.extraActions?.(r, done)}<Button size="icon" variant="ghost" onClick={() => setEditing(r)} title="Edit"><Pencil size={14} /></Button>{(spec.canDelete?.(r) ?? true) && <Button size="icon" variant="ghost" className="text-ink-3 hover:text-danger" onClick={() => setDel(r)} title="Delete"><Trash2 size={14} /></Button>}</span></td>
              </tr>))}</tbody></table>)}
      </div>
      <CrudFormModal spec={spec} row={editing === 'new' ? null : editing} open={editing !== null} onClose={() => setEditing(null)} onSaved={done} />
      <Confirm open={!!del} onClose={() => setDel(null)} onConfirm={() => del && remove.mutate(del.id)} loading={remove.isPending} danger title={`Delete this ${spec.entity.toLowerCase()}?`} body="Items still referenced by leads cannot be deleted — deactivate them instead." confirmLabel="Delete" />
    </div>
  );
}

export function CrudFormModal<T extends { id: string }>({ spec, row, open, onClose, onSaved }: { spec: CrudSpec<T>; row: T | null; open: boolean; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState<Record<string, unknown>>({});
  useEffect(() => { if (open) setV(row ? (spec.toForm ? spec.toForm(row) : { ...(row as Record<string, unknown>) }) : { ...(spec.defaults ?? {}) }); }, [open, row, spec]);
  const save = useMutation({
    mutationFn: () => { const body: Record<string, unknown> = {}; spec.fields.forEach((f) => { if (row && f.readOnlyOnEdit) return; if (f.showIf && !f.showIf(v)) return; body[f.key] = v[f.key] === '' ? undefined : v[f.key]; }); const payload = spec.toPayload ? spec.toPayload(body) : body; return row ? api.patch(`${spec.endpoint}/${row.id}`, payload) : api.post(spec.endpoint, payload); },
    onSuccess: () => { toast.success(row ? 'Saved' : `${spec.entity} created`); onSaved(); onClose(); }, onError: (e) => toast.error(errorMessage(e)),
  });
  const visible = useMemo(() => spec.fields.filter((f) => !f.showIf || f.showIf(v)), [spec.fields, v]);
  return (
    <Modal open={open} onClose={onClose} title={row ? `Edit ${spec.entity.toLowerCase()}` : `New ${spec.entity.toLowerCase()}`} width="max-w-lg" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={save.isPending} onClick={() => save.mutate()}>{row ? 'Save changes' : 'Create'}</Button></>}>
      <div className="grid sm:grid-cols-2 gap-3">{visible.map((f) => <Field key={f.key} label={f.type === 'boolean' ? undefined : f.label} required={f.required} hint={f.hint} className={f.full || f.type === 'textarea' || f.type === 'multiselect' || f.type === 'tags' ? 'sm:col-span-2' : ''}><FormInput f={f} value={v[f.key]} disabled={!!row && f.readOnlyOnEdit} onChange={(x) => setV((s) => ({ ...s, [f.key]: x }))} /></Field>)}</div>
    </Modal>
  );
}

function FormInput({ f, value, onChange, disabled }: { f: FormFieldSpec; value: unknown; onChange: (v: unknown) => void; disabled?: boolean }) {
  const v = value ?? '';
  switch (f.type) {
    case 'textarea': return <Textarea value={String(v)} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} />;
    case 'number': return <Input type="number" value={v === null ? '' : String(v)} onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))} disabled={disabled} />;
    case 'color': return <div className="flex gap-2 items-center"><input type="color" value={String(v || '#185FA5')} onChange={(e) => onChange(e.target.value)} className="h-9 w-12 rounded border border-line bg-surface p-1 cursor-pointer" /><Input value={String(v)} onChange={(e) => onChange(e.target.value)} placeholder="#185FA5" /></div>;
    case 'boolean': return <div className="pt-6"><Toggle checked={!!v} onChange={onChange} label={f.label} /></div>;
    case 'select': return <Select value={String(v)} onChange={(e) => onChange(e.target.value || undefined)} disabled={disabled}><option value="">{f.placeholder ?? '—'}</option>{f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>;
    case 'multiselect': { const arr = Array.isArray(v) ? (v as string[]) : []; return <div className="flex flex-wrap gap-1.5 pt-1">{f.options?.map((o) => <Checkbox key={o.value} checked={arr.includes(o.value)} onChange={(on) => onChange(on ? [...arr, o.value] : arr.filter((x) => x !== o.value))} label={o.label} className="pill h-8 pl-2" />)}{!f.options?.length && <span className="text-[12.5px] text-ink-3">No options available</span>}</div>; }
    case 'tags': return <Input value={Array.isArray(v) ? (v as string[]).join(', ') : String(v)} onChange={(e) => onChange(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} placeholder={f.placeholder ?? 'Comma separated'} />;
    default: return <Input value={String(v)} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} disabled={disabled} />;
  }
}
