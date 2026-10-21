import { Snowflake } from '@sapphire/snowflake';

const epoch = new Date('2026-01-01T00:00:00.000Z');

const snowflake = new Snowflake(epoch);

export const generateFlake = () => snowflake.generate().toString();
