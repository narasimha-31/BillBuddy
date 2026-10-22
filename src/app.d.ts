import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Display } from './display';

declare global {
	namespace App {
		interface Error {
			message: string;
			ref?: string;
		}
		interface Locals {
			supabase: SupabaseClient;
			getUser: () => Promise<User | null>;
			// the account's saved look, when it differs from this device's cookie
			display?: Display;
		}
	}
}

export {};
