import { MealType } from "./recommendationEngine";

export type RecommendationPolicy =
  | "LIGHT"
  | "BALANCED"
  | "HIGH_PROTEIN"
  | "MAIN_MEAL";

interface PolicyInput {
  remainingKalori: number;
  totalBurned: number;
  consumedPerMeal: Record<MealType, number>;
}

export function resolveRecommendationPolicy(
  input: PolicyInput
): RecommendationPolicy {
  const { remainingKalori, totalBurned, consumedPerMeal } = input;

  if (remainingKalori <= 300) {
    return "LIGHT";
  }

  if (totalBurned >= 400) {
    return "HIGH_PROTEIN";
  }

  if (consumedPerMeal.lunch === 0 || consumedPerMeal.dinner === 0) {
    return "MAIN_MEAL";
  }

  return "BALANCED";
}
