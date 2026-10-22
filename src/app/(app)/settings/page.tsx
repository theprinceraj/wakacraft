import { Suspense } from 'react';

import { EditorSetup } from '@/components/app/editor-setup';
import { Panel } from '@/components/dashboard/panel';
import { ApiKeys } from '@/components/settings/api-keys';
import { CustomRulesEditor } from '@/components/settings/custom-rules-editor';
import { ImportExport } from '@/components/settings/import-export';
import { AuthorizedApps, DeveloperApps } from '@/components/settings/oauth-apps';
import { PreferencesForm } from '@/components/settings/preferences-form';
import { PublicProfileForm } from '@/components/settings/public-profile-form';
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
		<Suspense fallback={<div className="mx-auto h-96 max-w-3xl animate-pulse rounded-lg border bg-card/50" />}>
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

	return (
		<div className="mx-auto flex max-w-3xl flex-col gap-4">
			<h1 className="text-lg font-semibold tracking-tight">Settings</h1>

			<Panel label="Connect an editor">
				<EditorSetup apiUrl={`${baseUrl}/api/v1`} />
			</Panel>

			<div id="api-keys" className="scroll-mt-16">
				<Panel label="API keys">
					<ApiKeys initialKeys={keys.map(toApiKeyResponse)} />
				</Panel>
			</div>

			<Panel label="Preferences">
				<PreferencesForm
					initial={{
						username: user.username,
						timezone: user.timezone,
						timeout: user.timeout,
						writes_only: user.writes_only,
						week_start_day: user.week_start_day,
					}}
					timezones={timezones}
				/>
			</Panel>

			<div id="public-profile" className="scroll-mt-16">
				<Panel label="Public profile">
					<PublicProfileForm user={user} baseUrl={baseUrl} />
				</Panel>
			</div>

			{user.username && user.logged_time_public ? (
				<Panel label="Embed in your README">
					<ShareSnippets
						baseUrl={baseUrl}
						username={user.username}
						publicProjects={projects.filter((project) => project.hasPublicUrl).map((project) => project.name)}
					/>
				</Panel>
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
		</div>
	);
}
