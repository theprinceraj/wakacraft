import { z } from 'zod';

import { UserAgentZodSchema, type IUserAgentZodSchema } from '@/lib/mongo/zod';

export const UserAgentResponseSchema = z.object({
	id: UserAgentZodSchema.shape.id,
	value: UserAgentZodSchema.shape.value,
	editor: z.string().nullable(),
	version: z.string().nullable(),
	os: z.string().nullable(),
	is_browser_extension: z.boolean(),
	is_desktop_app: z.boolean(),
	last_seen_at: z.iso.datetime(),
	created_at: z.iso.datetime(),
});

export type UserAgentResponse = z.infer<typeof UserAgentResponseSchema>;

export const toUserAgentResponse = (userAgent: IUserAgentZodSchema): UserAgentResponse => ({
	id: userAgent.id,
	value: userAgent.value,
	editor: userAgent.editor ?? null,
	version: userAgent.version ?? null,
	os: userAgent.os ?? null,
	is_browser_extension: userAgent.isBrowserExtension,
	is_desktop_app: userAgent.isDesktopApp,
	last_seen_at: userAgent.lastSeenAt.toISOString(),
	created_at: userAgent.createdAt.toISOString(),
});
