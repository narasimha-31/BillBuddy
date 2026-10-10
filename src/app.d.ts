import type { SupabaseClient, User } from '@supabase/supabase-js';

declare global {
	namespace App {
		interface Error {
			message: string;
			ref?: string;
		}
		interface Locals {
			supabase: SupabaseClient;
			getUser: () => Promise<User | null>;
		}
	}
}

export {};
