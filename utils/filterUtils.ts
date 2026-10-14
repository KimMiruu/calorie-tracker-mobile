// utils/filterUtils.ts

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

/**
 * Filter makanan berdasarkan meal
 * - all  → gabung semua meal
 * - meal → hanya meal tertentu
 */
export function filterByMeal<T extends object>(
  byMeal: Record<MealType, T[]>,
  filter: "all" | MealType
): (T & { _meal: MealType })[] {
  if (filter === "all") {
    return (Object.keys(byMeal) as MealType[]).flatMap((meal) =>
      (byMeal[meal] ?? []).map((item) => ({
        ...item,
        _meal: meal,
      }))
    );
  }

  return (byMeal[filter] ?? []).map((item) => ({
    ...item,
    _meal: filter,
  }));
}
