# Kyros Demos — Sunday Setup Guide

## What this is
Cloudflare Worker + R2 bucket that serves custom demo sites at demo-*.kyrosdirect.com

## You need (from Mmilano51143@gmail.com Cloudflare account)

### 1. Main API Token
Cloudflare dashboard → My Profile → API Tokens → Create Token
- Use "Edit Cloudflare Workers" template
- Add permission: Zone DNS Edit for kyrosdirect.com
- Copy the token → `CF_API_TOKEN`

### 2. R2 API Keys
Cloudflare dashboard → R2 → Manage R2 API Tokens → Create API Token
- Permissions: Object Read & Write
- Apply to specific bucket: kyros-demos (create the bucket first)
- Copy Access Key ID → `R2_ACCESS_KEY_ID`
- Copy Secret Access Key → `R2_SECRET_ACCESS_KEY`

### 3. Account ID
Cloudflare dashboard → right sidebar → Account ID
→ `CF_ACCOUNT_ID`

---

## Setup steps (in order)

```bash
# 1. Install wrangler if needed
npm install -g wrangler

# 2. Login to Cloudflare
wrangler login

# 3. Create R2 bucket
wrangler r2 bucket create kyros-demos

# 4. Deploy the Worker
cd /Users/home/projects/kyros-demos/worker
wrangler deploy

# 5. Add DNS wildcard in Cloudflare dashboard
# Type: CNAME | Name: demo-* | Target: kyros-demos-worker.mmilano51143.workers.dev
# (Cloudflare will tell you the exact worker URL after step 4)

# 6. Set env vars (add to ~/.zshrc or run before deploying)
export CF_ACCOUNT_ID=xxx
export R2_ACCESS_KEY_ID=xxx
export R2_SECRET_ACCESS_KEY=xxx

# 7. Deploy your first demo
node /Users/home/projects/kyros-demos/scripts/deploy-demo.js ic-refrigeration
# → https://demo-ic-refrigeration.kyrosdirect.com

node /Users/home/projects/kyros-demos/scripts/deploy-demo.js nw-passage
# → https://demo-nw-passage.kyrosdirect.com
```

---

## Going forward
Every new demo: build HTML → put in /kyros-demos/<slug>/index.html → run deploy script → live in seconds.
