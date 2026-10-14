// app/register.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Animated, Easing, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { initDB, listTables, UserDatabase } from "./db";

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

// Mock email service - dalam implementasi nyata, gunakan backend
const mockEmailService = {
  sendOTP: async (email: string): Promise<string> => {
    // Simulasi pengiriman email
    console.log(`📧 Mengirim OTP ke: ${email}`);

    // Generate random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Simulasi delay pengiriman
    await new Promise((resolve) => setTimeout(resolve, 1500));

    console.log(`✅ OTP ${otp} dikirim ke ${email}`);

    // Dalam aplikasi nyata, OTP akan dikirim ke email pengguna
    // Untuk demo, kita tampilkan di Alert (jangan lakukan di production!)
    Alert.alert("OTP Demo", `Kode OTP: ${otp}\n\n(Ini hanya demo. Di aplikasi nyata, OTP dikirim ke email.)`, [{ text: "OK" }]);

    return otp;
  },
};

const RegisterScreen = () => {
  const navigation = useNavigation();
  const [ready, setReady] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    usia: "",
    berat: "",
    tinggi: "",
    jenis_kelamin: "",
    target_kalori: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  // OTP State
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [generatedOTP, setGeneratedOTP] = useState("");
  const [otpTimer, setOtpTimer] = useState(0);
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [userDataForRegistration, setUserDataForRegistration] = useState<any>(null);

  // Animasi values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];
  const scaleAnim = useState(new Animated.Value(0.9))[0];
  const progressAnim = useState(new Animated.Value(0))[0];
  const otpInputRefs = Array(6)
    .fill(0)
    .map(() => React.createRef<TextInput>());

  useEffect(() => {
    // Initialize DB synchronously (openDatabaseSync variant)
    try {
      const ok = initDB();
      console.log("initDB returned:", ok);
      console.log("Current tables after init:", listTables());
      setReady(ok);
      if (!ok) {
        Alert.alert("Database error", "Database tidak dapat diinisialisasi di environment ini.");
      }
    } catch (e) {
      console.error("DB init error in RegisterScreen:", e);
      Alert.alert("Database error", "Gagal menginisialisasi database.");
      setReady(false);
    }

    // Start animations
    startAnimations();
  }, []);

  useEffect(() => {
    let interval: number | undefined;

    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [otpTimer]);

  const startAnimations = () => {
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

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Progress animation based on form completion
    const filledFields = Object.values({ ...formData, [field]: value }).filter((val) => val !== "").length;
    const progress = filledFields / Object.keys(formData).length;

    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
      easing: Easing.out(Easing.ease),
    }).start();
  };

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSendOTP = async () => {
    if (!formData.email || !validateEmail(formData.email)) {
      Alert.alert("Error", "Email tidak valid");
      return;
    }

    // Cek apakah email sudah terdaftar
    const existingUser = UserDatabase.getUserByEmail(formData.email);
    if (existingUser) {
      Alert.alert("Error", "Email sudah terdaftar");
      return;
    }

    setIsSendingOTP(true);

    try {
      // Kirim OTP ke email
      const otp = await mockEmailService.sendOTP(formData.email);
      setGeneratedOTP(otp);

      // Mulai timer 5 menit (300 detik)
      setOtpTimer(300);

      // Reset OTP input
      setOtp(["", "", "", "", "", ""]);
      setEmailVerified(false);

      // Tampilkan modal OTP
      setOtpModalVisible(true);

      Alert.alert("OTP Terkirim", "Kode OTP telah dikirim ke email Anda. Silakan cek inbox atau spam folder.");
    } catch (error) {
      console.error("Error sending OTP:", error);
      Alert.alert("Error", "Gagal mengirim OTP. Silakan coba lagi.");
    } finally {
      setIsSendingOTP(false);
    }
  };

  const handleOTPInputChange = (text: string, index: number) => {
    const newOtp = [...otp];

    // Hanya menerima angka
    const numericText = text.replace(/[^0-9]/g, "");
    newOtp[index] = numericText.slice(0, 1);
    setOtp(newOtp);

    // Auto-focus ke input berikutnya
    if (numericText && index < 5) {
      otpInputRefs[index + 1].current?.focus();
    }

    // Auto-verify jika semua input terisi
    if (newOtp.every((digit) => digit !== "") && index === 5) {
      handleVerifyOTP();
    }
  };

  const handleOTPKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      // Focus ke input sebelumnya jika backspace ditekan pada input kosong
      otpInputRefs[index - 1].current?.focus();
    }
  };

  const handleResendOTP = async () => {
    if (otpTimer > 0) {
      Alert.alert("Tunggu", `Tunggu ${otpTimer} detik untuk mengirim ulang OTP`);
      return;
    }

    setIsSendingOTP(true);
    try {
      const newOtp = await mockEmailService.sendOTP(formData.email);
      setGeneratedOTP(newOtp);
      setOtpTimer(300);
      setOtp(["", "", "", "", "", ""]);
      Alert.alert("OTP Dikirim Ulang", "Kode OTP baru telah dikirim ke email Anda.");
    } catch (error) {
      Alert.alert("Error", "Gagal mengirim ulang OTP");
    } finally {
      setIsSendingOTP(false);
    }
  };

  const handleVerifyOTP = async () => {
    const enteredOTP = otp.join("");

    if (enteredOTP.length !== 6) {
      Alert.alert("Error", "Masukkan 6 digit kode OTP");
      return;
    }

    setIsVerifyingOTP(true);

    // Simulasi delay verifikasi
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (enteredOTP === generatedOTP) {
      setEmailVerified(true);
      Alert.alert("Verifikasi Berhasil", "Email Anda telah diverifikasi. Lanjutkan pendaftaran.");
      setOtpModalVisible(false);

      // Lanjutkan dengan proses pendaftaran
      handleContinueRegistration();
    } else {
      Alert.alert("Error", "Kode OTP tidak valid. Silakan coba lagi.");

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
    }

    setIsVerifyingOTP(false);
  };

  const handleContinueRegistration = () => {
    // Validasi form data
    if (!formData.username || !formData.email || !formData.password) {
      Alert.alert("Error", "Username, email, dan password harus diisi");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert("Error", "Password dan konfirmasi password tidak cocok");
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert("Error", "Password minimal 6 karakter");
      return;
    }

    // Simpan data untuk registrasi
    setUserDataForRegistration(formData);

    // Lanjutkan ke tahap akhir pendaftaran
    completeRegistration();
  };

  const completeRegistration = async () => {
    if (!userDataForRegistration) return;

    setIsLoading(true);

    try {
      // Insert user baru menggunakan UserDatabase.createUser
      const userId = UserDatabase.createUser({
        username: userDataForRegistration.username,
        email: userDataForRegistration.email,
        password: userDataForRegistration.password,
        usia: userDataForRegistration.usia ? parseInt(userDataForRegistration.usia, 10) : undefined,
        berat: userDataForRegistration.berat ? parseFloat(userDataForRegistration.berat) : undefined,
        tinggi: userDataForRegistration.tinggi ? parseFloat(userDataForRegistration.tinggi) : undefined,
        jenis_kelamin: userDataForRegistration.jenis_kelamin || undefined,
        target_kalori: userDataForRegistration.target_kalori ? parseInt(userDataForRegistration.target_kalori, 10) : undefined,
      });

      if (userId === 0) {
        throw new Error("Gagal membuat user baru");
      }

      console.log("✅ User berhasil dibuat dengan ID:", userId);

      // Simpan user info ke AsyncStorage untuk login otomatis
      try {
        await AsyncStorage.setItem("isLoggedIn", "true");
        await AsyncStorage.setItem("user_id", userId.toString());
        await AsyncStorage.setItem("user_email", userDataForRegistration.email);
        await AsyncStorage.setItem(
          "loggedInUser",
          JSON.stringify({
            id: userId,
            username: userDataForRegistration.username,
            email: userDataForRegistration.email,
          })
        );

        console.log("📝 Data user disimpan di AsyncStorage");
      } catch (storageError) {
        console.error("Error menyimpan ke AsyncStorage:", storageError);
      }

      // Success animation
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        Alert.alert("🎉 Registrasi Berhasil!", "Akun Anda telah dibuat dan Anda sudah login otomatis!\n\nMulai tracking progress fitness Anda sekarang!", [
          {
            text: "Mulai Sekarang",
            onPress: () => {
              // Reset navigation stack dan redirect ke home
              navigation.reset({
                index: 0,
                routes: [{ name: "(tabs)" as never }],
              });
            },
          },
        ]);
      });
    } catch (error) {
      console.error("Register error:", error);
      Alert.alert("Error", "Terjadi kesalahan saat registrasi. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
      setUserDataForRegistration(null);
    }
  };

  const handleRegister = async () => {
    if (!ready) {
      Alert.alert("Tunggu", "Database belum siap. Coba lagi sebentar.");
      return;
    }

    // Validasi input dasar
    if (!formData.username || !formData.email || !formData.password) {
      Alert.alert("Error", "Username, email, dan password harus diisi");
      return;
    }

    if (!validateEmail(formData.email)) {
      Alert.alert("Error", "Format email tidak valid");
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert("Error", "Password minimal 6 karakter");
      return;
    }

    // Trigger OTP sending
    handleSendOTP();
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const progressColor = progressAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["#ef4444", "#f59e0b", "#22c55e"],
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Header dengan Progress Bar */}
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <Text style={styles.title}>Buat Akun Baru</Text>
          <Text style={styles.subtitle}>Mulai perjalanan fitness Anda</Text>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBackground}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: progressWidth,
                    backgroundColor: progressColor,
                  },
                ]}
              />
            </View>
            <Animated.Text style={styles.progressText}>
              {progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ["0% selesai", "100% selesai"],
              })}
            </Animated.Text>
          </View>
        </Animated.View>

        {/* Form Container dengan Animasi */}
        <Animated.View
          style={[
            styles.formContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          {/* Email Verification Status */}
          {emailVerified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓ Email Terverifikasi</Text>
            </View>
          )}

          {/* Required Fields Section */}
          <Text style={styles.sectionTitle}>Informasi Akun</Text>

          <Animated.View style={[styles.inputGroup, { opacity: fadeAnim }]}>
            <Text style={styles.label}>Username *</Text>
            <TextInput style={styles.input} placeholder="Masukkan username" placeholderTextColor="#9ca3af" value={formData.username} onChangeText={(text) => handleInputChange("username", text)} />
          </Animated.View>

          <Animated.View style={[styles.inputGroup, { opacity: fadeAnim }]}>
            <Text style={styles.label}>Email *</Text>
            <View style={styles.emailContainer}>
              <TextInput
                style={[styles.input, styles.emailInput]}
                placeholder="Masukkan email"
                placeholderTextColor="#9ca3af"
                value={formData.email}
                onChangeText={(text) => handleInputChange("email", text)}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!emailVerified}
              />
              {!emailVerified ? (
                <TouchableOpacity style={[styles.otpButton, isSendingOTP && styles.otpButtonDisabled]} onPress={handleSendOTP} disabled={isSendingOTP || !formData.email || !validateEmail(formData.email)}>
                  {isSendingOTP ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.otpButtonText}>Kirim OTP</Text>}
                </TouchableOpacity>
              ) : (
                <View style={styles.verifiedContainer}>
                  <Text style={styles.verifiedTextSmall}>✓</Text>
                </View>
              )}
            </View>
          </Animated.View>

          <Animated.View style={[styles.inputGroup, { opacity: fadeAnim }]}>
            <Text style={styles.label}>Password *</Text>
            <TextInput style={styles.input} placeholder="Masukkan password (min. 6 karakter)" placeholderTextColor="#9ca3af" value={formData.password} onChangeText={(text) => handleInputChange("password", text)} secureTextEntry />
          </Animated.View>

          <Animated.View style={[styles.inputGroup, { opacity: fadeAnim }]}>
            <Text style={styles.label}>Konfirmasi Password *</Text>
            <TextInput style={styles.input} placeholder="Konfirmasi password" placeholderTextColor="#9ca3af" value={formData.confirmPassword} onChangeText={(text) => handleInputChange("confirmPassword", text)} secureTextEntry />
          </Animated.View>

          {/* Optional Fields Section */}
          <Text style={styles.sectionTitle}>Data Diri (Opsional)</Text>
          <Text style={styles.optionalNote}>Isi data diri untuk pengalaman yang lebih personal</Text>

          <Animated.View style={[styles.inputGroup, { opacity: fadeAnim }]}>
            <Text style={styles.label}>Usia</Text>
            <TextInput style={styles.input} placeholder="Usia (tahun)" placeholderTextColor="#9ca3af" value={formData.usia} onChangeText={(text) => handleInputChange("usia", text)} keyboardType="numeric" />
          </Animated.View>

          <View style={styles.rowContainer}>
            <Animated.View style={[styles.inputGroup, styles.halfInput, { opacity: fadeAnim }]}>
              <Text style={styles.label}>Berat Badan</Text>
              <TextInput style={styles.input} placeholder="Berat (kg)" placeholderTextColor="#9ca3af" value={formData.berat} onChangeText={(text) => handleInputChange("berat", text)} keyboardType="numeric" />
            </Animated.View>

            <Animated.View style={[styles.inputGroup, styles.halfInput, { opacity: fadeAnim }]}>
              <Text style={styles.label}>Tinggi Badan</Text>
              <TextInput style={styles.input} placeholder="Tinggi (cm)" placeholderTextColor="#9ca3af" value={formData.tinggi} onChangeText={(text) => handleInputChange("tinggi", text)} keyboardType="numeric" />
            </Animated.View>
          </View>

          <Animated.View style={[styles.inputGroup, { opacity: fadeAnim }]}>
            <Text style={styles.label}>Jenis Kelamin</Text>
            <View style={styles.radioContainer}>
              <TouchableOpacity style={[styles.radioButton, formData.jenis_kelamin === "Laki-laki" && styles.radioButtonSelected]} onPress={() => handleInputChange("jenis_kelamin", "Laki-laki")}>
                <View style={styles.radioCircle}>{formData.jenis_kelamin === "Laki-laki" && <View style={styles.selectedRb} />}</View>
                <Text style={styles.radioText}>Laki-laki</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.radioButton, formData.jenis_kelamin === "Perempuan" && styles.radioButtonSelected]} onPress={() => handleInputChange("jenis_kelamin", "Perempuan")}>
                <View style={styles.radioCircle}>{formData.jenis_kelamin === "Perempuan" && <View style={styles.selectedRb} />}</View>
                <Text style={styles.radioText}>Perempuan</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          <Animated.View style={[styles.inputGroup, { opacity: fadeAnim }]}>
            <Text style={styles.label}>Target Kalori Harian</Text>
            <TextInput style={styles.input} placeholder="Target kalori (opsional)" placeholderTextColor="#9ca3af" value={formData.target_kalori} onChangeText={(text) => handleInputChange("target_kalori", text)} keyboardType="numeric" />
            <Text style={styles.hintText}>Rata-rata: Pria 2500 kcal, Wanita 2000 kcal</Text>
          </Animated.View>

          {/* Register Button */}
          <Animated.View style={{ opacity: fadeAnim }}>
            <TouchableOpacity style={[styles.registerButton, (isLoading || !ready || !emailVerified) && styles.registerButtonDisabled]} onPress={handleRegister} disabled={isLoading || !ready || !emailVerified} activeOpacity={0.8}>
              {isLoading ? <ActivityIndicator color="#fff" /> : emailVerified ? <Text style={styles.registerButtonText}>Daftar Sekarang</Text> : <Text style={styles.registerButtonText}>Verifikasi Email Dulu</Text>}
            </TouchableOpacity>
          </Animated.View>

          {/* Terms and Conditions */}
          <Animated.View style={[styles.termsContainer, { opacity: fadeAnim }]}>
            <Text style={styles.termsText}>
              Dengan mendaftar, Anda menyetujui <Text style={styles.termsLink}>Syarat & Ketentuan</Text> dan <Text style={styles.termsLink}>Kebijakan Privasi</Text> kami.
            </Text>
          </Animated.View>

          {/* Login Link */}
          <Animated.View style={[styles.loginContainer, { opacity: fadeAnim }]}>
            <Text style={styles.loginText}>Sudah punya akun? </Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.loginLink}>Login di sini</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>

        {/* OTP Verification Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={otpModalVisible}
          onRequestClose={() => {
            setOtpModalVisible(!otpModalVisible);
          }}
        >
          <View style={styles.modalOverlay}>
            <Animated.View style={[styles.modalContainer, { opacity: fadeAnim }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Verifikasi Email</Text>
                <Text style={styles.modalSubtitle}>Masukkan 6 digit kode yang dikirim ke:</Text>
                <Text style={styles.modalEmail}>{formData.email}</Text>
              </View>

              {/* Timer */}
              <View style={styles.timerContainer}>
                <Text style={styles.timerText}>Kode OTP berlaku: {formatTime(otpTimer)}</Text>
                {otpTimer === 0 && (
                  <TouchableOpacity onPress={handleResendOTP}>
                    <Text style={styles.resendText}>Kirim Ulang</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* OTP Inputs */}
              <View style={styles.otpContainer}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={otpInputRefs[index]}
                    style={[styles.otpInput, digit && styles.otpInputFilled]}
                    value={digit}
                    onChangeText={(text) => handleOTPInputChange(text, index)}
                    onKeyPress={(e) => handleOTPKeyPress(e, index)}
                    keyboardType="numeric"
                    maxLength={1}
                    selectTextOnFocus
                  />
                ))}
              </View>

              {/* Verification Button */}
              <TouchableOpacity style={[styles.verifyButton, otp.join("").length !== 6 && styles.verifyButtonDisabled]} onPress={handleVerifyOTP} disabled={otp.join("").length !== 6 || isVerifyingOTP}>
                {isVerifyingOTP ? <ActivityIndicator color="#fff" /> : <Text style={styles.verifyButtonText}>Verifikasi OTP</Text>}
              </TouchableOpacity>

              {/* Cancel Button */}
              <TouchableOpacity style={styles.cancelButton} onPress={() => setOtpModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Batalkan</Text>
              </TouchableOpacity>

              <Text style={styles.otpHint}>
                Tidak menerima kode? Cek folder spam atau{" "}
                <Text style={styles.resendLink} onPress={handleResendOTP}>
                  kirim ulang
                </Text>
              </Text>
            </Animated.View>
          </View>
        </Modal>

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
    padding: 20,
    minHeight: "100%",
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
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
    marginBottom: 20,
  },
  progressContainer: {
    width: "100%",
    alignItems: "center",
    marginTop: 10,
  },
  progressBackground: {
    width: "100%",
    height: 6,
    backgroundColor: "#e5e7eb",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: "#6b7280",
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
    marginBottom: 20,
  },
  verifiedBadge: {
    backgroundColor: "#dcfce7",
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#22c55e",
  },
  verifiedText: {
    color: "#166534",
    fontWeight: "600",
    textAlign: "center",
  },
  verifiedTextSmall: {
    color: "#166534",
    fontWeight: "bold",
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#16a34a",
    marginBottom: 12,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#22c55e",
    paddingLeft: 12,
  },
  optionalNote: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 16,
    fontStyle: "italic",
  },
  inputGroup: {
    marginBottom: 20,
  },
  emailContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  emailInput: {
    flex: 1,
    marginRight: 10,
  },
  otpButton: {
    backgroundColor: "#3b82f6",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  otpButtonDisabled: {
    backgroundColor: "#93c5fd",
  },
  otpButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  verifiedContainer: {
    backgroundColor: "#dcfce7",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#22c55e",
    minWidth: 50,
    alignItems: "center",
  },
  rowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  halfInput: {
    flex: 0.48,
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
  hintText: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 5,
    marginLeft: 5,
  },
  radioContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  radioButton: {
    flexDirection: "row",
    alignItems: "center",
    flex: 0.48,
    padding: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: "#f8fafc",
  },
  radioButtonSelected: {
    borderColor: "#22c55e",
    backgroundColor: "#f0fdf4",
  },
  radioCircle: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  selectedRb: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22c55e",
  },
  radioText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  registerButton: {
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
  registerButtonDisabled: {
    backgroundColor: "#9ca3af",
    shadowColor: "#6b7280",
  },
  registerButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  termsContainer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  termsText: {
    color: "#6b7280",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16,
  },
  termsLink: {
    color: "#16a34a",
    fontWeight: "600",
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
  },
  loginText: {
    color: "#6b7280",
    fontSize: 15,
    fontWeight: "500",
  },
  loginLink: {
    color: "#16a34a",
    fontSize: 15,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  decorativeCircle1: {
    position: "absolute",
    top: "5%",
    right: -60,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    zIndex: -1,
  },
  decorativeCircle2: {
    position: "absolute",
    bottom: "5%",
    left: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(34, 197, 94, 0.08)",
    zIndex: -1,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 25,
    width: "90%",
    maxWidth: 400,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#16a34a",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 5,
  },
  modalEmail: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 10,
  },
  timerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 25,
    paddingHorizontal: 5,
  },
  timerText: {
    color: "#ef4444",
    fontWeight: "600",
  },
  resendText: {
    color: "#3b82f6",
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 30,
  },
  otpInput: {
    width: 45,
    height: 45,
    borderWidth: 2,
    borderColor: "#d1d5db",
    borderRadius: 10,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    backgroundColor: "#f9fafb",
  },
  otpInputFilled: {
    borderColor: "#16a34a",
    backgroundColor: "#f0fdf4",
  },
  verifyButton: {
    backgroundColor: "#16a34a",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
    marginBottom: 15,
  },
  verifyButtonDisabled: {
    backgroundColor: "#9ca3af",
  },
  verifyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    marginBottom: 20,
  },
  cancelButtonText: {
    color: "#6b7280",
    fontSize: 14,
    fontWeight: "500",
  },
  otpHint: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
  },
  resendLink: {
    color: "#3b82f6",
    fontWeight: "600",
  },
});

export default RegisterScreen;
