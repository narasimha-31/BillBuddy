import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiUnavailable, recentlyFailed, structured } from './nebius.server';
import { readReceipt } from './receipt-reader.server';

vi.mock('./nebius.server', async (original) => ({
	...(await original<typeof import('./nebius.server')>()),
	structured: vi.fn(),
	recentlyFailed: vi.fn()
}));

const call = vi.mocked(structured);
const down = vi.mocked(recentlyFailed);
const roles = () => call.mock.calls.map(([request]) => request.role);
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);

beforeEach(() => {
	call.mockReset();
	down.mockReset().mockResolvedValue(false);
});

describe('readReceipt', () => {
	it('uses GLM when it answers', async () => {
		call.mockResolvedValueOnce({ kind: 'store_receipt' });
		await expect(readReceipt(jpeg, null)).resolves.toEqual({ kind: 'store_receipt' });
		expect(roles()).toEqual(['vision']);
	});

	it('gives the backup model one try when GLM is down or slow', async () => {
		call.mockRejectedValueOnce(new AiUnavailable('provider timed out')).mockResolvedValueOnce({ kind: 'store_receipt' });
		await expect(readReceipt(jpeg, null)).resolves.toEqual({ kind: 'store_receipt' });
		expect(roles()).toEqual(['vision', 'visionBackup']);
	});

	it('stops when both are down', async () => {
		call.mockRejectedValueOnce(new AiUnavailable('provider returned 503')).mockRejectedValueOnce(new AiUnavailable('provider timed out'));
		await expect(readReceipt(jpeg, null)).rejects.toBeInstanceOf(AiUnavailable);
		expect(roles()).toEqual(['vision', 'visionBackup']);
	});

	it('does not spend more when the daily budget is used up', async () => {
		call.mockRejectedValueOnce(new AiUnavailable('daily AI budget reached', true));
		await expect(readReceipt(jpeg, null)).rejects.toMatchObject({ budget: true });
		expect(roles()).toEqual(['vision']);
	});

	it('does not retry a request the provider rejected', async () => {
		call.mockRejectedValueOnce(new Error('provider rejected the request: 422'));
		await expect(readReceipt(jpeg, null)).rejects.toThrow('422');
		expect(roles()).toEqual(['vision']);
	});

	it('goes straight to the backup while GLM keeps failing', async () => {
		down.mockResolvedValue(true);
		call.mockResolvedValueOnce({ kind: 'store_receipt' });
		await readReceipt(jpeg, null);
		expect(roles()).toEqual(['visionBackup']);
	});

	it('still uses the one model it was pointed at, even if that model failed lately', async () => {
		down.mockResolvedValue(true);
		call.mockResolvedValueOnce({ kind: 'store_receipt' });
		await readReceipt(jpeg, null, ['vision']);
		expect(roles()).toEqual(['vision']);
	});

	it('can be pointed at one model, for the evals', async () => {
		call.mockResolvedValueOnce({ kind: 'store_receipt' });
		await readReceipt(jpeg, null, ['visionBackup']);
		expect(roles()).toEqual(['visionBackup']);
	});
});
