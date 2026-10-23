import { error, json } from '@sveltejs/kit';
import { branchesOf, searchPlaces } from '../../../../store-branch.server';
import { mapState } from '../../../../store-map.server';
import { storeOnWeb } from '../../../../web-lookup.server';
import type { RequestHandler } from './$types';

const UUID = /^[0-9a-f-]{36}$/;
const SHOWN = 6;
const PLACES = 8;

// Other branches of one of the shopper's stores near their ZIP, from OpenStreetMap, for "Which one?".
// With ?q, whatever places match what the shopper typed, for picking the store from a list.
export const GET: RequestHandler = async ({ params, locals, url }) => {
	const user = await locals.getUser();
	if (!user) error(401, 'Signed out');
	if (!UUID.test(params.id)) error(404, 'Not found');
	const [map, store] = await Promise.all([mapState(locals.supabase), locals.supabase.from('stores').select('name').eq('id', params.id).maybeSingle()]);
	if (store.error) throw store.error;
	if (!store.data) error(404, 'Not found');
	if (!map.you) return json({ branches: [], places: [] });
	const typed = url.searchParams.get('q')?.trim().slice(0, 80) ?? '';
	if (typed.length >= 3) {
		const onMap = await searchPlaces(typed, map.you);
		// small shops missing from OpenStreetMap are looked for on the web
		const places = onMap.length ? onMap : await storeOnWeb(typed, map.you, user.id);
		return json({ places: places.slice(0, PLACES), fromWeb: !onMap.length && places.length > 0 });
	}
	const found = await branchesOf(store.data.name, map.you);
	return json({ branches: found.filter((b) => b.address).slice(0, SHOWN) });
};
