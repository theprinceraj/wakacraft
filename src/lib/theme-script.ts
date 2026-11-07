export const STORAGE_KEY = 'theme';
export const MEDIA = '(prefers-color-scheme: dark)';

/**
 * Runs in <head> before first paint (rendered by the root layout), so the page never flashes the wrong theme.
 * With nothing stored the theme is light, matching the homepage; dark and "system" are opt-in.
 */
export const THEME_SCRIPT = `(() => {
	try {
		const stored = localStorage.getItem('${STORAGE_KEY}');
		const dark = stored === 'dark' ? true : stored === 'system' ? matchMedia('${MEDIA}').matches : false;
		document.documentElement.classList.toggle('dark', dark);
		document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
	} catch {}
})();`;
