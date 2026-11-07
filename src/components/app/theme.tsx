'use client';

import { useCallback, useSyncExternalStore } from 'react';

import { MEDIA, STORAGE_KEY } from '@/lib/theme-script';

export type Theme = 'dark' | 'light' | 'system';

const readTheme = (): Theme => {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		return stored === 'dark' || stored === 'system' ? stored : 'light';
	} catch {
		return 'light';
	}
};

const resolve = (theme: Theme): 'dark' | 'light' =>
	theme === 'system' ? (matchMedia(MEDIA).matches ? 'dark' : 'light') : theme;

function apply(theme: Theme) {
	const resolved = resolve(theme);
	document.documentElement.classList.toggle('dark', resolved === 'dark');
	document.documentElement.style.colorScheme = resolved;
}

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

function subscribe(listener: () => void) {
	listeners.add(listener);
	const media = matchMedia(MEDIA);
	const onSystemChange = () => {
		if (readTheme() === 'system') {
			apply('system');
			notify();
		}
	};
	// Another tab changed the theme.
	const onStorage = (event: StorageEvent) => {
		if (event.key !== STORAGE_KEY) return;
		apply(readTheme());
		notify();
	};
	media.addEventListener('change', onSystemChange);
	window.addEventListener('storage', onStorage);
	return () => {
		listeners.delete(listener);
		media.removeEventListener('change', onSystemChange);
		window.removeEventListener('storage', onStorage);
	};
}

/** The chosen theme and what it resolves to right now; `setTheme` persists the choice in this browser. */
export function useTheme() {
	const theme = useSyncExternalStore(subscribe, readTheme, () => 'light' as Theme);
	const resolvedTheme = useSyncExternalStore(
		subscribe,
		() => resolve(readTheme()),
		() => 'light' as const,
	);
	const setTheme = useCallback((next: string) => {
		const value: Theme = next === 'dark' || next === 'system' ? next : 'light';
		try {
			localStorage.setItem(STORAGE_KEY, value);
		} catch {
			// Storage blocked: the theme still applies for this page view.
		}
		apply(value);
		notify();
	}, []);
	return { theme, resolvedTheme, setTheme };
}
