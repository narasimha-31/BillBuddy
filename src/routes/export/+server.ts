import { error, json } from '@sveltejs/kit';
import { exportSheets, photoLinks } from '../../export.server';
import { workbook } from '../../spreadsheet';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!(await locals.getUser())) error(401, 'Sign in to download your data.');
	const { sheets, photos } = await exportSheets(locals.supabase);
	if (url.searchParams.has('photos')) return json(await photoLinks(locals.supabase, photos), { headers: { 'cache-control': 'no-store' } });

	const day = new Date().toISOString().slice(0, 10);
	return new Response(workbook(sheets) as BodyInit, {
		headers: {
			'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'content-disposition': `attachment; filename="billi-${day}.xlsx"`,
			'cache-control': 'no-store'
		}
	});
};
