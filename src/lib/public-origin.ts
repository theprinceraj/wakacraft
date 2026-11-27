const FALLBACK_ORIGIN = 'https://wakacraft.tech';
const configured = process.env.BETTER_AUTH_URL || FALLBACK_ORIGIN;

/**
 * Public origin for crawler files and links; the same variable that configures sign-in, else the hosted instance. A
 * malformed BETTER_AUTH_URL falls back too, rather than taking every page down at module load.
 */
export const PUBLIC_ORIGIN = URL.canParse(configured) ? configured.replace(/\/+$/, '') : FALLBACK_ORIGIN;

/** `PUBLIC_ORIGIN` without the scheme, for display. */
export const PUBLIC_HOST = new URL(PUBLIC_ORIGIN).host;
