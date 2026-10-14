import { FoodCandidate } from "./recommendationEngine";

export function knapsack(
  foods: FoodCandidate[],
  maxKalori: number
): FoodCandidate[] {
  const result: FoodCandidate[] = [];
  let total = 0;

  for (const food of [...foods].sort((a, b) => a.kalori - b.kalori)) {
    if (total + food.kalori <= maxKalori) {
      result.push(food);
      total += food.kalori;
    }
  }

  return result;
}
