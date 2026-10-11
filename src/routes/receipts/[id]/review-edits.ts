import { CATEGORIES } from '../../../item-names';

export type Edit = { id: string; name: string; category: string };
export type EditResult = { ok: true; edits: Edit[] } | { ok: false; problem: string };

const clean = (value: FormDataEntryValue | null) =>
	String(value ?? '')
		.replace(/[\u0000-\u001f\u007f<>]/g, '')
		.replace(/\s+/g, ' ')
		.trim();

// Only lines that belong to this receipt can be edited; anything else in the form is ignored.
export function readEdits(form: FormData, itemIds: string[]): EditResult {
	const edits: Edit[] = [];
	for (const id of itemIds) {
		if (!form.has(`name_${id}`)) continue;
		const name = clean(form.get(`name_${id}`));
		const category = clean(form.get(`category_${id}`));
		if (!name) return { ok: false, problem: 'every line needs a name' };
		if (name.length > 120) return { ok: false, problem: 'a name is too long' };
		if (!(CATEGORIES as readonly string[]).includes(category)) return { ok: false, problem: 'pick a category from the list' };
		edits.push({ id, name, category });
	}
	return { ok: true, edits };
}
