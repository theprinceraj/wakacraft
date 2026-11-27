import { ContactLine, LEGAL_CONTACT, LegalPage } from '@/components/landing/legal-page';
import { REPO_URL } from '@/components/landing/site';

import type { Metadata } from 'next';

export const metadata: Metadata = {
	title: 'Privacy Policy',
	description: 'What wakacraft stores about you, why, and how to get it back out.',
};

export default function PrivacyPage() {
	return (
		<LegalPage title="Privacy Policy" updated="2026-11-27">
			<section>
				<p>
					wakacraft is an open-source time tracker. This page describes what the hosted instance at wakacraft.tech
					stores about you. The code is public on <a href={REPO_URL}>GitHub</a>, so you can check every claim here
					against it. If you run your own copy, you hold the data and this page does not apply to it.
				</p>
			</section>

			<section>
				<h2>Your account</h2>
				<p>
					You sign in with GitHub or Google. We receive your name, email address, profile photo and account ID from the
					provider. There are no passwords. Sessions use a cookie, and each session is stored with the IP address and
					browser user agent it was created from.
				</p>
				<p>
					The sign-in library stores the OAuth access and refresh tokens that GitHub or Google issue when you sign in.
					The GitHub token is used to read and show the commits of projects you link to a GitHub repository, including
					private repositories only if you granted that permission. wakacraft never creates commits or writes to your
					repositories.
				</p>
			</section>

			<section>
				<h2>Activity data</h2>
				<p>
					Your editor plugin sends heartbeats. Each one can contain the file path or entity being edited, project,
					branch, language, editor, operating system, machine name, line counts, cursor position, dependencies and, if
					your tools report them, AI-assistance fields such as AI and human line changes and token counts. File paths
					can reveal the names of your projects and folders. We do not store file contents.
				</p>
				<p>
					From heartbeats we compute daily summaries, stats, goals, leaderboards and similar views. We also store the
					things you create, such as API keys, custom rules, goals, invoices, clients, teams and OAuth apps.
				</p>
			</section>

			<section>
				<h2>WakaTime import</h2>
				<p>
					If you import your history from WakaTime, the WakaTime credential you provide is stored encrypted and used
					only to fetch your data for the import.
				</p>
			</section>

			<section>
				<h2>What others can see</h2>
				<p>
					Your data is private by default. Under Settings you choose what appears on your public profile, such as logged
					time, languages, editors, categories and operating systems. Leaderboards show your name, and your photo only
					if you make it public. Members of teams you join see your name and photo. Anything you publish through share
					links or README badges is visible to whoever has the link.
				</p>
			</section>

			<section>
				<h2>Export and deletion</h2>
				<p>
					You can export your heartbeats and daily summaries as data dumps from Settings at any time. You can also
					delete your account yourself under Settings → Delete account. That immediately and permanently removes your
					profile, sign-in, heartbeats and everything derived from them, API keys, goals, rules, imports, clients and
					invoices, the leaderboards and OAuth apps you created, and teams where you are the only member. It also takes
					you off other leaderboards and teams. A team you own that others belong to passes to another owner; if it has
					none, delete the team or remove its other members first.
				</p>
				<p>
					For anything else about your data,{' '}
					{LEGAL_CONTACT ? (
						<>
							write to <a href={`mailto:${LEGAL_CONTACT}`}>{LEGAL_CONTACT}</a>.
						</>
					) : (
						'contact the operator of this instance.'
					)}
				</p>
			</section>

			<section>
				<h2>Sharing and tracking</h2>
				<p>
					We do not sell your data and do not run advertising trackers. The hosted instance keeps its data with its
					hosting and database providers. GitHub and Google are used for sign-in, and GitHub also for the commit
					listings described above. The WakaTime API is called only during an import you start.
				</p>
				<p>
					To enforce rate limits, client IP addresses are briefly used as keys in request counters. The counters expire
					within about an hour.
				</p>
			</section>

			<section>
				<h2>Changes and contact</h2>
				<p>
					We will update this page when what we store changes, and revise the date above.{' '}
					<ContactLine lead="Questions or requests" />
				</p>
			</section>
		</LegalPage>
	);
}
