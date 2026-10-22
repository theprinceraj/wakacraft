import { KeyRound, ShieldAlert } from 'lucide-react';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { Logo } from '@/components/app/logo';
import { Button } from '@/components/ui/button';
import { requireSession } from '@/lib/auth/session';
import { AuthorizeQuerySchema } from '@/server/oauth/oauth.request.dto';
import { OAuthError, oauthService } from '@/server/oauth/oauth.service';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Authorize app' };

/** WakaTime's `GET /oauth/authorize`: the consent screen a third-party app sends you to. */
export default function AuthorizePage({ searchParams }: PageProps<'/oauth/authorize'>) {
	return (
		<div className="canvas-grid flex min-h-full flex-1 flex-col items-center justify-center px-4 py-12">
			<div className="mb-8 text-foreground">
				<Logo />
			</div>
			<div className="w-full max-w-md rounded-lg border bg-card/80 p-6 shadow-2xl backdrop-blur">
				<Suspense fallback={<div className="h-48 animate-pulse" />}>
					<Consent searchParams={searchParams} />
				</Suspense>
			</div>
		</div>
	);
}

function Problem({ message }: { message: string }) {
	return (
		<div className="flex flex-col items-center gap-3 py-4 text-center">
			<ShieldAlert className="size-6 text-destructive" aria-hidden />
			<p className="text-sm font-medium">This authorization link doesn&apos;t work</p>
			<p className="text-xs text-muted-foreground">{message}</p>
		</div>
	);
}

async function Consent({ searchParams }: Pick<PageProps<'/oauth/authorize'>, 'searchParams'>) {
	const raw = Object.fromEntries(
		Object.entries(await searchParams).flatMap(([key, value]) => (typeof value === 'string' ? [[key, value]] : [])),
	);
	const session = await requireSession(`/oauth/authorize?${new URLSearchParams(raw)}`);
	const parsed = AuthorizeQuerySchema.safeParse(raw);
	if (!parsed.success) return <Problem message={parsed.error.issues[0]?.message ?? 'Malformed request'} />;

	let described: Awaited<ReturnType<typeof oauthService.describeAuthorization>>;
	try {
		described = await oauthService.describeAuthorization(parsed.data);
	} catch (error) {
		if (error instanceof OAuthError) return <Problem message={error.message} />;
		throw error;
	}
	// The client and redirect URI are verified, so it's safe to hand other problems back to the app.
	if (described.problem) redirect(oauthService.errorRedirect(parsed.data, described.problem));

	const redirectHost = new URL(parsed.data.redirect_uri).host;

	return (
		<form method="post" action="/api/oauth/authorize" className="flex flex-col gap-5">
			{Object.entries(raw).map(([key, value]) => (
				<input key={key} type="hidden" name={key} value={value} />
			))}
			<div className="flex items-start gap-3">
				<div className="grid size-9 shrink-0 place-items-center rounded-md bg-ember/15 text-ember">
					<KeyRound className="size-4" aria-hidden />
				</div>
				<div className="min-w-0">
					<h1 className="text-base font-semibold tracking-tight">{described.app.name} wants access to your account</h1>
					<p className="text-xs text-muted-foreground">
						Signed in as {session.user.email}
						{described.app.website ? (
							<>
								{' · '}
								<a href={described.app.website} target="_blank" rel="noreferrer" className="hover:underline">
									{new URL(described.app.website).host}
								</a>
							</>
						) : null}
					</p>
				</div>
			</div>

			{described.app.description ? <p className="text-sm text-muted-foreground">{described.app.description}</p> : null}

			<div>
				<p className="mb-2 text-[11px] tracking-wide text-muted-foreground uppercase">It will be able to</p>
				{described.scopes.length ? (
					<ul className="flex flex-col gap-1.5 text-sm">
						{described.scopes.map(({ scope, description }) => (
							<li key={scope} className="flex gap-2">
								<span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-ember" aria-hidden />
								<span>
									{description} <code className="tabular text-[11px] text-muted-foreground">{scope}</code>
								</span>
							</li>
						))}
					</ul>
				) : (
					<p className="text-sm">See your public profile only.</p>
				)}
			</div>

			<p className="text-xs text-muted-foreground">
				You&apos;ll be sent back to <span className="text-foreground">{redirectHost}</span>. You can revoke access any
				time in Settings → Authorized apps.
			</p>

			<div className="flex justify-end gap-2">
				<Button type="submit" name="decision" value="deny" variant="ghost">
					Deny
				</Button>
				<Button type="submit" name="decision" value="approve">
					Authorize
				</Button>
			</div>
		</form>
	);
}
