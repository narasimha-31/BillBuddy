import { error, json } from '@sveltejs/kit';
import { branchesOf } from '../../../../store-branch.server';
import { mapState } from '../../../../store-map.server';
import type { RequestHandler } from './$types';

const UUID = /^[0-9a-f-]{36}$/;
const SHOWN = 6;

// Other branches of one of the shopper's stores near their ZIP, from OpenStreetMap, for "Which one?"
export const GET: RequestHandler = async ({ params, locals }) => {
	if (!(await locals.getUser())) error(401, 'Signed out');
	if (!UUID.test(params.id)) error(404, 'Not found');
	const [map, store] = await Promise.all([mapState(locals.supabase), locals.supabase.from('stores').select('name').eq('id', params.id).maybeSingle()]);
	if (store.error) throw store.error;
	if (!store.data) error(404, 'Not found');
	if (!map.you) return json({ branches: [] });
	const found = await branchesOf(store.data.name, map.you);
	return json({ branches: found.filter((b) => b.address).slice(0, SHOWN) });
};
