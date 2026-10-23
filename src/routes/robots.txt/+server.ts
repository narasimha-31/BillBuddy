import type { RequestHandler } from './$types';

// signed-in pages send strangers back to the landing page, so only the public ones are listed
export const GET: RequestHandler = ({ url }) =>
	new Response(`User-agent: *\nAllow: /\nDisallow: /phone/\n\nSitemap: ${url.origin}/sitemap.xml\n`, { headers: { 'content-type': 'text/plain' } });
