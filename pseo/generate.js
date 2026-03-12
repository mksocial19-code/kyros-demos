#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const Anthropic = require("@anthropic-ai/sdk");

const configPath = process.argv[2];
if (!configPath) {
  console.error("Usage: node generate.js <config.json> [--dry-run]");
  process.exit(1);
}

const dryRun = process.argv.includes("--dry-run");
const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
const template = fs.readFileSync(path.join(__dirname, "template.html"), "utf-8");
const outputDir = path.join(__dirname, "output");

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateIntro(client, service, city, company, about) {
  const response = await client.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: `Write a 150-word unique introduction for a page targeting ${service} in ${city} for ${company}. Mention the city naturally 2-3 times. Include one specific local detail. Tone: professional contractor. No fluff. Company background: ${about}`,
      },
    ],
  });
  return response.content[0].text;
}

async function main() {
  const client = dryRun ? null : new Anthropic();
  const pages = [];

  for (const service of config.services) {
    for (const city of config.cities) {
      const slug = slugify(`${service} ${city}`);
      const serviceSlug = slugify(service);

      if (config.existing_pages && config.existing_pages.includes(serviceSlug)) {
        continue;
      }

      pages.push({ service, city, slug });
    }
  }

  if (dryRun) {
    console.log(`Dry run: ${pages.length} pages would be generated\n`);
    for (const p of pages) {
      console.log(`  ${p.slug}.html  —  ${p.service} in ${p.city}`);
    }
    return;
  }

  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`Generating ${pages.length} pages...\n`);

  for (let i = 0; i < pages.length; i++) {
    const { service, city, slug } = pages[i];
    process.stdout.write(`[${i + 1}/${pages.length}] ${slug} ... `);

    const intro = await generateIntro(client, service, city, config.company, config.about);

    const html = template
      .replace(/\{\{COMPANY\}\}/g, config.company)
      .replace(/\{\{SERVICE\}\}/g, service)
      .replace(/\{\{CITY\}\}/g, city)
      .replace(/\{\{PHONE\}\}/g, config.phone)
      .replace(/\{\{SLUG\}\}/g, slug)
      .replace(/\{\{DOMAIN\}\}/g, config.domain)
      .replace(/\{\{GENERATED_INTRO\}\}/g, intro);

    fs.writeFileSync(path.join(outputDir, `${slug}.html`), html);
    console.log("done");

    if (i < pages.length - 1) {
      await sleep(500);
    }
  }

  // Generate sitemap
  const urls = pages
    .map(
      (p) =>
        `  <url>\n    <loc>https://${config.domain}/${p.slug}</loc>\n    <changefreq>monthly</changefreq>\n  </url>`
    )
    .join("\n");

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  fs.writeFileSync(path.join(outputDir, "sitemap-pseo.xml"), sitemap);
  console.log(`\nSitemap written to output/sitemap-pseo.xml`);
  console.log(`Done — ${pages.length} pages generated.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
