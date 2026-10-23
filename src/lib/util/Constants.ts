import { Schema, type SchemaDefinition, type SchemaDefinitionType, type SchemaOptions } from 'mongoose';

export const createSubSchema = <T>(
	definition: SchemaDefinition<SchemaDefinitionType<T>>,
	options: SchemaOptions = {},
): Schema<T> =>
	new Schema(definition, {
		// eslint-disable-next-line no-restricted-syntax -- sub-documents have no _id of their own
		_id: false,
		versionKey: false,
		...options,
	}) as unknown as Schema<T>;

export const DB_NAME =
	process.env.MONGODB_DB ?? (process.env.NODE_ENV === 'production' ? 'wakacraft' : 'wakacraft-dev');

/**
 * The "keystroke timeout": the max gap between heartbeats still counted as coding. Fixed at WakaTime's default for
 * everyone, so totals stay comparable with WakaTime and across users; a longer timeout counts breaks as coding.
 */
export const KEYSTROKE_TIMEOUT_MINUTES = 15;

/** wakatime-cli caps a bulk request at 25 heartbeats; we accept a little headroom for other clients. */
export const MAX_HEARTBEATS_PER_BULK = 100;

/** Older heartbeats are rejected, matching WakaTime's offline-queue window. */
export const MAX_HEARTBEAT_AGE_DAYS = 365;
