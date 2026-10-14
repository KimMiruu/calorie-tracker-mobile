import foodsData from "@/assets/food.json";

/* ================= TYPES ================= */

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

interface RawFood {
  name: string;
  kalori: number; 
  protein: number;
  carbs: number;
  fat: number;
  category: string;
  recipe?: {
    ingredients: string[];
    steps: string[];
  };
}

export interface FoodCandidate {
  name: string;
  kalori: number;
  protein: number;
  carbs: number;
  fat: number;
  meal: MealType;
  recipe?: RawFood["recipe"];
}

/* ================= NORMALIZER ================= */

function normalizeMeal(category: string): MealType | null {
  const c = category?.toLowerCase() ?? "";
  if (c.includes("breakfast") || c.includes("sarapan")) return "breakfast";
  if (c.includes("lunch") || c.includes("siang")) return "lunch";
  if (c.includes("dinner") || c.includes("malam")) return "dinner";
  if (c.includes("snack") || c.includes("cemilan")) return "snack";
  return null;
}

/* ================= UTILS ================= */

// shuffle supaya menu ganti-ganti
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ================= SMART RULE ================= */

// mode berdasar sisa kalori
type Mode = "SNACK_ONLY" | "LIGHT" | "NORMAL" | "FULL";

function resolveMode(remaining: number): Mode {
  if (remaining <= 200) return "SNACK_ONLY";
  if (remaining <= 400) return "LIGHT";
  if (remaining <= 900) return "NORMAL";
  return "FULL";
}

// meal mana yang boleh muncul
function allowedMeals(mode: Mode): MealType[] {
  switch (mode) {
    case "SNACK_ONLY":
      return ["snack"];
    case "LIGHT":
      return ["snack", "dinner", "lunch"];
    case "NORMAL":
    case "FULL":
    default:
      return ["breakfast", "lunch", "dinner", "snack"];
  }
}

// max item per meal (DINAMIS)
function maxItemForMeal(meal: MealType, mode: Mode): number {
  if (mode === "SNACK_ONLY") return meal === "snack" ? 1 : 0;
  if (mode === "LIGHT") return meal === "snack" ? 2 : 1;
  if (mode === "NORMAL") return meal === "snack" ? 2 : 2;
  return meal === "lunch" ? 3 : 2;
}

/* ================= ENGINE ================= */

export function generateRecommendation(
  remainingKalori: number,
  consumedPerMeal: Record<MealType, number>,
  totalBurned: number = 0
) {
  const byMeal: Record<MealType, FoodCandidate[]> = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  };

  if (remainingKalori <= 0) {
    return {
      byMeal,
      meta: { remainingAfter: remainingKalori, coverage: 0 },
    };
  }

  /* ===== LOAD & GROUP ===== */
  const grouped: Record<MealType, FoodCandidate[]> = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  };

  for (const f of foodsData as RawFood[]) {
    const meal = normalizeMeal(f.category);
    if (!meal) continue;

    grouped[meal].push({
      name: f.name,
       kalori: Number(f.kalori), 
      protein: Number(f.protein),
      carbs: Number(f.carbs),
      fat: Number(f.fat),
      meal,
      recipe: f.recipe,
    });
  }

  // randomize tiap meal
  (Object.keys(grouped) as MealType[]).forEach((m) => {
    grouped[m] = shuffle(grouped[m]);
  });

  const mode = resolveMode(remainingKalori);
  const mealsAllowed = allowedMeals(mode);

  let remaining = remainingKalori;
  const used = new Set<string>();

  /* =====================================================
     PASS 1 — WAJIB 1 ITEM PER MEAL (FAIRNESS)
     ➜ INI FIX UTAMA SARAPAN & SNACK KOSONG
  ===================================================== */
  for (const meal of mealsAllowed) {
    const food = grouped[meal].find(
      (f) => f.kalori <= remaining && !used.has(f.name)
    );

    if (!food) continue;

    byMeal[meal].push(food);
    used.add(food.name);
    remaining -= food.kalori;
  }

  /* =====================================================
     PASS 2 — SMART FILL (PRECISION)
  ===================================================== */
  const pool = shuffle(
    mealsAllowed.flatMap((m) => grouped[m])
  );

  for (const food of pool) {
    if (remaining < 60) break;
    if (used.has(food.name)) continue;
    if (food.kalori > remaining) continue;

    const limit = maxItemForMeal(food.meal, mode);
    if (byMeal[food.meal].length >= limit) continue;

    byMeal[food.meal].push(food);
    used.add(food.name);
    remaining -= food.kalori;
  }

  const usedKalori = remainingKalori - remaining;

  return {
    byMeal,
    meta: {
      mode,
      remainingAfter: remaining,
      coverage:
        remainingKalori > 0
          ? Math.round((usedKalori / remainingKalori) * 100)
          : 0,
    },
  };
}
