import { requireSelf, route, UserParamSchema } from '@/lib/http/route';
import { toMachineResponse } from '@/server/machine/machine.response.dto';
import { machineService } from '@/server/machine/machine.service';

export const GET = route({ auth: 'required', params: UserParamSchema }, async ({ caller, params }) => ({
	data: (await machineService.list(await requireSelf(params.user, caller))).map(toMachineResponse),
}));
