import { Suspense } from 'react';

import { EditorSetup } from '@/components/app/editor-setup';
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

export default function SettingsPage() {
	return (
		<Suspense fallback={<div className="mx-auto h-96 max-w-5xl animate-pulse rounded-lg border bg-card/50" />}>
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
		{ id: 'editor', label: 'Connect an editor' },
		{ id: 'api-keys', label: 'API keys' },
		{ id: 'preferences', label: 'Preferences' },
		{ id: 'public-profile', label: 'Public profile' },
		...(showEmbed ? [{ id: 'embed', label: 'Embed in your README' }] : []),
		{ id: 'custom-rules', label: 'Custom rules' },
		{ id: 'import-export', label: 'Import & export' },
		{ id: 'authorized-apps', label: 'Authorized apps' },
		{ id: 'developer-apps', label: 'Developer apps' },
	];

	return (
		<div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[11rem_minmax(0,1fr)]">
			<aside className="hidden lg:block">
				<div className="sticky top-20 pt-11">
					<SettingsNav sections={sections} />
				</div>
			</aside>

			<div className="flex min-w-0 flex-col gap-4">
				<h1 className="text-lg font-semibold tracking-tight">Settings</h1>

				<div id="editor" className="scroll-mt-16">
					<Panel label="Connect an editor">
						<EditorSetup apiUrl={`${baseUrl}/api/v1`} />
					</Panel>
				</div>

				<div id="api-keys" className="scroll-mt-16">
					<Panel label="API keys">
						<ApiKeys initialKeys={keys.map(toApiKeyResponse)} />
					</Panel>
				</div>

				<div id="preferences" className="scroll-mt-16">
					<Panel label="Preferences">
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
				</div>

				<div id="public-profile" className="scroll-mt-16">
					<Panel label="Public profile">
						<PublicProfileForm user={user} baseUrl={baseUrl} />
					</Panel>
				</div>

				{user.username && showEmbed ? (
					<div id="embed" className="scroll-mt-16">
						<Panel label="Embed in your README">
							<ShareSnippets
								baseUrl={baseUrl}
								username={user.username}
								publicProjects={projects.filter((project) => project.hasPublicUrl).map((project) => project.name)}
							/>
						</Panel>
					</div>
				) : null}

				<div id="custom-rules" className="scroll-mt-16">
					<Panel label="Custom rules">
						<CustomRulesEditor initialRules={rules.data} />
					</Panel>
				</div>

				<div id="import-export" className="scroll-mt-16">
					<Panel label="Import & export" bodyClassName="flex flex-col gap-6">
						<ImportExport />
						<WakatimeImport initial={wakatimeImport.data} />
					</Panel>
				</div>

				<div id="authorized-apps" className="scroll-mt-16">
					<Panel label="Authorized apps">
						<AuthorizedApps initial={authorizations.data} />
					</Panel>
				</div>

				<div id="developer-apps" className="scroll-mt-16">
					<Panel label="Developer apps (OAuth)">
						<DeveloperApps initial={apps.data} baseUrl={baseUrl} />
					</Panel>
				</div>

				<p className="pt-2 text-center text-[11px] text-muted-foreground/70">
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
	);
}
