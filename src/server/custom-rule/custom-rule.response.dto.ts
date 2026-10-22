import { z } from 'zod';

import { CustomRuleZodSchema, type ICustomRuleZodSchema } from '@/lib/mongo/zod';

/** WakaTime's custom rule shape (GET), with destinations nested. */
export const CustomRuleResponseSchema = z.object({
	id: CustomRuleZodSchema.shape.id,
	action: CustomRuleZodSchema.shape.action,
	source: CustomRuleZodSchema.shape.source,
	operation: CustomRuleZodSchema.shape.operation,
	source_value: z.string(),
	destinations: z.array(z.object({ id: z.string(), destination: z.string(), destination_value: z.string() })),
	priority: z.number(),
	created_at: z.iso.datetime(),
	modified_at: z.iso.datetime(),
});

export type CustomRuleResponse = z.infer<typeof CustomRuleResponseSchema>;

export const toCustomRuleResponse = (rule: ICustomRuleZodSchema): CustomRuleResponse => ({
	id: rule.id,
	action: rule.action,
	source: rule.source,
	operation: rule.operation,
	source_value: rule.sourceValue,
	destinations: rule.destinations.map((destination) => ({
		id: destination.id,
		destination: destination.destination,
		destination_value: destination.destinationValue,
	})),
	priority: rule.priority,
	created_at: rule.createdAt.toISOString(),
	modified_at: rule.updatedAt.toISOString(),
});
