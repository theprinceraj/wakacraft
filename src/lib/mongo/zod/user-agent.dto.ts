/* THIS FILE WAS GENERATED AUTOMATICALLY BY wakacraft. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
/* TO REGENERATE RUN: `bun run sync` */

import { z, type infer as TypeOf } from 'zod';

export const UserAgentZodSchema = z.object({
	id: z.string(),
	userId: z.string(),
	value: z.string(),
	editor: z.string().nullish(),
	version: z.string().nullish(),
	os: z.string().nullish(),
	isBrowserExtension: z.boolean().default(false),
	isDesktopApp: z.boolean().default(false),
	lastSeenAt: z
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
export const PartialUserAgentZodSchema = UserAgentZodSchema.partial();

export type IUserAgentZodSchema = TypeOf<typeof UserAgentZodSchema>;
export type IUserAgentZodSchemaInput = Omit<z.input<typeof UserAgentZodSchema>, 'createdAt' | 'updatedAt'> &
	Partial<Pick<z.input<typeof UserAgentZodSchema>, 'createdAt' | 'updatedAt'>>;
export type IPartialUserAgentZodSchema = TypeOf<typeof PartialUserAgentZodSchema>;
