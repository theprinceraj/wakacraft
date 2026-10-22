'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

const safeNext = (next: string | null) =>
	next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';

/** Sets the new profile's timezone from the browser so "today" is the user's today from the first heartbeat. */
export function WelcomeSetup() {
	const router = useRouter();
	const next = safeNext(useSearchParams().get('next'));

	useEffect(() => {
		const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
		void fetch('/api/v1/users/current', {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ timezone }),
		})
			.catch(() => {})
			.finally(() => router.replace(next));
	}, [next, router]);

	return <p className="text-sm text-muted-foreground">Setting up your account…</p>;
}
