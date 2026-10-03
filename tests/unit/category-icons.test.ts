import { describe, expect, it } from "vitest";
import { CATEGORIES } from "@/lib/config/categories";
import { allCategoriesHaveIcons, categoryIcon } from "@/lib/category-icons";

describe("categoryIcon", () => {
  it("resolves an icon for every configured category id", () => {
    expect(allCategoriesHaveIcons()).toBe(true);
    for (const category of CATEGORIES) {
      expect(categoryIcon(category.id), category.id).toBeDefined();
    }
  });

  it("returns undefined for unknown and omitted ids (pinned section)", () => {
    expect(categoryIcon("nonexistent")).toBeUndefined();
    expect(categoryIcon(undefined)).toBeUndefined();
  });
});
