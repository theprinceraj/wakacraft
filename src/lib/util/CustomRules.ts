export const RuleActions = { Change: 'change', Delete: 'delete' } as const;
export type RuleAction = (typeof RuleActions)[keyof typeof RuleActions];
export const RuleActionsList: RuleAction[] = Object.values(RuleActions);

/** Operation names exactly as WakaTime spells them (with spaces). */
export const RuleOperations = {
	Equals: 'equals',
	Contains: 'contains',
	StartsWith: 'starts with',
	EndsWith: 'ends with',
} as const;
export type RuleOperation = (typeof RuleOperations)[keyof typeof RuleOperations];
export const RuleOperationsList: RuleOperation[] = Object.values(RuleOperations);

/** Heartbeat properties a rule can match on or rewrite, in WakaTime's wire names. */
export const RuleFields = {
	Project: 'project',
	Entity: 'entity',
	Language: 'language',
	Branch: 'branch',
	Category: 'category',
	Editor: 'editor',
	OperatingSystem: 'operating_system',
	Machine: 'machine',
} as const;
export type RuleField = (typeof RuleFields)[keyof typeof RuleFields];
export const RuleFieldsList: RuleField[] = Object.values(RuleFields);

/** Wire name → stored heartbeat field. */
export const RULE_FIELD_TO_HEARTBEAT = {
	project: 'project',
	entity: 'entity',
	language: 'language',
	branch: 'branch',
	category: 'category',
	editor: 'editor',
	operating_system: 'operatingSystem',
	machine: 'machine',
} as const satisfies Record<RuleField, string>;

export const RuleJobStatuses = { Running: 'running', Done: 'done', Failed: 'failed' } as const;
export type RuleJobStatus = (typeof RuleJobStatuses)[keyof typeof RuleJobStatuses];
export const RuleJobStatusesList: RuleJobStatus[] = Object.values(RuleJobStatuses);
