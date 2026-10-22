import { RULE_FIELD_TO_HEARTBEAT, type RuleOperation } from '@/lib/util/CustomRules';

import type { ICustomRuleZodSchema } from '@/lib/mongo/zod';

export type Rule = Pick<ICustomRuleZodSchema, 'action' | 'source' | 'operation' | 'sourceValue' | 'destinations'>;

/** `equals` is exact; the substring operations ignore case, as path and project casing varies across machines. */
export function matches(value: string | null | undefined, operation: RuleOperation, needle: string): boolean {
	if (value === null || value === undefined) return false;
	if (operation === 'equals') return value === needle;

	const haystack = value.toLowerCase();
	const target = needle.toLowerCase();
	switch (operation) {
		case 'contains':
			return haystack.includes(target);
		case 'starts with':
			return haystack.startsWith(target);
		case 'ends with':
			return haystack.endsWith(target);
	}
}

/**
 * Runs rules (already sorted by priority) over one heartbeat's fields. Returns the rewritten fields, or `null` when
 * a `delete` rule matched. Each rule sees the changes made by earlier rules.
 */
export function applyRules<T extends Record<string, unknown>>(heartbeat: T, rules: readonly Rule[]): T | null {
	let current: Record<string, unknown> = heartbeat;
	for (const rule of rules) {
		const field = RULE_FIELD_TO_HEARTBEAT[rule.source];
		if (!matches(current[field] as string | undefined, rule.operation, rule.sourceValue)) continue;
		if (rule.action === 'delete') return null;

		current = { ...current };
		for (const { destination, destinationValue } of rule.destinations) {
			current[RULE_FIELD_TO_HEARTBEAT[destination]] = destinationValue;
		}
	}
	return current as T;
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The same match expressed as a MongoDB filter, for rewriting stored heartbeats in bulk. */
export function ruleFilter(rule: Rule): Record<string, unknown> {
	const field = RULE_FIELD_TO_HEARTBEAT[rule.source];
	const value = escapeRegex(rule.sourceValue);
	switch (rule.operation) {
		case 'equals':
			return { [field]: rule.sourceValue };
		case 'contains':
			return { [field]: { $regex: value, $options: 'i' } };
		case 'starts with':
			return { [field]: { $regex: `^${value}`, $options: 'i' } };
		case 'ends with':
			return { [field]: { $regex: `${value}$`, $options: 'i' } };
	}
}

export function ruleUpdate(rule: Rule): Record<string, string> {
	return Object.fromEntries(
		rule.destinations.map(({ destination, destinationValue }) => [
			RULE_FIELD_TO_HEARTBEAT[destination],
			destinationValue,
		]),
	);
}
