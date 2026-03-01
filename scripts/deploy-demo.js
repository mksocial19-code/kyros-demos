#!/usr/bin/env node
/**
 * Kyros Demo Deployer — fully automated
 * Usage: node scripts/deploy-demo.js <slug>
 * Example: node scripts/deploy-demo.js ic-refrigeration
 *
 * 1. Uploads <slug>/index.html to R2
 * 2. Creates DNS CNAME: <slug>.kyrosdirect.com
 * 3. Adds Worker route
 * 4. Posts to #reports
 * Live at: https://<slug>.kyrosdirect.com
 *
 * Env: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '4b16628f7816c9e5d01dc9a4392078b5';
const ZONE_ID = '3940487d2cb59af147b79d715d0cd67d';
const BUCKET = 'kyros-demos';
const WORKER = 'kyros-demos-worker.mmilano51143.workers.dev';

const slug = process.argv[2];
if (!slug) { console.error('Usage: node deploy-demo.js <slug>'); process.exit(1); }
if (!/^[a-z0-9-]{1,60}$/.test(slug)) { console.error('Invalid slug — lowercase, numbers, hyphens only'); process.exit(1); }
if (!TOKEN) { console.error('Missing CLOUDFLARE_API_TOKEN'); process.exit(1); }

const htmlPath = path.join(__dirname, '..', slug, 'index.html');
if (!fs.existsSync(htmlPath)) { console.error(`Not found: ${htmlPath}`); process.exit(1); }

function cfRequest(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.cloudflare.com',
      path: `/client/v4${endpoint}`,
      method,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function uploadToR2(slug, html) {
  // Use wrangler (simpler than signing S3 requests)
  const tmp = `/tmp/kyros-${slug}.html`;
  fs.writeFileSync(tmp, html);
  execSync(`CLOUDFLARE_API_TOKEN=${TOKEN} CLOUDFLARE_ACCOUNT_ID=${ACCOUNT_ID} wrangler r2 object put ${BUCKET}/${slug}/index.html --file ${tmp} --content-type "text/html; charset=utf-8" --remote`, { stdio: 'pipe' });
  fs.unlinkSync(tmp);
}

async function ensureDNS(slug) {
  const hostname = `${slug}.kyrosdirect.com`;
  const existing = await cfRequest('GET', `/zones/${ZONE_ID}/dns_records?name=${hostname}`);
  if (existing.result?.length > 0) return 'exists';
  const result = await cfRequest('POST', `/zones/${ZONE_ID}/dns_records`, {
    type: 'CNAME', name: slug, content: WORKER, proxied: true, ttl: 1
  });
  return result.success ? 'created' : `failed: ${JSON.stringify(result.errors)}`;
}

async function ensureRoute(slug) {
  const pattern = `${slug}.kyrosdirect.com/*`;
  const existing = await cfRequest('GET', `/zones/${ZONE_ID}/workers/routes`);
  if (existing.result?.some(r => r.pattern === pattern)) return 'exists';
  const result = await cfRequest('POST', `/zones/${ZONE_ID}/workers/routes`, {
    pattern, script: 'kyros-demos-worker'
  });
  return result.success ? 'created' : `failed: ${JSON.stringify(result.errors)}`;
}

(async () => {
  const html = fs.readFileSync(htmlPath);
  const url = `https://${slug}.kyrosdirect.com`;

  console.log(`Deploying ${slug}...`);
  
  process.stdout.write('  Uploading to R2... ');
  await uploadToR2(slug, html);
  console.log('done');

  process.stdout.write('  DNS record... ');
  const dns = await ensureDNS(slug);
  console.log(dns);

  process.stdout.write('  Worker route... ');
  const route = await ensureRoute(slug);
  console.log(route);

  console.log(`\n✅ Live at: ${url}`);

  try {
    execSync(`node ${path.join(__dirname, '../../../.openclaw/workspace/lib/report.js')} "✅ Demo deployed: **${slug}** → ${url}"`, { stdio: 'pipe' });
  } catch(e) { /* non-fatal */ }
})().catch(e => { console.error(e.message); process.exit(1); });
