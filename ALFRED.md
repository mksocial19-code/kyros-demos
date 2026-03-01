# ALFRED.md — Shared Context for Alfred (Mike's Bot)

_Written by Big Mike. Read this before every task on this repo._
_Last updated: 2026-03-01_

---

## What This Repo Is

Kyros Co demo sites. We build custom preview websites for small business prospects, 
send them the link, they pay $5k to own it. The demo IS the pitch.

**Live at:** kyrosco.com (TBD) / kyrosdirect.com (main site)
**Demo pattern:** `<slug>.kyrosdirect.com` (e.g. `ic-refrigeration.kyrosdirect.com`)

---

## The Mission

Build a demo site so good that the business owner sees it and says "I need that."

That means:
- **Real content only.** Scraped from their actual site.
- **Real phone, real address, real services, real reviews.**
- **No placeholders.** Not a single "Lorem ipsum" or "Your tagline here."
- **No fake testimonials.** Only use reviews that exist on their Google/Yelp page.
- **No generic trust bars.** "Licensed & Insured" only if they actually say so.

Generic demos fail. The pitch dies the second they see content that isn't theirs.

---

## Tech Stack (live and working)

- **Cloudflare Worker:** `kyros-demos-worker` on mmilano Cloudflare account
- **R2 Bucket:** `kyros-demos`
- **Deploy command:** `node scripts/deploy-demo.js <slug>`
  - Uploads HTML to R2
  - Creates DNS CNAME automatically
  - Registers Worker route automatically
  - Posts to #reports Discord channel
- **API Token:** has R2 Edit + Workers Edit + DNS Edit (fully automated)
- **Account ID:** `4b16628f7816c9e5d01dc9a4392078b5` (mmilano)
- **Zone ID:** `3940487d2cb59af147b79d715d0cd67d`

---

## Demo Build Process (mandatory — no shortcuts)

Every demo goes through 3 passes before deploy:

**Pass 1 — Accuracy**
- Every phone number, address, service, stat, year, review = verified real
- No placeholder text anywhere
- Business name spelled correctly

**Pass 2 — Copy**
- Every sentence earns its place
- Headline = their actual value prop, not generic
- No filler sections

**Pass 3 — Design**
- Nav works on mobile
- Stats bar has real numbers
- Color scheme matches their brand (or close to it)

---

## Demos Built So Far

| Slug | Business | Status | URL |
|---|---|---|---|
| ic-refrigeration | IC Refrigeration | Live ✅ | ic-refrigeration.kyrosdirect.com |
| nw-passage | NW Passage | Live ✅ | nw-passage.kyrosdirect.com |

---

## Division of Labor

| Task | Who |
|---|---|
| Site generation (scrape → build → review) | Big Mike + Codex |
| Deploy pipeline + infra | Big Mike (Node.js) |
| R2/Worker architecture review | Alfred |
| Lead research + scoring | Big Mike |
| Cold email copy | Both (Big Mike drafts, Alfred reviews) |
| Website strategy/concepts | Both |

---

## How We Communicate

This file. Big Mike writes updates here, Alfred reads before tasks. Alfred writes 
questions/suggestions in the `## Alfred Notes` section below. Mike mediates.

---

## Pricing

- Base site: $5,000
- Chatbot add-on: $2,500
- Local SEO add-on: $2,500
- No recurring. No maintenance plans. One-time, clean close.

---

## What We Don't Do

- No recurring revenue / maintenance upsells
- No fake social proof
- No generic templates sent as "custom" work
- No work on company laptops or Rejigg WiFi
- No Rejigg HubSpot data — leads from Apollo.io only

---

## Alfred Notes

_(Alfred: write questions, suggestions, and status updates here)_

