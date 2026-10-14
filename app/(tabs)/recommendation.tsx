import foodData from "../../assets/food.json";
import { predictFood } from "../../services/mlApi";
import { generateRecommendation } from "@/utils/recommendationEngine";
import { GOAL_CONFIG, GoalType } from "@/utils/goalConfig";
import { MealType } from "@/utils/filterUtils";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { executeParamQuery, FoodDatabase } from "../db";

/* ================= CONSTANT ================= */

const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

const MEAL_META: Record<MealType, { label: string; color: string }> = {
  breakfast: { label: "Breakfast", color: "#f97316" },
  lunch: { label: "Lunch", color: "#2563eb" },
  dinner: { label: "Dinner", color: "#7c3aed" },
  snack: { label: "Snack", color: "#0ea5e9" },
};

const MEAL_ENC: Record<MealType, number> = {
  breakfast: 0,
  lunch: 1,
  dinner: 2,
  snack: 3,
};

const normalize = (s: string) =>
  s.toLowerCase().replace(/[_\-]/g, " ").trim();

/* ================= GOAL MODE (FIX TS ERROR) ================= */

type GoalMode = "lose" | "maintain" | "gain";

function getGoalMode(goal: GoalType): GoalMode {
  if (goal.includes("lose")) return "lose";
  if (goal.includes("gain")) return "gain";
  return "maintain";
}

/* ================= HELPERS ================= */

function getNutrition(food: any) {
  const n = food.nutrition ?? {};
  const safe = (v: any) => {
    const num = Number(v);
    return isNaN(num) ? 0 : num;
  };
  return {
    calories: safe(n.calories ?? food.kalori),
    protein: safe(n.protein ?? food.protein),
    carbs: safe(n.carbs ?? food.carbs),
    fat: safe(n.fat ?? food.fat),
  };
}

function pickBestByCalorie(
  foods: any[],
  targetCal: number
) {
  return foods
    .map((f) => ({
      ...f,
      _calDiff: Math.abs(getNutrition(f).calories - targetCal),
    }))
    .sort((a, b) => a._calDiff - b._calDiff)[0];
}


function scoreByGoal(food: any, mode: GoalMode) {
  const n = getNutrition(food);

  if (mode === "lose") {
    return n.protein * 2 - n.fat * 1.5 - n.calories * 0.01;
  }

  if (mode === "gain") {
    return n.calories * 0.03 + n.protein * 1.5 + n.carbs;
  }

  return n.protein + n.carbs * 0.5;
}

const MEAL_RULE_SCORE: Record<MealType, (f: any) => number> = {
  breakfast: (f) =>
    getNutrition(f).carbs * 1.5 + getNutrition(f).protein * 2,
  lunch: (f) =>
    getNutrition(f).calories * 0.02 + getNutrition(f).protein * 1.5,
  dinner: (f) =>
    getNutrition(f).protein * 2 - getNutrition(f).carbs,
  snack: (f) =>
    getNutrition(f).protein * 1.2 - getNutrition(f).calories * 0.03,
};


const MEAL_CAL_RATIO: Record<MealType, number> = {
  breakfast: 0.25,
  lunch: 0.35,
  dinner: 0.30,
  snack: 0.10,
};

/* ================= COMPONENT ================= */

export default function Recommendation() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedFood, setSelectedFood] = useState<any>(null);

  const [goalFilter, setGoalFilter] = useState<GoalType>("maintain");
  const [mealFilter, setMealFilter] = useState<"all" | MealType>("all");
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshData = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const load = async () => {
        setLoading(true);

        const userId = Number(await AsyncStorage.getItem("user_id"));
        if (!userId) return;

        const today = new Date().toISOString().split("T")[0];
        const goalMode = getGoalMode(goalFilter);

        const user =
          executeParamQuery(
            "SELECT target_kalori FROM users WHERE id_user = ?",
            [userId]
          )?.[0] ?? {};

        const targetKalori = Number(user.target_kalori ?? 2000);
        const meals = FoodDatabase.getFoodItemsByMealType(today, userId);

        const consumedPerMeal: Record<MealType, number> = {
          breakfast: 0,
          lunch: 0,
          dinner: 0,
          snack: 0,
        };

        MEAL_ORDER.forEach((m) => {
          consumedPerMeal[m] =
            meals?.[m]?.reduce(
              (s: number, f: any) => s + Number(f.calories),
              0
            ) ?? 0;
        });

        const totalConsumed = Object.values(consumedPerMeal).reduce(
          (a, b) => a + b,
          0
        );

        const burned =
          executeParamQuery(
            `SELECT SUM(calories_burned) as total
             FROM workouts_history
             WHERE user_id = ? AND DATE(completed_at)=DATE('now')`,
            [userId]
          )?.[0]?.total ?? 0;

        const remainingKalori =
          targetKalori - totalConsumed + Number(burned);

        const goalCfg = GOAL_CONFIG[goalFilter];

        const ruleBase = generateRecommendation(
          remainingKalori + goalCfg.calorieBias,
          consumedPerMeal
        ).byMeal;

        const byMeal: Record<MealType, any[]> = {
          breakfast: [],
          lunch: [],
          dinner: [],
          snack: [],
        };

        for (const meal of MEAL_ORDER) {
          let merged: any[] = [];

          try {
            const ml = await predictFood({
              goal_enc: goalCfg.goal_enc,
              meal_enc: MEAL_ENC[meal],
              remaining_calories:
                remainingKalori + goalCfg.calorieBias,
              vegetarian: 0,
              high_protein: goalCfg.highProtein ? 1 : 0,
              top_n: 6,
            });

            merged = [
              ...ml.recommendations
                .map((r: any) =>
                  foodData.find(
                    (f: any) =>
                      normalize(f.name) === normalize(r.food_name) &&
                      (Array.isArray(f.meal)
                        ? f.meal.includes(meal)
                        : f.meal === meal)
                  )
                )
                .filter(Boolean),
              ...(ruleBase[meal] ?? []),
            ];
          } catch {
            merged = ruleBase[meal] ?? [];
          }

          const limit =
            goalMode === "gain" ? 5 : goalMode === "maintain" ? 4 : 3;

          let ranked = merged
            .map((f) => ({
              ...f,
              _score:
                scoreByGoal(f, goalMode) +
                MEAL_RULE_SCORE[meal](f),
            }))
            .filter((f) =>
              goalMode === "lose"
                ? getNutrition(f).calories <= 500
                : f._score > 0
            )
            .sort((a, b) => b._score - a._score);

          if (ranked.length === 0) {
            ranked = (ruleBase[meal] ?? []).slice(0, limit);
          }

const mealTargetCal =
  remainingKalori * MEAL_CAL_RATIO[meal];

let mealFoods: any[] = [];
let currentCal = 0;

/* ===== SORT BY BEST SCORE ===== */
let candidates = [...ranked];

/* ===== RANDOM BIAR GA ITU2 AJA ===== */
candidates = candidates.sort(() => Math.random() - 0.5);

/* ===== AMBIL SAMPAI MENDEKATI TARGET ===== */
for (let food of candidates) {
  const cal = getNutrition(food).calories;

  if (mealFoods.find(f => f.name === food.name)) continue;

  if (currentCal + cal <= mealTargetCal * 1.2) {
    mealFoods.push(food);
    currentCal += cal;
  }

  if (mealFoods.length >= 4) break;
}

/* ===== JIKA MASIH KEKURANGAN, TAMBAH PAKSA ===== */
for (let food of candidates) {
  if (currentCal >= mealTargetCal * 0.9) break;

  if (mealFoods.find(f => f.name === food.name)) continue;

  mealFoods.push(food);
  currentCal += getNutrition(food).calories;
}

byMeal[meal] = mealFoods;


        }

        if (!active) return;

        setData({
          targetKalori,
          totalConsumed,
          burned,
          remainingKalori,
          byMeal,
        });

        setLoading(false);
      };

      load();
      return () => {
        active = false;
      };
    }, [goalFilter, refreshKey])
  );

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Memuat rekomendasi…</Text>
      </View>
    );

  const progress = Math.min(
    data.totalConsumed / data.targetKalori,
    1
  );

  return (
    <>
      <ScrollView style={styles.container}>
        <LinearGradient colors={["#22c55e", "#3b82f6"]} style={styles.header}>
          <Text style={styles.headerTitle}>Rekomendasi Menu Harian</Text>
          <View style={styles.progressBg}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {Math.round(progress * 100)}% dari target kalori
          </Text>
        </LinearGradient>

        {/* SUMMARY */}
        <View style={styles.summary}>
          <SummaryItem label="Target" value={data.targetKalori} />
          <SummaryItem label="Makan" value={data.totalConsumed} />
          <SummaryItem label="Bakar" value={data.burned} />
          <SummaryItem label="Sisa" value={data.remainingKalori} highlight />
        </View>

        {/* GOAL FILTER */}
        <View style={styles.goalRow}>
          {(Object.keys(GOAL_CONFIG) as GoalType[]).map((g) => {
            const active = goalFilter === g;
            return (
              <TouchableOpacity
                key={g}
                onPress={() => setGoalFilter(g)}
                style={[
                  styles.goalBtn,
                  active
                    ? { backgroundColor: GOAL_CONFIG[g].color }
                    : styles.goalBtnInactive,
                ]}
              >
                <Text
                  style={[
                    styles.goalText,
                    !active && styles.goalTextInactive,
                  ]}
                >
                  {GOAL_CONFIG[g].label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* MEAL FILTER */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ paddingHorizontal: 16, marginBottom: 8 }}
        >
          {["all", ...MEAL_ORDER].map((m) => (
            <TouchableOpacity
              key={m}
              onPress={() => setMealFilter(m as any)}
              style={[
                styles.mealTab,
                mealFilter === m && styles.mealTabActive,
              ]}
            >
              <Text
                style={{
                  color: mealFilter === m ? "#fff" : "#111",
                  fontWeight: "700",
                }}
              >
                {m.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* FOOD LIST */}
        <View style={{ padding: 16 }}>
          {(mealFilter === "all" ? MEAL_ORDER : [mealFilter]).map(
            (meal) =>
              data.byMeal[meal]?.length > 0 && (
                <View key={meal}>
                  <Text
                    style={[
                      styles.sectionTitle,
                      { color: MEAL_META[meal].color },
                    ]}
                  >
                    {MEAL_META[meal].label}
                  </Text>

                  {data.byMeal[meal].map((food: any, i: number) => {
                    const n = getNutrition(food);
                    return (
                      <TouchableOpacity
                        key={i}
                        style={[
                          styles.foodCard,
                          { borderLeftColor: MEAL_META[meal].color },
                        ]}
                        onPress={() =>
                          setSelectedFood({ ...food, _meal: meal })
                        }
                      >
                        <Text style={styles.foodName}>{food.name}</Text>
                        <View style={styles.macroRow}>
                          <Text>🔥 {n.calories} kcal</Text>
                          <Text>💪 {n.protein} g</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )
          )}
        </View>
      </ScrollView>

      {/* DETAIL MODAL */}
      <Modal visible={!!selectedFood} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
          <TouchableOpacity
  onPress={() => setSelectedFood(null)}
  style={styles.closeBtn}
>
  <Text style={styles.closeBtnText}>✕</Text>
</TouchableOpacity>

            {selectedFood && (() => {
              const n = getNutrition(selectedFood);
              return (
                <ScrollView>
                  <Text style={styles.modalTitle}>{selectedFood.name}</Text>

                  <View style={styles.macroCard}>
                    <Macro label="Kcal" value={n.calories} />
                    <Macro label="Protein" value={`${n.protein}g`} />
                    <Macro label="Carbs" value={`${n.carbs}g`} />
                    <Macro label="Fat" value={`${n.fat}g`} />
                  </View>

                  {selectedFood.recipe?.ingredients && (
  <View style={styles.sectionCard}>
    <Text style={styles.sectionHeader}>🧺 Bahan</Text>
    {selectedFood.recipe.ingredients.map(
      (item: string, idx: number) => (
        <Text key={idx} style={styles.listItem}>
          {item}
        </Text>
      )
    )}
  </View>
)}

{selectedFood.recipe?.steps && (
  <View style={styles.sectionCard}>
    <Text style={styles.sectionHeader}>👩‍🍳 Cara Memasak</Text>
    {selectedFood.recipe.steps.map(
      (step: string, idx: number) => (
        <Text key={idx} style={styles.listItem}>
          {step}
        </Text>
      )
    )}
  </View>
)}

                  <TouchableOpacity
                    style={[styles.btnPrimary, { marginTop: 16 }]}
                    onPress={async () => {
                      const userId = Number(
                        await AsyncStorage.getItem("user_id")
                      );
                      FoodDatabase.addFoodItem({
                        name: selectedFood.name,
                        calories: n.calories,
                        protein: n.protein,
                        carbs: n.carbs,
                        fat: n.fat,
                        quantity: 1,
                        unit: "porsi",
                        mealType: selectedFood._meal,
                        date: new Date().toISOString().split("T")[0],
                        userId,
                      });
                      setSelectedFood(null);
                      refreshData();
                    }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "800" }}>
                      Tambah ke Tracking
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              );
            })()}
          </View>
        </View>
      </Modal>
    </>
  );
}

/* ================= SMALL ================= */

function SummaryItem({ label, value, highlight }: any) {
  return (
    <View
      style={[
        styles.summaryItem,
        highlight && styles.summaryHighlight,
      ]}
    >
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function Macro({ label, value }: any) {
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={{ fontWeight: "900" }}>{value}</Text>
      <Text style={{ fontSize: 11, color: "#64748b" }}>{label}</Text>
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: { padding: 24 },
  headerTitle: { color: "#fff", fontSize: 24, fontWeight: "900" },

  progressBg: {
    height: 10,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 999,
    marginTop: 12,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#fff",
    borderRadius: 999,
  },
  progressText: { color: "#fff", fontSize: 12, marginTop: 6 },

  summary: {
    flexDirection: "row",
    backgroundColor: "#fff",
    margin: 16,
    borderRadius: 20,
  },
  summaryItem: { flex: 1, alignItems: "center", paddingVertical: 14 },
  summaryHighlight: { backgroundColor: "#dcfce7" },
  summaryValue: { fontSize: 18, fontWeight: "900" },
  summaryLabel: { fontSize: 11, color: "#64748b" },

  goalRow: { flexDirection: "row", paddingHorizontal: 16, marginBottom: 8 },
  goalBtn: {
    flex: 1,
    marginHorizontal: 4,
    padding: 10,
    borderRadius: 14,
    alignItems: "center",
  },
  goalBtnInactive: { backgroundColor: "#e5e7eb" },
  goalText: { color: "#fff", fontWeight: "800" },
  goalTextInactive: { color: "#475569" },

  mealTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#e5e7eb",
    borderRadius: 999,
    marginRight: 8,
  },
  mealTabActive: { backgroundColor: "#22c55e" },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    marginTop: 16,
    marginBottom: 8,
  },

  foodCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  foodName: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  macroRow: { flexDirection: "row", justifyContent: "space-between" },

  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "85%",
  },

  modalTitle: { fontSize: 20, fontWeight: "900", marginBottom: 12 },

  macroCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f1f5f9",
    padding: 12,
    borderRadius: 16,
    marginBottom: 16,
  },

  sectionCard: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  sectionHeader: { fontWeight: "900", marginBottom: 8 },

  btnPrimary: {
    backgroundColor: "#22c55e",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  listItem: {
  fontSize: 14,
  lineHeight: 20,
  color: "#334155",
  marginBottom: 6,
},
closeBtn: {
  position: "absolute",
  top: 14,
  right: 14,
  width: 32,
  height: 32,
  borderRadius: 16,
  backgroundColor: "#e5e7eb",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 10,
},
closeBtnText: {
  fontSize: 18,
  fontWeight: "900",
  color: "#334155",
},

});