import Link from 'next/link';

import { ContactLine, LegalPage } from '@/components/landing/legal-page';
import { REPO_URL } from '@/components/landing/site';

import type { Metadata } from 'next';

export const metadata: Metadata = {
	title: 'Terms of Service',
	description: 'The terms for using the hosted wakacraft service.',
};

export default function TermsPage() {
	return (
		<LegalPage title="Terms of Service" updated="2026-11-27">
			<section>
				<p>
					These terms cover the hosted wakacraft service at wakacraft.tech. By signing in or using the API you agree to
					them. If you do not agree, please do not use the service.
				</p>
			</section>

			<section>
				<h2>The service</h2>
				<p>
					wakacraft records the coding activity your editor plugins send and shows it back to you. The software is open
					source under the AGPL-3.0 license and available on <a href={REPO_URL}>GitHub</a>. These terms govern the
					hosted service; the license governs the code, and you may self-host it under that license.
				</p>
			</section>

			<section>
				<h2>Your account</h2>
				<ul>
					<li>You sign in with GitHub or Google and are responsible for activity under your account and API keys.</li>
					<li>Keep your API keys secret. Revoke any you think have leaked.</li>
					<li>Give accurate information and do not use someone else&apos;s account.</li>
				</ul>
			</section>

			<section>
				<h2>Acceptable use</h2>
				<ul>
					<li>Do not attack, overload or probe the service, or work around rate limits.</li>
					<li>Do not send unlawful content or data you have no right to share.</li>
					<li>Do not use the service to harm, harass or deceive other people.</li>
				</ul>
				<p>We may limit or suspend accounts that break these rules.</p>
			</section>

			<section>
				<h2>Your data</h2>
				<p>
					You keep ownership of your data. You allow us to store and process it to run the service for you. See the{' '}
					<Link href="/privacy">Privacy Policy</Link> for details, including export.
				</p>
			</section>

			<section>
				<h2>No warranty</h2>
				<p>
					The service is provided as is and as available, without warranties of any kind. Tracked times are estimates
					and should not be your only record for billing or legal purposes. The service may change, be interrupted or
					lose data, so keep your own exports.
				</p>
			</section>

			<section>
				<h2>Liability</h2>
				<p>
					To the extent the law allows, the operators of wakacraft are not liable for indirect or consequential damages,
					or for loss of data or profit, arising from your use of the service.
				</p>
			</section>

			<section>
				<h2>Changes and contact</h2>
				<p>
					We may update these terms and will revise the date above. Continued use after a change means you accept it.
					<ContactLine lead="Questions" />
				</p>
			</section>
		</LegalPage>
	);
}
