import { z } from 'zod';

import { route } from '@/lib/http/route';
import { ShareCharts, shareableService } from '@/server/shareable/shareable.service';

const ParamsSchema = z.object({
	username: z.string().min(1),
	chart: z
		.string()
		.regex(new RegExp(`^(${ShareCharts.join('|')})\.(svg|json)$`), 'Unknown chart')
		.transform((value) => {
			const [chart, format] = value.split('.') as [(typeof ShareCharts)[number], 'svg' | 'json'];
			return { chart, format };
		}),
});

const QuerySchema = z.object({ theme: z.enum(['dark', 'light']).default('dark') });

const CACHE = 'public, max-age=600';

/** Embeddable last-7-days charts: `/share/<username>/languages.svg`, `editors.json`, `activity.svg`, … */
export const GET = route({ auth: 'none', params: ParamsSchema, query: QuerySchema }, async ({ params, query }) => {
	const { chart, format } = params.chart;
	if (format === 'json') {
		return Response.json(
			{ data: await shareableService.chartData(params.username, chart) },
			{ headers: { 'cache-control': CACHE } },
		);
	}
	return new Response(await shareableService.chartSvg(params.username, chart, query.theme), {
		headers: { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': CACHE },
	});
});
