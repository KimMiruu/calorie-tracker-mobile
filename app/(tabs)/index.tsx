// app/(tabs)/index.tsx
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useState } from "react";
import { Alert, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AnalyticsDatabase, DrinksDatabase, ExerciseDatabase, GoalsDatabase, initDB, UserDatabase } from "../db";

export default function HomeScreen() {
  const [username, setUsername] = useState("User");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [userData, setUserData] = useState<any>(null);
  const [dailySummary, setDailySummary] = useState<any>(null);
  const [dailyGoal, setDailyGoal] = useState<any>(null);
  const [waterIntake, setWaterIntake] = useState(0); // in mL
  const [exercises, setExercises] = useState<any[]>([]);
  const screenWidth = Dimensions.get("window").width;
  const [isLoading, setIsLoading] = useState(true);
  const [showWaterNotification, setShowWaterNotification] = useState(false);
  const [waterTarget] = useState(2000); // Target 2L = 2000 mL
  const [userId, setUserId] = useState<number | undefined>(undefined); // Tambah state untuk userId

  // Format tanggal untuk database
  const formatDate = (date: Date): string => {
    return date.toISOString().split("T")[0];
  };

  // Format tanggal untuk display
  const formatDisplayDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dateStr = formatDate(date);
    const todayStr = formatDate(today);
    const yesterdayStr = formatDate(yesterday);
    const tomorrowStr = formatDate(tomorrow);

    if (dateStr === todayStr) {
      return "Hari Ini";
    } else if (dateStr === yesterdayStr) {
      return "Kemarin";
    } else if (dateStr === tomorrowStr) {
      return "Besok";
    } else {
      return date.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
    }
  };

  const formatFullDate = (date: Date) => {
    return date.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  useEffect(() => {
    // Initialize database
    initDB();
    loadAllData();
  }, []);

  // Load all data untuk tanggal yang dipilih
  const loadAllData = async (date?: Date) => {
    setIsLoading(true);
    try {
      await loadUserData(); // Ini harus dipanggil dulu untuk mendapatkan userId
      const loadDate = date || selectedDate;
      if (userId) {
        // Hanya load data jika userId ada
        await loadDailySummary(loadDate);
        await loadDailyGoal(loadDate);
        await loadWaterIntake(loadDate);
        await loadExercises(loadDate);
      }
    } catch (error) {
      console.log("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load user data from database - DIPERBAIKI
  const loadUserData = async () => {
    try {
      const data = await AsyncStorage.getItem("loggedInUser");
      if (data) {
        const user = JSON.parse(data);

        if (user.email) {
          const dbUser = UserDatabase.getUserByEmail(user.email);
          if (dbUser) {
            setUserData(dbUser);
            setUserId(dbUser.id_user); // SET userId DARI DATABASE
            setUsername(dbUser.username || user.email?.split("@")[0] || "User");
          } else {
            console.warn("User not found in database, creating new one...");
            // Jika user tidak ada di database, buat baru
            const newUserId = UserDatabase.createUser({
              username: user.email?.split("@")[0] || "User",
              email: user.email,
              password: user.password || "default123", // Ini hanya placeholder
            });
            if (newUserId > 0) {
              setUserId(newUserId);
              // Reload user data
              const newDbUser = UserDatabase.getUserByEmail(user.email);
              if (newDbUser) {
                setUserData(newDbUser);
                setUsername(newDbUser.username);
              }
            }
          }
        } else {
          setUsername(user.username || "User");
        }
      } else {
        console.warn("No user logged in");
      }
    } catch (error) {
      console.log("Error loading user:", error);
      setUsername("User");
    }
  };

  // Load daily summary untuk tanggal tertentu - DIPERBAIKI
  const loadDailySummary = async (date: Date) => {
    try {
      if (!userId) {
        console.warn("No userId, cannot load daily summary");
        return;
      }

      const dateStr = formatDate(date);
      // TAMBAHKAN userId PARAMETER
      const summary = AnalyticsDatabase.getDailySummary(dateStr, userId);
      setDailySummary(
        summary || {
          foodCalories: 0,
          exerciseCalories: 0,
          workoutCalories: 0,
          totalCaloriesBurned: 0,
          netCalories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        }
      );
    } catch (error) {
      console.log("Error loading daily summary:", error);
      setDailySummary({
        foodCalories: 0,
        exerciseCalories: 0,
        workoutCalories: 0,
        totalCaloriesBurned: 0,
        netCalories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      });
    }
  };

  // Load daily goal untuk tanggal tertentu - DIPERBAIKI
  const loadDailyGoal = async (date: Date) => {
    try {
      if (!userId) {
        console.warn("No userId, cannot load daily goal");
        return;
      }

      const dateStr = formatDate(date);
      // TAMBAHKAN userId PARAMETER
      const goal = GoalsDatabase.getDailyGoal(dateStr, userId);

      if (goal) {
        setDailyGoal(goal);
      } else {
        const targetKalori = userData?.target_kalori || 2000;
        const defaultGoal = {
          calorieGoal: targetKalori,
          proteinGoal: 100,
          carbsGoal: 250,
          fatGoal: 70,
        };
        setDailyGoal(defaultGoal);

        // Simpan default goal ke database
        GoalsDatabase.setDailyGoal({
          date: dateStr,
          calorieGoal: targetKalori,
          proteinGoal: 100,
          carbsGoal: 250,
          fatGoal: 70,
          userId: userId,
        });
      }
    } catch (error) {
      console.log("Error loading daily goal:", error);
      const defaultGoal = {
        calorieGoal: 2000,
        proteinGoal: 100,
        carbsGoal: 250,
        fatGoal: 70,
      };
      setDailyGoal(defaultGoal);
    }
  };

  // Load water intake untuk tanggal tertentu - DIPERBAIKI
  const loadWaterIntake = async (date: Date) => {
    try {
      if (!userId) {
        console.warn("No userId, cannot load water intake");
        return;
      }

      const dateStr = formatDate(date);
      // TAMBAHKAN userId PARAMETER
      const intake = DrinksDatabase.getTodayWaterIntake(dateStr, userId);
      setWaterIntake(intake);

      // Cek apakah sudah memenuhi target minum (hanya untuk hari ini)
      const today = new Date();
      if (dateStr === formatDate(today) && intake >= waterTarget && !showWaterNotification) {
        setShowWaterNotification(true);
        setTimeout(() => {
          Alert.alert("🎉 Selamat!", "Anda telah memenuhi kebutuhan minum harian 2L!", [{ text: "OK", onPress: () => setShowWaterNotification(false) }]);
        }, 500);
      } else if (intake < waterTarget || dateStr !== formatDate(today)) {
        setShowWaterNotification(false);
      }
    } catch (error) {
      console.log("Error loading water intake:", error);
      setWaterIntake(0);
    }
  };

  // Load exercises untuk tanggal tertentu - DIPERBAIKI
  const loadExercises = async (date: Date) => {
    try {
      if (!userId) {
        console.warn("No userId, cannot load exercises");
        return;
      }

      const dateStr = formatDate(date);
      // TAMBAHKAN userId PARAMETER
      const exercisesData = ExerciseDatabase.getExercisesByDate(dateStr, userId);
      setExercises(exercisesData || []);
    } catch (error) {
      console.log("Error loading exercises:", error);
      setExercises([]);
    }
  };

  // Function to add water (hanya untuk hari ini) - DIPERBAIKI
  const addWater = async (volume: number) => {
    try {
      if (!userId) {
        Alert.alert("Error", "User tidak ditemukan. Silakan login ulang.");
        return;
      }

      const today = new Date();
      if (formatDate(selectedDate) !== formatDate(today)) {
        Alert.alert("Info", "Anda hanya bisa menambahkan air untuk hari ini");
        return;
      }

      const date = formatDate(selectedDate);
      const now = new Date();
      const time = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

      // TAMBAHKAN userId PARAMETER
      DrinksDatabase.addDrink({
        name: "Air Putih",
        volume: volume,
        date: date,
        time: time,
        userId: userId, // TAMBAH INI
      });

      // Refresh water intake
      await loadWaterIntake(selectedDate);

      const newWaterIntake = waterIntake + volume;

      // Cek apakah setelah menambah air mencapai atau melebihi target
      if (newWaterIntake >= waterTarget && waterIntake < waterTarget) {
        Alert.alert("🎉 Selamat!", "Anda telah memenuhi kebutuhan minum harian 2L!", [{ text: "OK" }]);
      } else {
        Alert.alert("Success", `${volume} mL air berhasil ditambahkan!`);
      }
    } catch (error) {
      console.log("Error adding water:", error);
      Alert.alert("Error", "Gagal menambahkan air");
    }
  };

  // Calculate total exercise minutes for activity stat
  const calculateTotalExerciseMinutes = () => {
    return exercises.reduce((total, exercise) => total + (exercise.duration || 0), 0);
  };

  // Navigate to previous day
  const goToPreviousDay = () => {
    const previousDay = new Date(selectedDate);
    previousDay.setDate(previousDay.getDate() - 1);
    setSelectedDate(previousDay);
    loadAllData(previousDay);
  };

  // Navigate to next day
  const goToNextDay = () => {
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Don't allow navigating to future dates beyond tomorrow
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (nextDay <= tomorrow) {
      setSelectedDate(nextDay);
      loadAllData(nextDay);
    }
  };

  // Navigate to today
  const goToToday = () => {
    const today = new Date();
    setSelectedDate(today);
    loadAllData(today);
  };

  // Refresh data
  const refreshData = () => {
    loadAllData();
  };

  // Cek apakah selected date adalah hari ini
  const isToday = useMemo(() => {
    const today = new Date();
    return formatDate(selectedDate) === formatDate(today);
  }, [selectedDate]);

  // Cek apakah selected date adalah besok
  const isTomorrow = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDate(selectedDate) === formatDate(tomorrow);
  }, [selectedDate]);

  // Use dynamic data from database
  const calories = useMemo(
    () => ({
      current: dailySummary?.foodCalories || 0,
      target: dailyGoal?.calorieGoal || 2000,
    }),
    [dailySummary, dailyGoal]
  );

  const protein = useMemo(
    () => ({
      current: dailySummary?.protein || 0,
      target: dailyGoal?.proteinGoal || 100,
    }),
    [dailySummary, dailyGoal]
  );

  const carbs = useMemo(
    () => ({
      current: dailySummary?.carbs || 0,
      target: dailyGoal?.carbsGoal || 250,
    }),
    [dailySummary, dailyGoal]
  );

  const fats = useMemo(
    () => ({
      current: dailySummary?.fat || 0,
      target: dailyGoal?.fatGoal || 70,
    }),
    [dailySummary, dailyGoal]
  );

  // Data untuk Statistik - REAL DATA - DIPERBAIKI
  const dailyStats = useMemo(
    () => [
      {
        title: "Kalori Masuk",
        icon: "🔥",
        current: dailySummary?.foodCalories || 0,
        target: dailyGoal?.calorieGoal || 2000,
        unit: "kcal",
        color: "#10B981", // Hijau
        gradient: ["#10B981", "#0DA271"] as [string, string],
      },
      {
        title: "Kalori Terbakar",
        icon: "⚡",
        current: dailySummary?.totalCaloriesBurned || 0,
        target: 500,
        unit: "cal",
        color: "#F59E0B", // Oranye
        gradient: ["#F59E0B", "#D97706"] as [string, string],
      },
      {
        title: "Air",
        icon: "💧",
        current: Math.round(waterIntake / 100) / 10, // Convert mL to L
        target: 2,
        unit: "L",
        color: "#3B82F6", // Biru
        gradient: ["#3B82F6", "#2563EB"] as [string, string],
      },
      {
        title: "Aktivitas",
        icon: "🎯",
        current: Math.round(calculateTotalExerciseMinutes() / 60), // Convert minutes to hours
        target: 1, // Target 1 jam aktivitas
        unit: "jam",
        color: "#8B5CF6", // Ungu
        gradient: ["#8B5CF6", "#7C3AED"] as [string, string],
      },
    ],
    [dailySummary, dailyGoal, waterIntake, exercises]
  );

  // return number 0..100
  const pctNum = (c: number, t: number) => {
    if (t === 0) return 0;
    const v = c / t;
    const clamped = Math.max(0, Math.min(1, v));
    return Math.round(clamped * 100);
  };

  const initials = (name: string) => {
    if (!name || name === "User") return "U";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return (parts[0][0] + parts[1][0]).slice(0, 2).toUpperCase();
  };

  // Tampilkan loading jika belum ada userId
  if (!userId && isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <LinearGradient colors={["#10B981", "#3B82F6"] as [string, string]} style={styles.loadingGradient}>
          <View style={styles.loadingSpinner}>
            <Ionicons name="fitness-outline" size={48} color="#FFFFFF" />
          </View>
          <Text style={styles.loadingText}>Memuat data pengguna...</Text>
        </LinearGradient>
      </View>
    );
  }

  // Tampilkan message jika tidak ada user yang login
  if (!userId && !isLoading) {
    return (
      <View style={[styles.container, styles.noUserContainer]}>
        <LinearGradient colors={["#10B981", "#3B82F6"] as [string, string]} style={styles.noUserGradient}>
          <View style={styles.noUserContent}>
            <Ionicons name="person-outline" size={60} color="#FFFFFF" />
            <Text style={styles.noUserTitle}>Belum Login</Text>
            <Text style={styles.noUserMessage}>Silakan login untuk melihat data Anda</Text>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => {
                // Navigasi ke login screen
                // navigation.navigate('Login');
              }}
            >
              <Text style={styles.loginButtonText}>Login Sekarang</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <LinearGradient colors={["#10B981", "#3B82F6"] as [string, string]} style={styles.loadingGradient}>
          <View style={styles.loadingSpinner}>
            <Ionicons name="fitness-outline" size={48} color="#FFFFFF" />
          </View>
          <Text style={styles.loadingText}>Loading...</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header dengan Gradient Hijau-Biru */}
      <LinearGradient colors={["#10B981", "#3B82F6"] as [string, string]} style={styles.headerGradient}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <View style={styles.avatarContainer}>
                <LinearGradient colors={["#10B981", "#0DA271"] as [string, string]} style={styles.avatarGradient}>
                  <Text style={styles.avatarText}>{initials(username)}</Text>
                </LinearGradient>
                {userId && (
                  <View style={styles.userIdBadge}>
                    <Text style={styles.userIdText}>ID: {userId}</Text>
                  </View>
                )}
              </View>
              <View style={styles.greetingContainer}>
                <Text style={styles.greeting}>
                  Hello, <Text style={styles.username}>{username}</Text> 👋
                </Text>
                <Text style={styles.subGreeting}>{formatFullDate(selectedDate)}</Text>
                {userData?.target_kalori && <Text style={styles.targetInfo}>Target Kalori: {userData.target_kalori} kcal</Text>}
              </View>
            </View>
            <TouchableOpacity style={styles.notificationButton} onPress={refreshData}>
              <LinearGradient colors={["rgba(255,255,255,0.3)", "rgba(255,255,255,0.1)"] as [string, string]} style={styles.refreshButtonGradient}>
                <Ionicons name="refresh-outline" size={24} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Date Navigation */}
          <View style={styles.dateNavigation}>
            <TouchableOpacity onPress={goToPreviousDay} style={styles.dateNavButton}>
              <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity onPress={goToToday} style={styles.dateDisplay}>
              <Text style={styles.dateDisplayText}>{formatDisplayDate(selectedDate)}</Text>
              {!isToday && !isTomorrow && (
                <Text style={styles.dateIndicator}>
                  {selectedDate.toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                  })}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={goToNextDay} style={[styles.dateNavButton, isTomorrow && styles.dateNavButtonDisabled]} disabled={isTomorrow}>
              <Ionicons name="chevron-forward" size={20} color={isTomorrow ? "rgba(255,255,255,0.3)" : "#FFFFFF"} />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* Notifikasi Target Minum Terpenuhi */}
      {showWaterNotification && isToday && (
        <View style={styles.waterNotificationContainer}>
          <LinearGradient colors={["#10B981", "#0DA271"] as [string, string]} style={styles.waterNotification}>
            <View style={styles.waterNotificationContent}>
              <View style={styles.waterNotificationIconContainer}>
                <Ionicons name="trophy" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.waterNotificationTextContainer}>
                <Text style={styles.waterNotificationTitle}>🎉 Selamat!</Text>
                <Text style={styles.waterNotificationMessage}>Anda telah memenuhi kebutuhan minum harian 2L!</Text>
              </View>
              <TouchableOpacity style={styles.waterNotificationCloseButton} onPress={() => setShowWaterNotification(false)}>
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      )}

      {/* Calories Summary Section */}
      <View style={styles.caloriesSummarySection}>
        <View style={styles.caloriesSummaryRow}>
          {/* Kalori Masuk Card */}
          <TouchableOpacity style={styles.caloriesSummaryCard} activeOpacity={0.9}>
            <LinearGradient colors={["#10B981", "#0DA271"] as [string, string]} style={styles.caloriesSummaryCardGradient}>
              <View style={styles.caloriesSummaryCardContent}>
                <View style={styles.caloriesSummaryIconContainer}>
                  <Ionicons name="nutrition" size={24} color="#FFFFFF" />
                </View>
                <View style={styles.caloriesSummaryInfo}>
                  <Text style={styles.caloriesSummaryLabel}>Kalori Masuk</Text>
                  <Text style={styles.caloriesSummaryValue}>{Math.round(dailySummary?.foodCalories || 0)} kcal</Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Kalori Terbakar Card */}
          <TouchableOpacity style={styles.caloriesSummaryCard} activeOpacity={0.9}>
            <LinearGradient colors={["#F59E0B", "#D97706"] as [string, string]} style={styles.caloriesSummaryCardGradient}>
              <View style={styles.caloriesSummaryCardContent}>
                <View style={styles.caloriesSummaryIconContainer}>
                  <Ionicons name="flame" size={24} color="#FFFFFF" />
                </View>
                <View style={styles.caloriesSummaryInfo}>
                  <Text style={styles.caloriesSummaryLabel}>Kalori Terbakar</Text>
                  <Text style={styles.caloriesSummaryValue}>{Math.round(dailySummary?.totalCaloriesBurned || 0)} kcal</Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Net Calories Card */}
        <TouchableOpacity style={styles.netCaloriesCard} activeOpacity={0.9}>
          <LinearGradient colors={["#8B5CF6", "#7C3AED"] as [string, string]} style={styles.netCaloriesCardGradient}>
            <View style={styles.netCaloriesCardContent}>
              <Text style={styles.netCaloriesLabel}>Net Kalori</Text>
              <Text style={styles.netCaloriesValue}>{Math.round(dailySummary?.netCalories || 0)} kcal</Text>
              <View style={styles.netCaloriesDetail}>
                <Text style={styles.netCaloriesDetailText}>
                  {Math.round(dailySummary?.foodCalories || 0)} kcal masuk - {Math.round(dailySummary?.totalCaloriesBurned || 0)} kcal terbakar
                </Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Total Calories Card - Hijau */}
      <View style={styles.caloriesSection}>
        <LinearGradient colors={["#10B981", "#0DA271"] as [string, string]} style={styles.caloriesCard}>
          <View style={styles.caloriesHeader}>
            <View style={styles.caloriesIconContainer}>
              <Ionicons name="trending-up" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.caloriesTextContainer}>
              <Text style={styles.caloriesTitle}>🎯 Total Kalori Harian</Text>
              <Text style={styles.caloriesAmount}>
                {Math.round(calories.current)} / {calories.target} kcal
              </Text>
              <Text style={styles.caloriesUserInfo}>Data khusus untuk {username}</Text>
            </View>
          </View>

          <View style={styles.caloriesProgress}>
            <View style={styles.caloriesProgressBar}>
              <View style={[styles.caloriesProgressFill, { width: `${Math.min(100, pctNum(calories.current, calories.target))}%`, backgroundColor: "#FFFFFF" }]} />
            </View>
            <View style={styles.caloriesProgressInfo}>
              <Text style={styles.caloriesProgressText}>{pctNum(calories.current, calories.target)}% dari target harian</Text>
              <Text style={styles.caloriesRemaining}>{Math.max(0, calories.target - calories.current)} kcal tersisa</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Water Intake Section - Biru */}
      <View style={styles.waterSection}>
        <LinearGradient colors={["#3B82F6", "#2563EB"] as [string, string]} style={styles.waterCard}>
          <View style={styles.waterHeader}>
            <View style={styles.waterIconContainer}>
              <Ionicons name="water" size={24} color="#FFFFFF" />
              {waterIntake >= waterTarget && isToday && (
                <View style={styles.waterAchievementBadge}>
                  <Ionicons name="trophy" size={12} color="#FFFFFF" />
                </View>
              )}
            </View>
            <View style={styles.waterTextContainer}>
              <Text style={styles.waterTitle}>💧 Asupan Air</Text>
              <Text style={styles.waterAmount}>
                {waterIntake} mL
                {waterIntake >= waterTarget && isToday && <Text style={styles.waterAchievementText}> 🏆</Text>}
              </Text>
            </View>
          </View>

          <View style={styles.waterProgress}>
            <View style={styles.waterProgressBar}>
              <View
                style={[
                  styles.waterProgressFill,
                  {
                    width: `${Math.min(100, (waterIntake / waterTarget) * 100)}%`,
                    backgroundColor: waterIntake >= waterTarget && isToday ? "#10B981" : "#FFFFFF",
                  },
                ]}
              />
            </View>
            <Text style={styles.waterProgressText}>
              {Math.round((waterIntake / waterTarget) * 100)}% dari target 2L
              {waterIntake >= waterTarget && isToday && <Text style={styles.waterTargetAchieved}> - TARGET TERCAPAI! 🎉</Text>}
            </Text>
          </View>

          {/* Quick Add Water Buttons - Hanya tampil untuk hari ini */}
          {isToday && (
            <View style={styles.waterButtons}>
              {[100, 250, 1000].map((volume) => (
                <TouchableOpacity key={volume} style={styles.waterButton} onPress={() => addWater(volume)}>
                  <LinearGradient colors={["rgba(255,255,255,0.3)", "rgba(255,255,255,0.1)"] as [string, string]} style={styles.waterButtonGradient}>
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                    <Text style={styles.waterButtonText}>{volume} mL</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </LinearGradient>
      </View>

      {/* Exercises Summary - Cyan */}
      <View style={styles.exercisesSection}>
        <LinearGradient colors={["#06B6D4", "#0891B2"] as [string, string]} style={styles.exercisesCard}>
          <View style={styles.exercisesHeader}>
            <View style={styles.exercisesIconContainer}>
              <Ionicons name="barbell" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.exercisesTextContainer}>
              <Text style={styles.exercisesTitle}>💪 Aktivitas {formatDisplayDate(selectedDate)}</Text>
              <Text style={styles.exercisesCount}>{exercises.length} kegiatan</Text>
              <Text style={styles.exercisesUserInfo}>Aktivitas pribadi Anda</Text>
            </View>
          </View>

          {exercises.length > 0 ? (
            <View style={styles.exercisesList}>
              {exercises.slice(0, 3).map((exercise, index) => (
                <View key={index} style={styles.exerciseItem}>
                  <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    <Text style={styles.exerciseDetails}>
                      {exercise.duration} menit • {Math.round(exercise.caloriesBurned)} cal
                    </Text>
                  </View>
                  <View style={styles.exerciseTypeBadge}>
                    <Text style={styles.exerciseType}>{exercise.type}</Text>
                  </View>
                </View>
              ))}
              {exercises.length > 3 && <Text style={styles.moreExercisesText}>+{exercises.length - 3} kegiatan lainnya</Text>}
            </View>
          ) : (
            <View style={styles.noExercisesContainer}>
              <Ionicons name="barbell-outline" size={40} color="rgba(255,255,255,0.7)" />
              <Text style={styles.noExercisesText}>Belum ada aktivitas {formatDisplayDate(selectedDate).toLowerCase()}</Text>
            </View>
          )}
        </LinearGradient>
      </View>

      {/* Macro Grid */}
      <Text style={styles.sectionTitle}>Nutrisi Makro - {username}</Text>
      <View style={styles.macroGrid}>
        <View style={styles.macroCard}>
          <LinearGradient colors={["#10B981", "#0DA271"] as [string, string]} style={styles.macroCardContent}>
            <View style={styles.macroHeader}>
              <Text style={styles.macroIcon}>💪</Text>
              <View style={styles.macroPercentageContainer}>
                <Text style={styles.macroPercentage}>{pctNum(protein.current, protein.target)}%</Text>
              </View>
            </View>
            <Text style={styles.macroName}>Protein</Text>
            <Text style={styles.macroValue}>
              {Math.round(protein.current)}g / {Math.round(protein.target)}g
            </Text>
            <View style={styles.macroProgress}>
              <View style={[styles.macroProgressFill, { width: `${pctNum(protein.current, protein.target)}%` }]} />
            </View>
          </LinearGradient>
        </View>

        <View style={styles.macroCard}>
          <LinearGradient colors={["#3B82F6", "#2563EB"] as [string, string]} style={styles.macroCardContent}>
            <View style={styles.macroHeader}>
              <Text style={styles.macroIcon}>🌾</Text>
              <View style={styles.macroPercentageContainer}>
                <Text style={styles.macroPercentage}>{pctNum(carbs.current, carbs.target)}%</Text>
              </View>
            </View>
            <Text style={styles.macroName}>Carbs</Text>
            <Text style={styles.macroValue}>
              {Math.round(carbs.current)}g / {Math.round(carbs.target)}g
            </Text>
            <View style={styles.macroProgress}>
              <View style={[styles.macroProgressFill, { width: `${pctNum(carbs.current, carbs.target)}%` }]} />
            </View>
          </LinearGradient>
        </View>

        <View style={styles.macroCard}>
          <LinearGradient colors={["#F59E0B", "#D97706"] as [string, string]} style={styles.macroCardContent}>
            <View style={styles.macroHeader}>
              <Text style={styles.macroIcon}>🥑</Text>
              <View style={styles.macroPercentageContainer}>
                <Text style={styles.macroPercentage}>{pctNum(fats.current, fats.target)}%</Text>
              </View>
            </View>
            <Text style={styles.macroName}>Fats</Text>
            <Text style={styles.macroValue}>
              {Math.round(fats.current)}g / {Math.round(fats.target)}g
            </Text>
            <View style={styles.macroProgress}>
              <View style={[styles.macroProgressFill, { width: `${pctNum(fats.current, fats.target)}%` }]} />
            </View>
          </LinearGradient>
        </View>
      </View>

      {/* Statistik */}
      <Text style={styles.sectionTitle}>Statistik {formatDisplayDate(selectedDate)}</Text>
      <View style={styles.statsGrid}>
        {dailyStats.map((stat, index) => {
          const percentage = pctNum(stat.current, stat.target);
          return (
            <TouchableOpacity key={index} style={styles.statCard} activeOpacity={0.9}>
              <LinearGradient colors={stat.gradient} style={styles.statCardGradient}>
                <View style={styles.statCardContent}>
                  <View style={styles.statIconContainer}>
                    <Text style={styles.statIcon}>{stat.icon}</Text>
                  </View>
                  <View style={styles.statInfo}>
                    <Text style={styles.statValue}>
                      {typeof stat.current === "number" ? Math.round(stat.current * 10) / 10 : stat.current}
                      <Text style={styles.statUnit}> {stat.unit}</Text>
                    </Text>
                    <Text style={styles.statLabel}>{stat.title}</Text>
                  </View>
                  <View style={styles.statProgressContainer}>
                    <View style={styles.statProgressBar}>
                      <View style={[styles.statProgressFill, { width: `${percentage}%` }]} />
                    </View>
                    <Text style={styles.statPercentage}>{percentage}%</Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F9FF",
  },
  content: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
  },
  loadingGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingSpinner: {
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 18,
    color: "#FFFFFF",
    fontWeight: "600",
  },

  // No User Container
  noUserContainer: {
    flex: 1,
  },
  noUserGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  noUserContent: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    padding: 30,
    borderRadius: 20,
    width: "100%",
    maxWidth: 300,
  },
  noUserTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 20,
    marginBottom: 10,
  },
  noUserMessage: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    marginBottom: 25,
  },
  loginButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  // Header dengan Gradient
  headerGradient: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  header: {
    marginBottom: 10,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  greetingContainer: {
    marginLeft: 12,
  },
  greeting: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    textShadowColor: "rgba(0, 0, 0, 0.1)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  username: {
    color: "#FFFBEB",
  },
  subGreeting: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    marginTop: 2,
  },
  targetInfo: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 2,
  },
  notificationButton: {
    borderRadius: 20,
    overflow: "hidden",
  },
  refreshButtonGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  // Date Navigation
  dateNavigation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  dateNavButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  dateNavButtonDisabled: {
    opacity: 0.5,
  },
  dateDisplay: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 12,
  },
  dateDisplayText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  dateIndicator: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 2,
  },

  // Avatar dengan gradient
  avatarContainer: {
    position: "relative",
  },
  avatarGradient: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  userIdBadge: {
    position: "absolute",
    bottom: -5,
    right: -5,
    backgroundColor: "#F59E0B",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  userIdText: {
    fontSize: 10,
    color: "#FFFFFF",
    fontWeight: "700",
  },

  // Notifikasi Target Minum
  waterNotificationContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  waterNotification: {
    borderRadius: 16,
    padding: 16,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  waterNotificationContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  waterNotificationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  waterNotificationTextContainer: {
    flex: 1,
  },
  waterNotificationTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  waterNotificationMessage: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.9)",
  },
  waterNotificationCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  // Calories Summary Section
  caloriesSummarySection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  caloriesSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  caloriesSummaryCard: {
    width: "48%",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  caloriesSummaryCardGradient: {
    padding: 16,
    borderRadius: 16,
  },
  caloriesSummaryCardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  caloriesSummaryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  caloriesSummaryInfo: {
    flex: 1,
  },
  caloriesSummaryLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 2,
    fontWeight: "600",
  },
  caloriesSummaryValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  netCaloriesCard: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  netCaloriesCardGradient: {
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  netCaloriesCardContent: {
    alignItems: "center",
  },
  netCaloriesLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 4,
    fontWeight: "600",
  },
  netCaloriesValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  netCaloriesDetail: {
    alignItems: "center",
  },
  netCaloriesDetailText: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
  },

  // Calories Section
  caloriesSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  caloriesCard: {
    borderRadius: 24,
    padding: 24,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  caloriesHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  caloriesIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  caloriesTextContainer: {
    flex: 1,
  },
  caloriesTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 4,
  },
  caloriesAmount: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  caloriesUserInfo: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 2,
  },
  caloriesProgress: {
    marginBottom: 10,
  },
  caloriesProgressBar: {
    height: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 12,
  },
  caloriesProgressFill: {
    height: "100%",
    borderRadius: 8,
  },
  caloriesProgressInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  caloriesProgressText: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.9)",
  },
  caloriesRemaining: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.7)",
  },

  // Water Section
  waterSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  waterCard: {
    borderRadius: 24,
    padding: 24,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  waterHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  waterIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
    position: "relative",
  },
  waterAchievementBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#3B82F6",
  },
  waterTextContainer: {
    flex: 1,
  },
  waterTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 4,
  },
  waterAmount: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  waterAchievementText: {
    color: "#FFD700",
  },
  waterProgress: {
    marginBottom: 24,
  },
  waterProgressBar: {
    height: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 8,
  },
  waterProgressFill: {
    height: "100%",
    borderRadius: 8,
  },
  waterProgressText: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
  },
  waterTargetAchieved: {
    color: "#10B981",
    fontWeight: "700",
  },
  waterButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  waterButton: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 16,
    overflow: "hidden",
  },
  waterButtonGradient: {
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  waterButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 6,
  },

  // Exercises Section
  exercisesSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  exercisesCard: {
    borderRadius: 24,
    padding: 24,
    shadowColor: "#06B6D4",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  exercisesHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  exercisesIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  exercisesTextContainer: {
    flex: 1,
  },
  exercisesTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 4,
  },
  exercisesCount: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  exercisesUserInfo: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 2,
  },
  exercisesList: {
    marginTop: 8,
  },
  exerciseItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  exerciseDetails: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.7)",
  },
  exerciseTypeBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  exerciseType: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  moreExercisesText: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    marginTop: 12,
    fontStyle: "italic",
  },
  noExercisesContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  noExercisesText: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 8,
    marginBottom: 16,
  },

  // Section Titles
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E293B",
    marginHorizontal: 20,
    marginBottom: 16,
    letterSpacing: -0.5,
  },

  // Macro Grid
  macroGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  macroCard: {
    width: "31%",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  macroCardContent: {
    padding: 16,
    alignItems: "center",
  },
  macroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    alignItems: "center",
    marginBottom: 12,
  },
  macroIcon: {
    fontSize: 24,
    color: "#FFFFFF",
  },
  macroPercentageContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  macroPercentage: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  macroName: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 4,
    fontWeight: "600",
    width: "100%",
  },
  macroValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 12,
    width: "100%",
  },
  macroProgress: {
    width: "100%",
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 3,
    overflow: "hidden",
  },
  macroProgressFill: {
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 3,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  statCard: {
    width: "48%",
    marginBottom: 16,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  statCardGradient: {
    padding: 16,
    borderRadius: 20,
  },
  statCardContent: {
    flex: 1,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  statIcon: {
    fontSize: 20,
    color: "#FFFFFF",
  },
  statInfo: {
    marginBottom: 12,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  statUnit: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "600",
  },
  statLabel: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "500",
  },
  statProgressContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 2,
    overflow: "hidden",
    marginRight: 8,
  },
  statProgressFill: {
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 2,
  },
  statPercentage: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});