import { route } from '@/lib/http/route';
import { metaService } from '@/server/meta/meta.service';

export const GET = route({ auth: 'none' }, async () => metaService.listLanguages());
