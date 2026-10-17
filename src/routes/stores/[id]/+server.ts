import { error, json } from '@sveltejs/kit';
import { placed } from '../../../branches';
import { mapState, myBranches, myStores, placeWaiting, snapToBranch } from '../../../store-map.server';
import { placeStore } from '../../../store-place.server';
import type { RequestHandler } from './$types';

const UUID = /^[0-9a-f-]{36}$/;

// One of the shopper's stores for the store sheet: its branches, nearest first, and what it is
// cheapest for. Row level security makes anyone else's store simply not found.
async function details(locals: App.Locals, id: string) {
	const [stores, named, map, branches, cheapest, unplaced] = await Promise.all([
		myStores(locals.supabase),
		locals.supabase.from('stores').select('id, name').eq('id', id).maybeSingle(),
		mapState(locals.supabase),
		myBranches(locals.supabase),
		locals.supabase.rpc('store_cheapest', { p_store: id, how_many: 4 }),
		locals.supabase.from('receipts').select('id', { count: 'exact', head: true }).eq('store_id', id).eq('status', 'saved').is('store_lat', null)
	]);
	if (cheapest.error) throw cheapest.error;
	if (unplaced.error) throw unplaced.error;
	if (named.error) throw named.error;
	if (!named.data) error(404, 'Not found');
	// a store whose receipts are all still waiting for review has no saved visits yet
	const store = stores.find((s) => s.id === id) ?? { ...named.data, visits: 0 };
	const mine = branches.filter((b) => b.storeId === id);
	return {
		store,
		map: { on: map.on, zip: map.zip, you: map.you },
		branches: map.you ? placed(mine, map.you) : [],
		unplaced: unplaced.count ?? 0,
		cheapest: cheapest.data as { name: string; per: string; cents: number; next_cents: number }[]
	};
}

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!(await locals.getUser())) error(401, 'Signed out');
	if (!UUID.test(params.id)) error(404, 'Not found');
	return json(await details(locals, params.id));
};

// "Yes, that's it" for a guessed branch, a corrected address for a branch, or "Where was this?" for
// receipts with no branch at all
export const POST: RequestHandler = async ({ params, locals, request }) => {
	if (!(await locals.getUser())) error(401, 'Signed out');
	if (!UUID.test(params.id)) error(404, 'Not found');
	const body = (await request.json().catch(() => null)) as { action?: string; key?: unknown; address?: unknown } | null;
	const map = await mapState(locals.supabase);
	if (!map.on || !map.you) return json({ problem: 'Turn on the store map first.' }, { status: 400 });

	if (body?.action === 'lookup') {
		await placeWaiting(locals.supabase, map.you, params.id);
		const left = await locals.supabase.from('receipts').select('id', { count: 'exact', head: true }).eq('store_id', params.id).eq('status', 'saved').is('store_lat', null);
		if (left.error) throw left.error;
		if (left.count) return json({ ...(await details(locals, params.id)), problem: 'This store isn’t on OpenStreetMap near your ZIP. Type its address instead.' });
	} else if (body?.action === 'confirm' && typeof body.key === 'string') {
		const { error: failed } = await locals.supabase.from('receipts').update({ branch_guess: false }).eq('store_id', params.id).eq('branch_key', body.key).eq('branch_guess', true);
		if (failed) throw failed;
	} else if (body?.action === 'move' && typeof body.key === 'string') {
		const address = typeof body.address === 'string' ? body.address.trim() : '';
		if (address.length < 6 || address.length > 200) return json({ problem: 'Type the street address, city and state.' }, { status: 400 });
		const point = await placeStore(address);
		if (!point) return json({ problem: 'That address couldn’t be found on the map. Check the street and city.' }, { status: 400 });
		// every receipt from that branch moves together, onto another branch if it is the same place
		const at = await snapToBranch(locals.supabase, params.id, { ...point, address });
		const { error: failed } = await locals.supabase
			.from('receipts')
			.update({ store_lat: at.lat, store_lng: at.lng, store_address: at.address, branch_guess: false })
			.eq('store_id', params.id)
			.eq('branch_key', body.key);
		if (failed) throw failed;
	} else if (body?.action === 'address') {
		const address = typeof body.address === 'string' ? body.address.trim() : '';
		if (address.length < 6 || address.length > 200) return json({ problem: 'Type the street address, city and state.' }, { status: 400 });
		const point = await placeStore(address);
		if (!point) return json({ problem: 'That address couldn’t be found on the map. Check the street and city.' }, { status: 400 });
		const at = await snapToBranch(locals.supabase, params.id, { ...point, address });
		const { error: failed } = await locals.supabase
			.from('receipts')
			.update({ store_lat: at.lat, store_lng: at.lng, store_address: at.address, branch_guess: false })
			.eq('store_id', params.id)
			.eq('status', 'saved')
			.is('store_lat', null);
		if (failed) throw failed;
	} else return json({ problem: 'Unknown request.' }, { status: 400 });

	return json(await details(locals, params.id));
};
