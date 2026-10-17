import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';

// the production build refuses a file that is not UTF-8, while the dev server still serves it
it('every source file is valid UTF-8', () => {
	const files = (readdirSync('src', { recursive: true }) as string[]).filter((f) => /\.(ts|svelte|css|html)$/.test(f));
	const decoder = new TextDecoder('utf-8', { fatal: true });
	const broken = files.filter((f) => {
		try {
			decoder.decode(readFileSync(join('src', f)));
			return false;
		} catch {
			return true;
		}
	});
	expect(broken).toEqual([]);
});
