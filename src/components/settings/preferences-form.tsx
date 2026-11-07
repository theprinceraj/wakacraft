'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { Segmented } from '@/components/app/segmented';
import { SettingToggle } from '@/components/app/setting-toggle';
import { useTheme } from '@/components/app/theme';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Preferences {
	username: string | null;
	timezone: string;
	writes_only: boolean;
	week_start_day: number;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function PreferencesForm({ initial, timezones }: { initial: Preferences; timezones: string[] }) {
	const router = useRouter();
	const { theme, setTheme } = useTheme();
	const [values, setValues] = useState(initial);
	const [errors, setErrors] = useState<Record<string, string[]>>({});
	const [pending, setPending] = useState(false);

	async function save(event: React.FormEvent) {
		event.preventDefault();
		setPending(true);
		const response = await fetch('/api/v1/users/current', {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				...(values.username ? { username: values.username } : {}),
				timezone: values.timezone,
				writesOnly: values.writes_only,
				weekStartDay: values.week_start_day,
			}),
		});
		setPending(false);
		const json = await response.json();
		if (!response.ok) {
			setErrors(json.errors ?? {});
			toast.error(json.error ?? 'Could not save settings');
			return;
		}
		setErrors({});
		toast.success('Settings saved');
		router.refresh();
	}

	return (
		<form onSubmit={save} className="grid gap-5">
			<div className="grid gap-4 sm:grid-cols-2">
				<div className="grid gap-1.5">
					<Label htmlFor="username" className="text-[13px]">
						Username
					</Label>
					<Input
						id="username"
						value={values.username ?? ''}
						onChange={(event) => setValues({ ...values, username: event.target.value })}
						placeholder="your-handle"
						aria-invalid={Boolean(errors.username)}
					/>
					{errors.username ? <p className="text-[12.5px] text-destructive">{errors.username[0]}</p> : null}
				</div>

				<div className="grid gap-1.5">
					<Label className="text-[13px]">Timezone</Label>
					<Select value={values.timezone} onValueChange={(timezone) => setValues({ ...values, timezone })}>
						<SelectTrigger className="w-full">
							<SelectValue />
						</SelectTrigger>
						<SelectContent className="max-h-72">
							{timezones.map((timezone) => (
								<SelectItem key={timezone} value={timezone}>
									{timezone}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<p className="text-[12.5px] text-muted-foreground">Days start at midnight in this timezone.</p>
				</div>

				<div className="grid gap-1.5">
					<Label className="text-[13px]">Week starts on</Label>
					<Select
						value={String(values.week_start_day)}
						onValueChange={(day) => setValues({ ...values, week_start_day: Number(day) })}
					>
						<SelectTrigger className="w-full">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{WEEKDAYS.map((day, index) => (
								<SelectItem key={day} value={String(index)}>
									{day}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="grid gap-1.5">
					<span className="text-[13px] font-medium">Theme</span>
					<Segmented
						aria-label="Theme"
						tone="background"
						value={theme}
						onValueChange={setTheme}
						options={[
							{ value: 'light', label: 'Light' },
							{ value: 'dark', label: 'Dark' },
							{ value: 'system', label: 'System' },
						]}
					/>
				</div>
			</div>

			<SettingToggle
				title="Count only file saves"
				hint="Ignore time spent only reading code. Off matches WakaTime's default."
				checked={values.writes_only}
				onCheckedChange={(writes_only) => setValues({ ...values, writes_only })}
			/>

			<Button type="submit" disabled={pending} className="justify-self-start">
				{pending ? 'Saving…' : 'Save settings'}
			</Button>
		</form>
	);
}
