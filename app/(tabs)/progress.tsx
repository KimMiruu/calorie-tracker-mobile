// app/tabs/progress.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Dimensions, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { BarChart, LineChart, PieChart } from "react-native-chart-kit";
import { AnalyticsDatabase, ProgressDatabase, UserDatabase } from "../db";

const screenWidth = Dimensions.get("window").width;

// Define types for our data
interface DailySummary {
  date: string;
  foodCalories: number;
  exerciseCalories: number;
  netCalories: number;
}

interface MonthlyData {
  date: string;
  foodCalories: number;
  exerciseCalories: number;
  netCalories: number;
}

interface ProgressStats {
  totalFoodCalories: number;
  totalExerciseCalories: number;
  avgNetCalories: number;
  daysOnTarget: number;
  totalDays: number;
}

const ProgressCharts: React.FC = () => {
  const [weeklyData, setWeeklyData] = useState<DailySummary[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [yearlyData, setYearlyData] = useState<MonthlyData[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<ProgressStats | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<ProgressStats | null>(null);
  const [yearlyStats, setYearlyStats] = useState<ProgressStats | null>(null);
  const [streak, setStreak] = useState<number>(0);
  const [totalStats, setTotalStats] = useState<any>(null);
  const [macroDistribution, setMacroDistribution] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [userId, setUserId] = useState<number | undefined>(undefined);
  const [username, setUsername] = useState<string>("User");

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (userId) {
      loadProgressData();
    }
  }, [userId, selectedMonth, selectedYear]);

  const loadUserData = async () => {
    try {
      const data = await AsyncStorage.getItem("loggedInUser");
      if (data) {
        const user = JSON.parse(data);

        if (user.email) {
          const dbUser = UserDatabase.getUserByEmail(user.email);
          if (dbUser) {
            setUserId(dbUser.id_user);
            setUsername(dbUser.username || user.email?.split("@")[0] || "User");
          } else {
            console.warn("User not found in database");
            setUserId(undefined);
          }
        } else {
          setUsername(user.username || "User");
        }
      } else {
        console.warn("No user logged in");
        setUserId(undefined);
      }
    } catch (error) {
      console.log("Error loading user:", error);
      setUserId(undefined);
    }
  };

  const loadProgressData = async () => {
    try {
      setError(null);

      if (!userId) {
        setError("Silakan login untuk melihat progress Anda");
        setLoading(false);
        return;
      }

      const today = new Date();
      const currentYear = selectedYear || today.getFullYear();
      const currentMonth = selectedMonth || today.getMonth() + 1;

      // Format helper function
      const formatDate = (date: Date): string => {
        return date.toISOString().split("T")[0];
      };

      // Get current week dates (Sunday to Saturday) based on today
      const currentWeekStart = new Date(today);
      currentWeekStart.setDate(today.getDate() - today.getDay()); // Go to Sunday

      const currentWeekEnd = new Date(today);
      currentWeekEnd.setDate(today.getDate() + (6 - today.getDay())); // Go to Saturday

      // Load weekly data for current week - TAMBAHKAN userId
      const weekStartStr = formatDate(currentWeekStart);
      const weekEndStr = formatDate(currentWeekEnd);
      const weeklySummary = AnalyticsDatabase.getWeeklySummary(weekStartStr, weekEndStr, userId);

      // Filter and process weekly data to ensure we have data for each day
      const processedWeeklyData: DailySummary[] = [];

      // Create array for all days of the current week
      const weekDates: Date[] = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(currentWeekStart);
        date.setDate(currentWeekStart.getDate() + i);
        weekDates.push(date);
      }

      weekDates.forEach((date) => {
        const dateStr = formatDate(date);
        const existingData = weeklySummary?.find((item) => item.date === dateStr);

        if (existingData) {
          processedWeeklyData.push({
            date: dateStr,
            foodCalories: existingData.foodCalories || 0,
            exerciseCalories: existingData.exerciseCalories || 0,
            netCalories: existingData.netCalories || 0,
          });
        } else {
          processedWeeklyData.push({
            date: dateStr,
            foodCalories: 0,
            exerciseCalories: 0,
            netCalories: 0,
          });
        }
      });

      setWeeklyData(processedWeeklyData);

      // Calculate weekly stats
      const totalFood = processedWeeklyData.reduce((sum, day) => sum + day.foodCalories, 0);
      const totalExercise = processedWeeklyData.reduce((sum, day) => sum + day.exerciseCalories, 0);
      const avgNet = processedWeeklyData.length > 0 ? processedWeeklyData.reduce((sum, day) => sum + day.netCalories, 0) / processedWeeklyData.length : 0;

      setWeeklyStats({
        totalFoodCalories: Math.round(totalFood),
        totalExerciseCalories: Math.round(totalExercise),
        avgNetCalories: Math.round(avgNet),
        daysOnTarget: processedWeeklyData.filter((day) => day.foodCalories <= 2000 && day.foodCalories > 0).length,
        totalDays: processedWeeklyData.filter((day) => day.foodCalories > 0 || day.exerciseCalories > 0).length,
      });

      // Load monthly data for selected month and year - TAMBAHKAN userId
      const monthlySummary = AnalyticsDatabase.getMonthlyProgress(currentYear, currentMonth, userId);

      if (monthlySummary && monthlySummary.length > 0) {
        setMonthlyData(monthlySummary);

        // Calculate monthly stats
        const monthTotalFood = monthlySummary.reduce((sum, day) => sum + (day.foodCalories || 0), 0);
        const monthTotalExercise = monthlySummary.reduce((sum, day) => sum + (day.exerciseCalories || 0), 0);
        const activeDays = monthlySummary.filter((day) => day.foodCalories > 0 || day.exerciseCalories > 0).length;
        const monthAvgNet = activeDays > 0 ? monthlySummary.reduce((sum, day) => sum + (day.netCalories || 0), 0) / activeDays : 0;

        setMonthlyStats({
          totalFoodCalories: monthTotalFood,
          totalExerciseCalories: monthTotalExercise,
          avgNetCalories: Math.round(monthAvgNet),
          daysOnTarget: monthlySummary.filter((day) => day.foodCalories > 0 && day.foodCalories <= 2000).length,
          totalDays: activeDays,
        });
      } else {
        setMonthlyData([]);
        setMonthlyStats({
          totalFoodCalories: 0,
          totalExerciseCalories: 0,
          avgNetCalories: 0,
          daysOnTarget: 0,
          totalDays: 0,
        });
      }

      // Load yearly data (last 12 months) - TAMBAHKAN userId
      const yearlySummary: MonthlyData[] = [];
      const currentDate = new Date(currentYear, currentMonth - 1, 1);

      for (let i = 0; i < 12; i++) {
        const monthDate = new Date(currentDate);
        monthDate.setMonth(currentDate.getMonth() - i);
        const year = monthDate.getFullYear();
        const month = monthDate.getMonth() + 1;

        const monthName = monthDate.toLocaleDateString("id-ID", { month: "short" });

        try {
          const monthData = AnalyticsDatabase.getMonthlyProgress(year, month, userId);

          if (monthData && monthData.length > 0) {
            const monthFoodTotal = monthData.reduce((sum, day) => sum + (day.foodCalories || 0), 0);
            const monthExerciseTotal = monthData.reduce((sum, day) => sum + (day.exerciseCalories || 0), 0);
            const monthNetTotal = monthData.reduce((sum, day) => sum + (day.netCalories || 0), 0);

            yearlySummary.unshift({
              date: `${monthName} ${year}`,
              foodCalories: monthFoodTotal,
              exerciseCalories: monthExerciseTotal,
              netCalories: monthNetTotal,
            });
          } else {
            yearlySummary.unshift({
              date: `${monthName} ${year}`,
              foodCalories: 0,
              exerciseCalories: 0,
              netCalories: 0,
            });
          }
        } catch (error) {
          console.error(`Error loading data for ${year}-${month}:`, error);
          yearlySummary.unshift({
            date: `${monthName} ${year}`,
            foodCalories: 0,
            exerciseCalories: 0,
            netCalories: 0,
          });
        }
      }

      setYearlyData(yearlySummary);

      // Calculate yearly stats
      if (yearlySummary.length > 0) {
        const totalFood = yearlySummary.reduce((sum, month) => sum + month.foodCalories, 0);
        const totalExercise = yearlySummary.reduce((sum, month) => sum + month.exerciseCalories, 0);
        const avgNet = yearlySummary.length > 0 ? yearlySummary.reduce((sum, month) => sum + month.netCalories, 0) / yearlySummary.length : 0;

        setYearlyStats({
          totalFoodCalories: totalFood,
          totalExerciseCalories: totalExercise,
          avgNetCalories: Math.round(avgNet),
          daysOnTarget: yearlySummary.filter((month) => month.foodCalories > 0).length,
          totalDays: yearlySummary.filter((month) => month.foodCalories > 0 || month.exerciseCalories > 0).length * 30,
        });
      } else {
        setYearlyStats({
          totalFoodCalories: 0,
          totalExerciseCalories: 0,
          avgNetCalories: 0,
          daysOnTarget: 0,
          totalDays: 0,
        });
      }

      // Get streak - TAMBAHKAN userId
      try {
        const currentStreak = AnalyticsDatabase.getCurrentStreak(userId);
        setStreak(currentStreak || 0);
      } catch (streakError) {
        console.error("Error getting streak:", streakError);
        setStreak(0);
      }

      // Get total statistics - TAMBAHKAN userId
      try {
        const stats = ProgressDatabase.getStatistics(userId);
        setTotalStats(
          stats || {
            totalCaloriesConsumed: 0,
            totalCaloriesBurned: 0,
            totalWorkouts: 0,
            currentStreak: 0,
            weeklyAvgCalories: 0,
            monthlyAvgCalories: 0,
            netCalories: 0,
          }
        );
      } catch (statsError) {
        console.error("Error getting statistics:", statsError);
        setTotalStats({
          totalCaloriesConsumed: 0,
          totalCaloriesBurned: 0,
          totalWorkouts: 0,
          currentStreak: 0,
          weeklyAvgCalories: 0,
          monthlyAvgCalories: 0,
          netCalories: 0,
        });
      }

      // Get macro distribution for selected month - TAMBAHKAN userId
      try {
        const monthStartStr = `${currentYear}-${currentMonth.toString().padStart(2, "0")}-01`;
        const lastDay = new Date(currentYear, currentMonth, 0).getDate();
        const monthEndStr = `${currentYear}-${currentMonth.toString().padStart(2, "0")}-${lastDay.toString().padStart(2, "0")}`;

        const macroData = AnalyticsDatabase.getMacroDistribution(monthStartStr, monthEndStr, userId);
        setMacroDistribution(
          macroData || {
            protein: 0,
            carbs: 0,
            fat: 0,
            total: 0,
          }
        );
      } catch (macroError) {
        console.error("Error getting macro distribution:", macroError);
        setMacroDistribution({
          protein: 0,
          carbs: 0,
          fat: 0,
          total: 0,
        });
      }
    } catch (error) {
      console.error("Error loading progress data:", error);
      setError("Gagal memuat data progress. Silakan coba lagi.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUserData().then(() => {
      if (userId) {
        loadProgressData();
      } else {
        setRefreshing(false);
      }
    });
  };

  const navigateToPreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const navigateToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const navigateToToday = () => {
    const today = new Date();
    setSelectedMonth(today.getMonth() + 1);
    setSelectedYear(today.getFullYear());
  };

  const getMonthName = (month: number) => {
    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    return monthNames[month - 1] || "";
  };

  const chartConfig = {
    backgroundColor: "#ffffff",
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "6",
      strokeWidth: "2",
      stroke: "#3b82f6",
    },
  };

  const getWeekDayLabels = () => {
    if (!weeklyData || weeklyData.length === 0) {
      return ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    }
    return weeklyData.map((item) => {
      const date = new Date(item.date);
      return date.toLocaleDateString("id-ID", { weekday: "narrow" });
    });
  };

  const getMonthlyLabels = () => {
    if (!monthlyData || monthlyData.length === 0) {
      return Array.from({ length: 10 }, (_, i) => (i + 1).toString());
    }

    // Only show dates that have data
    const dataWithDates = monthlyData.filter((item) => item.foodCalories > 0 || item.exerciseCalories > 0).slice(0, 10);

    if (dataWithDates.length === 0) {
      return Array.from({ length: 5 }, (_, i) => (i + 1).toString());
    }

    return dataWithDates.map((item) => {
      const date = new Date(item.date);
      return date.getDate().toString();
    });
  };

  const getYearlyLabels = () => {
    if (!yearlyData || yearlyData.length === 0) {
      return ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    }
    return yearlyData.map((item) => item.date.split(" ")[0]);
  };

  if (!userId && !loading) {
    return (
      <View style={styles.noUserContainer}>
        <View style={styles.noUserContent}>
          <Text style={styles.noUserIcon}>📊</Text>
          <Text style={styles.noUserTitle}>Progress Pribadi Anda</Text>
          <Text style={styles.noUserMessage}>Silakan login untuk melihat progress dan statistik kesehatan Anda</Text>
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
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Memuat progress {username}...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} showsVerticalScrollIndicator={false}>
      {/* HEADER SECTION */}
      <View style={styles.headerSection}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Progress {username}</Text>
            <Text style={styles.headerSubtitle}>Statistik dan grafik progress kesehatan Anda</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userId}>ID: {userId}</Text>
          </View>
        </View>

        {/* Quick Stats in Header */}
        <View style={styles.headerStats}>
          <View style={styles.headerStatItem}>
            <View style={[styles.statCircle, { backgroundColor: "#3b82f620" }]}>
              <Text style={[styles.headerStatValue, { color: "#3b82f6" }]}>{streak}</Text>
            </View>
            <Text style={styles.headerStatLabel}>Hari Streak</Text>
          </View>
          <View style={styles.headerStatItem}>
            <View style={[styles.statCircle, { backgroundColor: "#10b98120" }]}>
              <Text style={[styles.headerStatValue, { color: "#10b981" }]}>{totalStats?.totalWorkouts || 0}</Text>
            </View>
            <Text style={styles.headerStatLabel}>Total Workout</Text>
          </View>
          <View style={styles.headerStatItem}>
            <View style={[styles.statCircle, { backgroundColor: "#ef444420" }]}>
              <Text style={[styles.headerStatValue, { color: "#ef4444" }]}>{totalStats?.totalCaloriesBurned ? Math.round(totalStats.totalCaloriesBurned / 1000) : 0}k</Text>
            </View>
            <Text style={styles.headerStatLabel}>Kalori Bakar</Text>
          </View>
          <View style={styles.headerStatItem}>
            <View style={[styles.statCircle, { backgroundColor: "#8b5cf620" }]}>
              <Text style={[styles.headerStatValue, { color: "#8b5cf6" }]}>{totalStats?.totalCaloriesConsumed ? Math.round(totalStats.totalCaloriesConsumed / 1000) : 0}k</Text>
            </View>
            <Text style={styles.headerStatLabel}>Kalori Konsumsi</Text>
          </View>
        </View>
      </View>

      {error && (
        <View style={styles.errorSection}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorSubtext}>Pull down untuk refresh</Text>
        </View>
      )}

      {/* Monthly Navigation */}
      <View style={styles.monthNavigationSection}>
        <View style={styles.monthNavigation}>
          <Text style={styles.monthNavigationTitle}>Data Bulan:</Text>
          <View style={styles.monthNavigationControls}>
            <TouchableOpacity onPress={navigateToPreviousMonth}>
              <Text style={styles.monthNavButton}>◀</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={navigateToToday}>
              <Text style={styles.monthDisplay}>
                {getMonthName(selectedMonth)} {selectedYear}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={navigateToNextMonth} disabled={selectedMonth === new Date().getMonth() + 1 && selectedYear === new Date().getFullYear()}>
              <Text style={[styles.monthNavButton, selectedMonth === new Date().getMonth() + 1 && selectedYear === new Date().getFullYear() && styles.monthNavButtonDisabled]}>▶</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Weekly Progress Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Progress Minggu Ini</Text>
          <Text style={styles.sectionSubtitle}>7 hari terakhir - Data {username}</Text>
        </View>

        {weeklyStats && (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{weeklyStats.totalFoodCalories.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Kalori Makan</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{weeklyStats.totalExerciseCalories.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Kalori Bakar</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: weeklyStats.avgNetCalories > 0 ? "#ef4444" : "#10b981" }]}>
                {weeklyStats.avgNetCalories > 0 ? "+" : ""}
                {weeklyStats.avgNetCalories.toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>Rata-rata Net</Text>
            </View>
            <View style={styles.statItem}>
              <View style={styles.targetContainer}>
                <Text style={styles.statValue}>{weeklyStats.daysOnTarget}</Text>
                <Text style={styles.targetLabel}>/{weeklyStats.totalDays || 1}</Text>
              </View>
              <Text style={styles.statLabel}>Hari Target</Text>
            </View>
          </View>
        )}

        {weeklyData && weeklyData.length > 0 ? (
          <View style={styles.chartContainer}>
            <LineChart
              data={{
                labels: getWeekDayLabels(),
                datasets: [
                  {
                    data: weeklyData.map((item) => item.foodCalories || 0),
                    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                    strokeWidth: 3,
                  },
                  {
                    data: weeklyData.map((item) => item.exerciseCalories || 0),
                    color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                    strokeWidth: 3,
                  },
                ],
                legend: ["Kalori Makan", "Kalori Bakar"],
              }}
              width={screenWidth - 64}
              height={220}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                propsForBackgroundLines: {
                  strokeDasharray: "", // solid background lines
                },
              }}
              bezier
              style={styles.chart}
              withVerticalLines={false}
              withHorizontalLines={true}
              withInnerLines={false}
              fromZero={true}
            />
          </View>
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>Tidak ada data untuk minggu ini</Text>
            <Text style={styles.noDataSubtext}>Mulai tracking makanan dan latihan untuk melihat progress</Text>
          </View>
        )}
      </View>

      {/* Monthly Progress Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Progress Bulan {getMonthName(selectedMonth)}</Text>
          <Text style={styles.sectionSubtitle}>Kalori bersih per hari - {username}</Text>
        </View>

        {monthlyStats && (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{Math.round(monthlyStats.totalFoodCalories / 1000)}k</Text>
              <Text style={styles.statLabel}>Total Makan</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{Math.round(monthlyStats.totalExerciseCalories / 1000)}k</Text>
              <Text style={styles.statLabel}>Total Bakar</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: monthlyStats.avgNetCalories > 0 ? "#ef4444" : "#10b981" }]}>
                {monthlyStats.avgNetCalories > 0 ? "+" : ""}
                {monthlyStats.avgNetCalories.toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>Rata-rata Harian</Text>
            </View>
            <View style={styles.statItem}>
              <View style={styles.progressCircle}>
                <Text style={styles.progressText}>{monthlyStats.totalDays > 0 ? Math.round((monthlyStats.daysOnTarget / monthlyStats.totalDays) * 100) : 0}%</Text>
              </View>
              <Text style={styles.statLabel}>Sukses</Text>
            </View>
          </View>
        )}

        {monthlyData && monthlyData.length > 0 && monthlyData.some((item) => item.netCalories !== 0) ? (
          <View style={styles.chartContainer}>
            <BarChart
              data={{
                labels: getMonthlyLabels(),
                datasets: [
                  {
                    data: monthlyData
                      .filter((item) => item.netCalories !== 0)
                      .slice(0, 10)
                      .map((item) => item.netCalories || 0),
                  },
                ],
              }}
              width={screenWidth - 64}
              height={220}
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
                barPercentage: 0.7,
              }}
              style={styles.chart}
              showValuesOnTopOfBars={true}
              withCustomBarColorFromData={true}
              flatColor={true}
              fromZero={true}
            />
          </View>
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>Tidak ada data untuk bulan {getMonthName(selectedMonth)}</Text>
            <Text style={styles.noDataSubtext}>Data akan muncul setelah Anda mencatat aktivitas</Text>
          </View>
        )}
      </View>

      {/* Macronutrient Distribution for Selected Month */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Distribusi Makronutrien</Text>
          <Text style={styles.sectionSubtitle}>
            Bulan {getMonthName(selectedMonth)} {selectedYear} - {username}
          </Text>
        </View>

        <View style={styles.pieChartContainer}>
          {macroDistribution && (macroDistribution.protein > 0 || macroDistribution.carbs > 0 || macroDistribution.fat > 0) ? (
            <PieChart
              data={[
                {
                  name: "Protein",
                  population: Math.round(macroDistribution.protein || 0),
                  color: "#3b82f6",
                  legendFontColor: "#374151",
                  legendFontSize: 13,
                },
                {
                  name: "Karbohidrat",
                  population: Math.round(macroDistribution.carbs || 0),
                  color: "#10b981",
                  legendFontColor: "#374151",
                  legendFontSize: 13,
                },
                {
                  name: "Lemak",
                  population: Math.round(macroDistribution.fat || 0),
                  color: "#f59e0b",
                  legendFontColor: "#374151",
                  legendFontSize: 13,
                },
              ]}
              width={screenWidth - 64}
              height={200}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
              hasLegend={true}
            />
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>Tidak ada data makronutrien</Text>
              <Text style={styles.noDataSubtext}>Mulai tracking makanan dengan detail nutrisi</Text>
            </View>
          )}
        </View>

        {macroDistribution && (macroDistribution.protein > 0 || macroDistribution.carbs > 0 || macroDistribution.fat > 0) && (
          <View style={styles.macroDetails}>
            <View style={styles.macroRow}>
              <View style={[styles.macroDot, { backgroundColor: "#3b82f6" }]} />
              <Text style={styles.macroText}>
                Protein: <Text style={styles.macroValue}>{Math.round(macroDistribution.protein || 0)}%</Text>
              </Text>
              <Text style={styles.macroGram}>{Math.round(((macroDistribution.total || 0) * (macroDistribution.protein || 0)) / 100)}g</Text>
            </View>
            <View style={styles.macroRow}>
              <View style={[styles.macroDot, { backgroundColor: "#10b981" }]} />
              <Text style={styles.macroText}>
                Karbohidrat: <Text style={styles.macroValue}>{Math.round(macroDistribution.carbs || 0)}%</Text>
              </Text>
              <Text style={styles.macroGram}>{Math.round(((macroDistribution.total || 0) * (macroDistribution.carbs || 0)) / 100)}g</Text>
            </View>
            <View style={styles.macroRow}>
              <View style={[styles.macroDot, { backgroundColor: "#f59e0b" }]} />
              <Text style={styles.macroText}>
                Lemak: <Text style={styles.macroValue}>{Math.round(macroDistribution.fat || 0)}%</Text>
              </Text>
              <Text style={styles.macroGram}>{Math.round(((macroDistribution.total || 0) * (macroDistribution.fat || 0)) / 100)}g</Text>
            </View>
          </View>
        )}
      </View>

      {/* Yearly Progress Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Progress 12 Bulan Terakhir</Text>
          <Text style={styles.sectionSubtitle}>Total kalori per bulan - {username}</Text>
        </View>

        {yearlyStats && (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{Math.round(yearlyStats.totalFoodCalories / 1000000)}jt</Text>
              <Text style={styles.statLabel}>Total Makan</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{Math.round(yearlyStats.totalExerciseCalories / 1000000)}jt</Text>
              <Text style={styles.statLabel}>Total Bakar</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: yearlyStats.avgNetCalories > 0 ? "#ef4444" : "#10b981" }]}>
                {yearlyStats.avgNetCalories > 0 ? "+" : ""}
                {Math.round(yearlyStats.avgNetCalories / 1000)}k
              </Text>
              <Text style={styles.statLabel}>Rata-rata Bulanan</Text>
            </View>
          </View>
        )}

        {yearlyData && yearlyData.length > 0 && yearlyData.some((item) => item.foodCalories > 0) ? (
          <View style={styles.chartContainer}>
            <LineChart
              data={{
                labels: getYearlyLabels(),
                datasets: [
                  {
                    data: yearlyData.map((item) => Math.round(item.foodCalories / 1000)),
                    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                    strokeWidth: 3,
                  },
                ],
                legend: ["Kalori Makan (ribuan)"],
              }}
              width={screenWidth - 64}
              height={220}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
              }}
              bezier
              style={styles.chart}
              withVerticalLines={false}
              fromZero={true}
            />
          </View>
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>Tidak ada data untuk 12 bulan terakhir</Text>
            <Text style={styles.noDataSubtext}>Konsisten tracking untuk melihat progress jangka panjang</Text>
          </View>
        )}
      </View>

      {/* Progress Tips */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tips untuk Progress Lebih Baik</Text>

        <View style={styles.tipsContainer}>
          <View style={styles.tipItem}>
            <View style={styles.tipIconContainer}>
              <Text style={styles.tipIcon}>📊</Text>
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Track Konsisten</Text>
              <Text style={styles.tipText}>Catat semua makanan dan latihan setiap hari untuk data yang akurat</Text>
            </View>
          </View>
          <View style={styles.tipItem}>
            <View style={styles.tipIconContainer}>
              <Text style={styles.tipIcon}>💧</Text>
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Hidrasi Optimal</Text>
              <Text style={styles.tipText}>Minum 2L air per hari untuk metabolisme yang lebih baik</Text>
            </View>
          </View>
          <View style={styles.tipItem}>
            <View style={styles.tipIconContainer}>
              <Text style={styles.tipIcon}>🏃</Text>
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Variasi Latihan</Text>
              <Text style={styles.tipText}>Gabungkan cardio, strength, dan flexibility training</Text>
            </View>
          </View>
          <View style={styles.tipItem}>
            <View style={styles.tipIconContainer}>
              <Text style={styles.tipIcon}>🥗</Text>
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Nutrisi Seimbang</Text>
              <Text style={styles.tipText}>Prioritaskan protein, karbohidrat kompleks, dan lemak sehat</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Empty space at bottom */}
      <View style={styles.bottomSpace} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6b7280",
  },
  // NO USER CONTAINER
  noUserContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    padding: 20,
  },
  noUserContent: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 40,
    borderRadius: 20,
    width: "100%",
    maxWidth: 350,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  noUserIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  noUserTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 12,
    textAlign: "center",
  },
  noUserMessage: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 30,
  },
  loginButton: {
    backgroundColor: "#3b82f6",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  // HEADER STYLES
  headerSection: {
    backgroundColor: "#ffffff",
    padding: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1f2937",
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: "#6b7280",
    lineHeight: 20,
  },
  userInfo: {
    alignItems: "flex-end",
  },
  userId: {
    fontSize: 12,
    color: "#9ca3af",
    fontStyle: "italic",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  lastUpdated: {
    fontSize: 12,
    color: "#9ca3af",
    fontStyle: "italic",
  },
  headerStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerStatItem: {
    alignItems: "center",
    flex: 1,
  },
  statCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  headerStatValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  headerStatLabel: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    fontWeight: "500",
  },
  // MONTH NAVIGATION
  monthNavigationSection: {
    backgroundColor: "#ffffff",
    marginTop: 8,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  monthNavigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  monthNavigationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4b5563",
  },
  monthNavigationControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  monthNavButton: {
    fontSize: 18,
    fontWeight: "600",
    color: "#3b82f6",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  monthNavButtonDisabled: {
    opacity: 0.3,
  },
  monthDisplay: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    minWidth: 140,
    textAlign: "center",
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
  },
  errorSection: {
    backgroundColor: "#fee2e2",
    margin: 16,
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: "#dc2626",
  },
  errorText: {
    fontSize: 16,
    color: "#dc2626",
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  errorSubtext: {
    fontSize: 14,
    color: "#7f1d1d",
    textAlign: "center",
  },
  // SECTION STYLES
  section: {
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#6b7280",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    flexWrap: "wrap",
    gap: 12,
  },
  statItem: {
    alignItems: "center",
    minWidth: "23%",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    fontWeight: "500",
  },
  targetContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  targetLabel: {
    fontSize: 14,
    color: "#9ca3af",
    marginLeft: 2,
  },
  progressCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#10b98120",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#10b981",
  },
  chartContainer: {
    alignItems: "center",
    backgroundColor: "#f8fafc",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 12,
  },
  chart: {
    borderRadius: 12,
  },
  noDataContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    marginVertical: 8,
  },
  noDataText: {
    textAlign: "center",
    color: "#9ca3af",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  noDataSubtext: {
    textAlign: "center",
    color: "#6b7280",
    fontSize: 14,
    lineHeight: 20,
  },
  pieChartContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  macroDetails: {
    marginTop: 16,
    padding: 16,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  macroRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    justifyContent: "space-between",
  },
  macroDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  macroText: {
    fontSize: 15,
    color: "#4b5563",
    flex: 1,
  },
  macroValue: {
    fontWeight: "700",
    color: "#1f2937",
  },
  macroGram: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  // TIPS SECTION
  tipsContainer: {
    marginTop: 8,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
    backgroundColor: "#f0f9ff",
    padding: 16,
    borderRadius: 12,
  },
  tipIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#3b82f620",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  tipIcon: {
    fontSize: 18,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1e40af",
    marginBottom: 4,
  },
  tipText: {
    fontSize: 14,
    color: "#1e40af",
    lineHeight: 20,
    opacity: 0.9,
  },
  bottomSpace: {
    height: 40,
  },
});

export default ProgressCharts;