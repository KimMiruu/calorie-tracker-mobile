# Calorie Tracker Mobile

Aplikasi mobile **tracking kalori** untuk mencatat konsumsi makanan, exercise, memantau progres, dan mendapatkan rekomendasi makanan sesuai target pengguna.

Dibangun dengan [Expo](https://expo.dev) + React Native + TypeScript. Seluruh data disimpan secara lokal di perangkat melalui SQLite, sehingga aplikasi tetap bisa dipakai secara offline.

## Fitur

| Modul | Fitur |
| --- | --- |
| **Auth** | Registrasi dan login dengan isolasi data per pengguna (`user_id`) |
| **Home** | Ringkasan intake harian, sisa budget kalor, komposisi makro, dan streak |
| **Tracking** | Mencatat makanan per jam makan, air minum, dan exercise, lengkap dengan grafik |
| **Workout** | Katalog workout, timer latihan, dan riwayat workout yang tersimpan |
| **Progress** | Analisis mingguan, bulanan, dan tahunan, distribusi makro, serta tren progres |
| **Rekomendasi** | Rekomendasi makanan otomatis berdasarkan sisa kalor, goal, dan preferensi |
| **Profile** | Data profil (usia, berat, tinggi, jenis kelamin) dan pengaturan target kalor |

## Tab Aplikasi

| Tab | Keterangan |
| --- | --- |
| **Home** | Dashboard harian |
| **Progress** | Analisis dan tren |
| **Workout** | Latihan |
| **Tracking** | Pencatatan makanan dan exercise |
| **Rekomendasi** | Saran makanan |
| **Profile** | Profil pengguna |

## Stack

- [Expo SDK 54](https://expo.dev) dan React Native 0.81
- [Expo Router](https://docs.expo.dev/router/) untuk file-based routing dengan typed routes
- [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) sebagai database lokal
- React 19 dan TypeScript
- react-native-chart-kit untuk visualisasi grafik
- @react-native-async-storage untuk menyimpan preferensi ringan

## Struktur Project

```
.
├── app/                   # Routing (expo-router)
│   ├── _layout.tsx        # Root layout
│   ├── login.tsx          # Login
│   ├── register.tsx       # Registrasi
│   ├── db.ts              # Inisialisasi skema SQLite dan query helper
│   └── (tabs)/            # Tab utama aplikasi
│       ├── index.tsx          # Home
│       ├── progress.tsx       # Progress
│       ├── workout.tsx        # Workout
│       ├── tracking.tsx       # Tracking
│       ├── recommendation.tsx # Rekomendasi
│       └── profile.tsx        # Profile
├── components/            # Komponen UI reusable
├── constants/             # Tema dan konstanta
├── hooks/                 # Custom hooks
├── services/              # Integrasi API (mlApi.ts)
├── utils/                 # Logika bisnis
│   ├── knapsack.ts                # Greedy knapsack berdasarkan budget kalor
│   ├── recommendationEngine.ts    # Engine rekomendasi makanan
│   ├── recommendationPolicy.ts    # Kebijakan: LIGHT / BALANCED / HIGH_PROTEIN / MAIN_MEAL
│   ├── goalConfig.ts              # Konfigurasi goal: maintain / gain / loss
│   └── filterUtils.ts
└── assets/
    ├── food.json          # Master data makanan
    └── tree.json          # Data workout
```

## Menjalankan Project

```bash
# 1. Install dependency
npm install

# 2. Jalankan dev server
npx expo start
```

Setelah itu pilih platform dari terminal: **Android emulator**, **iOS simulator**, **Expo Go**, atau **web**.

Script yang tersedia:

```bash
npm start        # Expo dev server
npm run android  # Build dan jalankan di Android
npm run ios      # Build dan jalankan di iOS
npm run web      # Jalankan di web
npm run lint     # ESLint
```

## Database

Database `simplefit.db` dibuat otomatis saat aplikasi dijalankan. Tabel yang digunakan:

- `users` — profil pengguna dan target kalor
- `food_items` — catatan makanan per tanggal dan jam makan
- `exercises` — catatan exercise dan kalor terbakar
- `daily_goals` — target harian
- `drinks` — catatan air minum
- `workouts_history` dan `workout_exercises` — riwayat workout beserta detail latihan
- `progress_history` — ringkasan progres

Seluruh query diisolasi berdasarkan `user_id` agar data antar pengguna tidak saling tercampur.

> File `.db` tidak di-commit ke repository dan sudah masuk ke `.gitignore`.

## Rekomendasi Makanan

Sistem rekomendasi berjalan melalui dua jalur:

1. **Offline (default)** — `utils/recommendationEngine.ts` memilih kandidat makanan dari `assets/food.json`, lalu `utils/knapsack.ts` menyusun kombinasi yang paling memenuhi sisa budget kalor. Pilihan juga mempertimbangkan goal pengguna (`utils/goalConfig.ts`) dan kondisi harian (`utils/recommendationPolicy.ts`).
2. **ML API (opsional)** — bila backend ML berjalan di `http://10.0.2.2:8000`, aplikasi memanggil endpoint `POST /predict` melalui `services/mlApi.ts`. Endpoint tersebut mengembalikan daftar makanan beserta skor dan digunakan sebagai peringkat alternatif.

   `10.0.2.2` adalah alias `localhost` dari Android emulator. Untuk perangkat fisik, ganti dengan alamat IP LAN komputer Anda.

## Catatan Keamanan

Password saat ini disimpan langsung di tabel `users` tanpa hashing. Repository ini ditujukan untuk keperluan demo dan portofolio. Jangan dipakai untuk data sensitif sebelum menambahkan hashing (bcrypt atau argon2) serta mekanisme autentikasi yang sesungguhnya.

File `backend/*.db` dan `.env` sudah diabaikan oleh git.

## Lisensi

Dibuat sebagai proyek pribadi dan portofolio.