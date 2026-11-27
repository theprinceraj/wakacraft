/**
 * Fills a user's account with ~30 days of plausible heartbeats so the dashboard can be explored before any real
 * editor is connected. Goes through the real ingestion service, so it also exercises dedup, projects and rollups.
 *
 *   bun run seed:demo you@example.com
 */
import { auth } from '../src/lib/auth/auth';
import { connectMongo } from '../src/lib/mongo/connection';
import { demoService } from '../src/server/demo/demo.service';
import { addDays, todayIn } from '../src/lib/util/Time';

const email = process.argv[2];
if (!email) {
	console.error('Usage: bun run seed:demo <email-of-existing-account>');
	process.exit(1);
}

await connectMongo();
const context = await auth.$context;
const found = await context.internalAdapter.findUserByEmail(email);
if (!found) {
	console.error(`No account for ${email}. Sign up in the app first.`);
	process.exit(1);
}
const userId = found.user.id;

const today = todayIn('UTC');
let total = 0;
for (let daysAgo = 30; daysAgo >= 0; daysAgo--) total += await demoService.ingestDay(userId, addDays(today, -daysAgo));

console.info(`Seeded ${total} heartbeats for ${email}.`);
process.exit(0);
