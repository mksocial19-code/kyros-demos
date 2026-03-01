#!/usr/bin/env node
/**
 * Kyros Demo Deployer
 * Usage: node scripts/deploy-demo.js <slug>
 * Example: node scripts/deploy-demo.js ic-refrigeration
 *
 * Reads: projects/kyros-demos/<slug>/index.html
 * Uploads to: R2 bucket kyros-demos/<slug>/index.html
 * Live at: https://demo-<slug>.kyrosdirect.com
 *
 * Env vars required:
 *   CF_ACCOUNT_ID
 *   R2_ACCESS_KEY_ID
 *   R2_SECRET_ACCESS_KEY
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET = 'kyros-demos';

const slug = process.argv[2];
if (!slug) { console.error('Usage: node deploy-demo.js <slug>'); process.exit(1); }
if (!/^[a-z0-9-]{1,60}$/.test(slug)) { console.error('Invalid slug — lowercase letters, numbers, hyphens only'); process.exit(1); }

const missing = ['CF_ACCOUNT_ID','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY'].filter(k => !process.env[k]);
if (missing.length) { console.error(`Missing env vars: ${missing.join(', ')}`); process.exit(1); }

const htmlPath = path.join(__dirname, '..', slug, 'index.html');
if (!fs.existsSync(htmlPath)) { console.error(`Not found: ${htmlPath}`); process.exit(1); }

const html = fs.readFileSync(htmlPath);
const key = `${slug}/index.html`;
const endpoint = `https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`;

// AWS Signature V4 for R2
function sign(method, key, body) {
  const now = new Date();
  const date = now.toISOString().slice(0,10).replace(/-/g,'');
  const datetime = now.toISOString().replace(/[-:]/g,'').slice(0,15) + 'Z';
  const host = `${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const region = 'auto';
  const service = 's3';

  const hash = crypto.createHash('sha256').update(body).digest('hex');
  const headers = `content-type:text/html; charset=utf-8\nhost:${host}\nx-amz-content-sha256:${hash}\nx-amz-date:${datetime}\n`;
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = [method, `/${BUCKET}/${key}`, '', headers, signedHeaders, hash].join('\n');
  const credentialScope = `${date}/${region}/${service}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${datetime}\n${credentialScope}\n${crypto.createHash('sha256').update(canonicalRequest).digest('hex')}`;

  function hmac(key, data) { return crypto.createHmac('sha256', key).update(data).digest(); }
  const signingKey = hmac(hmac(hmac(hmac('AWS4' + R2_SECRET_ACCESS_KEY, date), region), service), 'aws4_request');
  const signature = hmac(signingKey, stringToSign).toString('hex');

  return {
    Authorization: `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    'x-amz-date': datetime,
    'x-amz-content-sha256': hash,
    'Content-Type': 'text/html; charset=utf-8',
    Host: host,
  };
}

async function upload() {
  return new Promise((resolve, reject) => {
    const headers = sign('PUT', key, html);
    const req = https.request({
      hostname: `${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      path: `/${BUCKET}/${key}`,
      method: 'PUT',
      headers: { ...headers, 'Content-Length': html.length }
    }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve();
        else reject(new Error(`R2 upload failed: ${res.statusCode} ${body}`));
      });
    });
    req.on('error', reject);
    req.write(html);
    req.end();
  });
}

(async () => {
  console.log(`Deploying ${slug}...`);
  await upload();
  const url = `https://demo-${slug}.kyrosdirect.com`;
  console.log(`✅ Live at: ${url}`);

  // Post to #reports
  try {
    const { execSync } = require('child_process');
    execSync(`node ${path.join(__dirname, '../../../.openclaw/workspace/lib/report.js')} "✅ Demo deployed: **${slug}** → ${url}"`);
  } catch(e) { /* non-fatal */ }
})().catch(e => { console.error(e.message); process.exit(1); });
