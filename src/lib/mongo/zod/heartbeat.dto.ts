/* THIS FILE WAS GENERATED AUTOMATICALLY BY wakacraft. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
/* TO REGENERATE RUN: `bun run sync` */

import { z, type infer as TypeOf } from 'zod';

export const HeartbeatZodSchema = z.object({
	id: z.string(),
	userId: z.string(),
	entity: z.string(),
	type: z.enum(['file', 'domain', 'url', 'app']),
	category: z
		.enum([
			'coding',
			'ai coding',
			'building',
			'indexing',
			'debugging',
			'browsing',
			'running tests',
			'writing tests',
			'manual testing',
			'writing docs',
			'communicating',
			'code reviewing',
			'researching',
			'learning',
			'designing',
			'translating',
			'meeting',
			'planning',
			'supporting',
			'advising',
		])
		.default('coding'),
	time: z.number(),
	project: z.string().nullish(),
	projectRootCount: z.number().nullish(),
	branch: z.string().nullish(),
	language: z.string().nullish(),
	dependencies: z.array(z.string()).optional(),
	lines: z.number().nullish(),
	lineno: z.number().nullish(),
	cursorpos: z.number().nullish(),
	isWrite: z.boolean().default(false),
	aiLineChanges: z.number().nullish(),
	humanLineChanges: z.number().nullish(),
	aiSession: z.string().nullish(),
	aiInputTokens: z.number().nullish(),
	aiCachedInputTokens: z.number().nullish(),
	aiOutputTokens: z.number().nullish(),
	aiPromptLength: z.number().nullish(),
	aiSubscriptionPlan: z.string().nullish(),
	userAgentId: z.string().nullish(),
	editor: z.string().nullish(),
	operatingSystem: z.string().nullish(),
	machine: z.string().nullish(),
	dedupHash: z.string(),
	createdAt: z
		.union([z.date(), z.iso.datetime({ offset: true })])
		.pipe(z.coerce.date())
		.meta({ type: 'string', format: 'date-time' }),
	updatedAt: z
		.union([z.date(), z.iso.datetime({ offset: true })])
		.pipe(z.coerce.date())
		.meta({ type: 'string', format: 'date-time' }),
});
export const PartialHeartbeatZodSchema = HeartbeatZodSchema.partial();

export type IHeartbeatZodSchema = TypeOf<typeof HeartbeatZodSchema>;
export type IHeartbeatZodSchemaInput = Omit<z.input<typeof HeartbeatZodSchema>, 'createdAt' | 'updatedAt'> &
	Partial<Pick<z.input<typeof HeartbeatZodSchema>, 'createdAt' | 'updatedAt'>>;
export type IPartialHeartbeatZodSchema = TypeOf<typeof PartialHeartbeatZodSchema>;
