import type { RequestHandler } from './$types';

const PUBLIC_PAGES = ['/', '/demo', '/privacy'];

export const GET: RequestHandler = ({ url }) =>
	new Response(
		`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${PUBLIC_PAGES.map((path) => `\t<url><loc>${url.origin}${path}</loc></url>`).join('\n')}\n</urlset>\n`,
		{ headers: { 'content-type': 'application/xml' } }
	);
