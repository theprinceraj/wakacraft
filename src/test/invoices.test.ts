import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { connectMongo } from '@/lib/mongo/connection';
import { addDays, localDayBounds, todayIn } from '@/lib/util/Time';
import { heartbeatService } from '@/server/heartbeat/heartbeat.service';
import { CreateClientSchema } from '@/server/invoice/invoice.request.dto';
import { invoiceService } from '@/server/invoice/invoice.service';
import { userProfileService } from '@/server/user/user-profile.service';

import { signUpTestUser } from './users';

const day = addDays(todayIn('UTC'), -1);
let userId: string;
let clientId: string;

const work = (project: string, startMinute: number, minutes: number) =>
	heartbeatService.ingest(
		userId,
		Array.from({ length: minutes + 1 }, (_, index) => ({
			entity: `/src/${project}.ts`,
			type: 'file',
			project,
			time: localDayBounds(day, 'UTC').start + 9 * 3600 + (startMinute + index) * 60,
		})),
		{ userAgent: null, machineName: null },
	);

beforeAll(async () => {
	await connectMongo();
	({
		user: { id: userId },
	} = await signUpTestUser({ body: { email: 'invoices@wakacraft.test', name: 'Billable' } }));
	await userProfileService.updateSettings(userId, { timezone: 'UTC' });
	await work('api', 0, 50);
	await work('web', 120, 20);
});

afterAll(async () => {
	await (await connectMongo()).disconnect();
});

describe('invoices', () => {
	it('creates a client', async () => {
		const { data } = await invoiceService.createClient(
			userId,
			CreateClientSchema.parse({
				name: 'Acme',
				hourlyRate: 100,
				currency: 'eur',
				roundingMinutes: 15,
				projects: ['api'],
			}),
		);
		clientId = data.id;
		expect(data).toMatchObject({ currency: 'EUR', rounding_minutes: 15 });
	});

	it("bills only the client's projects, rounded up", async () => {
		const { data } = await invoiceService.createInvoice(userId, { clientId, start: day, end: day });
		expect(data.number).toBe('INV-0001');
		// 50 minutes rounds up to 60 → 100.00; the web project isn't Acme's.
		expect(data.line_items).toEqual([
			{ project: 'api', seconds: 3000, billed_seconds: 3600, hourly_rate: 100, amount: 100 },
		]);
		expect(data.total).toBe(100);
		expect(data.status).toBe('draft');
	});

	it('numbers invoices sequentially and freezes issued ones', async () => {
		const first = (await invoiceService.listInvoices(userId)).data[0];
		await work('api', 300, 30);
		const second = (await invoiceService.createInvoice(userId, { clientId, start: day, end: day })).data;
		expect(second.number).toBe('INV-0002');
		expect(second.total).toBeGreaterThan(first.total);
		expect((await invoiceService.getInvoice(userId, first.id)).data.total).toBe(100);
	});

	it('tracks status', async () => {
		const [latest] = (await invoiceService.listInvoices(userId)).data;
		expect((await invoiceService.updateInvoice(userId, latest.id, { status: 'paid' })).data.status).toBe('paid');
	});

	it('refuses to invoice a client without projects', async () => {
		const { data } = await invoiceService.createClient(
			userId,
			CreateClientSchema.parse({ name: 'Empty', hourlyRate: 50, currency: 'USD' }),
		);
		await expect(invoiceService.createInvoice(userId, { clientId: data.id, start: day, end: day })).rejects.toThrow(
			/project/,
		);
	});
});
