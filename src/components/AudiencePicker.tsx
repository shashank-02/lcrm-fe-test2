import { Checkbox, Field, Select } from '@/components/ui';
import { useBootstrap } from '@/store/bootstrap';
import type { Audience } from '@/types';

export const emptyAudience = (): Audience => ({ all: true, roles: [], teamIds: [], userIds: [] });

/** Shared "Visible to" control for documents, folders and training. */
export function AudiencePicker({ value, onChange }: { value: Audience; onChange: (a: Audience) => void }) {
  const { boot } = useBootstrap();
  const set = (p: Partial<Audience>) => onChange({ ...value, ...p });
  const toggle = (k: 'roles' | 'teamIds' | 'userIds', id: string, on: boolean) => set({ [k]: on ? [...(value[k] as string[]), id] : (value[k] as string[]).filter((x) => x !== id) } as Partial<Audience>);
  return (
    <div className="space-y-3">
      <Field label="Visible to">
        <div className="space-y-1.5">
          <Checkbox checked={value.all} onChange={(v) => set({ all: v })} label={<span className="font-medium">All organisation members</span>} />
          {!value.all && <div className="pl-6 space-y-1.5">
            <Checkbox checked={value.roles.includes('managers')} onChange={(v) => toggle('roles', 'managers', v)} label="Managers / Team Leads" />
            <Checkbox checked={value.roles.includes('agents')} onChange={(v) => toggle('roles', 'agents', v)} label="Agents" />
            <Checkbox checked={value.roles.includes('admins')} onChange={(v) => toggle('roles', 'admins', v)} label="Admins only" />
          </div>}
        </div>
      </Field>
      {!value.all && <>
        <Field label="Teams / departments" hint={value.roles.length ? 'With roles selected above, a user must match BOTH role and team.' : 'Leave empty for any team.'}>
          <div className="flex flex-wrap gap-1.5">{boot.teams.map((t) => <Checkbox key={t.id} className="pill h-8 pl-2" checked={value.teamIds.includes(t.id)} onChange={(v) => toggle('teamIds', t.id, v)} label={t.name} />)}{!boot.teams.length && <span className="text-[12.5px] text-ink-3">No teams configured</span>}</div>
        </Field>
        <Field label="Specific users" hint="These users always see it, regardless of role or team.">
          <Select value="" onChange={(e) => { if (e.target.value) toggle('userIds', e.target.value, true); }}><option value="">Add a user…</option>{boot.users.filter((u) => !value.userIds.includes(u.id)).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select>
          {value.userIds.length > 0 && <div className="flex flex-wrap gap-1.5 mt-2">{value.userIds.map((id) => <button key={id} type="button" className="pill" onClick={() => toggle('userIds', id, false)}>{boot.users.find((u) => u.id === id)?.name ?? 'User'} ×</button>)}</div>}
        </Field>
      </>}
    </div>
  );
}

export function audienceLabel(a: Audience, teams: { id: string; name: string }[], users: { id: string; name: string }[]) {
  if (a.all) return 'All members';
  const parts: string[] = [];
  if (a.roles.length) parts.push(a.roles.map((r) => (r === 'managers' ? 'Managers/TLs' : r === 'agents' ? 'Agents' : 'Admins')).join(' + '));
  if (a.teamIds.length) parts.push(a.teamIds.map((t) => teams.find((x) => x.id === t)?.name ?? '?').join(', '));
  if (a.userIds.length) parts.push(`${a.userIds.length} user(s)${a.userIds.length <= 2 ? `: ${a.userIds.map((u) => users.find((x) => x.id === u)?.name ?? '?').join(', ')}` : ''}`);
  return parts.join(' · ') || 'Nobody';
}
