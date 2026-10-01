export type Role = 'admin' | 'branch_manager' | 'team_lead' | 'agent';

export interface Me {
  id: string; orgId: string; name: string; email: string; role: Role; teamId: string | null; managedTeamIds: string[];
  permissions: string[]; timezone: string; mustChangePassword: boolean; phone?: string; username?: string; avatarColor?: string;
  avatarUrl?: string | null; twoFactorEnabled?: boolean; employeeId?: string; designation?: string;
}
export interface Ref { id: string; name: string; color?: string; avatarColor?: string; isWon?: boolean; isLost?: boolean }
export interface Stage { id: string; name: string; order: number; color: string; isWon: boolean; isLost: boolean; isActive: boolean }
export interface Status { id: string; name: string; stageIds: string[]; subStatuses: string[]; color: string; order: number; isActive: boolean }
export interface Source { id: string; name: string; isActive: boolean }
export type FieldType = 'text' | 'textarea' | 'number' | 'currency' | 'percent' | 'date' | 'datetime' | 'select' | 'multiselect' | 'boolean' | 'phone' | 'email' | 'url';
export interface FieldDef { id: string; key: string; label: string; type: FieldType; options: string[]; tab: string; section: string; order: number; required: boolean; showInList: boolean; showInCreate: boolean; readOnly?: boolean; placeholder: string; helpText: string; isActive: boolean }
export interface Template { id: string; name: string; channel: 'whatsapp' | 'email' | 'sms'; subject: string; body: string; isActive: boolean }
export interface Directive { id: string; name: string; fromStageId: string | null; toStageId: string; requiredFields: string[]; requireRemark: boolean; requireNextFollowUp: boolean; allowedRoles: Role[]; isActive: boolean }
export interface ListView { id: string; name: string; columns: string[]; filters: Record<string, unknown>; isDefault: boolean; userId: string | null; baseTab: string; roles: Role[]; teamIds: string[]; groupId: string | null; isActive: boolean; isSystem: boolean; order: number }
export interface ViewGroup { id: string; name: string; order: number }
export interface UserLite { id: string; name: string; email?: string; role?: Role; teamId?: string | null; avatarColor?: string; avatarUrl?: string | null }
export interface User extends UserLite { phone: string; username: string; isActive: boolean; permissionTemplateId: string | null; mustChangePassword: boolean; twoFactorEnabled?: boolean; employeeId?: string; designation?: string; lastLoginAt: string | null; createdAt: string; leadCount?: number }
export interface Team { id: string; name: string; description: string; managerId: string | null; teamLeadId: string | null; permissionTemplateId?: string | null; isActive: boolean; memberCount?: number; leadCount?: number; members?: User[] }
export interface PermissionTemplate { id: string; name: string; role: Role; description: string; permissions: string[]; isSystem: boolean; isDefault: boolean; userCount?: number }
export interface LeadColumnCfg { key: string; label: string; visible: boolean; order: number }
export interface ColumnGroupCfg { name: string; columns: string[]; order: number }
export interface Organisation { id: string; name: string; slug: string; timezone: string; currency: string; branding: { logoUrl: string; logoKey?: string; primaryColor: string }; settings: { defaultRowsPerPage: number; workingHours: { start: string; end: string }; workingDays: number[]; defaultFollowUpHours: number; duplicatePhoneCheck: boolean; showLeadStageBar: boolean; topUpReminderMonths: number; twoFactorDefault: boolean; files: { allowedTypes: string[]; maxSizeMb: number }; training: { maxVideoSizeMb: number }; leadColumns: LeadColumnCfg[]; columnGroups: ColumnGroupCfg[] } }
export interface AssignmentRule { id: string; name: string; priority: number; isActive: boolean; conditions: { sourceIds: string[]; stageIds: string[]; cities: string[]; states: string[] }; strategy: 'round_robin' | 'least_loaded' | 'specific_user'; targetUserIds: string[]; targetTeamId: string | null; assignedCount: number }

export interface Bootstrap {
  org: Organisation | null; stages: Stage[]; statuses: Status[]; sources: Source[]; fields: FieldDef[]; templates: Template[];
  directives: Directive[]; views: ListView[]; viewGroups: ViewGroup[]; users: UserLite[]; teams: Team[];
  permissionCatalogue: Record<string, Record<string, string>>; roles: Record<Role, string>;
}

export interface Lead {
  id: string; name: string; phone: string; altPhone: string; email: string; city: string; state: string; country: string; language: string;
  stageId: string | null; statusId: string | null; sourceId: string | null; ownerId: string | null; teamId: string | null; managerId: string | null;
  createdById: string | null; assignedAt: string | null; remarks: string; nextFollowUpAt: string | null; firstContactedAt: string | null; lastContactedAt: string | null;
  contactCount: number; qualityScore: number; priority: number; color: string; tags: string[]; inTodayList: boolean; customFields: Record<string, unknown>;
  isDeleted: boolean; createdAt: string; updatedAt: string;
  stage: Ref | null; status: Ref | null; source: Ref | null; owner: Ref | null; team: Ref | null;
  creator?: Ref | null; counts?: { notes: number; files: number; tasks: number; calls: number }; topUp?: TopUpReminder | null; canEdit?: boolean;
}
export interface Activity { id: string; leadId: string; type: string; description: string; payload: Record<string, unknown>; createdAt: string; user: UserLite | null; lead?: { id: string; name: string; phone: string } | null }
export interface Note { id: string; body: string; remindAt?: string | null; createdAt: string; updatedAt: string; createdBy: UserLite | null }
export interface Task { id: string; title: string; description: string; dueAt: string | null; status: 'open' | 'done' | 'cancelled'; completedAt: string | null; createdBy: UserLite | null; assignee: UserLite | null; createdAt: string }
export interface CallLog { id: string; outcome: string; subStatus?: string; callStatus?: string; outcomeStatusId: string | null; outcomeStatus: Ref | null; notes: string; durationSec: number; followUpAt: string | null; direction: 'outbound' | 'inbound'; createdBy: UserLite | null; createdAt: string }
export interface LeadFile { id: string; title: string; description: string; category: string; isMandatory: boolean; fileName: string; mimeType: string; size: number; status: 'pending' | 'uploaded' | 'verified' | 'rejected'; uploadedBy: UserLite | null; createdAt: string }
export interface ImportJob { id: string; fileName: string; importType: 'create' | 'upsert'; status: 'pending' | 'processing' | 'completed' | 'failed'; totals: { rows: number; processed: number; created: number; updated: number; errored: number }; errors?: { row: number; message: string; data: Record<string, string> }[]; errorCount?: number; failureReason: string; startedBy?: UserLite | null; createdAt: string; finishedAt: string | null }

export interface PageMeta { page: number; limit: number; total: number; totalPages: number }
export interface ApiList<T> { data: T[]; meta: PageMeta }
export interface ApiError { code: string; message: string; details?: unknown }

export type NotificationStatus = 'pending' | 'read' | 'snoozed' | 'completed' | 'dismissed';
export interface Notification { id: string; leadId: string | null; leadName: string; type: string; category: 'followups' | 'assignments' | 'admin' | 'reminders' | 'general'; priority: 'high' | 'medium' | 'normal'; title: string; body: string; scheduledAt: string | null; status: NotificationStatus; readAt: string | null; createdAt: string; ref?: { kind: string; id: string | null } }
export type TopUpOutcome = 'interested' | 'not_interested' | 'call_back_later' | 'unable_to_reach' | 'already_taken' | 'other';
export interface TopUpReminder { id: string; leadId: string; ownerId: string | null; disbursedAt: string; dueAt: string; status: 'scheduled' | 'due' | 'snoozed' | 'completed' | 'dismissed'; snoozedUntil: string | null; outcome: TopUpOutcome | ''; outcomeNotes: string; completedAt: string | null; lead?: { id: string; name: string; phone: string } | null; owner?: UserLite | null; completedBy?: UserLite | null }
export interface Audience { all: boolean; roles: ('admins' | 'managers' | 'agents')[]; teamIds: string[]; userIds: string[] }
export interface DocFolder { id: string; name: string; parentId: string | null; audience: Audience; order: number; createdAt: string }
export interface DocItem { id: string; folderId: string | null; name: string; description: string; fileName: string; mimeType: string; docType: string; size: number; audience: Audience; version: number; isActive: boolean; uploadedBy: string; teamNames: string[]; createdAt: string; updatedAt: string }
export type TrainingType = 'video_upload' | 'video_link' | 'external_link' | 'document' | 'tutorial';
export interface TrainingCategory { id: string; name: string; order: number; isActive: boolean }
export interface TrainingItem { id: string; title: string; description: string; type: TrainingType; categoryId: string | null; category: string; url: string; fileName: string; mimeType: string; size: number; content?: string; durationSec: number; audience: Audience; isActive: boolean; isNew: boolean; allowDownload: boolean; addedBy: string; createdAt: string; progress: { status: 'not_started' | 'in_progress' | 'completed'; progressPct: number; positionSec: number } | null; viewToken?: string | null; viewUrl?: string | null; canDownload?: boolean }
export interface TrainingProgressRow { id: string; userId: string; status: string; progressPct: number; lastViewedAt: string | null; completedAt: string | null; user: UserLite | null }
export interface AuditLogItem { id: string; action: string; entity: string; entityId: string; summary: string; before: unknown; after: unknown; ip: string; createdAt: string; user: UserLite | null }
export interface PrioritizationRule { id: string; name: string; factor: string; fieldKey: string; operator: string; value: unknown; points: number; isActive: boolean; order: number }
export interface FbEvent { id: string; name: string; trigger: string; stageId: string | null; statusId: string | null; sourceIds: string[]; eventName: string; pixelId: string; testEventCode: string; isActive: boolean; hasAccessToken: boolean; lastFiredAt: string | null; firedCount: number; lastError: string }
export interface Profile { id: string; name: string; email: string; phone: string; username: string; role: Role; teamId: string | null; teamName: string; avatarUrl: string | null; avatarColor?: string; employeeId: string; designation: string; dateOfBirth: string | null; bankName: string; bankAccountName: string; bankAccountNumber: string; ifscCode: string; panNumber: string; twoFactorEnabled: boolean; lastLoginAt: string | null; createdAt: string; account: { name: string; owner: string; ownerEmail: string }; projects: { id: string; name: string; role: string }[] }
export interface Branding { name: string; primaryColor: string; logoUrl: string | null }
