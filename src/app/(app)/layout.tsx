import { Suspense } from 'react';

import { AppNav, AppNavSkeleton } from '@/components/app/app-nav';
import { requireSession } from '@/lib/auth/session';

/** The frame prerenders; the session-dependent nav streams in behind its own boundary. */
export default function AppLayout({ children }: LayoutProps<'/'>) {
	return (
		<div className="canvas-grid flex min-h-full flex-1 flex-col">
			<Suspense fallback={<AppNavSkeleton />}>
				<SignedInNav />
			</Suspense>
			<main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-5">{children}</main>
		</div>
	);
}

async function SignedInNav() {
	const session = await requireSession();
	return <AppNav user={{ name: session.user.name, email: session.user.email, image: session.user.image }} />;
}
