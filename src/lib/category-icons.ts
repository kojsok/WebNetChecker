import {
  CodeXml,
  Globe,
  MessageCircle,
  Play,
  Plus,
  Route,
  Sparkles,
  TrendingUp,
  Users,
  WandSparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { CATEGORIES } from "@/lib/config/categories";

/**
 * Category id -> Lucide icon, mirroring the `icon` names in CATEGORIES config.
 * "Code2"/"Wand2" config names map to their lucide 1.x canonical names.
 */
export const CATEGORY_ICONS: Readonly<Record<string, LucideIcon>> = {
  custom: Plus,
  messengers: MessageCircle,
  dev: CodeXml,
  ai: Sparkles,
  "ai-routers": Route,
  "ai-tools": WandSparkles,
  social: Users,
  streaming: Play,
  tools: Wrench,
  finance: TrendingUp,
  basics: Globe,
};

/** Icon for a category id, or undefined when unknown (e.g. pinned section). */
export function categoryIcon(categoryId: string | undefined): LucideIcon | undefined {
  return categoryId ? CATEGORY_ICONS[categoryId] : undefined;
}

/** Every configured category has an icon; guards against config drift. */
export function allCategoriesHaveIcons(): boolean {
  return CATEGORIES.every((category) => categoryIcon(category.id) !== undefined);
}
