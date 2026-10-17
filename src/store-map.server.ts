import type { SupabaseClient } from '@supabase/supabase-js';
import { placed, type Branch } from './branches';
import { milesBetween, type Point } from './distance';
import { branchesOf } from './store-branch.server';
import { placeStore } from './store-place.server';

export type MapState = { on: boolean; zip: string | null; you: Point | null };
export type Store = { id: string; name: string; visits: number };
type Spot = { lat: number; lng: number; address: string | null };

// stores looked up on OpenStreetMap in one go; at one request a second this is about 9 seconds
const MOST_LOOKUPS = 8;
// Two lookups of one address can land ~100 m apart (Census against OpenStreetMap), so a typed or
// picked address this close to a branch the shopper already has is that branch.
const SAME_BRANCH_MILES = 0.15;

async function zipPoint(supabase: SupabaseClient, zip: string): Promise<Point | null> {
	const { data, error } = await supabase.from('zip_codes').select('lat, lng').eq('zip', zip).maybeSingle();
	if (error) throw error;
	return data;
}

export async function mapState(supabase: SupabaseClient): Promise<MapState> {
	const { data, error } = await supabase.from('user_settings').select('keep_store_location, zip_code').maybeSingle();
	if (error) throw error;
	const on = data?.keep_store_location === true && !!data.zip_code;
	return { on, zip: on ? data!.zip_code : null, you: on ? await zipPoint(supabase, data!.zip_code) : null };
}

export async function myStores(supabase: SupabaseClient): Promise<Store[]> {
	const { data, error } = await supabase.rpc('my_store_places');
	if (error) throw error;
	return (data as Store[]).map((s) => ({ ...s, visits: Number(s.visits) }));
}

type BranchRow = { store_id: string; name: string; branch_key: string; lat: number; lng: number; address: string | null; visits: number; last_visit: string | null; guess: boolean };

export async function myBranches(supabase: SupabaseClient): Promise<Branch[]> {
	const { data, error } = await supabase.rpc('my_branches');
	if (error) throw error;
	return (data as BranchRow[]).map((b) => ({
		storeId: b.store_id,
		name: b.name,
		key: b.branch_key,
		lat: b.lat,
		lng: b.lng,
		address: b.address,
		visits: Number(b.visits),
		lastVisit: b.last_visit,
		guess: b.guess
	}));
}

// For a receipt with no printed address: the branch of that store the shopper uses most near home,
// else the chain's branch nearest their ZIP on OpenStreetMap. Always marked as a guess.
export async function guessSpot(store: { id: string; name: string }, you: Point, known: Branch[]): Promise<Spot | null> {
	const usual = placed(known.filter((b) => b.storeId === store.id && !b.guess), you)
		.filter((b) => !b.away)
		.sort((a, b) => b.visits - a.visits)[0];
	if (usual) return { lat: usual.lat, lng: usual.lng, address: usual.address };
	// a saved point always carries an address (a database rule), so a branch with none is no guess
	const nearest = (await branchesOf(store.name, you)).find((b) => b.address);
	return nearest ? { lat: nearest.lat, lng: nearest.lng, address: nearest.address } : null;
}

// receipts saved before the map was on, or without an address, get a guessed branch per store
export async function placeWaiting(supabase: SupabaseClient, you: Point) {
	const waiting = await supabase.from('receipts').select('store_id, stores(name)').eq('status', 'saved').is('store_lat', null).not('store_id', 'is', null);
	if (waiting.error) throw waiting.error;
	const stores = new Map<string, string>();
	for (const r of waiting.data as unknown as { store_id: string; stores: { name: string } | { name: string }[] }[])
		stores.set(r.store_id, (Array.isArray(r.stores) ? r.stores[0]?.name : r.stores?.name) ?? '');
	const known = await myBranches(supabase);
	let lookups = 0;
	for (const [id, name] of stores) {
		const hasUsual = known.some((b) => b.storeId === id && !b.guess);
		if (!hasUsual && lookups++ >= MOST_LOOKUPS) continue;
		if (!hasUsual && lookups > 1) await new Promise((wait) => setTimeout(wait, 1100));
		const spot = await guessSpot({ id, name }, you, known);
		if (!spot) continue;
		const { error } = await supabase
			.from('receipts')
			.update({ store_lat: spot.lat, store_lng: spot.lng, store_address: spot.address, branch_guess: true })
			.eq('store_id', id)
			.eq('status', 'saved')
			.is('store_lat', null);
		if (error) throw error;
	}
}

export async function turnMapOn(supabase: SupabaseClient, userId: string, zip: string): Promise<'ok' | 'unknown_zip'> {
	const you = await zipPoint(supabase, zip);
	if (!you) return 'unknown_zip';
	const { error } = await supabase.from('user_settings').upsert({ user_id: userId, keep_store_location: true, zip_code: zip, updated_at: new Date().toISOString() });
	if (error) throw error;
	await placeWaiting(supabase, you);
	return 'ok';
}

// Off deletes everything the map kept: the ZIP and every receipt's branch, printed or guessed
export async function turnMapOff(supabase: SupabaseClient, userId: string) {
	const [settings, receipts] = await Promise.all([
		supabase.from('user_settings').upsert({ user_id: userId, keep_store_location: false, zip_code: null, updated_at: new Date().toISOString() }),
		supabase.from('receipts').update({ store_address: null, store_lat: null, store_lng: null, branch_guess: false }).not('store_lat', 'is', null)
	]);
	for (const result of [settings, receipts]) if (result.error) throw result.error;
}

// the exact point of the shopper's nearest branch of this store within reach of the spot, or the spot
export async function snapToBranch(supabase: SupabaseClient, storeId: string, spot: Spot): Promise<Spot> {
	const close = (await myBranches(supabase))
		.filter((b) => b.storeId === storeId)
		.map((b) => ({ key: b.key, miles: milesBetween(spot, b) }))
		.filter((b) => b.miles <= SAME_BRANCH_MILES)
		.sort((a, b) => a.miles - b.miles)[0];
	if (!close) return spot;
	const { data, error } = await supabase.from('receipts').select('store_lat, store_lng, store_address').eq('store_id', storeId).eq('branch_key', close.key).limit(1).single();
	if (error) throw error;
	return { lat: data.store_lat, lng: data.store_lng, address: data.store_address ?? spot.address };
}

// "Which Walmart?": one receipt moves to the branch the shopper picked, and stops being a guess
export async function pickBranch(supabase: SupabaseClient, receiptId: string, spot: Spot) {
	const receipt = await supabase.from('receipts').select('store_id').eq('id', receiptId).single();
	if (receipt.error) throw receipt.error;
	const at = receipt.data.store_id ? await snapToBranch(supabase, receipt.data.store_id, spot) : spot;
	const { error } = await supabase.from('receipts').update({ store_lat: at.lat, store_lng: at.lng, store_address: at.address, branch_guess: false }).eq('id', receiptId);
	if (error) throw error;
}

// a typed address is placed by the Census geocoder, like a printed one
export async function typeBranch(supabase: SupabaseClient, receiptId: string, address: string): Promise<'ok' | 'not_found'> {
	const point = await placeStore(address);
	if (!point) return 'not_found';
	await pickBranch(supabase, receiptId, { ...point, address });
	return 'ok';
}
