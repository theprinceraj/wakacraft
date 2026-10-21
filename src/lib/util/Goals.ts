export const GoalDeltas = { Day: 'day', Week: 'week' } as const;
export type GoalDelta = (typeof GoalDeltas)[keyof typeof GoalDeltas];
export const GoalDeltasList: GoalDelta[] = Object.values(GoalDeltas);

export const GoalStatuses = { Success: 'success', Fail: 'fail', Pending: 'pending', Ignored: 'ignored' } as const;
export type GoalStatus = (typeof GoalStatuses)[keyof typeof GoalStatuses];
export const GoalStatusesList: GoalStatus[] = Object.values(GoalStatuses);

/** Lowercase weekday names as WakaTime spells them in `ignore_days`. */
export const Weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
export type Weekday = (typeof Weekdays)[number];
