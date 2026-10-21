/* THIS FILE WAS GENERATED AUTOMATICALLY BY wakacraft. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
/* TO REGENERATE RUN: `bun run sync` */

import { z, type infer as TypeOf } from 'zod';

export const ProjectZodSchema = z.object({
	id: z.string(),
	userId: z.string(),
	name: z.string(),
	color: z.string().nullish(),
	repository: z.string().nullish(),
	hasPublicUrl: z.boolean().default(false),
	firstHeartbeatAt: z
		.union([z.date(), z.iso.datetime({ offset: true })])
		.pipe(z.coerce.date())
		.meta({ type: 'string', format: 'date-time' }),
	lastHeartbeatAt: z
		.union([z.date(), z.iso.datetime({ offset: true })])
		.pipe(z.coerce.date())
		.meta({ type: 'string', format: 'date-time' }),
	createdAt: z
		.union([z.date(), z.iso.datetime({ offset: true })])
		.pipe(z.coerce.date())
		.meta({ type: 'string', format: 'date-time' }),
	updatedAt: z
		.union([z.date(), z.iso.datetime({ offset: true })])
		.pipe(z.coerce.date())
		.meta({ type: 'string', format: 'date-time' }),
});
export const PartialProjectZodSchema = ProjectZodSchema.partial();

export type IProjectZodSchema = TypeOf<typeof ProjectZodSchema>;
export type IProjectZodSchemaInput = Omit<z.input<typeof ProjectZodSchema>, 'createdAt' | 'updatedAt'> &
	Partial<Pick<z.input<typeof ProjectZodSchema>, 'createdAt' | 'updatedAt'>>;
export type IPartialProjectZodSchema = TypeOf<typeof PartialProjectZodSchema>;
