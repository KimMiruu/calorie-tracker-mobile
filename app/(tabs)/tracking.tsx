// app/tracking.tsx
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Dimensions, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { ExerciseDatabase, FoodDatabase, initDB } from "../db";

const { width: screenWidth } = Dimensions.get("window");

// Interfaces
interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  quantity: number;
  unit: string;
}

interface ExerciseItem {
  id: string;
  name: string;
  caloriesBurned: number;
  duration: number;
  type: string;
}

interface MealData {
  breakfast: FoodItem[];
  lunch: FoodItem[];
  dinner: FoodItem[];
  snacks: FoodItem[];
}

// Helper function to format date as YYYY-MM-DD
const formatDate = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

/**
 * Food modal as isolated component with its own local state.
 */
function FoodModalComponent({ visible, onClose, onAdd }: { visible: boolean; onClose: () => void; onAdd: (mealType: keyof MealData, item: FoodItem) => void }) {
  const [foodName, setFoodName] = useState("");
  const [foodCalories, setFoodCalories] = useState("");
  const [foodProtein, setFoodProtein] = useState("");
  const [foodCarbs, setFoodCarbs] = useState("");
  const [foodFat, setFoodFat] = useState("");
  const [foodQuantity, setFoodQuantity] = useState("1");
  const [foodUnit, setFoodUnit] = useState("serving");

  const resetForm = () => {
    setFoodName("");
    setFoodCalories("");
    setFoodProtein("");
    setFoodCarbs("");
    setFoodFat("");
    setFoodQuantity("1");
    setFoodUnit("serving");
  };

  const validateNumberInput = (value: string): number => {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  };

  const handleAdd = (mealType: keyof MealData) => {
    if (!foodName.trim()) {
      Alert.alert("Error", "Please enter food name");
      return;
    }
    if (!foodCalories) {
      Alert.alert("Error", "Please enter calories");
      return;
    }

    const newFood: FoodItem = {
      id: Date.now().toString(),
      name: foodName.trim(),
      calories: validateNumberInput(foodCalories),
      protein: validateNumberInput(foodProtein),
      carbs: validateNumberInput(foodCarbs),
      fat: validateNumberInput(foodFat),
      quantity: validateNumberInput(foodQuantity),
      unit: foodUnit,
    };

    onAdd(mealType, newFood);
    resetForm();
    onClose();
  };

  const mealTypes = [
    { type: "breakfast" as keyof MealData, label: "🍳 Breakfast", color: "#FF9F43", icon: "☀️" },
    { type: "lunch" as keyof MealData, label: "🍲 Lunch", color: "#10B981", icon: "🌞" },
    { type: "dinner" as keyof MealData, label: "🍽️ Dinner", color: "#3B82F6", icon: "🌙" },
    { type: "snacks" as keyof MealData, label: "🍎 Snacks", color: "#8B5CF6", icon: "🕒" },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={() => {
        resetForm();
        onClose();
      }}
      presentationStyle="overFullScreen"
      statusBarTranslucent
    >
      <KeyboardAvoidingView style={styles.modalOuter} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <View style={[styles.modalIcon, { backgroundColor: "#3B82F6" }]}>
                  <ThemedText style={styles.modalIconText}>🍽️</ThemedText>
                </View>
                <View>
                  <ThemedText type="subtitle" style={styles.modalTitle}>
                    Add Food
                  </ThemedText>
                  <ThemedText style={styles.modalSubtitle}>Track your nutrition</ThemedText>
                </View>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  resetForm();
                  onClose();
                }}
              >
                <ThemedText style={styles.closeButtonText}>✕</ThemedText>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer} contentContainerStyle={styles.formContentContainer} keyboardShouldPersistTaps="always" showsVerticalScrollIndicator={false}>
              {/* Food Name */}
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Food Name *</ThemedText>
                <TextInput style={styles.textInput} placeholder="e.g., Chicken Breast" value={foodName} onChangeText={setFoodName} placeholderTextColor="#94a3b8" />
              </View>

              {/* Calories & Quantity */}
              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.flex1]}>
                  <ThemedText style={styles.inputLabel}>Calories *</ThemedText>
                  <TextInput style={styles.textInput} placeholder="0" value={foodCalories} onChangeText={setFoodCalories} keyboardType="numeric" placeholderTextColor="#94a3b8" />
                </View>

                <View style={[styles.inputGroup, styles.flex1]}>
                  <ThemedText style={styles.inputLabel}>Quantity</ThemedText>
                  <TextInput style={styles.textInput} placeholder="1" value={foodQuantity} onChangeText={setFoodQuantity} keyboardType="numeric" placeholderTextColor="#94a3b8" />
                </View>
              </View>

              {/* Unit Selection */}
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Unit</ThemedText>
                <View style={styles.unitButtons}>
                  {["serving", "gram", "cup", "piece", "ml"].map((unit) => (
                    <TouchableOpacity key={unit} style={[styles.unitButton, foodUnit === unit && styles.unitButtonActive]} onPress={() => setFoodUnit(unit)}>
                      <ThemedText style={[styles.unitButtonText, foodUnit === unit && styles.unitButtonTextActive]}>{unit}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Macronutrients */}
              <View style={styles.macrosSection}>
                <View style={styles.sectionHeader}>
                  <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                    Macronutrients (optional)
                  </ThemedText>
                </View>
                <View style={styles.macrosGrid}>
                  <View style={styles.macroInputGroup}>
                    <View style={[styles.macroIcon, { backgroundColor: "#ECFDF5" }]}>
                      <ThemedText style={[styles.macroIconText, { color: "#047857" }]}>P</ThemedText>
                    </View>
                    <View style={styles.macroInputContainer}>
                      <ThemedText style={styles.macroLabel}>Protein (g)</ThemedText>
                      <TextInput style={styles.macroInput} placeholder="0" value={foodProtein} onChangeText={setFoodProtein} keyboardType="numeric" placeholderTextColor="#94a3b8" />
                    </View>
                  </View>

                  <View style={styles.macroInputGroup}>
                    <View style={[styles.macroIcon, { backgroundColor: "#EFF6FF" }]}>
                      <ThemedText style={[styles.macroIconText, { color: "#1D4ED8" }]}>C</ThemedText>
                    </View>
                    <View style={styles.macroInputContainer}>
                      <ThemedText style={styles.macroLabel}>Carbs (g)</ThemedText>
                      <TextInput style={styles.macroInput} placeholder="0" value={foodCarbs} onChangeText={setFoodCarbs} keyboardType="numeric" placeholderTextColor="#94a3b8" />
                    </View>
                  </View>

                  <View style={styles.macroInputGroup}>
                    <View style={[styles.macroIcon, { backgroundColor: "#FEF3C7" }]}>
                      <ThemedText style={[styles.macroIconText, { color: "#92400E" }]}>F</ThemedText>
                    </View>
                    <View style={styles.macroInputContainer}>
                      <ThemedText style={styles.macroLabel}>Fat (g)</ThemedText>
                      <TextInput style={styles.macroInput} placeholder="0" value={foodFat} onChangeText={setFoodFat} keyboardType="numeric" placeholderTextColor="#94a3b8" />
                    </View>
                  </View>
                </View>
              </View>

              <ThemedText style={styles.optionalText}>* Required fields</ThemedText>

              {/* Add to Meal Type */}
              <View style={styles.mealTypeSection}>
                <ThemedText style={styles.inputLabel}>Add to Meal</ThemedText>
                <View style={styles.mealButtonsGrid}>
                  {mealTypes.map((meal) => (
                    <TouchableOpacity key={meal.type} style={[styles.mealTypeButton, { backgroundColor: meal.color }]} onPress={() => handleAdd(meal.type)}>
                      <ThemedText style={styles.mealTypeIcon}>{meal.icon}</ThemedText>
                      <ThemedText style={styles.mealTypeButtonText}>{meal.label.replace("🍳", "").replace("🍲", "").replace("🍽️", "").replace("🍎", "")}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
          </ThemedView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/**
 * Exercise modal as isolated component with local state.
 */
function ExerciseModalComponent({ visible, onClose, onAdd }: { visible: boolean; onClose: () => void; onAdd: (item: ExerciseItem) => void }) {
  const [exerciseName, setExerciseName] = useState("");
  const [exerciseCaloriesBurned, setExerciseCaloriesBurned] = useState("");
  const [exerciseDuration, setExerciseDuration] = useState("");
  const [exerciseType, setExerciseType] = useState("Cardio");

  const resetForm = () => {
    setExerciseName("");
    setExerciseCaloriesBurned("");
    setExerciseDuration("");
    setExerciseType("Cardio");
  };

  const validateNumberInput = (value: string): number => {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  };

  const handleAdd = () => {
    if (!exerciseName.trim()) {
      Alert.alert("Error", "Please enter exercise name");
      return;
    }
    if (!exerciseCaloriesBurned || !exerciseDuration) {
      Alert.alert("Error", "Please enter calories burned and duration");
      return;
    }

    const newExercise: ExerciseItem = {
      id: Date.now().toString(),
      name: exerciseName.trim(),
      caloriesBurned: validateNumberInput(exerciseCaloriesBurned),
      duration: validateNumberInput(exerciseDuration),
      type: exerciseType,
    };

    onAdd(newExercise);
    resetForm();
    onClose();
  };

  const exerciseTypes = [
    { type: "Cardio", color: "#EF4444", icon: "❤️" },
    { type: "Strength", color: "#3B82F6", icon: "💪" },
    { type: "Flexibility", color: "#10B981", icon: "🧘" },
    { type: "Sports", color: "#8B5CF6", icon: "⚽" },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={() => {
        resetForm();
        onClose();
      }}
      presentationStyle="overFullScreen"
      statusBarTranslucent
    >
      <KeyboardAvoidingView style={styles.modalOuter} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <View style={[styles.modalIcon, { backgroundColor: "#EF4444" }]}>
                  <ThemedText style={styles.modalIconText}>💪</ThemedText>
                </View>
                <View>
                  <ThemedText type="subtitle" style={styles.modalTitle}>
                    Add Exercise
                  </ThemedText>
                  <ThemedText style={styles.modalSubtitle}>Track your workout</ThemedText>
                </View>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  resetForm();
                  onClose();
                }}
              >
                <ThemedText style={styles.closeButtonText}>✕</ThemedText>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer} contentContainerStyle={styles.formContentContainer} keyboardShouldPersistTaps="always" showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Exercise Name *</ThemedText>
                <TextInput style={styles.textInput} placeholder="e.g., Running, Weight Training" value={exerciseName} onChangeText={setExerciseName} placeholderTextColor="#94a3b8" />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.flex1]}>
                  <ThemedText style={styles.inputLabel}>Calories Burned *</ThemedText>
                  <TextInput style={styles.textInput} placeholder="0" value={exerciseCaloriesBurned} onChangeText={setExerciseCaloriesBurned} keyboardType="numeric" placeholderTextColor="#94a3b8" />
                </View>

                <View style={[styles.inputGroup, styles.flex1]}>
                  <ThemedText style={styles.inputLabel}>Duration (min) *</ThemedText>
                  <TextInput style={styles.textInput} placeholder="0" value={exerciseDuration} onChangeText={setExerciseDuration} keyboardType="numeric" placeholderTextColor="#94a3b8" />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Exercise Type</ThemedText>
                <View style={styles.typeButtons}>
                  {exerciseTypes.map((type) => (
                    <TouchableOpacity key={type.type} style={[styles.typeButton, exerciseType === type.type && [styles.typeButtonActive, { backgroundColor: type.color }]]} onPress={() => setExerciseType(type.type)}>
                      <ThemedText style={styles.typeIcon}>{type.icon}</ThemedText>
                      <ThemedText style={[styles.typeButtonText, exerciseType === type.type && styles.typeButtonTextActive]}>{type.type}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <ThemedText style={styles.optionalText}>* Required fields</ThemedText>

              <TouchableOpacity style={styles.submitButton} onPress={handleAdd}>
                <ThemedText style={styles.submitButtonText}>➕ Add Exercise</ThemedText>
              </TouchableOpacity>
            </ScrollView>
          </ThemedView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function TrackingScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<"food" | "exercise">("food");
  const [showFoodModal, setShowFoodModal] = useState(false);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [isDBInitialized, setIsDBInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");

  const [meals, setMeals] = useState<MealData>({
    breakfast: [],
    lunch: [],
    dinner: [],
    snacks: [],
  });

  const [exercises, setExercises] = useState<ExerciseItem[]>([]);

  // Format date untuk display
  const displayDate = useMemo(() => {
    return selectedDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }, [selectedDate]);

  // Format tanggal untuk database
  const dbDate = useMemo(() => formatDate(selectedDate), [selectedDate]);

  // Sequential init: load userId dulu, baru init DB.
  // Fix utama: sebelumnya loadUserData() dan initDB() jalan di 2 useEffect
  // paralel, jadi initDB bisa selesai & panggil loadAllData() duluan sebelum
  // userId ke-set dari AsyncStorage (race condition).
  useEffect(() => {
    const init = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem("user_id");
        const storedUserEmail = await AsyncStorage.getItem("user_email");

        if (storedUserId) {
          const userIdNum = parseInt(storedUserId, 10);
          setUserId(userIdNum);
          console.log("👤 User ID loaded from AsyncStorage:", userIdNum);
        }

        if (storedUserEmail) {
          setUserEmail(storedUserEmail);
          console.log("📧 User email loaded:", storedUserEmail);
        }

        const success = initDB();
        setIsDBInitialized(success);
        if (!success) {
          console.error("❌ Failed to initialize database");
          Alert.alert("Error", "Failed to initialize database");
        }
        // Data loading di-handle oleh useEffect [dbDate, isDBInitialized, userId]
        // di bawah, supaya selalu pakai userId terbaru.
      } catch (error) {
        console.error("Error during init:", error);
        Alert.alert("Error", "Failed to initialize app data");
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  // Load data when date changes atau ketika user berubah
  useEffect(() => {
    if (isDBInitialized && userId !== null) {
      console.log(`🔄 Loading data for user: ${userId}, date: ${dbDate}`);
      loadAllData();
    } else if (isDBInitialized) {
      console.log("⚠️ User ID not loaded yet, waiting...");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbDate, isDBInitialized, userId]);

  // Reload data setiap kali tab Tracking di-fokus ulang.
  // Fix: tanpa ini, kalau user nambah makanan dari screen Recommendation
  // lalu balik ke tab Tracking, komponen ini tidak remount (tab navigator
  // cuma switch visibility), jadi useEffect di atas tidak jalan lagi dan
  // data lama masih nempel sampai reload manual.
  useFocusEffect(
    useCallback(() => {
      if (isDBInitialized && userId !== null) {
        console.log("👁️ Tracking screen focused, refreshing data...");
        loadAllData();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDBInitialized, userId, dbDate])
  );

  // Load all data for current date dan user
  const loadAllData = () => {
    if (userId === null) {
      console.log("⏳ User ID is null, skipping data load");
      return;
    }

    loadFoodData();
    loadExerciseData();
  };

  // Load food data untuk tanggal saat ini dan user tertentu
  const loadFoodData = () => {
    try {
      if (userId === null) {
        console.log("⚠️ Cannot load food data: user ID is null");
        setMeals({
          breakfast: [],
          lunch: [],
          dinner: [],
          snacks: [],
        });
        return;
      }

      const raw = FoodDatabase.getFoodItemsByMealType(dbDate, userId) as Record<string, any> | null;

      console.log(`🍽️ Loading food data for user: ${userId}, date: ${dbDate}`);

      // Normalisasi supaya selalu memenuhi interface MealData
      const normalized: MealData = {
        breakfast: Array.isArray(raw?.breakfast) ? raw!.breakfast : [],
        lunch: Array.isArray(raw?.lunch) ? raw!.lunch : [],
        dinner: Array.isArray(raw?.dinner) ? raw!.dinner : [],
        snacks: Array.isArray(raw?.snacks) ? raw!.snacks : [],
      };

      const totalItems = normalized.breakfast.length + normalized.lunch.length + normalized.dinner.length + normalized.snacks.length;
      console.log(`✅ Loaded ${totalItems} food items for user ${userId} on ${dbDate}`);
      setMeals(normalized);
    } catch (error) {
      console.error("❌ Error loading food data:", error);
      Alert.alert("Error", "Failed to load food data");
    }
  };

  // Load exercise data untuk tanggal saat ini dan user tertentu
  const loadExerciseData = () => {
    try {
      if (userId === null) {
        console.log("⚠️ Cannot load exercise data: user ID is null");
        setExercises([]);
        return;
      }

      const exerciseData = ExerciseDatabase.getExercisesByDate(dbDate, userId);
      console.log(`💪 Loaded ${Array.isArray(exerciseData) ? exerciseData.length : 0} exercises for user ${userId} on ${dbDate}`);
      setExercises(Array.isArray(exerciseData) ? exerciseData : []);
    } catch (error) {
      console.error("❌ Error loading exercise data:", error);
      Alert.alert("Error", "Failed to load exercise data");
    }
  };

  // Refresh data
  const refreshData = () => {
    console.log("🔄 Refreshing data...");
    loadAllData();
  };

  const totalFoodCalories = useMemo(
    () =>
      Object.values(meals)
        .flat()
        .reduce((sum, item) => sum + item.calories, 0),
    [meals]
  );

  const totalExerciseCalories = useMemo(() => exercises.reduce((sum, exercise) => sum + exercise.caloriesBurned, 0), [exercises]);

  const netCalories = totalFoodCalories - totalExerciseCalories;

  const addManualFood = async (mealType: keyof MealData, item: FoodItem) => {
    try {
      if (isLoading) {
        Alert.alert("Please wait", "App is still loading, try again in a moment.");
        return;
      }
      if (userId === null) {
        Alert.alert("Error", "User not logged in. Please login first.");
        return;
      }

      console.log(`➕ Adding food item for user ${userId}:`, {
        name: item.name,
        mealType,
        date: dbDate,
      });

      // Gunakan tanggal yang sesuai dengan selectedDate
      const foodId = FoodDatabase.addFoodItem({
        name: item.name,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        quantity: item.quantity,
        unit: item.unit,
        mealType: mealType,
        date: dbDate,
        userId: userId, // Tambahkan userId
      });

      if (foodId === 0) {
        throw new Error("Failed to add food item");
      }

      console.log(`✅ Food item added successfully with ID: ${foodId}`);

      // Reload data setelah menambah
      loadFoodData();
      Alert.alert("Success", "Food item added successfully!");
    } catch (error) {
      console.error("❌ Error adding food item:", error);
      Alert.alert("Error", "Failed to add food item");
    }
  };

  const addManualExercise = async (item: ExerciseItem) => {
    try {
      if (userId === null) {
        Alert.alert("Error", "User not logged in. Please login first.");
        return;
      }

      console.log(`➕ Adding exercise for user ${userId}:`, {
        name: item.name,
        date: dbDate,
      });

      const exerciseId = ExerciseDatabase.addExercise({
        name: item.name,
        caloriesBurned: item.caloriesBurned,
        duration: item.duration,
        type: item.type,
        date: dbDate,
        userId: userId, // Tambahkan userId
      });

      if (exerciseId === 0) {
        throw new Error("Failed to add exercise");
      }

      console.log(`✅ Exercise added successfully with ID: ${exerciseId}`);

      // Reload data setelah menambah
      loadExerciseData();
      Alert.alert("Success", "Exercise added successfully!");
    } catch (error) {
      console.error("❌ Error adding exercise:", error);
      Alert.alert("Error", "Failed to add exercise");
    }
  };

  const removeFoodItem = async (mealType: keyof MealData, foodId: string) => {
    Alert.alert("Remove Food", "Are you sure you want to remove this food item?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          try {
            if (userId === null) {
              Alert.alert("Error", "User not logged in.");
              return;
            }

            console.log(`🗑️ Removing food item ID: ${foodId} for user ${userId}`);

            // Gunakan userId untuk delete
            const success = FoodDatabase.deleteFoodItem(parseInt(foodId), userId);

            if (success) {
              loadFoodData();
              Alert.alert("Success", "Food item removed successfully!");
            } else {
              throw new Error("Delete failed");
            }
          } catch (error) {
            console.error("❌ Error deleting food item:", error);
            Alert.alert("Error", "Failed to remove food item");
          }
        },
      },
    ]);
  };

  const removeExercise = async (exerciseId: string) => {
    Alert.alert("Remove Exercise", "Are you sure you want to remove this exercise?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          try {
            if (userId === null) {
              Alert.alert("Error", "User not logged in.");
              return;
            }

            console.log(`🗑️ Removing exercise ID: ${exerciseId} for user ${userId}`);

            // Gunakan userId untuk delete
            const success = ExerciseDatabase.deleteExercise(parseInt(exerciseId), userId);

            if (success) {
              loadExerciseData();
              Alert.alert("Success", "Exercise removed successfully!");
            } else {
              throw new Error("Delete failed");
            }
          } catch (error) {
            console.error("❌ Error deleting exercise:", error);
            Alert.alert("Error", "Failed to remove exercise");
          }
        },
      },
    ]);
  };

  // Navigate to previous day
  const goToPreviousDay = () => {
    const previousDay = new Date(selectedDate);
    previousDay.setDate(previousDay.getDate() - 1);
    setSelectedDate(previousDay);
  };

  // Navigate to next day
  const goToNextDay = () => {
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Don't allow navigating to future dates
    const today = new Date();
    if (nextDay <= today) {
      setSelectedDate(nextDay);
    }
  };

  // Navigate to today
  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const MealSection = ({ title, mealType, data, icon, color }: { title: string; mealType: keyof MealData; data: FoodItem[]; icon: string; color: string }) => (
    <ThemedView style={styles.mealSection}>
      <View style={styles.mealHeader}>
        <View style={styles.mealTitleContainer}>
          <View style={[styles.mealIcon, { backgroundColor: color }]}>
            <ThemedText style={styles.mealIconText}>{icon}</ThemedText>
          </View>
          <View>
            <ThemedText type="subtitle" style={styles.mealTitle}>
              {title}
            </ThemedText>
            <ThemedText style={styles.mealCount}>
              {data.length} items • {data.reduce((sum, item) => sum + item.calories, 0)} cal
            </ThemedText>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: color }]}
          onPress={() => {
            if (userId === null) {
              Alert.alert("Login Required", "Please login to add food items.");
              return;
            }
            setShowFoodModal(true);
          }}
        >
          <ThemedText style={styles.addButtonText}>+ Add</ThemedText>
        </TouchableOpacity>
      </View>

      {data.length === 0 ? (
        <View style={styles.emptyMealState}>
          <ThemedText style={styles.emptyText}>No food items</ThemedText>
          <ThemedText style={styles.emptySubtext}>Add your first item</ThemedText>
        </View>
      ) : (
        <View style={styles.foodItemsContainer}>
          {data.map((item) => (
            <View key={item.id} style={styles.foodItem}>
              <View style={styles.foodInfo}>
                <ThemedText type="defaultSemiBold" style={styles.foodName}>
                  {item.name}
                </ThemedText>
                <ThemedText style={styles.foodDetails}>
                  {item.calories} cal • {item.quantity} {item.unit}
                </ThemedText>
                <View style={styles.macrosContainer}>
                  <View style={[styles.macroPill, { backgroundColor: "#ECFDF5" }]}>
                    <ThemedText style={[styles.macroText, { color: "#047857" }]}>P: {item.protein}g</ThemedText>
                  </View>
                  <View style={[styles.macroPill, { backgroundColor: "#EFF6FF" }]}>
                    <ThemedText style={[styles.macroText, { color: "#1D4ED8" }]}>C: {item.carbs}g</ThemedText>
                  </View>
                  <View style={[styles.macroPill, { backgroundColor: "#FEF3C7" }]}>
                    <ThemedText style={[styles.macroText, { color: "#92400E" }]}>F: {item.fat}g</ThemedText>
                  </View>
                </View>
              </View>
              <TouchableOpacity style={styles.removeButton} onPress={() => removeFoodItem(mealType, item.id)} disabled={userId === null}>
                <ThemedText style={styles.removeButtonText}>×</ThemedText>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </ThemedView>
  );

  const ExerciseRow = ({ item }: { item: ExerciseItem }) => {
    const getExerciseColor = (type: string) => {
      const colors: { [key: string]: string } = {
        Cardio: "#EF4444",
        Strength: "#3B82F6",
        Flexibility: "#10B981",
        Sports: "#8B5CF6",
      };
      return colors[type] || "#6B7280";
    };

    const getExerciseIcon = (type: string) => {
      const icons: { [key: string]: string } = {
        Cardio: "❤️",
        Strength: "💪",
        Flexibility: "🧘",
        Sports: "⚽",
      };
      return icons[type] || "🏃";
    };

    return (
      <View style={styles.exerciseItem}>
        <View style={[styles.exerciseIconContainer, { backgroundColor: getExerciseColor(item.type) + "15" }]}>
          <ThemedText style={styles.exerciseIconText}>{getExerciseIcon(item.type)}</ThemedText>
        </View>
        <View style={styles.exerciseInfo}>
          <View style={styles.exerciseHeaderRow}>
            <ThemedText type="defaultSemiBold" style={styles.exerciseName}>
              {item.name}
            </ThemedText>
            <View style={[styles.exerciseTypePill, { backgroundColor: getExerciseColor(item.type) + "20" }]}>
              <ThemedText style={[styles.exerciseTypeText, { color: getExerciseColor(item.type) }]}>{item.type}</ThemedText>
            </View>
          </View>
          <View style={styles.exerciseDetailsRow}>
            <View style={styles.exerciseDetail}>
              <ThemedText style={styles.exerciseDetailText}>🔥 {item.caloriesBurned} cal</ThemedText>
            </View>
            <View style={styles.exerciseDetail}>
              <ThemedText style={styles.exerciseDetailText}>⏱️ {item.duration} min</ThemedText>
            </View>
          </View>
        </View>
        <TouchableOpacity style={styles.removeButton} onPress={() => removeExercise(item.id)} disabled={userId === null}>
          <ThemedText style={styles.removeButtonText}>×</ThemedText>
        </TouchableOpacity>
      </View>
    );
  };

  // Summary data for horizontal cards
  const summaryData = [
    {
      title: "Food Intake",
      value: totalFoodCalories,
      unit: "cal",
      icon: "🍽️",
      color: "#EF4444",
      subtitle: "consumed",
    },
    {
      title: "Exercise",
      value: totalExerciseCalories,
      unit: "cal",
      icon: "💪",
      color: "#10B981",
      subtitle: "burned",
    },
    {
      title: "Net Calories",
      value: netCalories,
      unit: "cal",
      icon: netCalories > 0 ? "📈" : "📉",
      color: netCalories > 0 ? "#EF4444" : "#10B981",
      subtitle: netCalories > 0 ? "surplus" : "deficit",
    },
  ];

  const mealSections = [
    { type: "breakfast" as keyof MealData, title: "Breakfast", icon: "🍳", color: "#FF9F43" },
    { type: "lunch" as keyof MealData, title: "Lunch", icon: "🍲", color: "#10B981" },
    { type: "dinner" as keyof MealData, title: "Dinner", icon: "🍽️", color: "#3B82F6" },
    { type: "snacks" as keyof MealData, title: "Snacks", icon: "🍎", color: "#8B5CF6" },
  ];

  // Check if selected date is today
  const isToday = useMemo(() => {
    const today = new Date();
    return formatDate(selectedDate) === formatDate(today);
  }, [selectedDate]);

  // Check if user is logged in
  const isLoggedIn = userId !== null;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ThemedText style={styles.loadingText}>Loading...</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="always">
        {/* Header with Date Navigation */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerContent}>
              <ThemedText type="title" style={styles.headerTitle}>
                Calorie Tracking
              </ThemedText>

              {/* Show user info if logged in */}
              {isLoggedIn && userEmail && <ThemedText style={styles.userInfo}>👤 {userEmail}</ThemedText>}

              <View style={styles.dateNavigation}>
                <TouchableOpacity onPress={goToPreviousDay} style={styles.dateNavButton}>
                  <ThemedText style={styles.dateNavIcon}>◀</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity onPress={goToToday} style={styles.dateDisplay}>
                  <ThemedText style={styles.headerSubtitle}>{displayDate}</ThemedText>
                  {!isToday && <ThemedText style={styles.dateIndicator}>{formatDate(selectedDate)}</ThemedText>}
                </TouchableOpacity>

                <TouchableOpacity onPress={goToNextDay} style={[styles.dateNavButton, !isToday && styles.dateNavButtonDisabled]} disabled={isToday}>
                  <ThemedText style={[styles.dateNavIcon, !isToday && styles.dateNavIconDisabled]}>▶</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={styles.refreshButton} onPress={refreshData}>
              <ThemedText style={styles.refreshButtonText}>↻</ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.headerStats}>
            <ThemedText style={styles.headerStat}>Total: {totalFoodCalories} cal</ThemedText>
            <ThemedText style={styles.headerStat}>Burned: {totalExerciseCalories} cal</ThemedText>
            {!isLoggedIn && <ThemedText style={[styles.headerStat, styles.warningText]}>⚠️ Login to track</ThemedText>}
          </View>
        </View>

        {/* Login Warning Banner */}
        {!isLoggedIn && (
          <View style={styles.warningBanner}>
            <ThemedText style={styles.warningBannerText}>🔐 Please login to track your calories and exercises</ThemedText>
          </View>
        )}

        {/* Horizontal Summary Cards */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll} contentContainerStyle={styles.horizontalScrollContent}>
          {summaryData.map((item, index) => (
            <View key={index} style={[styles.summaryCard, { backgroundColor: item.color + "10", borderLeftColor: item.color }]}>
              <View style={styles.summaryIcon}>
                <ThemedText style={styles.summaryIconText}>{item.icon}</ThemedText>
              </View>
              <View style={styles.summaryContent}>
                <ThemedText style={styles.summaryTitle}>{item.title}</ThemedText>
                <ThemedText type="title" style={[styles.summaryValue, { color: item.color }]}>
                  {item.value}
                </ThemedText>
                <ThemedText style={styles.summarySubtitle}>{item.subtitle}</ThemedText>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity style={[styles.tab, activeTab === "food" && styles.activeTab]} onPress={() => setActiveTab("food")}>
            <ThemedText style={[styles.tabText, activeTab === "food" && styles.activeTabText]}>🍽️ Food</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === "exercise" && styles.activeTab]} onPress={() => setActiveTab("exercise")}>
            <ThemedText style={[styles.tabText, activeTab === "exercise" && styles.activeTabText]}>💪 Exercise</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {activeTab === "food" ? (
          <View style={styles.foodContent}>
            {mealSections.map((meal) => (
              <MealSection key={meal.type} title={meal.title} mealType={meal.type} data={meals[meal.type]} icon={meal.icon} color={meal.color} />
            ))}

            {!isLoggedIn && meals.breakfast.length === 0 && meals.lunch.length === 0 && meals.dinner.length === 0 && meals.snacks.length === 0 && (
              <View style={styles.loginPrompt}>
                <ThemedText style={styles.loginPromptTitle}>Start Tracking Your Nutrition</ThemedText>
                <ThemedText style={styles.loginPromptText}>Login to start tracking your meals, calories, and macronutrients. Your data will be saved privately to your account.</ThemedText>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.exerciseContent}>
            <View style={styles.exerciseSectionHeader}>
              <ThemedText type="subtitle" style={styles.exerciseTitle}>
                {isToday ? "Today's Exercises" : `${displayDate.split(",")[0]}'s Exercises`}
              </ThemedText>
              {/* Outline / transparent button for Add Exercise */}
              <TouchableOpacity
                style={[styles.addButtonOutline, !isLoggedIn && styles.disabledButton]}
                onPress={() => {
                  if (!isLoggedIn) {
                    Alert.alert("Login Required", "Please login to add exercises.");
                    return;
                  }
                  setShowExerciseModal(true);
                }}
                disabled={!isLoggedIn}
              >
                <ThemedText style={[styles.addButtonOutlineText, !isLoggedIn && styles.disabledButtonText]}>+ Add Exercise</ThemedText>
              </TouchableOpacity>
            </View>

            {exercises.length === 0 ? (
              <View style={styles.emptyExerciseState}>
                <ThemedText style={styles.emptyText}>{!isLoggedIn ? "Login to see exercises" : `No exercises ${isToday ? "today" : "on this day"}`}</ThemedText>
                <ThemedText style={styles.emptySubtext}>{!isLoggedIn ? "Your exercise data is private to your account" : isToday ? "Start by adding your first exercise" : "No exercises were logged"}</ThemedText>
              </View>
            ) : (
              <View style={styles.exerciseItemsContainer}>
                {exercises.map((item) => (
                  <ExerciseRow key={item.id} item={item} />
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      <FoodModalComponent visible={showFoodModal} onClose={() => setShowFoodModal(false)} onAdd={addManualFood} />
      <ExerciseModalComponent visible={showExerciseModal} onClose={() => setShowExerciseModal(false)} onAdd={addManualExercise} />
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 18,
    color: "#64748b",
  },
  // Header Styles
  header: {
    padding: 24,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 8,
  },
  userInfo: {
    fontSize: 14,
    color: "#3B82F6",
    marginBottom: 8,
    fontWeight: "500",
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#3B82F6",
    fontWeight: "600",
  },
  dateNavigation: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  dateNavButton: {
    padding: 8,
  },
  dateNavButtonDisabled: {
    opacity: 0.3,
  },
  dateNavIcon: {
    fontSize: 18,
    color: "#3B82F6",
    fontWeight: "bold",
  },
  dateNavIconDisabled: {
    color: "#94a3b8",
  },
  dateDisplay: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 16,
  },
  dateIndicator: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },
  refreshButton: {
    padding: 8,
    backgroundColor: "#f1f5f9",
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  refreshButtonText: {
    fontSize: 18,
    color: "#3B82F6",
    fontWeight: "bold",
  },
  headerStats: {
    flexDirection: "row",
    gap: 16,
  },
  headerStat: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  warningText: {
    color: "#EF4444",
    fontWeight: "600",
  },

  // Warning Banner
  warningBanner: {
    backgroundColor: "#FEF3C7",
    padding: 16,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F59E0B",
  },
  warningBannerText: {
    color: "#92400E",
    fontWeight: "500",
    textAlign: "center",
  },

  // Horizontal Summary Cards
  horizontalScroll: {
    marginVertical: 16,
  },
  horizontalScrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  summaryCard: {
    width: 160,
    borderRadius: 20,
    padding: 20,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryIconText: {
    fontSize: 20,
  },
  summaryContent: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 4,
    fontWeight: "600",
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 2,
  },
  summarySubtitle: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "500",
  },

  // Tab Styles
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 8,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: "#3B82F6",
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#64748b",
  },
  activeTabText: {
    color: "#fff",
  },

  // Food Content
  foodContent: {
    gap: 16,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  mealSection: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
  mealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  mealTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  mealIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  mealIconText: {
    fontSize: 20,
  },
  mealTitle: {
    fontSize: 18,
    color: "#1e293b",
    fontWeight: "600",
  },
  mealCount: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 2,
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#3B82F6",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  // Outline Add Exercise button
  addButtonOutline: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#3B82F6",
  },
  disabledButton: {
    opacity: 0.5,
    borderColor: "#94a3b8",
  },
  addButtonOutlineText: {
    color: "#3B82F6",
    fontWeight: "600",
    fontSize: 14,
  },
  disabledButtonText: {
    color: "#94a3b8",
  },

  foodItemsContainer: {
    gap: 12,
  },
  foodItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 16,
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    borderLeftWidth: 3,
    borderLeftColor: "#3B82F6",
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 16,
    color: "#1e293b",
    marginBottom: 4,
  },
  foodDetails: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 8,
  },
  macrosContainer: {
    flexDirection: "row",
    gap: 8,
  },
  macroPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  macroText: {
    fontSize: 12,
    fontWeight: "600",
  },
  removeButton: {
    backgroundColor: "#FEE2E2",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  removeButtonText: {
    color: "#DC2626",
    fontSize: 18,
    fontWeight: "bold",
  },

  // Exercise Content
  exerciseContent: {
    gap: 16,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  exerciseSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  exerciseTitle: {
    fontSize: 20,
    color: "#1e293b",
    fontWeight: "600",
  },
  exerciseItemsContainer: {
    gap: 12,
  },
  exerciseItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
  exerciseIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  exerciseIconText: {
    fontSize: 20,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  exerciseName: {
    fontSize: 16,
    color: "#1e293b",
    flex: 1,
    marginRight: 12,
  },
  exerciseTypePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  exerciseTypeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  exerciseDetailsRow: {
    flexDirection: "row",
    gap: 16,
  },
  exerciseDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  exerciseDetailText: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },

  // Login Prompt
  loginPrompt: {
    backgroundColor: "#EFF6FF",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  loginPromptTitle: {
    fontSize: 18,
    color: "#1E40AF",
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  loginPromptText: {
    fontSize: 14,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 20,
  },

  // Empty States
  emptyMealState: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyExerciseState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 16,
    marginBottom: 4,
    fontWeight: "600",
  },
  emptySubtext: {
    textAlign: "center",
    color: "#cbd5e1",
    fontSize: 14,
  },

  // Modal Styles
  modalOuter: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  modalTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  modalIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  modalIconText: {
    fontSize: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1e293b",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 20,
    color: "#64748b",
    fontWeight: "bold",
  },
  formContainer: {
    padding: 24,
  },
  formContentContainer: {
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#1e293b",
  },
  row: {
    flexDirection: "row",
    gap: 16,
  },
  flex1: {
    flex: 1,
  },

  // Macros Section
  macrosSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    color: "#374151",
  },
  macrosGrid: {
    gap: 12,
  },
  macroInputGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  macroIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  macroIconText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  macroInputContainer: {
    flex: 1,
  },
  macroLabel: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 6,
    fontWeight: "500",
  },
  macroInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#1e293b",
  },

  // Unit & Type Buttons
  unitButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  unitButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
  },
  unitButtonActive: {
    backgroundColor: "#3B82F6",
  },
  unitButtonText: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  unitButtonTextActive: {
    color: "#fff",
  },
  typeButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  typeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
  },
  typeButtonActive: {
    backgroundColor: "#3B82F6",
  },
  typeIcon: {
    fontSize: 16,
  },
  typeButtonText: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  typeButtonTextActive: {
    color: "#fff",
  },
  mealTypeSection: {
    marginTop: 20,
  },
  mealButtonsGrid: {
    gap: 12,
    marginTop: 12,
  },
  mealTypeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 12,
  },
  mealTypeIcon: {
    fontSize: 20,
  },
  mealTypeButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  optionalText: {
    fontSize: 14,
    color: "#6b7280",
    fontStyle: "italic",
    marginBottom: 20,
    textAlign: "center",
  },
  submitButton: {
    backgroundColor: "#3B82F6",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});