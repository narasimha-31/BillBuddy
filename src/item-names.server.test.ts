import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

vi.mock('./nebius.server', () => ({ structured: vi.fn() }));
vi.mock('./web-lookup.server', () => ({ searchLines: vi.fn() }));

import { structured } from './nebius.server';
import { searchLines } from './web-lookup.server';
import { lookUpLine, nameLines } from './item-names.server';

const call = vi.mocked(structured);
const search = vi.mocked(searchLines);
const item = (index: number, name: string, flag: string) => ({ index, name, brand: null, category: 'Pantry', size_amount: null, size_unit: null, flag });
const noUser = {} as SupabaseClient;

beforeEach(() => {
	call.mockReset();
	search.mockReset();
});

describe('web lookups', () => {
	it('a read never searches the web', async () => {
		call.mockResolvedValueOnce({ items: [item(0, 'Sauce', 'unsure')] });
		const named = await nameLines(noUser, null, null, ['CF ORGI SAUCE']);
		expect(named[0].name).toBe('Sauce');
		expect(search).not.toHaveBeenCalled();
	});

	it('looks one line up when asked, and names it from what was found', async () => {
		search.mockResolvedValueOnce([[{ title: 'Kraft Original BBQ sauce', content: '' }]]);
		call.mockResolvedValueOnce({ items: [item(0, 'Barbecue sauce', 'ok')] });
		const found = await lookUpLine('CF ORGI SAUCE', false, 'FIESTA MART', 'user-1');
		expect(search).toHaveBeenCalledWith('FIESTA MART', ['CF ORGI SAUCE'], 'user-1');
		expect(found?.name).toBe('Barbecue sauce');
		expect(JSON.stringify(call.mock.calls[0][0].messages)).toContain('web_results');
	});

	it('gives nothing when the web had nothing, with no model call', async () => {
		search.mockResolvedValueOnce([null]);
		expect(await lookUpLine('CF ORGI SAUCE', false, 'FIESTA MART', 'user-1')).toBeNull();
		expect(call).not.toHaveBeenCalled();
	});

	it('gives nothing when the model still could not tell', async () => {
		search.mockResolvedValueOnce([[{ title: 'Some page', content: '' }]]);
		call.mockResolvedValueOnce({ items: [item(0, 'Sauce', 'unreadable')] });
		expect(await lookUpLine('CF ORGI SAUCE', false, 'FIESTA MART', 'user-1')).toBeNull();
	});
});
