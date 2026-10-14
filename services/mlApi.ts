const BASE_URL = "http://10.0.2.2:8000";

/* ================= TYPES ================= */

export interface PredictFoodPayload {
  goal_enc: number;
  meal_enc: number;
  remaining_calories: number;
  vegetarian: number;
  high_protein: number;
  top_n?: number;
}

export interface PredictFoodResponse {
  count: number;
  recommendations: {
    food_name: string;
    score: number;
  }[];
}

/* ================= API ================= */

export async function predictFood(
  payload: PredictFoodPayload
): Promise<PredictFoodResponse> {
  const res = await fetch(`${BASE_URL}/predict`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }

  return res.json();
}
