import { z } from 'zod';

import { DataDumpZodSchema, type IDataDumpZodSchema } from '@/lib/mongo/zod';

/** WakaTime's `data_dumps` item. wakacraft streams dumps on download, so every dump is complete immediately. */
export const DataDumpResponseSchema = z.object({
	id: DataDumpZodSchema.shape.id,
	type: DataDumpZodSchema.shape.type,
	status: z.literal('Completed'),
	percent_complete: z.number(),
	download_url: z.url(),
	is_processing: z.boolean(),
	is_stuck: z.boolean(),
	has_failed: z.boolean(),
	expires: z.iso.datetime(),
	created_at: z.iso.datetime(),
});

export type DataDumpResponse = z.infer<typeof DataDumpResponseSchema>;

export const toDataDumpResponse = (dump: IDataDumpZodSchema, baseUrl: string): DataDumpResponse => ({
	id: dump.id,
	type: dump.type,
	status: 'Completed',
	percent_complete: 100,
	download_url: `${baseUrl}/api/v1/users/current/data_dumps/${dump.id}/download`,
	is_processing: false,
	is_stuck: false,
	has_failed: false,
	expires: dump.expiresAt.toISOString(),
	created_at: dump.createdAt.toISOString(),
});
