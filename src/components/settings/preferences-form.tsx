'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface Preferences {
	username: string | null;
	timezone: string;
	writes_only: boolean;
	week_start_day: number;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function PreferencesForm({ initial, timezones }: { initial: Preferences; timezones: string[] }) {
	const router = useRouter();
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
		<form onSubmit={save} className="grid max-w-xl gap-5">
			<div className="grid gap-1.5">
				<Label htmlFor="username" className="text-xs">
					Username
				</Label>
				<Input
					id="username"
					value={values.username ?? ''}
					onChange={(event) => setValues({ ...values, username: event.target.value })}
					placeholder="your-handle"
					aria-invalid={Boolean(errors.username)}
				/>
				{errors.username ? <p className="text-xs text-destructive">{errors.username[0]}</p> : null}
			</div>

			<div className="grid gap-1.5">
				<Label className="text-xs">Timezone</Label>
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
				<p className="text-xs text-muted-foreground">Days start at midnight in this timezone.</p>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<div className="grid gap-1.5">
					<Label className="text-xs">Week starts on</Label>
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
			</div>

			<label className="flex items-start justify-between gap-4 rounded-md border p-3">
				<span>
					<span className="block text-sm">Count only file saves</span>
					<span className="block text-xs text-muted-foreground">
						Ignore time spent only reading code. Off matches WakaTime&apos;s default.
					</span>
				</span>
				<Switch checked={values.writes_only} onCheckedChange={(writes_only) => setValues({ ...values, writes_only })} />
			</label>

			<Button type="submit" disabled={pending} className="justify-self-start">
				{pending ? 'Saving…' : 'Save settings'}
			</Button>
		</form>
	);
}
