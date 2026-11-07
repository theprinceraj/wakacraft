import { Suspense } from 'react';

import { EditorSetup } from '@/components/app/editor-setup';
import { PageHeader } from '@/components/app/page-header';
import { PageSkeleton } from '@/components/app/states';
import { Panel } from '@/components/dashboard/panel';
import { ApiKeys } from '@/components/settings/api-keys';
import { CustomRulesEditor } from '@/components/settings/custom-rules-editor';
import { ImportExport } from '@/components/settings/import-export';
import { AuthorizedApps, DeveloperApps } from '@/components/settings/oauth-apps';
import { PreferencesForm } from '@/components/settings/preferences-form';
import { PublicProfileForm } from '@/components/settings/public-profile-form';
import { SettingsNav, type SettingsSection } from '@/components/settings/settings-nav';
import { ShareSnippets } from '@/components/settings/share-snippets';
import { WakatimeImport } from '@/components/settings/wakatime-import';
import { requireSession } from '@/lib/auth/session';
import { getBaseUrl } from '@/lib/base-url';
import { toApiKeyResponse } from '@/server/api-key/api-key.response.dto';
import { apiKeyService } from '@/server/api-key/api-key.service';
import { customRuleService } from '@/server/custom-rule/custom-rule.service';
import { oauthService } from '@/server/oauth/oauth.service';
import { projectService } from '@/server/project/project.service';
import { userService } from '@/server/user/user.service';
import { wakatimeImportService } from '@/server/wakatime-import/wakatime-import.service';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Settings' };

/** Clears the sticky app bar, plus the chip row below the desktop breakpoint. */
const SECTION = 'scroll-mt-32 lg:scroll-mt-22';

export default function SettingsPage() {
	return (
		<Suspense fallback={<PageSkeleton stats={false} />}>
			<Settings />
		</Suspense>
	);
}

async function Settings() {
	const session = await requireSession('/settings');
	const [user, keys, baseUrl, rules, projects, wakatimeImport, apps, authorizations] = await Promise.all([
		userService.getCurrentUser(session.user.id),
		apiKeyService.list(session.user.id),
		getBaseUrl(),
		customRuleService.list(session.user.id),
		projectService.list(session.user.id),
		wakatimeImportService.getStatus(session.user.id),
		oauthService.listApps(session.user.id),
		oauthService.listAuthorizations(session.user.id),
	]);
	const timezones = Intl.supportedValuesOf('timeZone');
	if (!timezones.includes(user.timezone)) timezones.unshift(user.timezone);

	const showEmbed = Boolean(user.username && user.logged_time_public);
	const sections: SettingsSection[] = [
		{ id: 'editor', label: 'Connect an editor', group: 'Set up' },
		{ id: 'api-keys', label: 'API keys', group: 'Set up' },
		{ id: 'preferences', label: 'Preferences', group: 'Account' },
		{ id: 'public-profile', label: 'Public profile', group: 'Account' },
		...(showEmbed ? [{ id: 'embed', label: 'README embeds', group: 'Account' }] : []),
		{ id: 'custom-rules', label: 'Custom rules', group: 'Data' },
		{ id: 'import-export', label: 'Import and export', group: 'Data' },
		{ id: 'authorized-apps', label: 'Authorized apps', group: 'Apps' },
		{ id: 'developer-apps', label: 'Developer apps', group: 'Apps' },
	];

	return (
		<div className="mx-auto max-w-5xl">
			<PageHeader
				title="Settings"
				description="Connect your editors, control what's public, and keep your data."
				className="mb-4"
			/>
			<div className="flex flex-col gap-4 lg:grid lg:grid-cols-[12.5rem_minmax(0,1fr)] lg:gap-10">
				<SettingsNav sections={sections} />

				<div className="flex min-w-0 flex-col gap-4">
					<Panel
						id="editor"
						className={SECTION}
						label="Connect an editor"
						description="Once per machine. Heartbeats arrive within about two minutes."
					>
						<EditorSetup apiUrl={`${baseUrl}/api/v1`} />
					</Panel>

					<Panel
						id="api-keys"
						className={SECTION}
						label="API keys"
						description="Create one for each machine you code on, so that you can revoke them separately."
					>
						<ApiKeys initialKeys={keys.map(toApiKeyResponse)} />
					</Panel>

					<Panel
						id="preferences"
						className={SECTION}
						label="Preferences"
						description="How your time is counted and shown."
					>
						<PreferencesForm
							initial={{
								username: user.username,
								timezone: user.timezone,
								writes_only: user.writes_only,
								week_start_day: user.week_start_day,
							}}
							timezones={timezones}
						/>
					</Panel>

					<Panel
						id="public-profile"
						className={SECTION}
						label="Public profile"
						description="Private by default. Share only what you turn on here."
					>
						<PublicProfileForm user={user} baseUrl={baseUrl} />
					</Panel>

					{user.username && showEmbed ? (
						<Panel id="embed" className={SECTION} label="Embed in your README">
							<ShareSnippets
								baseUrl={baseUrl}
								username={user.username}
								languagesPublic={user.languages_used_public}
								editorsPublic={user.editors_used_public}
								publicProjects={projects.filter((project) => project.hasPublicUrl).map((project) => project.name)}
							/>
						</Panel>
					) : null}

					<Panel id="custom-rules" className={SECTION} label="Custom rules">
						<CustomRulesEditor initialRules={rules.data} />
					</Panel>

					<Panel
						id="import-export"
						className={SECTION}
						label="Import and export"
						description="Your history is yours. Re-importing the same data never duplicates it."
						bodyClassName="flex flex-col gap-3"
					>
						<WakatimeImport initial={wakatimeImport.data} />
						<ImportExport />
					</Panel>

					<Panel
						id="authorized-apps"
						className={SECTION}
						label="Authorized apps"
						description="Third-party apps you've allowed to read your data."
					>
						<AuthorizedApps initial={authorizations.data} />
					</Panel>

					<Panel id="developer-apps" className={SECTION} label="Developer apps">
						<DeveloperApps initial={apps.data} baseUrl={baseUrl} />
					</Panel>

					<p className="pt-2 text-center text-xs text-muted-foreground">
						Section navigation by{' '}
						<a
							href="https://rareui.com"
							target="_blank"
							rel="noopener noreferrer"
							className="underline underline-offset-2 hover:text-foreground"
						>
							Rare UI
						</a>
					</p>
				</div>
			</div>
		</div>
	);
}
