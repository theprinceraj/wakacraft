import Link from 'next/link';
import { Suspense } from 'react';

import { Logo } from '@/components/app/logo';
import { RedirectIfSignedIn } from '@/components/app/redirect-if-signed-in';

export default function AuthLayout({ children }: LayoutProps<'/'>) {
	return (
		<div className="flex min-h-full flex-1 flex-col items-center justify-center px-4 py-12">
			<Suspense>
				<RedirectIfSignedIn />
			</Suspense>
			<Link href="/" className="mb-8 text-foreground">
				<Logo />
			</Link>
			<div className="tile w-full max-w-sm p-7">{children}</div>
		</div>
	);
}
