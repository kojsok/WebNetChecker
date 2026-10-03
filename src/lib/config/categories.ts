import type { Category } from "@/types/checker";

/**
 * Seed categories. Ordering here drives the ordering in the UI.
 * Extend by appending a new entry — nothing else needs to change.
 */
export const CATEGORIES = [
  { id: "custom", label: "Свои цели", icon: "Plus" },
  { id: "messengers", label: "Мессенджеры", icon: "MessageCircle" },
  { id: "dev", label: "Разработка", icon: "Code2" },
  { id: "ai", label: "ИИ-сервисы", icon: "Sparkles" },
  { id: "ai-routers", label: "ИИ-роутеры", icon: "Route" },
  { id: "ai-tools", label: "ИИ-инструменты", icon: "Wand2" },
  { id: "social", label: "Соцсети", icon: "Users" },
  { id: "streaming", label: "Стриминг", icon: "Play" },
  { id: "tools", label: "Инструменты", icon: "Wrench" },
  { id: "finance", label: "Финансы", icon: "TrendingUp" },
  { id: "basics", label: "Базовые", icon: "Globe" },
] as const satisfies readonly Category[];

export type CategoryId = (typeof CATEGORIES)[number]["id"];

const CATEGORY_BY_ID = new Map<string, Category>(CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id: string): Category | undefined {
  return CATEGORY_BY_ID.get(id);
}

export function isKnownCategory(id: string): id is CategoryId {
  return CATEGORY_BY_ID.has(id);
}