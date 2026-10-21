import { NotFoundException } from '@/lib/http/errors';
import { mongoProjectService } from '@/lib/mongo/project/project.service';

import type { IHeartbeatZodSchema, IProjectZodSchema } from '@/lib/mongo/zod';
import type { UpdateProjectInput } from './project.request.dto';

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

class ProjectService {
	/** Creates projects on first sight and widens their first/last activity window. */
	public async touchFromHeartbeats(userId: string, heartbeats: Pick<IHeartbeatZodSchema, 'project' | 'time'>[]) {
		const windows = new Map<string, { first: number; last: number }>();
		for (const { project, time } of heartbeats) {
			if (!project) continue;
			const window = windows.get(project);
			if (window) {
				window.first = Math.min(window.first, time);
				window.last = Math.max(window.last, time);
			} else windows.set(project, { first: time, last: time });
		}

		await Promise.all(
			[...windows].map(([name, { first, last }]) =>
				mongoProjectService.updateOne(
					{ userId, name },
					{
						$setOnInsert: { userId, name },
						$min: { firstHeartbeatAt: new Date(first * 1000) },
						$max: { lastHeartbeatAt: new Date(last * 1000) },
					},
					{ upsert: true, setDefaultsOnInsert: true },
				),
			),
		);
	}

	public async list(userId: string, query?: string): Promise<IProjectZodSchema[]> {
		const filter = query ? { userId, name: { $regex: escapeRegex(query), $options: 'i' } } : { userId };
		return mongoProjectService.find(filter, '', { sort: { lastHeartbeatAt: -1 } });
	}

	public async getByName(userId: string, name: string): Promise<IProjectZodSchema> {
		const project = await mongoProjectService.findOne({ userId, name });
		if (!project) throw new NotFoundException('Project not found');
		return project;
	}

	public async update(userId: string, id: string, input: UpdateProjectInput): Promise<IProjectZodSchema> {
		const project = await mongoProjectService.updateOne({ userId, id }, { $set: input });
		if (!project) throw new NotFoundException('Project not found');
		return project;
	}
}

export const projectService = new ProjectService();
