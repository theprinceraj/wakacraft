import { z } from 'zod';

import { CustomRuleZodSchema, RuleJobZodSchema } from '@/lib/mongo/zod';
import { RuleActionsList, RuleFieldsList, RuleOperationsList } from '@/lib/util/CustomRules';
import { CategoriesList } from '@/lib/util/Heartbeats';

const value = z.string().trim().min(1).max(512);

const DestinationSchema = z.object({ destination: z.enum(RuleFieldsList), destination_value: value });

/**
 * One rule in WakaTime's PUT format (flat `destination`/`destination_value`). wakacraft also accepts a
 * `destinations` array so one rule can rewrite several fields.
 */
const RuleInputSchema = z
	.object({
		id: CustomRuleZodSchema.shape.id.optional(),
		action: z.enum(RuleActionsList),
		source: z.enum(RuleFieldsList),
		operation: z.enum(RuleOperationsList),
		source_value: value,
		destination: z.enum(RuleFieldsList).optional(),
		destination_value: value.optional(),
		destinations: z.array(DestinationSchema).max(8).optional(),
		priority: z.int().min(1).optional(),
	})
	.transform((rule) => ({
		id: rule.id,
		action: rule.action,
		source: rule.source,
		operation: rule.operation,
		sourceValue: rule.source_value,
		priority: rule.priority,
		destinations:
			rule.action === 'delete'
				? []
				: [
						...(rule.destinations ?? []),
						...(rule.destination && rule.destination_value
							? [{ destination: rule.destination, destination_value: rule.destination_value }]
							: []),
					].map((destination) => ({
						destination: destination.destination,
						destinationValue: destination.destination_value,
					})),
	}))
	.superRefine((rule, context) => {
		if (rule.action === 'change' && !rule.destinations.length) {
			context.addIssue({
				code: 'custom',
				message: 'A change rule needs a destination and value',
				path: ['destination'],
			});
		}
		for (const { destination, destinationValue } of rule.destinations) {
			if (destination === 'category' && !(CategoriesList as string[]).includes(destinationValue)) {
				context.addIssue({
					code: 'custom',
					message: `Unknown category "${destinationValue}"`,
					path: ['destination_value'],
				});
			}
		}
	});

export type RuleInput = z.output<typeof RuleInputSchema>;

export const ReplaceRulesSchema = z.array(RuleInputSchema).max(100);

export const RuleParamsSchema = z.object({ user: z.string(), rule_id: CustomRuleZodSchema.shape.id });

export const RuleProgressQuerySchema = z.object({ job_id: RuleJobZodSchema.shape.id });
