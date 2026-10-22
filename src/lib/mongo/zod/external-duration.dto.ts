/* THIS FILE WAS GENERATED AUTOMATICALLY BY wakacraft. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
/* TO REGENERATE RUN: `bun run sync` */

import { z, type infer as TypeOf } from 'zod';

export const ExternalDurationZodSchema = z.object({
	id: z.string(),
	userId: z.string(),
	externalId: z.string().max(256),
	provider: z.string().max(128).nullish(),
	entity: z.string().max(2048),
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
		.default('meeting'),
	startTime: z.number(),
	endTime: z.number(),
	project: z.string().nullish(),
	branch: z.string().nullish(),
	language: z.string().nullish(),
	meta: z.string().max(2048).nullish(),
	createdAt: z
		.union([z.date(), z.iso.datetime({ offset: true })])
		.pipe(z.coerce.date())
		.meta({ type: 'string', format: 'date-time' }),
	updatedAt: z
		.union([z.date(), z.iso.datetime({ offset: true })])
		.pipe(z.coerce.date())
		.meta({ type: 'string', format: 'date-time' }),
});
export const PartialExternalDurationZodSchema = ExternalDurationZodSchema.partial();

export type IExternalDurationZodSchema = TypeOf<typeof ExternalDurationZodSchema>;
export type IExternalDurationZodSchemaInput = Omit<
	z.input<typeof ExternalDurationZodSchema>,
	'createdAt' | 'updatedAt'
> &
	Partial<Pick<z.input<typeof ExternalDurationZodSchema>, 'createdAt' | 'updatedAt'>>;
export type IPartialExternalDurationZodSchema = TypeOf<typeof PartialExternalDurationZodSchema>;
