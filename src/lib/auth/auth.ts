import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { APIError, createAuthMiddleware } from 'better-auth/api';
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
	// The cookie cache spares a session lookup per request, but a revoked session (sign-out elsewhere, a deleted
	// account) stays valid on other devices until it expires, so keep it short: a minute.
	session: { cookieCache: { enabled: true, maxAge: 60 } },
	user: {
		// `POST /api/auth/delete-user`: needs a session from the database (not the cookie cache) that was created
		// within `session.freshAge` (a day); an older session must sign in again first. Better Auth then removes the
		// user, its sessions and its accounts. Our own data goes first, in `beforeDelete`, and again in `afterDelete`
		// for anything an in-flight request (a bulk heartbeat, an import, another device's cached session) wrote in
		// between.
		deleteUser: {
			enabled: true,
			beforeDelete: async (user) => {
				const [{ connectMongo }, { HttpError }, { accountDeletionService }] = await Promise.all([
					import('@/lib/mongo/connection'),
					import('@/lib/http/errors'),
					import('@/server/account/account-deletion.service'),
				]);
				await connectMongo();
				try {
					await accountDeletionService.deleteAccountData(user.id);
				} catch (error) {
					// Refusals (demo account, owned teams) reach the client with their status and message.
					if (error instanceof HttpError) {
						throw new APIError('BAD_REQUEST', { message: error.message }, undefined, error.status);
					}
					throw error;
				}
			},
			afterDelete: async (user) => {
				try {
					const [{ connectMongo }, { accountDeletionService }] = await Promise.all([
						import('@/lib/mongo/connection'),
						import('@/server/account/account-deletion.service'),
					]);
					await connectMongo();
					await accountDeletionService.deleteAccountData(user.id, { afterUserDeleted: true });
				} catch (error) {
					// The user is already deleted: report success and leave the leftovers to the log.
					console.error(`[delete-user] cleanup after deleting user ${user.id} failed`, error);
				}
			},
		},
	},
	databaseHooks: {
		account: {
			create: {
				// The demo user has no account, so nobody can sign in as it. Account linking matches users by email, so
				// refuse to attach one to it should its address ever be claimed.
				before: async (account) => {
					const { userProfileService } = await import('@/server/user/user-profile.service');
					if (await userProfileService.isDemo(account.userId)) {
						throw new APIError('FORBIDDEN', { message: 'The demo account cannot be signed in to' });
					}
				},
			},
		},
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
	hooks: {
		// The driver closes its topology when the first, implicit connect fails (e.g. Atlas has no primary for a
		// moment) but keeps it on the client, so every later operation throws `MongoTopologyClosedError` until the
		// process dies. An explicit connect() is a no-op while connected and builds a fresh topology after a close.
		before: createAuthMiddleware(async () => {
			await client.connect();
		}),
	},
	plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
