import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.PUBLIC_SUPABASE_URL!;
const publishable = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const noSession = { auth: { persistSession: false, autoRefreshToken: false } };

const admin = createClient(url, process.env.SUPABASE_SECRET_KEY!, noSession);
const userIds: string[] = [];

async function signedInUser(label: string): Promise<SupabaseClient> {
	const email = `rls-${label}-${crypto.randomUUID()}@billbuddy.test`;
	const created = await admin.auth.admin.createUser({ email, email_confirm: true });
	if (created.error) throw created.error;
	userIds.push(created.data.user.id);

	const link = await admin.auth.admin.generateLink({ type: 'magiclink', email });
	if (link.error) throw link.error;

	const client = createClient(url, publishable, noSession);
	const verified = await client.auth.verifyOtp({
		type: 'email',
		token_hash: link.data.properties.hashed_token
	});
	if (verified.error) throw verified.error;
	return client;
}

let alice: SupabaseClient;
let bob: SupabaseClient;
let aliceId: string;
let aliceStoreId: string;
let aliceReceiptId: string;

beforeAll(async () => {
	alice = await signedInUser('alice');
	bob = await signedInUser('bob');
	aliceId = userIds[0];

	const store = await alice.from('stores').insert({ name: 'Fiesta' }).select().single();
	if (store.error) throw store.error;
	aliceStoreId = store.data.id;

	const receipt = await alice
		.from('receipts')
		.insert({ store_id: aliceStoreId, total_cents: 1299 })
		.select()
		.single();
	if (receipt.error) throw receipt.error;
	aliceReceiptId = receipt.data.id;
});

afterAll(async () => {
	for (const id of userIds) await admin.auth.admin.deleteUser(id);
});

async function aliceReceiptAsAdmin() {
	const { data, error } = await admin.from('receipts').select().eq('id', aliceReceiptId).single();
	if (error) throw error;
	return data;
}

describe('row level security on receipts and stores', () => {
	it('lets the owner read their receipt', async () => {
		const { data, error } = await alice.from('receipts').select().eq('id', aliceReceiptId);
		expect(error).toBeNull();
		expect(data).toHaveLength(1);
	});

	it("hides another user's receipts and stores", async () => {
		const receipts = await bob.from('receipts').select();
		const stores = await bob.from('stores').select();
		expect(receipts.data).toEqual([]);
		expect(stores.data).toEqual([]);
	});

	it("blocks editing another user's receipt", async () => {
		await bob.from('receipts').update({ total_cents: 1 }).eq('id', aliceReceiptId);
		expect((await aliceReceiptAsAdmin()).total_cents).toBe(1299);
	});

	it("blocks deleting another user's receipt", async () => {
		await bob.from('receipts').delete().eq('id', aliceReceiptId);
		expect((await aliceReceiptAsAdmin()).id).toBe(aliceReceiptId);
	});

	it('blocks inserting a receipt as someone else', async () => {
		const { error } = await bob.from('receipts').insert({ user_id: aliceId, total_cents: 5 });
		expect(error?.code).toBe('42501');
	});

	it("blocks attaching a receipt to another user's store", async () => {
		const { error } = await bob.from('receipts').insert({ store_id: aliceStoreId, total_cents: 5 });
		expect(error?.code).toBe('23503');
	});

	it('blocks moving your receipt onto another user', async () => {
		const own = await bob.from('receipts').insert({ total_cents: 7 }).select().single();
		expect(own.error).toBeNull();
		const { error } = await bob.from('receipts').update({ user_id: aliceId }).eq('id', own.data!.id);
		expect(error?.code).toBe('42501');
	});

	it('gives signed-out visitors nothing', async () => {
		const anon = createClient(url, publishable, noSession);
		const receipts = await anon.from('receipts').select();
		const stores = await anon.from('stores').select();
		expect(receipts.error?.code).toBe('42501');
		expect(stores.error?.code).toBe('42501');
	});
});
