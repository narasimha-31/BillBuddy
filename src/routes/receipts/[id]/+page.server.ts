import { error as httpError, fail, redirect } from '@sveltejs/kit';
import { chooseAisle } from '../../../aisle-choice.server';
import { CATEGORIES, type Category } from '../../../item-names';
import { AiUnavailable } from '../../../nebius.server';
import { assignProducts } from '../../../product-merge.server';
import { readDate, reconcile } from '../../../receipt-check';
import { firstNameOf } from '../../../session.server';
import { readEdits } from './review-edits';
import type { Actions, PageServerLoad } from './$types';

const UUID = /^[0-9a-f-]{36}$/;

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = await locals.getUser();
	if (!user) redirect(303, '/');
	if (!UUID.test(params.id)) httpError(404, 'Not found');

	// row level security makes someone else's receipt simply not found
	const [receipt, items] = await Promise.all([
		locals.supabase
			.from('receipts')
			.select('id, status, problem, purchased_on, channel, subtotal_cents, tax_cents, total_cents, skipped_lines, store_id, store_address, stores(name)')
			.eq('id', params.id)
			.maybeSingle(),
		locals.supabase
			.from('receipt_items')
			.select('id, position, kind, raw_text, name, brand, category, quantity, unit, unit_price_cents, total_cents, computed, issue')
			.eq('receipt_id', params.id)
			.order('position')
	]);
	if (receipt.error) throw receipt.error;
	if (items.error) throw items.error;
	if (!receipt.data) httpError(404, 'Not found');

	const { stores, ...rest } = receipt.data;
	const store = (Array.isArray(stores) ? stores[0]?.name : (stores as { name: string } | null)?.name) ?? null;
	const math = reconcile(
		items.data.map((i) => i.total_cents),
		rest.subtotal_cents,
		rest.tax_cents,
		rest.total_cents
	);
	return { firstName: firstNameOf(user), receipt: { ...rest, store }, items: items.data, math, categories: [...CATEGORIES] };
};

export const actions: Actions = {
	// apply the edits, remember them for next time, and mark the receipt as checked
	confirm: async ({ params, request, locals }) => {
		const user = await locals.getUser();
		if (!user) return fail(401, { problem: 'signed out' });

		const receipt = await locals.supabase.from('receipts').select('id, store_id').eq('id', params.id).maybeSingle();
		if (receipt.error) throw receipt.error;
		if (!receipt.data) httpError(404, 'Not found');
		const storeId: string | null = receipt.data.store_id;

		const items = await locals.supabase.from('receipt_items').select('id, kind, raw_text, name, brand, category, size_amount, size_unit, issue, product_id').eq('receipt_id', params.id);
		if (items.error) throw items.error;

		const editable = items.data.filter((i) => i.kind === 'item');
		const form = await request.formData();
		const result = readEdits(form, editable.map((i) => i.id));
		if (!result.ok) return fail(400, { problem: result.problem });

		// the date as the shopper set it; a blank field means the receipt has no date
		const typed = String(form.get('purchased_on') ?? '').trim();
		const purchasedOn = typed ? readDate(typed) : null;
		if (typed && !purchasedOn) return fail(400, { problem: 'pick a real date, not in the future' });

		const changed = result.edits.filter((edit) => {
			const before = editable.find((i) => i.id === edit.id)!;
			return before.name !== edit.name || before.category !== edit.category;
		});
		for (const edit of changed) {
			const { error } = await locals.supabase
				.from('receipt_items')
				.update({ name: edit.name, category: edit.category, issue: null })
				.eq('id', edit.id);
			if (error) throw error;
		}

		if (changed.length) {
			const memory = changed.map((edit) => {
				const before = editable.find((i) => i.id === edit.id)!;
				return {
					store_id: storeId,
					raw_text: before.raw_text,
					name: edit.name,
					brand: before.brand,
					category: edit.category,
					size_amount: before.size_amount,
					size_unit: before.size_unit,
					updated_at: new Date().toISOString()
				};
			});
			const { error } = await locals.supabase.from('name_memory').upsert(memory, { onConflict: 'user_id,store_id,raw_text' });
			if (error) throw error;
		}

		// A renamed line, or a guessed one the shopper has now seen and kept, joins the shared product
		// of its name. If the models are down the save still stands: the line keeps its own name on
		// Prices until the next save. A new aisle alone needs no model.
		const renamed = changed.filter((edit) => editable.find((i) => i.id === edit.id)!.name !== edit.name);
		const productOf = new Map<string, string | null>(editable.map((i) => [i.id, i.product_id]));
		const confirmed = [
			...renamed.map((edit) => ({ id: edit.id, name: edit.name })),
			...editable.filter((i) => i.name && ['unsure', 'unreadable'].includes(i.issue) && !changed.some((e) => e.id === i.id)).map((i) => ({ id: i.id, name: i.name as string }))
		];
		if (confirmed.length) {
			try {
				const products = await assignProducts(user.id, confirmed.map((c) => c.name));
				for (const [i, line] of confirmed.entries()) {
					const { error } = await locals.supabase
						.from('receipt_items')
						.update({ product_id: products[i].productId, maybe_product_id: products[i].maybeProductId })
						.eq('id', line.id);
					if (error) throw error;
					productOf.set(line.id, products[i].productId);
				}
			} catch (problem) {
				if (!(problem instanceof AiUnavailable)) throw problem;
				console.warn('renamed lines kept without a product:', problem.message);
			}
		}

		// a new aisle covers the whole product for this shopper: every line of it, now and later
		for (const edit of changed) {
			const before = editable.find((i) => i.id === edit.id)!;
			const product = productOf.get(edit.id);
			if (before.category !== edit.category && product) await chooseAisle(locals.supabase, product, edit.category as Category);
		}

		// the shopper has seen the guessed names, so they stop being marked
		const seen = await locals.supabase.from('receipt_items').update({ issue: null }).eq('receipt_id', params.id).in('issue', ['unsure', 'unreadable']);
		if (seen.error) throw seen.error;

		const update = form.has('purchased_on') ? { status: 'saved', purchased_on: purchasedOn } : { status: 'saved' };
		const { error } = await locals.supabase.from('receipts').update(update).eq('id', params.id);
		if (error) throw error;
		redirect(303, '/receipts');
	},

	delete: async ({ params, locals }) => {
		const user = await locals.getUser();
		if (!user) return fail(401, { problem: 'signed out' });

		const receipt = await locals.supabase.from('receipts').select('image_path').eq('id', params.id).maybeSingle();
		if (receipt.error) throw receipt.error;
		if (!receipt.data) httpError(404, 'Not found');

		if (receipt.data.image_path) await locals.supabase.storage.from('receipts').remove([receipt.data.image_path]);
		const { error } = await locals.supabase.from('receipts').delete().eq('id', params.id);
		if (error) throw error;
		redirect(303, '/receipts');
	}
};
