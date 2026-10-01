import { Badge } from '@/components/ui';
import type { Bootstrap, Directive, FieldDef, Source, Stage, Status, Template, AssignmentRule } from '@/types';
import type { CrudSpec } from './ConfigCrudPage';

const FIELD_TYPES = ['text', 'textarea', 'number', 'currency', 'percent', 'date', 'datetime', 'select', 'multiselect', 'boolean', 'phone', 'email', 'url'];
const ROLES = [{ value: 'admin', label: 'Admin' }, { value: 'branch_manager', label: 'Branch Manager' }, { value: 'team_lead', label: 'Team Lead' }, { value: 'agent', label: 'Calling Agent' }];

export const stagesSpec = (): CrudSpec<Stage> => ({
  title: 'Stages', entity: 'Stage', endpoint: '/config/stages', reorderable: true, description: 'The pipeline a lead moves through. Mark the final stages as Won or Lost so conversion is computed correctly.',
  columns: [{ key: 'name', label: 'Stage', render: (s) => <Badge color={s.color} soft>{s.name}</Badge> }, { key: 'flags', label: 'Type', render: (s) => (s.isWon ? 'Won' : s.isLost ? 'Lost' : 'Open') }, { key: 'isActive', label: 'Active', render: (s) => (s.isActive ? 'Yes' : 'No') }],
  fields: [{ key: 'name', label: 'Name', type: 'text', required: true }, { key: 'color', label: 'Colour', type: 'color' }, { key: 'isWon', label: 'Counts as won (converted)', type: 'boolean' }, { key: 'isLost', label: 'Counts as lost', type: 'boolean' }, { key: 'isActive', label: 'Active', type: 'boolean' }],
  defaults: { color: '#185FA5', isActive: true },
});

export const statusesSpec = (boot: Bootstrap): CrudSpec<Status> => ({
  title: 'Statuses', entity: 'Status', endpoint: '/config/statuses', reorderable: true, description: 'Call outcomes such as Callback, RNR, Interested. Optionally restrict a status to specific stages.',
  columns: [{ key: 'name', label: 'Status', render: (s) => <Badge color={s.color}>{s.name}</Badge> }, { key: 'subStatuses', label: 'Sub-statuses', render: (s) => (s.subStatuses?.length ? s.subStatuses.join(', ') : '—') }, { key: 'stages', label: 'Available in', render: (s) => (s.stageIds.length ? s.stageIds.map((id) => boot.stages.find((x) => x.id === id)?.name ?? '?').join(', ') : 'All stages') }, { key: 'isActive', label: 'Active', render: (s) => (s.isActive ? 'Yes' : 'No') }],
  fields: [{ key: 'name', label: 'Name', type: 'text', required: true }, { key: 'color', label: 'Colour', type: 'color' }, { key: 'subStatuses', label: 'Sub-statuses (shown in the call-log form)', type: 'tags', placeholder: 'Callback Requested, Busy — Call Later' }, { key: 'stageIds', label: 'Restrict to stages (leave empty for all)', type: 'multiselect', options: boot.stages.map((s) => ({ value: s.id, label: s.name })) }, { key: 'isActive', label: 'Active', type: 'boolean' }],
  defaults: { color: '#6B7280', isActive: true, stageIds: [], subStatuses: [] },
});

export const sourcesSpec = (): CrudSpec<Source> => ({
  title: 'Sources', entity: 'Source', endpoint: '/config/sources', description: 'Where leads come from. Imports create unknown sources automatically.',
  columns: [{ key: 'name', label: 'Source' }, { key: 'isActive', label: 'Active', render: (s) => (s.isActive ? 'Yes' : 'No') }],
  fields: [{ key: 'name', label: 'Name', type: 'text', required: true }, { key: 'isActive', label: 'Active', type: 'boolean' }], defaults: { isActive: true },
});

export const directivesSpec = (boot: Bootstrap): CrudSpec<Directive> => ({
  title: 'Stage directives', entity: 'Directive', endpoint: '/config/stage-directives', description: 'Rules enforced when a lead enters a stage: mandatory fields, a remark, a follow-up date, or who is allowed to make the move.',
  columns: [{ key: 'name', label: 'Rule' }, { key: 'to', label: 'When moving to', render: (d) => `${d.fromStageId ? boot.stages.find((s) => s.id === d.fromStageId)?.name ?? '?' : 'Any'} → ${boot.stages.find((s) => s.id === d.toStageId)?.name ?? '?'}` }, { key: 'req', label: 'Requires', render: (d) => [d.requireRemark && 'remark', d.requireNextFollowUp && 'follow-up', ...d.requiredFields.map((f) => f.replace('custom.', ''))].filter(Boolean).join(', ') || '—' }, { key: 'roles', label: 'Allowed roles', render: (d) => (d.allowedRoles.length ? d.allowedRoles.join(', ') : 'All') }],
  fields: [
    { key: 'name', label: 'Rule name', type: 'text', required: true, full: true },
    { key: 'fromStageId', label: 'From stage', type: 'select', placeholder: 'Any stage', options: boot.stages.map((s) => ({ value: s.id, label: s.name })) },
    { key: 'toStageId', label: 'To stage', type: 'select', required: true, options: boot.stages.map((s) => ({ value: s.id, label: s.name })) },
    { key: 'requiredFields', label: 'Mandatory fields', type: 'multiselect', options: [{ value: 'name', label: 'Name' }, { value: 'email', label: 'Email' }, { value: 'city', label: 'City' }, ...boot.fields.map((f) => ({ value: `custom.${f.key}`, label: f.label }))] },
    { key: 'allowedRoles', label: 'Allowed roles (empty = everyone)', type: 'multiselect', options: ROLES },
    { key: 'requireRemark', label: 'Require a remark', type: 'boolean' }, { key: 'requireNextFollowUp', label: 'Require next follow-up', type: 'boolean' }, { key: 'isActive', label: 'Active', type: 'boolean' },
  ],
  defaults: { isActive: true, requiredFields: [], allowedRoles: [] },
  toPayload: (v) => ({ ...v, fromStageId: v.fromStageId || null }),
});

export const templatesSpec = (): CrudSpec<Template> => ({
  title: 'Message templates', entity: 'Template', endpoint: '/config/templates', description: 'Reusable WhatsApp and email messages. Placeholders: {{name}} {{phone}} {{owner.name}} {{owner.phone}} {{stage}} {{status}} {{custom.<key>}}.',
  columns: [{ key: 'name', label: 'Template' }, { key: 'channel', label: 'Channel', render: (t) => <Badge>{t.channel}</Badge> }, { key: 'body', label: 'Preview', render: (t) => <span className="block max-w-[420px] truncate text-ink-2" title={t.body}>{t.body}</span> }],
  fields: [{ key: 'name', label: 'Name', type: 'text', required: true }, { key: 'channel', label: 'Channel', type: 'select', required: true, options: [{ value: 'whatsapp', label: 'WhatsApp' }, { value: 'email', label: 'Email' }, { value: 'sms', label: 'SMS' }] }, { key: 'subject', label: 'Subject (email)', type: 'text', full: true, showIf: (v) => v.channel === 'email' }, { key: 'body', label: 'Message', type: 'textarea', required: true }, { key: 'isActive', label: 'Active', type: 'boolean' }],
  defaults: { channel: 'whatsapp', isActive: true },
});

export const fieldsSpec = (boot: Bootstrap): CrudSpec<FieldDef> => ({
  title: 'Lead fields', entity: 'Field', endpoint: '/config/fields', reorderable: true, description: 'Custom parameters captured on a lead. Fields are grouped into tabs and sections on the lead page; select fields with "Show in list" become filters.',
  columns: [{ key: 'label', label: 'Field', render: (f) => <span><span className="font-medium">{f.label}</span><span className="text-ink-3 ml-1.5 text-[12px]">{f.key}</span></span> }, { key: 'type', label: 'Type' }, { key: 'tab', label: 'Tab · Section', render: (f) => `${f.tab} · ${f.section}` }, { key: 'flags', label: 'Flags', render: (f) => [f.required && 'required', f.showInCreate && 'create form', f.showInList && 'list'].filter(Boolean).join(', ') || '—' }],
  fields: [
    { key: 'label', label: 'Label', type: 'text', required: true }, { key: 'key', label: 'Key', type: 'text', required: true, readOnlyOnEdit: true, hint: 'Letters, numbers, underscores. Cannot change later.', placeholder: 'loanAmount' },
    { key: 'type', label: 'Type', type: 'select', required: true, options: FIELD_TYPES.map((t) => ({ value: t, label: t })) },
    { key: 'options', label: 'Options', type: 'tags', placeholder: 'Option A, Option B', showIf: (v) => v.type === 'select' || v.type === 'multiselect' },
    { key: 'tab', label: 'Tab', type: 'text', required: true, hint: `Existing: ${Array.from(new Set(boot.fields.map((f) => f.tab))).join(', ') || 'Basic Info'}` }, { key: 'section', label: 'Section', type: 'text', required: true },
    { key: 'placeholder', label: 'Placeholder', type: 'text' }, { key: 'helpText', label: 'Help text', type: 'text' },
    { key: 'required', label: 'Required', type: 'boolean' }, { key: 'readOnly', label: 'Read-only on lead page', type: 'boolean' }, { key: 'showInCreate', label: 'Show in create form', type: 'boolean' }, { key: 'showInList', label: 'Show in list / filters', type: 'boolean' }, { key: 'isActive', label: 'Active', type: 'boolean' },
  ],
  defaults: { type: 'text', tab: 'Basic Info', section: 'Other Information', isActive: true, options: [] },
});

export const rulesSpec = (boot: Bootstrap): CrudSpec<AssignmentRule> => ({
  title: 'Assignment rules', entity: 'Rule', endpoint: '/config/assignment-rules', description: 'Evaluated in priority order (lowest first) for every new lead without an owner — from the create form, imports or the API.',
  columns: [{ key: 'priority', label: 'Priority' }, { key: 'name', label: 'Rule' }, { key: 'strategy', label: 'Strategy', render: (r) => r.strategy.replace('_', ' ') }, { key: 'targets', label: 'Targets', render: (r) => (r.targetUserIds.length ? r.targetUserIds.map((id) => boot.users.find((u) => u.id === id)?.name ?? '?').join(', ') : r.targetTeamId ? `Team: ${boot.teams.find((t) => t.id === r.targetTeamId)?.name ?? '?'}` : '—') }, { key: 'conds', label: 'When', render: (r) => [r.conditions.sourceIds.length && `source ∈ ${r.conditions.sourceIds.map((id) => boot.sources.find((s) => s.id === id)?.name).join('/')}`, r.conditions.cities.length && `city ∈ ${r.conditions.cities.join('/')}`, r.conditions.states.length && `state ∈ ${r.conditions.states.join('/')}`].filter(Boolean).join('; ') || 'Always' }, { key: 'assignedCount', label: 'Assigned', render: (r) => r.assignedCount ?? 0 }, { key: 'isActive', label: 'Active', render: (r) => (r.isActive ? 'Yes' : 'No') }],
  fields: [
    { key: 'name', label: 'Rule name', type: 'text', required: true }, { key: 'priority', label: 'Priority', type: 'number', hint: 'Lower runs first' },
    { key: 'strategy', label: 'Strategy', type: 'select', required: true, options: [{ value: 'round_robin', label: 'Round robin' }, { value: 'least_loaded', label: 'Least loaded (fewest leads)' }, { value: 'specific_user', label: 'Specific user' }] },
    { key: 'targetTeamId', label: 'Target team (all agents)', type: 'select', placeholder: 'Pick users below instead', options: boot.teams.map((t) => ({ value: t.id, label: t.name })) },
    { key: 'targetUserIds', label: 'Target users', type: 'multiselect', options: boot.users.map((u) => ({ value: u.id, label: u.name })) },
    { key: 'sourceIds', label: 'Only for sources', type: 'multiselect', options: boot.sources.map((s) => ({ value: s.id, label: s.name })) },
    { key: 'cities', label: 'Only for cities', type: 'tags' }, { key: 'states', label: 'Only for states', type: 'tags' }, { key: 'isActive', label: 'Active', type: 'boolean' },
  ],
  defaults: { priority: 100, strategy: 'round_robin', isActive: true, targetUserIds: [], sourceIds: [], cities: [], states: [] },
  toForm: (r) => ({ ...r, sourceIds: r.conditions?.sourceIds ?? [], cities: r.conditions?.cities ?? [], states: r.conditions?.states ?? [], targetTeamId: r.targetTeamId ?? '' }),
  toPayload: (v) => { const { sourceIds, cities, states, ...rest } = v; return { ...rest, targetTeamId: v.targetTeamId || null, conditions: { sourceIds: sourceIds ?? [], cities: cities ?? [], states: states ?? [] } }; },
});
