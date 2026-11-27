/**
 * Creates (or refreshes) the public demo account served at /@demo: ~90 days of synthetic activity, all public-profile
 * flags on, and no way to sign in. Safe to rerun; it replaces the demo's data. Keep it fresh afterwards by setting
 * DEMO_USERNAME so the nightly cron appends each new day.
 *
 *   bun run seed:public-demo [username]     (default: demo)
 */
import { connectMongo } from '../src/lib/mongo/connection';
import { demoService } from '../src/server/demo/demo.service';

const username = (process.argv[2] ?? 'demo').toLowerCase();

await connectMongo();
const { userId, heartbeats } = await demoService.seed(username);
console.info(
	`Seeded ${heartbeats} heartbeats for @${username} (${userId}). Set DEMO_USERNAME=${username} to keep it fresh.`,
);
process.exit(0);
