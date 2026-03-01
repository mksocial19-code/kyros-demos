/**
 * Kyros Demos — Cloudflare Worker
 * Routes demo-*.kyrosdirect.com → serves HTML from R2 bucket
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const host = url.hostname;

    if (host === 'kyrosdirect.com' || host === 'www.kyrosdirect.com') {
      return Response.redirect('https://kyrosdirect.com', 301);
    }

    const subdomain = host.split('.')[0];
    if (!subdomain.startsWith('demo-')) return notFound();

    const slug = subdomain.slice(5);
    if (!/^[a-z0-9-]{1,60}$/.test(slug)) return notFound();

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    const key = `${slug}/index.html`;
    let object;
    try { object = await env.DEMOS_BUCKET.get(key); }
    catch (e) { return new Response('Storage error', { status: 502 }); }

    if (!object) return notFound(slug);

    const etag = object.etag ? `"${object.etag}"` : null;
    if (etag && request.headers.get('If-None-Match') === etag) {
      return new Response(null, { status: 304 });
    }

    const headers = {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Frame-Options': 'SAMEORIGIN',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      ...corsHeaders(),
    };
    if (etag) headers['ETag'] = etag;
    if (request.method === 'HEAD') return new Response(null, { headers });

    return new Response(object.body, { headers });
  }
};

function corsHeaders() {
  return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS' };
}

function notFound() {
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Demo Not Found — Kyros Co</title><style>body{font-family:-apple-system,sans-serif;background:#f4f6f9;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}.box{text-align:center;padding:3rem 2rem}h1{font-size:1.5rem;font-weight:800;color:#0f1117;margin-bottom:.5rem}p{color:#6b7280;margin-bottom:1.5rem}a{background:#0f1117;color:#fff;padding:.6rem 1.2rem;border-radius:7px;text-decoration:none;font-weight:600;font-size:.9rem}</style></head><body><div class="box"><h1>Demo not found.</h1><p>This preview has expired or doesn't exist.</p><a href="https://kyrosdirect.com">Visit Kyros Co</a></div></body></html>`;
  return new Response(html, { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
