import { spawnSync } from 'node:child_process';

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) throw new Error('SUPABASE_DB_URL is not set in .env');

const cli = 'node_modules/supabase/dist/supabase.js';
const { status } = spawnSync(
	process.execPath,
	[cli, 'db', 'push', '--db-url', dbUrl, ...process.argv.slice(2)],
	{ stdio: 'inherit' }
);
process.exit(status ?? 1);
