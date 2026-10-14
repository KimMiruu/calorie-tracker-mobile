// app/login.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import * as React from "react";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Animated, Easing, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { executeParamQuery, initDB, listTables } from "./db";

interface User {
  id_user: number;
  username: string;
  email: string;
  password: string;
  usia?: number;
  berat?: number;
  tinggi?: number;
  jenis_kelamin?: string;
  target_kalori?: number;
  created_at: string;
}

const LoginScreen = () => {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Animasi values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];
  const scaleAnim = useState(new Animated.Value(0.9))[0];
  const logoScale = useState(new Animated.Value(0))[0];
  const logoRotate = useState(new Animated.Value(0))[0];

  useEffect(() => {
    try {
      const ok = initDB();
      console.log("initDB returned (Login):", ok);
      console.log("Current tables after init (Login):", listTables());
      setReady(ok);
      if (!ok) {
        Alert.alert("Storage error", "Database tidak dapat diinisialisasi di environment ini.");
      }
    } catch (e) {
      console.error("DB init error in LoginScreen:", e);
      setReady(false);
      Alert.alert("Database error", "Gagal menginisialisasi database.");
    }

    // Start animations when component mounts
    startAnimations();
  }, []);

  const startAnimations = () => {
    // Logo animation
    Animated.parallel([
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.elastic(1.2),
      }),
      Animated.timing(logoRotate, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
        easing: Easing.linear,
      }),
    ]).start();

    // Form animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleLogin = async () => {
    if (!ready) {
      Alert.alert("Tunggu", "Database belum siap. Coba lagi sebentar.");
      return;
    }

    // Validasi input
    if (!email || !password) {
      Alert.alert("Error", "Email dan password harus diisi");
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert("Error", "Format email tidak valid");
      return;
    }

    setIsLoading(true);
    try {
      const users = executeParamQuery("SELECT * FROM users WHERE email = ? AND password = ?", [email, password]) as User[];

      if (users && users.length > 0) {
        const user = users[0];

        await AsyncStorage.setItem(
  "user",
  JSON.stringify({
    id: user.id_user,
    email: user.email,
    username: user.username,
  })
);

        // ============ INI YANG PERLU DITAMBAHKAN ============
        // Simpan data user ke AsyncStorage untuk dipakai di profile screen
        console.log("✅ Login berhasil, menyimpan data user ke AsyncStorage...");
        console.log("📋 User data:", user);

        // Simpan data ke AsyncStorage dengan MULTIPLE KEYS
        try {
          // 1. Simpan sebagai JSON di loggedInUser
          await AsyncStorage.setItem(
            "loggedInUser",
            JSON.stringify({
              id_user: user.id_user,
              email: user.email,
              username: user.username,
              createdAt: new Date().toISOString(),
            })
          );

          // 2. Simpan user_id secara terpisah
          await AsyncStorage.setItem("user_id", String(user.id_user));

          // 3. Simpan email secara terpisah
          await AsyncStorage.setItem("user_email", user.email);

          // 4. Simpan status login
          await AsyncStorage.setItem("isLoggedIn", "true");

          console.log("✅ Data user berhasil disimpan ke AsyncStorage");
          console.log("🔑 Keys yang disimpan: loggedInUser, user_id, user_email, isLoggedIn");

          // Verifikasi penyimpanan
          const savedUserId = await AsyncStorage.getItem("user_id");
          console.log("✅ Verifikasi: user_id di AsyncStorage:", savedUserId);
        } catch (storageError) {
          console.error("❌ Error menyimpan ke AsyncStorage:", storageError);
          Alert.alert("Warning", "Login berhasil tapi ada masalah menyimpan session.");
        }
        // ============ END OF ADDED CODE ============

        // Success animation
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.05,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start(() => {
          Alert.alert("Success", `Selamat datang ${user.username || user.email}!`);
          router.replace("/(tabs)");
        });
      } else {
        // Error animation
        Animated.sequence([
          Animated.timing(slideAnim, {
            toValue: 10,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: -10,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();
        Alert.alert("Error", "Email atau password salah");
      }
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert("Error", "Terjadi kesalahan saat login");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterRedirect = () => {
    router.push("/register");
  };

  const logoSpin = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Animated Logo */}
        <View style={styles.header}>
          <Animated.View
            style={[
              styles.logoContainer,
              {
                transform: [{ scale: logoScale }, { rotate: logoSpin }],
              },
            ]}
          >
            <Text style={styles.logo}>💪</Text>
          </Animated.View>
          <Animated.Text style={[styles.title, { opacity: fadeAnim }]}>SimpleFit</Animated.Text>
          <Animated.Text style={[styles.subtitle, { opacity: fadeAnim }]}>Login ke Akun Anda</Animated.Text>
        </View>

        {/* Animated Form */}
        <Animated.View
          style={[
            styles.formContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          <Animated.View style={[styles.inputGroup, { opacity: fadeAnim }]}>
            <Text style={styles.label}>Email</Text>
            <TextInput style={styles.input} placeholder="Masukkan email Anda" placeholderTextColor="#9ca3af" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
          </Animated.View>

          <Animated.View style={[styles.inputGroup, { opacity: fadeAnim }]}>
            <Text style={styles.label}>Password</Text>
            <TextInput style={styles.input} placeholder="Masukkan password Anda" placeholderTextColor="#9ca3af" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
          </Animated.View>

          <Animated.View style={{ opacity: fadeAnim }}>
            <TouchableOpacity style={[styles.loginButton, (isLoading || !ready) && styles.loginButtonDisabled]} onPress={handleLogin} disabled={isLoading || !ready} activeOpacity={0.8}>
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginButtonText}>Login</Text>}
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={[styles.registerContainer, { opacity: fadeAnim }]}>
            <Text style={styles.registerText}>Belum punya akun? </Text>
            <TouchableOpacity onPress={handleRegisterRedirect}>
              <Text style={styles.registerLink}>Daftar di sini</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>

        {/* Decorative elements */}
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0fdf4",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
    minHeight: "100%",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#dcfce7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#16a34a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logo: {
    fontSize: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#16a34a",
    marginBottom: 8,
    textShadowColor: "rgba(22, 163, 74, 0.2)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#4b5563",
    fontWeight: "500",
  },
  formContainer: {
    backgroundColor: "#fff",
    padding: 28,
    borderRadius: 20,
    shadowColor: "#16a34a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#dcfce7",
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 2,
    borderColor: "#d1fae5",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: "#f9fafb",
    color: "#1f2937",
    fontWeight: "500",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  loginButton: {
    backgroundColor: "#16a34a",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#16a34a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginButtonDisabled: {
    backgroundColor: "#9ca3af",
    shadowColor: "#6b7280",
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  registerText: {
    color: "#6b7280",
    fontSize: 15,
    fontWeight: "500",
  },
  registerLink: {
    color: "#16a34a",
    fontSize: 15,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  decorativeCircle1: {
    position: "absolute",
    top: "10%",
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    zIndex: -1,
  },
  decorativeCircle2: {
    position: "absolute",
    bottom: "15%",
    left: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(34, 197, 94, 0.08)",
    zIndex: -1,
  },
});

export default LoginScreen;
