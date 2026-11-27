import { Heading, SiteFooter, SiteHeader, StartPill } from '@/components/landing/site';

/** Where legal questions and deletion requests go (LEGAL_CONTACT_EMAIL); unset on instances that publish none. */
export const LEGAL_CONTACT = process.env.LEGAL_CONTACT_EMAIL?.trim() || undefined;

/** `Questions: x@y.` with a contact address, else a pointer to whoever runs the instance. */
export function ContactLine({ lead }: { lead: string }) {
	return LEGAL_CONTACT ? (
		<>
			{lead}: <a href={`mailto:${LEGAL_CONTACT}`}>{LEGAL_CONTACT}</a>.
		</>
	) : (
		<>{lead}: contact the operator of this instance.</>
	);
}

/** Shell for the plain-text legal pages: the public header and footer around a readable column. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
	return (
		<div className="landing flex min-h-full flex-1 flex-col">
			<SiteHeader cta={<StartPill signedOut="Get started" className="h-10 max-md:ml-auto" />} />
			<main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6 lg:py-24">
				<Heading as="h1" className="text-4xl leading-[1.05] sm:text-5xl">
					{title}
				</Heading>
				<p className="mt-4 text-sm text-muted-foreground">Last updated: {updated}</p>
				<div className="mt-10 space-y-10 leading-relaxed text-muted-foreground [&_a]:text-foreground [&_a]:underline [&_a]:decoration-ember [&_a]:decoration-2 [&_a]:underline-offset-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-[-0.02em] [&_h2]:text-foreground [&_li]:mt-2 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
					{children}
				</div>
			</main>
			<SiteFooter />
		</div>
	);
}
