import { describe, expect, it } from 'vitest';
import { confirmsDelete } from './delete-account.server';

describe('confirmsDelete', () => {
	it('takes DELETE, with stray spaces around it', () => {
		expect(confirmsDelete('DELETE')).toBe(true);
		expect(confirmsDelete('  DELETE ')).toBe(true);
	});

	it('refuses anything else, so an account never goes by accident', () => {
		for (const typed of ['delete', 'Delete', 'DELET', 'DELETE ME', '', null, undefined, 1]) {
			expect(confirmsDelete(typed)).toBe(false);
		}
	});
});
