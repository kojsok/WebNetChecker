#!/usr/bin/env node
/**
 * Generate brand logo data for the seed catalog from the installed
 * simple-icons package (offline ground truth — no network, no CDN).
 *
 * Usage: node scripts/generate-brand-logos.mjs
 *
 * Outputs (verified afterwards via the trusted Read channel):
 *   - src/lib/config/brand-logos.generated.ts  (host -> { title, hex, path })
 *   - .scratch/brand-logos-report.md           (covered / missing report)
 *
 * Idempotent. Re-run after changing src/lib/config/services.ts.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, "..");
const pkgRoot = resolve(root, "node_modules/simple-icons");

/**
 * Seed host -> candidate simple-icons slugs (first existing wins).
 * Candidates cover renames across package versions (claude/anthropic, x/twitter).
 */
const HOST_SLUGS = {
  // messengers
  "api.telegram.org": ["telegram"],
  "t.me": ["telegram"],
  "web.whatsapp.com": ["whatsapp"],
  "discord.com": ["discord"],
  "slack.com": ["slack"],
  // dev
  "registry-1.docker.io": ["docker"],
  "github.com": ["github"],
  "gitlab.com": ["gitlab"],
  "npmjs.com": ["npm"],
  "stackoverflow.com": ["stackoverflow"],
  "vercel.com": ["vercel"],
  "cloudflare.com": ["cloudflare"],
  // ai
  "chatgpt.com": ["openai", "chatgpt"],
  "claude.ai": ["claude", "anthropic", "claudeai"],
  "gemini.google.com": ["googlegemini"],
  "huggingface.co": ["huggingface"],
  "perplexity.ai": ["perplexity"],
  "mistral.ai": ["mistralai", "mistral"],
  "cohere.com": ["cohere"],
  "stability.ai": ["stabilityai"],
  "midjourney.com": ["midjourney"],
  "poe.com": ["poe"],
  "character.ai": ["characterai"],
  "suno.com": ["suno"],
  "runwayml.com": ["runwayml", "runway"],
  "elevenlabs.io": ["elevenlabs"],
  "x.ai": ["xai", "grok"],
  "deepseek.com": ["deepseek"],
  "qwen.ai": ["qwen"],
  // ai-routers
  "openrouter.ai": ["openrouter"],
  "orcarouter.com": ["orcarouter"],
  "requesty.ai": ["requesty"],
  "together.ai": ["togetherai"],
  "groq.com": ["groq"],
  "fireworks.ai": ["fireworksai"],
  "replicate.com": ["replicate"],
  "portkey.ai": ["portkey"],
  "litellm.ai": ["litellm"],
  "anyscale.com": ["anyscale"],
  "deepinfra.com": ["deepinfra"],
  // ai-tools
  "cursor.com": ["cursor"],
  "v0.dev": ["v0", "vercel"],
  "replit.com": ["replit"],
  "lovable.dev": ["lovable"],
  "bolt.new": ["bolt", "stackblitz"],
  "langchain.com": ["langchain"],
  "n8n.io": ["n8n"],
  "make.com": ["make"],
  "zapier.com": ["zapier"],
  "pinecone.io": ["pinecone"],
  "weaviate.io": ["weaviate"],
  "autogpt.net": ["autogpt", "autogptnet"],
  "babyagi.com": ["babyagi"],
  // social
  "youtube.com": ["youtube"],
  "instagram.com": ["instagram"],
  "facebook.com": ["facebook"],
  "twitter.com": ["x", "twitter"],
  "tiktok.com": ["tiktok"],
  "linkedin.com": ["linkedin"],
  "medium.com": ["medium"],
  "reddit.com": ["reddit"],
  // streaming
  "netflix.com": ["netflix"],
  "spotify.com": ["spotify"],
  "twitch.tv": ["twitch"],
  "soundcloud.com": ["soundcloud"],
  // tools
  "notion.so": ["notion"],
  "canva.com": ["canva"],
  "pinterest.com": ["pinterest"],
  "shutterstock.com": ["shutterstock"],
  "figma.com": ["figma"],
  "dropbox.com": ["dropbox"],
  // finance
  "binance.com": ["binance"],
  "coinbase.com": ["coinbase"],
  "kraken.com": ["kraken"],
  // basics
  "google.com": ["google"],
  "wikipedia.org": ["wikipedia"],
  "microsoft.com": ["microsoft"],
  "apple.com": ["apple"],
  "amazon.com": ["amazon"],
};

/** Load the master data JSON defensively (array or object shapes). */
function loadIconIndex() {
  const dataPath = join(pkgRoot, "data", "simple-icons.json");
  const raw = JSON.parse(readFileSync(dataPath, "utf8"));
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.icons)
      ? raw.icons
      : Object.values(raw);
  const bySlug = new Map();
  for (const entry of list) {
    if (entry && typeof entry.slug === "string" && typeof entry.hex === "string") {
      bySlug.set(entry.slug, {
        title: String(entry.title ?? entry.slug),
        hex: entry.hex.replace(/^#/, "").toUpperCase(),
      });
    }
  }
  return { bySlug, count: bySlug.size };
}

/** Extract the first SVG path data from icons/{slug}.svg. */
function extractSvgPath(slug) {
  const svgPath = join(pkgRoot, "icons", `${slug}.svg`);
  if (!existsSync(svgPath)) return null;
  const svg = readFileSync(svgPath, "utf8");
  const match = svg.match(/<path[^>]*\sd="([^"]+)"/);
  return match ? match[1] : null;
}

function main() {
  const report = [];
  const pkg = JSON.parse(readFileSync(join(pkgRoot, "package.json"), "utf8"));
  report.push(`simple-icons: v${pkg.version} (installed locally, ground truth)`);
  const { bySlug, count } = loadIconIndex();
  report.push(`icons in package data: ${count}`);
  report.push(`seed hosts: ${Object.keys(HOST_SLUGS).length}`);

  const covered = [];
  const missing = [];
  for (const [host, candidates] of Object.entries(HOST_SLUGS)) {
    let resolved = null;
    for (const slug of candidates) {
      const meta = bySlug.get(slug);
      if (!meta) continue;
      const path = extractSvgPath(slug);
      if (!path) continue;
      resolved = { host, slug, title: meta.title, hex: meta.hex, path };
      break;
    }
    if (resolved) covered.push(resolved);
    else missing.push({ host, tried: candidates });
  }

  const generated = [
    "// AUTO-GENERATED by scripts/generate-brand-logos.mjs — do not edit by hand.",
    `// Source: simple-icons@${pkg.version} (https://simpleicons.org), license CC0-1.0.`,
    "// Brand logos are trademarks of their respective owners; rendered here for",
    "// identification in an availability dashboard.",
    "",
    "export interface BrandLogoData {",
    "  /** Simple Icons title of the brand. */",
    "  title: string;",
    "  /** Official brand hex (without #). */",
    "  hex: string;",
    "  /** Single-path 24x24 SVG path data. */",
    "  path: string;",
    "}",
    "",
    "/** Host -> brand logo data. Hosts missing here fall back to a letter avatar. */",
    "export const BRAND_LOGOS: Readonly<Record<string, BrandLogoData>> = {",
    ...covered.map(
      (c) =>
        `  ${JSON.stringify(c.host)}: { title: ${JSON.stringify(c.title)}, hex: ${JSON.stringify(c.hex)}, path: ${JSON.stringify(c.path)} },`,
    ),
    "} as const;",
    "",
  ];
  mkdirSync(join(root, "src", "lib", "config"), { recursive: true });
  writeFileSync(join(root, "src", "lib", "config", "brand-logos.generated.ts"), generated.join("\n"));

  const reportLines = [
    "# Brand logos report",
    "",
    ...report,
    `covered: ${covered.length}`,
    `missing: ${missing.length}`,
    "",
    "## Covered",
    "",
    "| Host | Slug | Title | Hex |",
    "| --- | --- | --- | --- |",
    ...covered.map((c) => `| ${c.host} | ${c.slug} | ${c.title} | #${c.hex} |`),
    "",
    "## Missing (letter avatar fallback)",
    "",
    ...(missing.length > 0 ? missing.map((m) => `- ${m.host} (tried: ${m.tried.join(", ")})`) : ["—"]),
    "",
  ];
  mkdirSync(join(root, ".scratch"), { recursive: true });
  writeFileSync(join(root, ".scratch", "brand-logos-report.md"), reportLines.join("\n"));

  console.log(`covered=${covered.length} missing=${missing.length}`);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
  try {
    mkdirSync(join(root, ".scratch"), { recursive: true });
    writeFileSync(
      join(root, ".scratch", "brand-logos-report.md"),
      `# Brand logos report\n\nERROR:\n\n${message}\n`,
    );
  } catch {
    // Report channel unavailable — fall through to exit code.
  }
  console.error(message);
  process.exitCode = 1;
}
