import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

vi.mock('./nebius.server', () => ({ structured: vi.fn() }));
vi.mock('./web-lookup.server', () => ({ searchLines: vi.fn() }));

import { structured } from './nebius.server';
import { searchLines } from './web-lookup.server';
import { nameLines } from './item-names.server';

const call = vi.mocked(structured);
const search = vi.mocked(searchLines);
const item = (index: number, name: string, flag: string) => ({ index, name, brand: null, category: 'Pantry', size_amount: null, size_unit: null, flag });
const noUser = {} as SupabaseClient;

beforeEach(() => {
	call.mockReset();
	search.mockReset();
});

describe('nameLines web lookups', () => {
	it('searches only the guessed lines, then takes the better names', async () => {
		call.mockResolvedValueOnce({ items: [item(0, 'Whole milk', 'ok'), item(1, 'Sauce', 'unsure')] });
		search.mockResolvedValueOnce([[{ title: 'Kraft Original BBQ sauce', content: '' }]]);
		call.mockResolvedValueOnce({ items: [item(1, 'Barbecue sauce', 'ok')] });
		const named = await nameLines(noUser, null, null, ['FIESTA WHL', 'CF ORGI SAUCE'], [], 'FIESTA MART');
		expect(search).toHaveBeenCalledWith('FIESTA MART', ['CF ORGI SAUCE'], null);
		expect(named.map((n) => n.name)).toEqual(['Whole milk', 'Barbecue sauce']);
		expect(JSON.stringify(call.mock.calls[1][0].messages)).toContain('web_results');
	});

	it('keeps the guess when nothing was found, with no second call', async () => {
		call.mockResolvedValueOnce({ items: [item(0, 'Sauce', 'unsure')] });
		search.mockResolvedValueOnce([null]);
		const named = await nameLines(noUser, null, null, ['CF ORGI SAUCE'], [], 'FIESTA MART');
		expect(named[0].name).toBe('Sauce');
		expect(call).toHaveBeenCalledTimes(1);
	});

	it('never searches without a store name', async () => {
		call.mockResolvedValueOnce({ items: [item(0, 'Sauce', 'unsure')] });
		await nameLines(noUser, null, null, ['CF ORGI SAUCE']);
		expect(search).not.toHaveBeenCalled();
	});
});
