import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { nextCookies } from 'better-auth/next-js';
import { MongoClient } from 'mongodb';

import { DB_NAME } from '../util/Constants';

// Better Auth talks to its own collections through the native driver; one client per process.
const globalForAuth = globalThis as unknown as { authMongoClient?: MongoClient };
// The driver connects lazily, so a placeholder URI keeps `next build` working without a database.
const client = (globalForAuth.authMongoClient ??= new MongoClient(
	process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017',
	{ maxPoolSize: 5, serverSelectionTimeoutMS: 10_000 },
));

const socialProviders = {
	...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
		? { github: { clientId: process.env.GITHUB_CLIENT_ID, clientSecret: process.env.GITHUB_CLIENT_SECRET } }
		: {}),
	...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
		? { google: { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET } }
		: {}),
};

export const enabledSocialProviders = Object.keys(socialProviders) as ('github' | 'google')[];

export const auth = betterAuth({
	appName: 'wakacraft',
	database: mongodbAdapter(client.db(DB_NAME), {
		client,
		// Standalone mongod (local dev) has no transactions; Atlas does.
		transaction: process.env.MONGODB_TRANSACTIONS === 'true',
	}),
	// OAuth only (GitHub, Google): no passwords to store and no email service needed for verification or resets.
	emailAndPassword: { enabled: false },
	socialProviders,
	account: { accountLinking: { enabled: true, trustedProviders: ['github', 'google'] } },
	session: { cookieCache: { enabled: true, maxAge: 5 * 60 } },
	databaseHooks: {
		user: {
			create: {
				after: async (user) => {
					// Imported lazily so the auth module stays free of Mongoose at build time.
					const { userProfileService } = await import('@/server/user/user-profile.service');
					await userProfileService.ensureProfile(user.id);
				},
			},
		},
	},
	plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
