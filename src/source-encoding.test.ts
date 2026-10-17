import { expect, it } from 'vitest';

// The production build refuses a file that is not UTF-8, while the dev server still serves it.
// Vite reads each file as UTF-8 here, so any byte that is not becomes the replacement character.
const sources = import.meta.glob(['./**/*.{ts,svelte,css,html}', '!./source-encoding.test.ts'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

it('every source file is valid UTF-8', () => {
	expect(Object.keys(sources).length).toBeGreaterThan(50);
	expect(Object.keys(sources).filter((file) => sources[file].includes('�'))).toEqual([]);
});
