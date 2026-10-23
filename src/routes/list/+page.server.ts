import { fail, redirect } from '@sveltejs/kit';
import { compareStores, listName, type ListPrice } from '../../list-compare';
import { firstNameOf } from '../../session.server';
import { placed } from '../../branches';
import { mapState, myBranches } from '../../store-map.server';
import type { Actions, PageServerLoad } from './$types';

const MOST_ITEMS = 60;

export const load: PageServerLoad = async ({ locals }) => {
	const user = await locals.getUser();
	if (!user) redirect(303, '/');

	const [settings, products, branches, map] = await Promise.all([
		locals.supabase.from('user_settings').select('shopping_list').maybeSingle(),
		locals.supabase.rpc('my_products'),
		myBranches(locals.supabase),
		mapState(locals.supabase)
	]);
	if (settings.error) throw settings.error;
	if (products.error) throw products.error;
	const list: string[] = settings.data?.shopping_list ?? [];

	const prices = list.length ? await locals.supabase.rpc('my_list_prices', { names: list }) : { data: [], error: null };
	if (prices.error) throw prices.error;

	const names = (products.data as { name: string }[]).map((p) => p.name);
	return {
		firstName: firstNameOf(user),
		list,
		names,
		you: map.you,
		places: map.you ? placed(branches, map.you) : [],
		...compareStores(list, prices.data as ListPrice[])
	};
};

async function save(locals: App.Locals, userId: string, list: string[]) {
	const { error } = await locals.supabase.from('user_settings').upsert({ user_id: userId, shopping_list: list, updated_at: new Date().toISOString() });
	if (error) throw error;
}

async function current(locals: App.Locals): Promise<string[]> {
	const { data, error } = await locals.supabase.from('user_settings').select('shopping_list').maybeSingle();
	if (error) throw error;
	return data?.shopping_list ?? [];
}

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export const actions: Actions = {
	add: async ({ request, locals }) => {
		const user = await locals.getUser();
		if (!user) return fail(401, { problem: 'signed out' });
		const typed = listName((await request.formData()).get('name'));
		if (!typed) return fail(400, { problem: 'Type an item, up to 60 letters.' });
		const [list, products] = await Promise.all([current(locals), locals.supabase.rpc('my_products')]);
		if (products.error) throw products.error;
		// "whole milk" becomes the product's own "Whole milk"
		const name = (products.data as { name: string }[]).find((p) => same(p.name, typed))?.name ?? typed;
		if (list.some((item) => same(item, name))) return;
		if (list.length >= MOST_ITEMS) return fail(400, { problem: `A list holds up to ${MOST_ITEMS} items.` });
		await save(locals, user.id, [...list, name]);
	},

	remove: async ({ request, locals }) => {
		const user = await locals.getUser();
		if (!user) return fail(401, { problem: 'signed out' });
		const name = String((await request.formData()).get('name') ?? '');
		await save(locals, user.id, (await current(locals)).filter((item) => !same(item, name)));
	},

	clear: async ({ locals }) => {
		const user = await locals.getUser();
		if (!user) return fail(401, { problem: 'signed out' });
		await save(locals, user.id, []);
	}
};
