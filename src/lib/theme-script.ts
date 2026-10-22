export const STORAGE_KEY = 'theme';
export const MEDIA = '(prefers-color-scheme: dark)';

/**
 * Runs in <head> before first paint (rendered by the root layout), so the page never flashes the wrong theme.
 * Dark-first: with nothing stored, the theme is dark.
 */
export const THEME_SCRIPT = `(() => {
	try {
		const stored = localStorage.getItem('${STORAGE_KEY}');
		const dark = stored === 'light' ? false : stored === 'system' ? matchMedia('${MEDIA}').matches : true;
		document.documentElement.classList.toggle('dark', dark);
		document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
	} catch {}
})();`;
