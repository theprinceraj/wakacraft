import { Suspense } from 'react';

import { Logo } from '@/components/app/logo';
import { WelcomeSetup } from '@/components/auth/welcome-setup';

/** First stop after a new account is created via OAuth: adopt the browser's timezone, then continue. */
export default function WelcomePage() {
	return (
		<div className="canvas-grid flex min-h-full flex-1 flex-col items-center justify-center gap-6 px-4">
			<Logo />
			<Suspense>
				<WelcomeSetup />
			</Suspense>
		</div>
	);
}
