import type { Category, Target } from "./checker";

export interface SeedResponse {
  categories: readonly Category[];
  targets: readonly Target[];
}