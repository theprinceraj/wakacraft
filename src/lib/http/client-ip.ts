/**
 * The client's address, from headers the platform sets and clients can't forge: Vercel's `x-vercel-forwarded-for`,
 * then a reverse proxy's `x-real-ip`. `x-forwarded-for` is client-controlled unless a proxy rewrites it, so it is
 * read only with `TRUST_PROXY=true`. Null when none applies.
 */
export function clientIp(headers: Headers): string | null {
	const firstHop = (name: string) => headers.get(name)?.split(',')[0]?.trim() || null;
	return (
		firstHop('x-vercel-forwarded-for') ??
		firstHop('x-real-ip') ??
		(process.env.TRUST_PROXY === 'true' ? firstHop('x-forwarded-for') : null)
	);
}
