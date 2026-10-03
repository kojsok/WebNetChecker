import type { Target } from "@/types/checker";

interface SeedService {
  name: string;
  url: string;
}

interface SeedCategory {
  id: string;
  services: readonly SeedService[];
}

/**
 * Seed catalogue ported from the original bash script and extended with
 * popular AI routers, AI platforms, and AI/agent tooling.
 *
 * To add a service: append `{ name, url }` to the relevant category.
 * To add a category: add it to `categories.ts` and append a block here.
 */
export const SEED_CATALOG: readonly SeedCategory[] = [
  {
    id: "messengers",
    services: [
      { name: "Telegram API", url: "https://api.telegram.org" },
      { name: "Telegram Links", url: "https://t.me" },
      { name: "WhatsApp", url: "https://web.whatsapp.com" },
      { name: "Discord", url: "https://discord.com" },
      { name: "Slack", url: "https://slack.com" },
    ],
  },
  {
    id: "dev",
    services: [
      { name: "Docker Hub", url: "https://registry-1.docker.io" },
      { name: "GitHub", url: "https://github.com" },
      { name: "GitLab", url: "https://gitlab.com" },
      { name: "NPM", url: "https://npmjs.com" },
      { name: "Stack Overflow", url: "https://stackoverflow.com" },
      { name: "Vercel", url: "https://vercel.com" },
      { name: "Cloudflare", url: "https://cloudflare.com" },
    ],
  },
  {
    id: "ai",
    services: [
      { name: "ChatGPT", url: "https://chatgpt.com" },
      { name: "Claude", url: "https://claude.ai" },
      { name: "Gemini", url: "https://gemini.google.com" },
      { name: "Hugging Face", url: "https://huggingface.co" },
      { name: "Perplexity", url: "https://perplexity.ai" },
      { name: "Mistral", url: "https://mistral.ai" },
      { name: "Cohere", url: "https://cohere.com" },
      { name: "Stability AI", url: "https://stability.ai" },
      { name: "Midjourney", url: "https://midjourney.com" },
      { name: "Poe", url: "https://poe.com" },
      { name: "Character.AI", url: "https://character.ai" },
      { name: "Suno", url: "https://suno.com" },
      { name: "Runway", url: "https://runwayml.com" },
      { name: "ElevenLabs", url: "https://elevenlabs.io" },
      { name: "Grok / xAI", url: "https://x.ai" },
      { name: "DeepSeek", url: "https://deepseek.com" },
      { name: "Qwen", url: "https://qwen.ai" },
    ],
  },
  {
    id: "ai-routers",
    services: [
      { name: "OpenRouter", url: "https://openrouter.ai" },
      { name: "OrcaRouter", url: "https://orcarouter.com" },
      { name: "Requesty", url: "https://requesty.ai" },
      { name: "Together AI", url: "https://together.ai" },
      { name: "Groq", url: "https://groq.com" },
      { name: "Fireworks AI", url: "https://fireworks.ai" },
      { name: "Replicate", url: "https://replicate.com" },
      { name: "Portkey", url: "https://portkey.ai" },
      { name: "LiteLLM", url: "https://litellm.ai" },
      { name: "Anyscale", url: "https://anyscale.com" },
      { name: "DeepInfra", url: "https://deepinfra.com" },
    ],
  },
  {
    id: "ai-tools",
    services: [
      { name: "Cursor", url: "https://cursor.com" },
      { name: "v0", url: "https://v0.dev" },
      { name: "Replit", url: "https://replit.com" },
      { name: "Lovable", url: "https://lovable.dev" },
      { name: "Bolt", url: "https://bolt.new" },
      { name: "LangChain", url: "https://langchain.com" },
      { name: "n8n", url: "https://n8n.io" },
      { name: "Make", url: "https://make.com" },
      { name: "Zapier", url: "https://zapier.com" },
      { name: "Pinecone", url: "https://pinecone.io" },
      { name: "Weaviate", url: "https://weaviate.io" },
      { name: "AutoGPT", url: "https://autogpt.net" },
      { name: "BabyAGI", url: "https://babyagi.com" },
    ],
  },
  {
    id: "social",
    services: [
      { name: "YouTube", url: "https://youtube.com" },
      { name: "Instagram", url: "https://instagram.com" },
      { name: "Facebook", url: "https://facebook.com" },
      { name: "X (Twitter)", url: "https://twitter.com" },
      { name: "TikTok", url: "https://tiktok.com" },
      { name: "LinkedIn", url: "https://linkedin.com" },
      { name: "Medium", url: "https://medium.com" },
      { name: "Reddit", url: "https://reddit.com" },
    ],
  },
  {
    id: "streaming",
    services: [
      { name: "Netflix", url: "https://netflix.com" },
      { name: "Spotify", url: "https://spotify.com" },
      { name: "Twitch", url: "https://twitch.tv" },
      { name: "SoundCloud", url: "https://soundcloud.com" },
    ],
  },
  {
    id: "tools",
    services: [
      { name: "Notion", url: "https://notion.so" },
      { name: "Canva", url: "https://canva.com" },
      { name: "Pinterest", url: "https://pinterest.com" },
      { name: "Shutterstock", url: "https://shutterstock.com" },
      { name: "Figma", url: "https://figma.com" },
      { name: "Dropbox", url: "https://dropbox.com" },
    ],
  },
  {
    id: "finance",
    services: [
      { name: "Binance", url: "https://binance.com" },
      { name: "Coinbase", url: "https://coinbase.com" },
      { name: "Kraken", url: "https://kraken.com" },
    ],
  },
  {
    id: "basics",
    services: [
      { name: "Google", url: "https://google.com" },
      { name: "Wikipedia", url: "https://wikipedia.org" },
      { name: "Microsoft", url: "https://microsoft.com" },
      { name: "Apple", url: "https://apple.com" },
      { name: "Amazon", url: "https://amazon.com" },
    ],
  },
];

/** Flattened, ready-to-check seed targets. */
export const SEED_TARGETS: readonly Target[] = SEED_CATALOG.flatMap((category) =>
  category.services.map((service) => ({
    id: `${category.id}:${service.name}`,
    name: service.name,
    url: service.url,
    category: category.id,
    tags: [],
    pinned: false,
  })),
);
