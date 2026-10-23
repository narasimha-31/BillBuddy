import { error } from '@sveltejs/kit';
import { tileAllowed } from '../../../../../../map-tiles';
import type { RequestHandler } from './$types';

// OpenStreetMap's map pictures, fetched by our server so the shopper's browser never talks to OSM.
// Each tile is cached for a week at the edge, as OSM's tile policy asks of anyone showing its tiles.
const WEEK = 7 * 24 * 60 * 60;

export const GET: RequestHandler = async ({ params, fetch }) => {
	const [z, x, y] = [params.z, params.x, params.y].map(Number);
	if (!tileAllowed(z, x, y)) error(404, 'Not found');

	const tile = await fetch(`https://tile.openstreetmap.org/${z}/${x}/${y}.png`, {
		headers: { 'user-agent': 'Billie/1.0 (+https://billi3.vercel.app)', referer: 'https://billi3.vercel.app/' },
		signal: AbortSignal.timeout(8000)
	});
	if (!tile.ok) error(502, 'Map tile unavailable');
	return new Response(await tile.arrayBuffer(), {
		headers: {
			'content-type': 'image/png',
			'cache-control': `public, max-age=${WEEK}, s-maxage=${WEEK}, stale-while-revalidate=${WEEK}`
		}
	});
};
