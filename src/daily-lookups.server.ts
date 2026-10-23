import { admin } from './admin.server';
import { isRecallNotice, plainTitle } from './recalls';
import { tavily } from './web-lookup.server';

const dateOf = (published: string | null) => (published && !Number.isNaN(Date.parse(published)) ? new Date(published).toISOString().slice(0, 10) : null);

// The week's FDA recall and safety alert pages, one search for everyone. Each shopper's matches are
// found from their own receipts when Home loads, so nothing about anyone is sent.
export async function findRecalls() {
	const found = await tavily('food recall allergy alert', 15, 200, 'recalls', null, AbortSignal.timeout(10_000), { time_range: 'week', include_domains: ['fda.gov'] });
	const rows = (found ?? []).filter((f) => isRecallNotice(f.url)).map((f) => ({ url: f.url, title: plainTitle(f.title), published_on: dateOf(f.published) }));
	if (!rows.length) return 0;
	const { error } = await admin.from('recalls').upsert(rows, { onConflict: 'url', ignoreDuplicates: true });
	if (error) throw error;
	return rows.length;
}
