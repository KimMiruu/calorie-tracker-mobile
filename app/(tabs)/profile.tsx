// app/(tabs)/profile.tsx
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { GoalsDatabase, initDB, UserDatabase } from "../db";

type UserRow = {
  id_user?: number;
  username?: string;
  email?: string;
  usia?: number | null;
  berat?: number | null; // kg
  tinggi?: number | null; // cm
  jenis_kelamin?: string | null;
  target_kalori?: number | null;
};

export default function ProfileScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserRow | null>(null);
  const [weightKg, setWeightKg] = useState<string>("");
  const [heightCm, setHeightCm] = useState<string>("");
  const [targetKaloriText, setTargetKaloriText] = useState<string>("");

  const [bmiValue, setBmiValue] = useState<number | null>(null);
  const [bmiCategory, setBmiCategory] = useState<string>("");

  // Function untuk load user yang sudah login
  const loadCurrentUser = async () => {
    try {
      setLoading(true);

      console.log("🔄 Mencari data user di AsyncStorage...");

      // Cek semua kemungkinan key di AsyncStorage
      const allKeys = await AsyncStorage.getAllKeys();
      console.log("🔑 Keys di AsyncStorage:", allKeys);

      // Prioritas pencarian:
      // 1. user_id (langsung)
      // 2. loggedInUser (JSON)
      // 3. user_email

      // 1. Coba dari user_id langsung
      const userIdStr = await AsyncStorage.getItem("user_id");
      console.log("📌 user_id dari AsyncStorage:", userIdStr);

      if (userIdStr) {
        const userId = parseInt(userIdStr, 10);
        if (!isNaN(userId)) {
          const userData = UserDatabase.getUserById(userId);
          console.log("👤 User by user_id:", userData);
          if (userData) {
            handleSetUserFromRow(userData);
            // Pastikan email juga disimpan
            if (userData.email) {
              await AsyncStorage.setItem("user_email", userData.email);
            }
            setLoading(false);
            return;
          }
        }
      }

      // 2. Coba dari loggedInUser (format JSON)
      const loggedInUserStr = await AsyncStorage.getItem("loggedInUser");
      console.log("📄 loggedInUser string:", loggedInUserStr);

      if (loggedInUserStr) {
        try {
          const loggedInUser = JSON.parse(loggedInUserStr);
          console.log("📊 Parsed loggedInUser:", loggedInUser);

          // Coba dengan id_user terlebih dahulu
          if (loggedInUser?.id_user) {
            const userId = parseInt(loggedInUser.id_user, 10);
            if (!isNaN(userId)) {
              const userData = UserDatabase.getUserById(userId);
              console.log("👤 User data by ID from loggedInUser:", userData);
              if (userData) {
                handleSetUserFromRow(userData);
                // Simpan ke key yang lebih sederhana untuk akses cepat
                await AsyncStorage.setItem("user_id", String(userData.id_user));
                await AsyncStorage.setItem("user_email", userData.email || "");
                setLoading(false);
                return;
              }
            }
          }

          // Coba dengan email
          if (loggedInUser?.email) {
            const userData = UserDatabase.getUserByEmail(loggedInUser.email);
            console.log("👤 User data by email from loggedInUser:", userData);
            if (userData) {
              handleSetUserFromRow(userData);
              // Simpan ke key yang lebih sederhana
              await AsyncStorage.setItem("user_id", String(userData.id_user || ""));
              await AsyncStorage.setItem("user_email", userData.email || "");
              setLoading(false);
              return;
            }
          }

          // Coba dengan username jika tidak ada email
          if (loggedInUser?.username && !loggedInUser?.email) {
            // Cari user berdasarkan username (ini tidak ada di database, perlu tambahan)
            console.log("⚠️ Mencari dengan username:", loggedInUser.username);
          }
        } catch (parseError) {
          console.error("❌ Error parsing loggedInUser:", parseError);
        }
      }

      // 3. Coba dari user_email
      const userEmail = await AsyncStorage.getItem("user_email");
      console.log("📧 user_email dari AsyncStorage:", userEmail);

      if (userEmail) {
        const userData = UserDatabase.getUserByEmail(userEmail);
        console.log("👤 User by email:", userData);
        if (userData) {
          handleSetUserFromRow(userData);
          // Simpan juga user_id
          if (userData.id_user) {
            await AsyncStorage.setItem("user_id", String(userData.id_user));
          }
          setLoading(false);
          return;
        }
      }

      // 4. Coba cari user dari semua kemungkinan key
      console.log("🔍 Mencari user dari semua keys...");
      for (const key of allKeys) {
        if (key.includes("user") || key.includes("email") || key.includes("id") || key.includes("login")) {
          const value = await AsyncStorage.getItem(key);
          console.log(`   ${key}: ${value}`);

          // Coba parse sebagai JSON
          try {
            const parsed = JSON.parse(value || "");
            if (parsed) {
              console.log(`   📊 Parsed ${key}:`, parsed);

              if (parsed.id_user || parsed.id) {
                const userId = parsed.id_user || parsed.id;
                const userData = UserDatabase.getUserById(userId);
                if (userData) {
                  console.log(`   ✅ Found user from ${key} by id:`, userData);
                  handleSetUserFromRow(userData);
                  setLoading(false);
                  return;
                }
              }

              if (parsed.email) {
                const userData = UserDatabase.getUserByEmail(parsed.email);
                if (userData) {
                  console.log(`   ✅ Found user from ${key} by email:`, userData);
                  handleSetUserFromRow(userData);
                  setLoading(false);
                  return;
                }
              }
            }
          } catch {
            // Skip jika bukan JSON
            console.log(`   ⚠️ ${key} is not JSON`);
          }
        }
      }

      // Jika tidak ditemukan, user belum login
      console.log("❌ Tidak ditemukan data user login");
      setUser(null);
    } catch (error) {
      console.error("❌ Error loading current user:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initDB();
    loadCurrentUser();
  }, []);

  // Refresh data setiap 30 detik
  useEffect(() => {
    const interval = setInterval(() => {
      loadCurrentUser();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleSetUserFromRow = (row: any) => {
    console.log("🔄 Setting user from row:", row);

    const normalized: UserRow = {
      id_user: row?.id_user ?? row?.id ?? undefined,
      username: row?.username ?? row?.name ?? undefined,
      email: row?.email ?? undefined,
      usia: row?.usia ?? null,
      berat: row?.berat != null ? Number(row.berat) : null,
      tinggi: row?.tinggi != null ? Number(row.tinggi) : null,
      jenis_kelamin: row?.jenis_kelamin ?? null,
      target_kalori: row?.target_kalori != null ? Number(row.target_kalori) : null,
    };

    console.log("✅ Normalized user data:", normalized);
    setUser(normalized);

    // Isi form dengan data dari database
    if (normalized.berat != null) {
      setWeightKg(String(normalized.berat));
      console.log("⚖️ Set berat:", normalized.berat);
    }
    if (normalized.tinggi != null) {
      setHeightCm(String(normalized.tinggi));
      console.log("📏 Set tinggi:", normalized.tinggi);
    }
    if (normalized.target_kalori != null) {
      setTargetKaloriText(String(normalized.target_kalori));
      console.log("🔥 Set target kalori:", normalized.target_kalori);
    }

    // Hitung BMI jika ada data berat dan tinggi
    if (normalized.berat != null && normalized.tinggi != null) {
      computeAndSetBMI(Number(normalized.berat), Number(normalized.tinggi));
    } else {
      console.log("⚠️ Tidak ada data berat/tinggi untuk hitung BMI");
      setBmiValue(null);
      setBmiCategory("");
    }
  };

  const computeAndSetBMI = (weightKgNum: number, heightCmNum: number) => {
    if (!weightKgNum || !heightCmNum) {
      setBmiValue(null);
      setBmiCategory("");
      return;
    }
    const heightM = heightCmNum / 100;
    if (heightM <= 0) {
      setBmiValue(null);
      setBmiCategory("");
      return;
    }
    const bmi = weightKgNum / (heightM * heightM);
    const rounded = Math.round(bmi * 10) / 10;
    setBmiValue(rounded);

    let category = "";
    if (bmi < 18.5) category = "Underweight (Kurus)";
    else if (bmi < 25) category = "Normal (Sehat)";
    else if (bmi < 30) category = "Overweight (Kelebihan berat badan)";
    else category = "Obese (Obesitas)";

    setBmiCategory(category);
    console.log("🧮 BMI calculated:", rounded, category);
  };

  const handleCalculateBMI = () => {
    const w = parseFloat(weightKg);
    const h = parseFloat(heightCm);
    if (isNaN(w) || w <= 0) {
      Alert.alert("Input salah", "Masukkan berat badan (kg) yang valid.");
      return;
    }
    if (isNaN(h) || h <= 0) {
      Alert.alert("Input salah", "Masukkan tinggi badan (cm) yang valid.");
      return;
    }
    computeAndSetBMI(w, h);
  };

  const handleSaveWeightHeightToProfile = () => {
    if (!user?.id_user) {
      Alert.alert("Error", "Tidak dapat menyimpan. Pastikan Anda sudah login.");
      return;
    }

    const w = parseFloat(weightKg);
    const h = parseFloat(heightCm);

    if (isNaN(w) || w <= 0) {
      Alert.alert("Input salah", "Masukkan berat badan (kg) yang valid.");
      return;
    }

    if (isNaN(h) || h <= 0) {
      Alert.alert("Input salah", "Masukkan tinggi badan (cm) yang valid.");
      return;
    }

    try {
      UserDatabase.updateUserProfile(user.id_user, { berat: w, tinggi: h });
      // Update state user dengan data baru
      const updatedUser = UserDatabase.getUserById(user.id_user);
      handleSetUserFromRow(updatedUser);
      Alert.alert("Berhasil", "Data berat dan tinggi berhasil disimpan.");
    } catch (err) {
      console.error("Error saving weight/height:", err);
      Alert.alert("Error", "Gagal menyimpan data.");
    }
  };

  const handleSaveTargetKalori = () => {
    if (!user?.id_user) {
      Alert.alert("Error", "Tidak dapat menyimpan. Pastikan Anda sudah login.");
      return;
    }

    const t = parseFloat(targetKaloriText);
    if (isNaN(t) || t <= 0) {
      Alert.alert("Input salah", "Masukkan target kalori yang valid (kcal).");
      return;
    }

    try {
      // 1. Update target_kalori di tabel users
      UserDatabase.updateUserProfile(user.id_user, { target_kalori: t });

      // 2. Update juga daily_goals untuk hari ini
      const today = new Date().toISOString().split("T")[0];
      const existingGoal = GoalsDatabase.getDailyGoal(today);

      GoalsDatabase.setDailyGoal({
        date: today,
        calorieGoal: t,
        proteinGoal: existingGoal?.proteinGoal ?? 0,
        carbsGoal: existingGoal?.carbsGoal ?? 0,
        fatGoal: existingGoal?.fatGoal ?? 0,
      });

      // 3. Update state user dengan data baru
      const updatedUser = UserDatabase.getUserById(user.id_user);
      handleSetUserFromRow(updatedUser);

      Alert.alert("Berhasil", "Target kalori berhasil disimpan.");
    } catch (err) {
      console.error("Error saving target_kalori:", err);
      Alert.alert("Error", "Gagal menyimpan target kalori.");
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Yakin ingin keluar dari akun ini?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await AsyncStorage.multiRemove(["loggedInUser", "user_id", "user_email", "isLoggedIn"]);
            setUser(null);
            setWeightKg("");
            setHeightCm("");
            setTargetKaloriText("");
            setBmiValue(null);
            setBmiCategory("");
            router.replace("/login");
          } catch (e) {
            console.error("Logout error:", e);
            Alert.alert("Error", "Gagal logout, coba lagi.");
          }
        },
      },
    ]);
  };

  const handleGoToLogin = () => {
    router.push("/login");
  };

  // Fungsi debug untuk melihat data AsyncStorage
  const debugAsyncStorage = async () => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      console.log("=== 🐛 DEBUG AsyncStorage ===");
      console.log("Total keys:", allKeys.length);

      for (const key of allKeys) {
        const value = await AsyncStorage.getItem(key);
        console.log(`${key}: ${value}`);
      }

      console.log("=== 🐛 END DEBUG ===");

      // Coba cek database juga
      console.log("=== 🗄️ Checking Database ===");
      const allUsers = UserDatabase.getAllUsers();
      console.log("Total users in DB:", allUsers.length);
      console.log("Users:", allUsers);

      Alert.alert("Debug Info", `Found ${allKeys.length} keys in AsyncStorage\n${allUsers.length} users in database.\nCheck console for details.`);
    } catch (error) {
      console.error("Debug error:", error);
    }
  };

  const initials = (name?: string) => {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return (parts[0][0] + parts[1][0]).slice(0, 2).toUpperCase();
  };

  const displayName = user?.username || user?.email?.split("@")[0] || "User";

  return (
    <ThemedView style={styles.container}>
      {/* Header gradient */}
      <LinearGradient colors={["#10B981", "#3B82F6"]} style={styles.headerGradient}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              <ThemedText style={styles.avatarText}>{initials(displayName)}</ThemedText>
            </View>
            <View>
              <ThemedText style={styles.headerTitle}>Profil Saya</ThemedText>
              <ThemedText style={styles.headerSubtitle}>{displayName}</ThemedText>
            </View>
          </View>

          <View style={styles.headerRight}>
            {user && (
              <TouchableOpacity onPress={debugAsyncStorage} style={styles.debugButton}>
                <Ionicons name="bug-outline" size={16} color="#fff" />
              </TouchableOpacity>
            )}
            {user ? (
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={18} color="#fff" />
                <ThemedText style={styles.logoutText}>Logout</ThemedText>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.loginButton} onPress={handleGoToLogin}>
                <Ionicons name="log-in-outline" size={18} color="#fff" />
                <ThemedText style={styles.logoutText}>Login</ThemedText>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Account info + target kalori */}
        <View style={[styles.card, styles.cardAccount]}>
          <View style={styles.cardHeaderRow}>
            <ThemedText type="subtitle" style={styles.cardTitle}>
              Akun & Target
            </ThemedText>
            <View style={styles.chip}>
              <Ionicons name="flame-outline" size={14} color="#f97316" />
              <ThemedText style={styles.chipText}>Kalori</ThemedText>
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ThemedText style={styles.loadingText}>Memuat data profil...</ThemedText>
            </View>
          ) : user ? (
            <>
              <View style={styles.row}>
                <ThemedText style={styles.label}>Username</ThemedText>
                <ThemedText style={styles.value}>{user.username ?? "—"}</ThemedText>
              </View>
              <View style={styles.row}>
                <ThemedText style={styles.label}>Email</ThemedText>
                <ThemedText style={styles.value}>{user.email ?? "—"}</ThemedText>
              </View>
              <View style={styles.row}>
                <ThemedText style={styles.label}>Usia</ThemedText>
                <ThemedText style={styles.value}>
                  {user.usia ?? "—"} {user.usia ? "th" : ""}
                </ThemedText>
              </View>
              <View style={styles.row}>
                <ThemedText style={styles.label}>Jenis Kelamin</ThemedText>
                <ThemedText style={styles.value}>{user.jenis_kelamin ?? "—"}</ThemedText>
              </View>

              <View style={styles.targetSection}>
                <ThemedText style={styles.smallLabel}>Target Kalori Harian (kcal)</ThemedText>
                <TextInput value={targetKaloriText} onChangeText={setTargetKaloriText} placeholder="Contoh: 2000" placeholderTextColor="#94a3b8" keyboardType="numeric" style={[styles.input, styles.inputAccent]} />
                <TouchableOpacity style={styles.saveButton} onPress={handleSaveTargetKalori}>
                  <Ionicons name="save-outline" size={18} color="#fff" />
                  <ThemedText style={styles.saveButtonText}>Simpan Target</ThemedText>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.notLoggedInContainer}>
              <ThemedText style={styles.notLoggedInText}>Anda belum login</ThemedText>
              <ThemedText style={styles.notLoggedInSubtext}>Silakan login untuk mengakses profil Anda</ThemedText>

              <TouchableOpacity style={styles.loginButtonLarge} onPress={handleGoToLogin}>
                <Ionicons name="log-in-outline" size={20} color="#fff" />
                <ThemedText style={styles.loginButtonText}>Login / Daftar</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.loginButtonLarge, styles.debugButtonLarge]} onPress={debugAsyncStorage}>
                <Ionicons name="bug-outline" size={20} color="#fff" />
                <ThemedText style={styles.loginButtonText}>Debug Info</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.loginButtonLarge, styles.refreshButton]} onPress={loadCurrentUser}>
                <Ionicons name="refresh-outline" size={20} color="#fff" />
                <ThemedText style={styles.loginButtonText}>Refresh Data</ThemedText>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* BMI Calculator - hanya tampil jika user sudah login */}
        {user && (
          <View style={[styles.card, styles.cardBmi]}>
            <View style={styles.cardHeaderRow}>
              <ThemedText type="subtitle" style={styles.cardTitle}>
                Kalkulator BMI
              </ThemedText>
              <View style={[styles.chip, styles.chipBlue]}>
                <Ionicons name="body-outline" size={14} color="#3b82f6" />
                <ThemedText style={[styles.chipText, styles.chipTextBlue]}>Kesehatan</ThemedText>
              </View>
            </View>

            <View style={styles.bmiInputs}>
              <View style={styles.bmiInput}>
                <ThemedText style={styles.smallLabel}>Berat (kg)</ThemedText>
                <TextInput value={weightKg} onChangeText={setWeightKg} placeholder="Contoh: 70" placeholderTextColor="#94a3b8" keyboardType="numeric" style={styles.input} />
              </View>

              <View style={styles.bmiInput}>
                <ThemedText style={styles.smallLabel}>Tinggi (cm)</ThemedText>
                <TextInput value={heightCm} onChangeText={setHeightCm} placeholder="Contoh: 170" placeholderTextColor="#94a3b8" keyboardType="numeric" style={styles.input} />
              </View>
            </View>

            <View style={styles.bmiButtons}>
              <TouchableOpacity style={styles.calculateButton} onPress={handleCalculateBMI}>
                <Ionicons name="calculator-outline" size={18} color="#fff" />
                <ThemedText style={styles.calculateButtonText}>Hitung BMI</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveProfileButton} onPress={handleSaveWeightHeightToProfile}>
                <Ionicons name="save-outline" size={18} color="#3B82F6" />
                <ThemedText style={styles.saveProfileButtonText}>Simpan ke Profil</ThemedText>
              </TouchableOpacity>
            </View>

            <View style={styles.bmiResults}>
              <View style={styles.resultRow}>
                <ThemedText style={styles.resultLabel}>Nilai BMI</ThemedText>
                <ThemedText style={styles.resultValue}>{bmiValue != null ? bmiValue : "—"}</ThemedText>
              </View>
              <View style={styles.resultRow}>
                <ThemedText style={styles.resultLabel}>Kategori</ThemedText>
                <ThemedText style={[styles.resultValue, bmiValue ? styles.resultCategory : undefined]}>{bmiCategory || "—"}</ThemedText>
              </View>
            </View>

            <ThemedText style={styles.noteText}>Kategori WHO: &lt;18.5 Kurus, 18.5–24.9 Normal, 25–29.9 Overweight, ≥30 Obesitas.</ThemedText>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e0f2fe",
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },
  avatarText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
  },
  headerTitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500",
  },
  headerSubtitle: {
    fontSize: 20,
    color: "#fff",
    fontWeight: "800",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(248,113,113,0.95)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  loginButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(59,130,246,0.95)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  debugButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(139, 92, 246, 0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: {
    color: "#fff",
    fontWeight: "700",
    marginLeft: 6,
    fontSize: 13,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
  },
  loadingText: {
    color: "#64748b",
    fontSize: 14,
  },
  notLoggedInContainer: {
    padding: 20,
    alignItems: "center",
  },
  notLoggedInText: {
    color: "#64748b",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  notLoggedInSubtext: {
    color: "#94a3b8",
    fontSize: 14,
    marginBottom: 20,
    textAlign: "center",
  },
  loginButtonLarge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3B82F6",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    width: "100%",
    justifyContent: "center",
    marginBottom: 12,
  },
  debugButtonLarge: {
    backgroundColor: "#8B5CF6",
  },
  refreshButton: {
    backgroundColor: "#10B981",
  },
  loginButtonText: {
    color: "#fff",
    fontWeight: "700",
    marginLeft: 8,
    fontSize: 14,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 3,
  },
  cardAccount: {
    borderLeftWidth: 4,
    borderLeftColor: "#10B981",
  },
  cardBmi: {
    borderLeftWidth: 4,
    borderLeftColor: "#3B82F6",
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fffbeb",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  chipBlue: {
    backgroundColor: "#eff6ff",
  },
  chipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#f97316",
    marginLeft: 4,
  },
  chipTextBlue: {
    color: "#2563eb",
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  label: {
    color: "#64748b",
    fontSize: 14,
  },
  value: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },

  targetSection: {
    marginTop: 16,
  },
  bmiInputs: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  },
  bmiInput: {
    flex: 1,
  },
  bmiButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  bmiResults: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },

  smallLabel: {
    color: "#64748b",
    fontSize: 13,
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: "#1e293b",
  },
  inputAccent: {
    borderColor: "#fed7aa",
    backgroundColor: "#fff7ed",
  },

  saveButton: {
    backgroundColor: "#3B82F6",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 8,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "700",
    marginLeft: 8,
    fontSize: 14,
  },

  calculateButton: {
    backgroundColor: "#3B82F6",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    flex: 1,
  },
  calculateButtonText: {
    color: "#fff",
    fontWeight: "700",
    marginLeft: 8,
    fontSize: 14,
  },

  saveProfileButton: {
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    flexDirection: "row",
    flex: 1,
  },
  saveProfileButtonText: {
    color: "#3B82F6",
    fontWeight: "700",
    marginLeft: 8,
    fontSize: 14,
  },

  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  resultLabel: {
    color: "#64748b",
    fontSize: 14,
  },
  resultValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  resultCategory: {
    color: "#3B82F6",
  },

  noteText: {
    color: "#94a3b8",
    fontSize: 12,
    fontStyle: "italic",
  },
});