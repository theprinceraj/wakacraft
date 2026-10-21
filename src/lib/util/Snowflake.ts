import { randomInt } from 'node:crypto';

import { Snowflake } from '@sapphire/snowflake';

const epoch = new Date('2026-01-01T00:00:00.000Z');

const snowflake = new Snowflake(epoch);

// Many short-lived processes (serverless instances, test workers) generate ids concurrently. With the defaults
// they would all share worker/process id 0/1 and start the 12-bit counter at 0, so two instances writing in the
// same millisecond would mint identical ids. Randomizing all three per process makes a clash require the same
// millisecond, the same 10 random id bits and the same counter position.
snowflake.workerId = randomInt(32);
snowflake.processId = randomInt(32);
let increment = BigInt(randomInt(4096));

export const generateFlake = () => {
	increment = (increment + 1n) % 4096n;
	return snowflake.generate({ increment }).toString();
};
