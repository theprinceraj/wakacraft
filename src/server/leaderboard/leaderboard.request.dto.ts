import { z } from 'zod';

import { LeaderboardZodSchema } from '@/lib/mongo/zod';

export const LeadersQuerySchema = z.object({
	language: z.string().trim().min(1).max(128).optional(),
	page: z.coerce.number().int().min(1).max(1000).default(1),
});

export const CreateLeaderboardSchema = z.object({ name: LeaderboardZodSchema.shape.name.trim().min(1).max(80) });

export const JoinLeaderboardSchema = z.object({ code: LeaderboardZodSchema.shape.inviteCode.trim().min(1).max(64) });

export const BoardParamsSchema = z.object({ user: z.string(), board: LeaderboardZodSchema.shape.id });
