import { z } from 'zod';

/** GitHub's own login rules: 1–39 alphanumerics or single hyphens, not starting or ending with one. */
export const GithubLoginSchema = z
	.string()
	.trim()
	.regex(/^@?[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i, 'That is not a valid GitHub username')
	.transform((login) => login.replace(/^@/, ''));

/** `?year=` on the wrapped page: GitHub's contribution graph starts in 2008. */
export const GithubWrappedYearSchema = z.coerce.number().int().min(2008);
