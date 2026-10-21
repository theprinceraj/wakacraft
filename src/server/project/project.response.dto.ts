import { z } from 'zod';

import { ProjectZodSchema, type IProjectZodSchema } from '@/lib/mongo/zod';
import { humanizeSeconds } from '@/lib/util/Time';

/** WakaTime's `GET users/:user/projects` item shape. */
export const ProjectResponseSchema = z.object({
	id: ProjectZodSchema.shape.id,
	name: ProjectZodSchema.shape.name,
	color: z.string().nullable(),
	repository: z.string().nullable(),
	badge: z.null(),
	clients: z.array(z.never()),
	has_public_url: z.boolean(),
	first_heartbeat_at: z.iso.datetime(),
	last_heartbeat_at: z.iso.datetime(),
	human_readable_first_heartbeat_at: z.string(),
	human_readable_last_heartbeat_at: z.string(),
	url: z.string(),
	urlencoded_name: z.string(),
	created_at: z.iso.datetime(),
});

export type ProjectResponse = z.infer<typeof ProjectResponseSchema>;

const ago = (date: Date) => {
	const seconds = Math.max(0, (Date.now() - date.getTime()) / 1000);
	if (seconds < 60) return 'just now';
	const days = Math.floor(seconds / 86_400);
	if (days >= 1) return `${days} day${days === 1 ? '' : 's'} ago`;
	return `${humanizeSeconds(seconds)} ago`;
};

export const toProjectResponse = (project: IProjectZodSchema): ProjectResponse => ({
	id: project.id,
	name: project.name,
	color: project.color ?? null,
	repository: project.repository ?? null,
	badge: null,
	clients: [],
	has_public_url: project.hasPublicUrl,
	first_heartbeat_at: project.firstHeartbeatAt.toISOString(),
	last_heartbeat_at: project.lastHeartbeatAt.toISOString(),
	human_readable_first_heartbeat_at: ago(project.firstHeartbeatAt),
	human_readable_last_heartbeat_at: ago(project.lastHeartbeatAt),
	url: `/projects/${encodeURIComponent(project.name)}`,
	urlencoded_name: encodeURIComponent(project.name),
	created_at: project.createdAt.toISOString(),
});
