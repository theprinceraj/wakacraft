import { Schema, SchemaTypes } from 'mongoose';

import { createSubSchema } from '../../util/Constants';
import { generateFlake } from '../../util/Snowflake';
import { WakatimeImportStatusesList } from '../../util/WakatimeImports';

import type { IWakatimeImportZodSchema } from '../zod';

export const WakatimeImportSchemaName = 'WakatimeImport';

const lookupSchema = createSubSchema({
	id: { type: SchemaTypes.String, required: true },
	value: { type: SchemaTypes.String, required: true },
});

/**
 * Pulling a user's history from wakatime.com, one day per request. The job is resumable: `cursor` is the next day to
 * fetch, and whoever holds the lease (`leaseUntil`) advances it. A request or the nightly cron picks up a job whose
 * lease lapsed, so a timed-out function never strands it.
 */
export const WakatimeImportSchema = new Schema<IWakatimeImportZodSchema>(
	{
		id: { type: SchemaTypes.String, default: generateFlake, required: true, unique: true, immutable: true },
		userId: { type: SchemaTypes.String, required: true },
		status: { type: SchemaTypes.String, enum: WakatimeImportStatusesList, required: true },
		/** The WakaTime personal OAuth token, encrypted at rest; removed once the job ends. */
		token: { type: SchemaTypes.String, required: false, select: false },
		startDate: { type: SchemaTypes.String, required: true },
		endDate: { type: SchemaTypes.String, required: true },
		cursor: { type: SchemaTypes.String, required: true },
		daysDone: { type: SchemaTypes.Number, required: true, default: 0 },
		daysTotal: { type: SchemaTypes.Number, required: true },
		heartbeatsImported: { type: SchemaTypes.Number, required: true, default: 0 },
		/** WakaTime's user agents and machines, so imported heartbeats keep their editor, OS and hostname. */
		userAgents: { type: [lookupSchema], required: true, default: [] },
		machines: { type: [lookupSchema], required: true, default: [] },
		leaseUntil: { type: SchemaTypes.Date, required: false },
		/** Set while WakaTime is rate limiting us; the job waits until then. */
		retryAt: { type: SchemaTypes.Date, required: false },
		error: { type: SchemaTypes.String, required: false },
		finishedAt: { type: SchemaTypes.Date, required: false },
	},
	{ timestamps: true, versionKey: false },
);

WakatimeImportSchema.index({ userId: 1, createdAt: -1 });
WakatimeImportSchema.index({ status: 1, leaseUntil: 1 });
