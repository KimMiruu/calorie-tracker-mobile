// app/(tabs)/workout.tsx
import { ExerciseDatabase, WorkoutDatabase } from "@/app/db";
import { ThemedView } from "@/components/themed-view";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { Alert, Dimensions, Image, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

// Data kategori latihan
const categories = [
  { id: "all", name: "Semua" },
  { id: "cardio", name: "Cardio", icon: "🏃" },
  { id: "strength", name: "Strength", icon: "💪" },
  { id: "yoga", name: "Yoga", icon: "🧘" },
  { id: "hiit", name: "HIIT", icon: "🔥" },
  { id: "fullbody", name: "Full Body", icon: "⚡" },
  { id: "upper", name: "Upper Body", icon: "💪" },
  { id: "lower", name: "Lower Body", icon: "🦵" },
  { id: "core", name: "Core", icon: "🟦" },
  { id: "flexibility", name: "Fleksibilitas", icon: "🤸" },
  { id: "recovery", name: "Pemulihan", icon: "🔄" },
];

// Data level kesulitan
const difficultyLevels = [
  { id: "all", name: "Semua Level" },
  { id: "beginner", name: "Pemula", color: "#10b981" },
  { id: "intermediate", name: "Menengah", color: "#f59e0b" },
  { id: "advanced", name: "Lanjutan", color: "#ef4444" },
];

// Interface untuk workout
interface Exercise {
  name: string;
  sets: string;
  icon: string;
  duration: number; // durasi dalam detik
  description: string;
}

interface WorkoutVideo {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  duration: string;
  calories: string;
  thumbnail: string;
  equipment: string[];
  focus: string[];
  exercises: Exercise[];
  totalExercises: number;
  totalTime: string;
}

// Data video latihan
const workoutVideos: WorkoutVideo[] = [
  {
    id: "1",
    title: "Cardio Ringan 30 Menit",
    description: "Latihan cardio ringan untuk pemula, cocok untuk hari pemulihan",
    category: "cardio",
    difficulty: "beginner",
    duration: "30 min",
    calories: "250",
    thumbnail: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop",
    equipment: ["Matras", "Sepatu Olahraga"],
    focus: ["Jantung", "Stamina", "Pembakaran Lemak"],
    exercises: [
      {
        name: "Jogging di Tempat",
        sets: "1 set",
        icon: "🏃‍♂️",
        duration: 300,
        description: "Lakukan jogging di tempat dengan tempo sedang, angkat lutut secukupnya",
      },
      {
        name: "Jumping Jacks",
        sets: "1 set",
        icon: "🤸‍♂️",
        duration: 300,
        description: "Lompat sambil membuka dan menutup kaki dan tangan secara bersamaan",
      },
      {
        name: "High Knees",
        sets: "1 set",
        icon: "🦵",
        duration: 300,
        description: "Angkat lutut setinggi pinggang sambil berlari di tempat",
      },
      {
        name: "Butt Kicks",
        sets: "1 set",
        icon: "👟",
        duration: 300,
        description: "Sentuh tumit ke pantat sambil berlari di tempat",
      },
      {
        name: "Mountain Climbers",
        sets: "1 set",
        icon: "🧗‍♂️",
        duration: 300,
        description: "Posisi plank, tarik lutut ke dada secara bergantian dengan cepat",
      },
      {
        name: "Cool Down",
        sets: "1 set",
        icon: "🧘‍♂️",
        duration: 300,
        description: "Peregangan dan pernapasan dalam untuk menenangkan tubuh",
      },
    ],
    totalExercises: 6,
    totalTime: "30 menit",
  },
  {
    id: "2",
    title: "Core Strength Advanced",
    description: "Latihan otot inti yang menantang untuk core yang kuat",
    category: "strength",
    difficulty: "advanced",
    duration: "45 min",
    calories: "320",
    thumbnail: "https://images.unsplash.com/photo-1534367507877-0edd93bd013b?w=400&h=300&fit=crop",
    equipment: ["Pull-up Bar", "Matras"],
    focus: ["Otot Inti", "Kekuatan", "Stabilitas"],
    exercises: [
      {
        name: "Dragon Flag",
        sets: "3 set x 8 reps",
        icon: "🐉",
        duration: 480,
        description: "Latihan advanced untuk otot inti dengan kontrol penuh tubuh",
      },
      {
        name: "L-Sit",
        sets: "3 set x 30 detik",
        icon: "🪑",
        duration: 360,
        description: "Tahan posisi L dengan tangan di samping tubuh",
      },
      {
        name: "Hanging Leg Raises",
        sets: "3 set x 12 reps",
        icon: "🦵",
        duration: 420,
        description: "Angkat kaki lurus ke atas saat menggantung di pull-up bar",
      },
    ],
    totalExercises: 3,
    totalTime: "45 menit",
  },
  {
    id: "3",
    title: "Yoga Flow untuk Pemula",
    description: "Gerakan yoga dasar untuk meningkatkan fleksibilitas",
    category: "yoga",
    difficulty: "beginner",
    duration: "25 min",
    calories: "180",
    thumbnail: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=300&fit=crop",
    equipment: ["Matras Yoga"],
    focus: ["Fleksibilitas", "Relaksasi", "Pernapasan"],
    exercises: [
      {
        name: "Sun Salutation",
        sets: "5 repetisi",
        icon: "☀️",
        duration: 600,
        description: "Serangkaian gerakan yoga untuk pemanasan dan penghormatan pada matahari",
      },
      {
        name: "Warrior Pose",
        sets: "3 set x 30 detik",
        icon: "⚔️",
        duration: 360,
        description: "Pose pahlawan untuk memperkuat kaki dan meningkatkan keseimbangan",
      },
      {
        name: "Tree Pose",
        sets: "3 set x 30 detik",
        icon: "🌳",
        duration: 360,
        description: "Pose pohon untuk meningkatkan keseimbangan dan konsentrasi",
      },
    ],
    totalExercises: 3,
    totalTime: "25 menit",
  },
  {
    id: "4",
    title: "HIIT Fat Burner 20 Menit",
    description: "Latihan intensitas tinggi untuk membakar lemak maksimal",
    category: "hiit",
    difficulty: "intermediate",
    duration: "20 min",
    calories: "300",
    thumbnail: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=300&fit=crop",
    equipment: ["Matras", "Timer"],
    focus: ["Pembakaran Lemak", "Metabolisme", "Kardiovaskular"],
    exercises: [
      {
        name: "Burpees",
        sets: "4 set x 45 detik",
        icon: "🏋️",
        duration: 180,
        description: "Push-up diikuti dengan jump squat untuk latihan seluruh tubuh",
      },
      {
        name: "Sprint di Tempat",
        sets: "4 set x 30 detik",
        icon: "⚡",
        duration: 120,
        description: "Lari di tempat secepat mungkin dengan lutut tinggi",
      },
      {
        name: "Plank Jacks",
        sets: "4 set x 45 detik",
        icon: "🦈",
        duration: 180,
        description: "Plank sambil membuka dan menutup kaki seperti jumping jack",
      },
      {
        name: "High Knees Sprint",
        sets: "4 set x 30 detik",
        icon: "🏃‍♀️",
        duration: 120,
        description: "Angkat lutut setinggi mungkin dengan tempo cepat",
      },
      {
        name: "Rest",
        sets: "4 set x 30 detik",
        icon: "⏸️",
        duration: 120,
        description: "Istirahat dan tarik napas dalam-dalam",
      },
    ],
    totalExercises: 5,
    totalTime: "20 menit",
  },
  {
    id: "5",
    title: "Full Body Strength Workout",
    description: "Latihan kekuatan untuk seluruh tubuh tanpa alat",
    category: "fullbody",
    difficulty: "intermediate",
    duration: "40 min",
    calories: "280",
    thumbnail: "https://images.unsplash.com/photo-1534367507877-0edd93bd013b?w=400&h=300&fit=crop",
    equipment: ["Matras", "Botol Air (Opsional)"],
    focus: ["Kekuatan", "Massa Otot", "Stamina"],
    exercises: [
      {
        name: "Push-up",
        sets: "3 set x 15 reps",
        icon: "💪",
        duration: 300,
        description: "Push-up standar atau dengan lutut di lantai untuk pemula",
      },
      {
        name: "Squats",
        sets: "3 set x 20 reps",
        icon: "🦵",
        duration: 300,
        description: "Tekuk lutut hingga paha sejajar lantai, punggung tetap lurus",
      },
      {
        name: "Plank",
        sets: "3 set x 60 detik",
        icon: "🛡️",
        duration: 180,
        description: "Tahan posisi plank dengan core yang kencang",
      },
      {
        name: "Lunges",
        sets: "3 set x 12 reps/kaki",
        icon: "🚶",
        duration: 300,
        description: "Langkah maju dan tekuk kedua lutut hingga 90 derajat",
      },
      {
        name: "Glute Bridge",
        sets: "3 set x 20 reps",
        icon: "🍑",
        duration: 300,
        description: "Angkat pinggul dari lantai dengan mengencangkan glutes",
      },
      {
        name: "Bicycle Crunch",
        sets: "3 set x 30 reps",
        icon: "🚴",
        duration: 300,
        description: "Gerakan seperti mengayuh sepeda sambil menekuk tubuh",
      },
    ],
    totalExercises: 6,
    totalTime: "40 menit",
  },
  {
    id: "6",
    title: "Upper Body Sculpting",
    description: "Membentuk dada, bahu, lengan, dan punggung atas",
    category: "upper",
    difficulty: "intermediate",
    duration: "35 min",
    calories: "240",
    thumbnail: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=300&fit=crop",
    equipment: ["Matras", "Dumbbell (Opsional)"],
    focus: ["Dada", "Bahu", "Lengan", "Punggung"],
    exercises: [
      {
        name: "Diamond Push-up",
        sets: "3 set x 12 reps",
        icon: "💎",
        duration: 300,
        description: "Push-up dengan tangan membentuk berlian, fokus pada triceps",
      },
      {
        name: "Shoulder Taps",
        sets: "3 set x 20 reps",
        icon: "👆",
        duration: 300,
        description: "Posisi plank, sentuh bahu secara bergantian",
      },
      {
        name: "Triceps Dips",
        sets: "3 set x 15 reps",
        icon: "📐",
        duration: 300,
        description: "Gunakan kursi atau lantai untuk melatih triceps",
      },
      {
        name: "Arm Circles",
        sets: "3 set x 30 detik",
        icon: "🌀",
        duration: 180,
        description: "Putar lengan ke depan dan belakang untuk pemanasan bahu",
      },
      {
        name: "Superman",
        sets: "3 set x 12 reps",
        icon: "🦸",
        duration: 300,
        description: "Angkat lengan dan kaki untuk memperkuat punggung bawah",
      },
    ],
    totalExercises: 5,
    totalTime: "35 menit",
  },
  {
    id: "7",
    title: "Lower Body Power",
    description: "Latihan untuk kaki dan bokong yang kuat",
    category: "lower",
    difficulty: "intermediate",
    duration: "30 min",
    calories: "260",
    thumbnail: "https://images.unsplash.com/photo-1536922246289-88c42f957773?w=400&h=300&fit=crop",
    equipment: ["Matras", "Kursi (Opsional)"],
    focus: ["Paha", "Bokong", "Betis", "Stabilitas"],
    exercises: [
      {
        name: "Sumo Squats",
        sets: "3 set x 15 reps",
        icon: "👘",
        duration: 300,
        description: "Squat dengan kaki terbuka lebar, fokus pada paha dalam",
      },
      {
        name: "Reverse Lunges",
        sets: "3 set x 12 reps/kaki",
        icon: "↩️",
        duration: 300,
        description: "Langkah mundur dan turunkan lutut hampir menyentuh lantai",
      },
      {
        name: "Calf Raises",
        sets: "3 set x 25 reps",
        icon: "🦶",
        duration: 300,
        description: "Angkat tumit untuk melatih betis, bisa dengan beban tambahan",
      },
      {
        name: "Fire Hydrants",
        sets: "3 set x 15 reps/kaki",
        icon: "🚒",
        duration: 300,
        description: "Angkat kaki ke samping seperti anjing di tiang hydrant",
      },
      {
        name: "Wall Sit",
        sets: "3 set x 45 detik",
        icon: "🧱",
        duration: 180,
        description: "Duduk di udara dengan punggung menempel dinding",
      },
    ],
    totalExercises: 5,
    totalTime: "30 menit",
  },
  {
    id: "8",
    title: "Core Intensive 25 Menit",
    description: "Fokus pada penguatan seluruh otot inti",
    category: "core",
    difficulty: "intermediate",
    duration: "25 min",
    calories: "220",
    thumbnail: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop",
    equipment: ["Matras"],
    focus: ["Abs", "Oblique", "Lower Back", "Stabilitas"],
    exercises: [
      {
        name: "Russian Twist",
        sets: "3 set x 20 reps",
        icon: "🇷🇺",
        duration: 300,
        description: "Putar tubuh dari sisi ke sisi sambil menjaga kaki tetap",
      },
      {
        name: "Leg Raises",
        sets: "3 set x 15 reps",
        icon: "⬆️",
        duration: 300,
        description: "Angkat kaki lurus ke atas dengan kontrol penuh",
      },
      {
        name: "Plank dengan Rotation",
        sets: "3 set x 10 reps/sisi",
        icon: "🔄",
        duration: 300,
        description: "Plank sambil memutar tubuh dan mengangkat lengan ke atas",
      },
      {
        name: "Flutter Kicks",
        sets: "3 set x 30 detik",
        icon: "👣",
        duration: 180,
        description: "Angkat kaki sedikit dan lakukan tendangan kecil bergantian",
      },
      {
        name: "Dead Bug",
        sets: "3 set x 12 reps/sisi",
        icon: "🐞",
        duration: 300,
        description: "Angkat lengan dan kaki berlawanan sambil menjaga punggung rata",
      },
    ],
    totalExercises: 5,
    totalTime: "25 menit",
  },
  {
    id: "9",
    title: "Flexibility & Mobility Flow",
    description: "Meningkatkan fleksibilitas dan mobilitas sendi",
    category: "flexibility",
    difficulty: "beginner",
    duration: "20 min",
    calories: "150",
    thumbnail: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=300&fit=crop",
    equipment: ["Matras Yoga", "Blok Yoga (Opsional)"],
    focus: ["Fleksibilitas", "Mobilitas", "Relaksasi", "Postur"],
    exercises: [
      {
        name: "Cat-Cow Stretch",
        sets: "10 repetisi",
        icon: "🐱🐮",
        duration: 180,
        description: "Lengkungkan dan bulatkan punggung untuk mobilitas tulang belakang",
      },
      {
        name: "Forward Fold",
        sets: "30 detik",
        icon: "🙇",
        duration: 180,
        description: "Membungkuk ke depan untuk meregangkan hamstring dan punggung",
      },
      {
        name: "Pigeon Pose",
        sets: "45 detik/sisi",
        icon: "🕊️",
        duration: 360,
        description: "Peregangan dalam untuk pinggul dan glutes",
      },
      {
        name: "Cobra Stretch",
        sets: "30 detik",
        icon: "🐍",
        duration: 180,
        description: "Angkat dada untuk meregangkan perut dan dada",
      },
      {
        name: "Seated Spinal Twist",
        sets: "30 detik/sisi",
        icon: "🌀",
        duration: 360,
        description: "Putar tubuh untuk mobilitas tulang belakang",
      },
    ],
    totalExercises: 5,
    totalTime: "20 menit",
  },
  {
    id: "10",
    title: "Recovery & Stretch Session",
    description: "Peregangan ringan untuk hari pemulihan",
    category: "recovery",
    difficulty: "beginner",
    duration: "15 min",
    calories: "100",
    thumbnail: "https://images.unsplash.com/photo-1549576490-b0b4831ef60a?w=400&h=300&fit=crop",
    equipment: ["Matras", "Bolster (Opsional)"],
    focus: ["Pemulihan", "Relaksasi", "Fleksibilitas", "Sirkulasi"],
    exercises: [
      {
        name: "Child's Pose",
        sets: "1 menit",
        icon: "👶",
        duration: 300,
        description: "Posisi istirahat untuk meregangkan punggung dan pinggul",
      },
      {
        name: "Hamstring Stretch",
        sets: "30 detik/kaki",
        icon: "🦵",
        duration: 360,
        description: "Regangkan kaki lurus ke depan, raih jari kaki",
      },
      {
        name: "Quad Stretch",
        sets: "30 detik/kaki",
        icon: "🏃",
        duration: 360,
        description: "Pegang kaki dan tarik ke belakang untuk meregangkan paha depan",
      },
      {
        name: "Shoulder Stretch",
        sets: "30 detik/sisi",
        icon: "🤲",
        duration: 360,
        description: "Rentangkan lengan untuk meregangkan bahu dan dada",
      },
      {
        name: "Deep Breathing",
        sets: "2 menit",
        icon: "🌬️",
        duration: 600,
        description: "Pernapasan dalam untuk relaksasi dan sirkulasi oksigen",
      },
    ],
    totalExercises: 5,
    totalTime: "15 menit",
  },
  {
    id: "11",
    title: "Advanced HIIT Challenge",
    description: "Latihan intensitas tinggi untuk atlet berpengalaman",
    category: "hiit",
    difficulty: "advanced",
    duration: "45 min",
    calories: "450",
    thumbnail: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=300&fit=crop",
    equipment: ["Matras", "Pull-up Bar", "Dumbbell"],
    focus: ["Power", "Stamina", "Kekuatan", "Kardiovaskular"],
    exercises: [
      {
        name: "Burpee Pull-ups",
        sets: "5 set x 10 reps",
        icon: "🏋️‍♂️",
        duration: 480,
        description: "Burpee diikuti dengan pull-up untuk latihan full body maksimal",
      },
      {
        name: "Box Jumps",
        sets: "5 set x 15 reps",
        icon: "📦",
        duration: 420,
        description: "Lompat ke platform tinggi dengan mendarat yang lembut",
      },
      {
        name: "Renegade Rows",
        sets: "5 set x 12 reps/sisi",
        icon: "🚣",
        duration: 480,
        description: "Plank dengan dumbbell, tarik siku ke belakang bergantian",
      },
      {
        name: "Double Unders",
        sets: "5 set x 30 detik",
        icon: "🪢",
        duration: 300,
        description: "Lompat tali dengan dua putaran tali per lompatan",
      },
      {
        name: "Sled Push",
        sets: "5 set x 20 meter",
        icon: "🏋️‍♀️",
        duration: 420,
        description: "Dorong sled atau benda berat sejauh 20 meter",
      },
    ],
    totalExercises: 5,
    totalTime: "45 menit",
  },
  {
    id: "12",
    title: "Morning Energizer 10 Menit",
    description: "Latihan cepat untuk memulai hari dengan energi",
    category: "cardio",
    difficulty: "beginner",
    duration: "10 min",
    calories: "120",
    thumbnail: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400&h=300&fit=crop",
    equipment: ["Matras"],
    focus: ["Energi", "Sirkulasi", "Metabolisme", "Kebugaran"],
    exercises: [
      {
        name: "Sun Salutation A",
        sets: "3 repetisi",
        icon: "🌅",
        duration: 180,
        description: "Rangkaian yoga untuk menyambut pagi dan meregangkan tubuh",
      },
      {
        name: "Star Jumps",
        sets: "3 set x 20 reps",
        icon: "⭐",
        duration: 180,
        description: "Lompat dengan membuka kaki dan tangan membentuk bintang",
      },
      {
        name: "Dynamic Leg Swings",
        sets: "20 reps/kaki",
        icon: "🔄",
        duration: 120,
        description: "Ayunkan kaki ke depan-belakang dan sisi untuk pemanasan",
      },
      {
        name: "Arm Circles Besar",
        sets: "30 detik",
        icon: "⭕",
        duration: 120,
        description: "Putar lengan dalam lingkaran besar untuk pemanasan bahu",
      },
    ],
    totalExercises: 4,
    totalTime: "10 menit",
  },
  {
    id: "13",
    title: "Posture Correction Routine",
    description: "Memperbaiki postur tubuh dari kebiasaan duduk",
    category: "strength",
    difficulty: "beginner",
    duration: "25 min",
    calories: "180",
    thumbnail: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop",
    equipment: ["Matras", "Dinding", "Towel"],
    focus: ["Postur", "Punggung", "Bahu", "Leher"],
    exercises: [
      {
        name: "Wall Angels",
        sets: "3 set x 12 reps",
        icon: "😇",
        duration: 300,
        description: "Tempelkan punggung ke dinding, gerakkan lengan seperti malaikat",
      },
      {
        name: "Chin Tucks",
        sets: "3 set x 15 reps",
        icon: "👍",
        duration: 240,
        description: "Tarik dagu ke belakang seperti membuat double chin",
      },
      {
        name: "Scapular Retraction",
        sets: "3 set x 15 reps",
        icon: "↔️",
        duration: 240,
        description: "Tarik bahu ke belakang dan tahan, kemudian lepaskan",
      },
      {
        name: "Thoracic Extension",
        sets: "3 set x 10 reps",
        icon: "📏",
        duration: 300,
        description: "Gulung towel di punggung atas, lakukan backbend ringan",
      },
      {
        name: "Chest Opener",
        sets: "3 set x 30 detik",
        icon: "🕊️",
        duration: 180,
        description: "Pegang tangan di belakang punggung, tarik dada terbuka",
      },
    ],
    totalExercises: 5,
    totalTime: "25 menit",
  },
];

// Screen untuk mulai latihan
const WorkoutStartScreen = ({ workout, onBack, onComplete, userId, navigation }: { workout: WorkoutVideo; onBack: () => void; onComplete: (success: boolean) => void; userId?: number; navigation: any }) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(true); // Langsung aktif saat mulai
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [workoutCompleted, setWorkoutCompleted] = useState(false);

  // Inisialisasi timer untuk latihan pertama saat komponen mount
  useEffect(() => {
    if (workout.exercises.length > 0) {
      setTimeLeft(workout.exercises[0].duration);
    }
  }, [workout.exercises]);

  // Timer effect
  useEffect(() => {
    let interval: number | null = null;

    if (isActive && timeLeft > 0 && !workoutCompleted) {
      interval = setInterval(() => {
        setTimeLeft((time) => {
          if (time <= 1) {
            // Timer habis, pindah ke latihan berikutnya
            setTimeout(() => {
              if (currentExerciseIndex < workout.exercises.length - 1) {
                setCurrentExerciseIndex((prev) => {
                  const nextIndex = prev + 1;
                  setTimeLeft(workout.exercises[nextIndex].duration);
                  return nextIndex;
                });
              } else {
                // Latihan terakhir selesai
                setWorkoutCompleted(true);
              }
            }, 100);
            return 0;
          }
          return time - 1;
        });
        setElapsedTime((time) => time + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft, workoutCompleted, currentExerciseIndex, workout.exercises]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStartPause = () => {
    setIsActive(!isActive);
  };

  const handleNextExercise = () => {
    if (currentExerciseIndex < workout.exercises.length - 1) {
      const nextIndex = currentExerciseIndex + 1;
      setCurrentExerciseIndex(nextIndex);
      setTimeLeft(workout.exercises[nextIndex].duration);
      setIsActive(true);
    } else {
      handleCompleteWorkout();
    }
  };

  const handlePreviousExercise = () => {
    if (currentExerciseIndex > 0) {
      const prevIndex = currentExerciseIndex - 1;
      setCurrentExerciseIndex(prevIndex);
      setTimeLeft(workout.exercises[prevIndex].duration);
      setIsActive(true);
    }
  };

  const handleSkip = () => {
    Alert.alert("Lewati Latihan", "Apakah Anda yakin ingin melewati latihan ini?", [
      { text: "Batal", style: "cancel" },
      { text: "Lewati", onPress: handleNextExercise },
    ]);
  };

  const saveWorkoutToDatabase = async () => {
    try {
      // Parse duration string to minutes (e.g., "30 min" -> 30)
      const durationMatch = workout.duration.match(/(\d+)/);
      const durationMinutes = durationMatch ? parseInt(durationMatch[1]) : 0;

      // Parse calories string to number (e.g., "250" -> 250)
      const caloriesBurned = parseInt(workout.calories) || 0;

      // Save workout to database dengan user_id
      const workoutHistoryId = WorkoutDatabase.saveCompletedWorkout({
        workout_id: workout.id,
        workout_title: workout.title,
        workout_category: workout.category,
        workout_difficulty: workout.difficulty,
        duration_minutes: durationMinutes,
        calories_burned: caloriesBurned,
        total_exercises: workout.totalExercises,
        user_id: userId || undefined, // TAMBAHKAN userId
      });

      if (workoutHistoryId > 0) {
        // Save individual exercises dengan user_id
        const exercisesData = workout.exercises.map((exercise) => ({
          name: exercise.name,
          duration: exercise.duration,
          sets: exercise.sets,
        }));

        WorkoutDatabase.saveWorkoutExercises(workoutHistoryId, exercisesData, userId); // TAMBAHKAN userId

        // Save exercise entry for calorie tracking dengan userId
        const today = new Date().toISOString().split("T")[0];
        const exerciseEntryId = ExerciseDatabase.addExercise({
          name: workout.title,
          caloriesBurned: caloriesBurned,
          duration: durationMinutes,
          type: workout.category,
          date: today,
          userId: userId, // TAMBAHKAN userId
        });

        console.log("Exercise saved for tracking with ID:", exerciseEntryId);

        // Show success message
        Alert.alert("Sukses", "Latihan berhasil disimpan ke tracking activity!\n\nKalori yang dibakar telah otomatis ditambahkan ke aktivitas hari ini.", [
          {
            text: "Lihat Tracking",
            onPress: () => {
              onComplete(true);
              // Navigate to tracking tab
              navigation?.navigate("tracking");
            },
          },
          {
            text: "OK",
            onPress: () => onComplete(true),
          },
        ]);

        return true;
      } else {
        Alert.alert("Peringatan", "Latihan tidak berhasil disimpan, tetapi Anda tetap menyelesaikannya!");
        return false;
      }
    } catch (error) {
      console.error("Error saving workout to database:", error);
      Alert.alert("Error", "Gagal menyimpan latihan ke database.");
      return false;
    }
  };

  const handleCompleteWorkout = async () => {
    setWorkoutCompleted(true);

    // Show confirmation dialog
    Alert.alert("Selesaikan Latihan", "Apakah Anda yakin ingin menyelesaikan latihan?\n\nLatihan akan otomatis disimpan ke tracking activity Anda.\nKalori yang dibakar akan mengurangi total kalori harian.", [
      { text: "Lanjutkan", style: "cancel" },
      {
        text: "Selesai",
        onPress: async () => {
          // Save workout to database
          const success = await saveWorkoutToDatabase();
          onComplete(success);
        },
      },
    ]);
  };

  const handleShare = async () => {
    try {
      const message = `🎉 Saya sedang melakukan latihan "${workout.title}"!\n\nLatihan saat ini: ${workout.exercises[currentExerciseIndex].name}\n\n#FitnessJourney #SedangWorkout`;

      await Share.share({
        message: message,
        title: "Latihan Saya",
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const currentExercise = workout.exercises[currentExerciseIndex];
  const progressPercentage = ((currentExerciseIndex + 1) / workout.exercises.length) * 100;

  return (
    <View style={styles.workoutStartContainer}>
      {/* Header */}
      <View style={styles.workoutHeaderStart}>
        <TouchableOpacity
          onPress={() => {
            if (isActive && !workoutCompleted) {
              Alert.alert("Keluar dari Latihan", "Latihan sedang berjalan. Apakah Anda yakin ingin keluar?\n\nProgres tidak akan disimpan.", [
                { text: "Lanjutkan Latihan", style: "cancel" },
                { text: "Keluar", onPress: onBack },
              ]);
            } else {
              onBack();
            }
          }}
          style={styles.headerBackButton}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.workoutHeaderTitle}>{workout.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressText}>
              {currentExerciseIndex + 1}/{workout.exercises.length}
            </Text>
            <Text style={styles.progressPercentage}>{Math.round(progressPercentage)}% Selesai</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
          </View>
        </View>

        {/* Current Exercise */}
        <View style={styles.exerciseContainer}>
          <Text style={styles.exerciseTitle}>{currentExercise.name}</Text>

          {/* Timer */}
          <View style={styles.timerContainer}>
            <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
            <Text style={styles.timerLabel}>Sisa Waktu</Text>
          </View>

          {/* Exercise Icon */}
          <View style={styles.exerciseImageContainer}>
            <Text style={styles.exerciseImage}>{currentExercise.icon}</Text>
          </View>

          {/* Exercise Info */}
          <View style={styles.exerciseInfo}>
            <View style={styles.infoItem}>
              <Ionicons name="time-outline" size={20} color="#64748b" />
              <Text style={styles.infoText}>{Math.floor(currentExercise.duration / 60)} menit</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="repeat-outline" size={20} color="#64748b" />
              <Text style={styles.infoText}>{currentExercise.sets}</Text>
            </View>
          </View>

          {/* Description */}
          <Text style={styles.exerciseDescription}>{currentExercise.description}</Text>

          {/* Share Button */}
          <TouchableOpacity style={styles.startShareButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={20} color="#3b82f6" />
            <Text style={styles.startShareButtonText}>Bagikan</Text>
          </TouchableOpacity>
        </View>

        {/* Controls */}
        <View style={styles.controlsContainer}>
          <View style={styles.mainControls}>
            {/* Previous Button */}
            <TouchableOpacity style={styles.previousButton} onPress={handlePreviousExercise} disabled={currentExerciseIndex === 0}>
              <Ionicons name="play-back" size={24} color={currentExerciseIndex === 0 ? "#cbd5e1" : "#3b82f6"} />
              <Text style={[styles.controlButtonText, currentExerciseIndex === 0 && styles.disabledButtonText]}>Sebelumnya</Text>
            </TouchableOpacity>

            {/* Play/Pause Button */}
            <TouchableOpacity style={styles.playPauseButton} onPress={handleStartPause} disabled={workoutCompleted}>
              <Ionicons name={isActive ? "pause" : "play"} size={32} color="#fff" />
            </TouchableOpacity>

            {/* Next/Skip Button */}
            <TouchableOpacity style={styles.nextButton} onPress={workoutCompleted ? handleCompleteWorkout : handleSkip} disabled={workoutCompleted && currentExerciseIndex === workout.exercises.length - 1}>
              <Ionicons name="play-forward" size={24} color={workoutCompleted ? "#cbd5e1" : "#3b82f6"} />
              <Text style={[styles.controlButtonText, workoutCompleted && styles.disabledButtonText]}>{currentExerciseIndex === workout.exercises.length - 1 ? "Selesai" : "Skip"}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Upcoming Exercises */}
        <View style={styles.upcomingContainer}>
          <Text style={styles.upcomingTitle}>Latihan Berikutnya</Text>
          {workout.exercises.slice(currentExerciseIndex + 1).map((exercise: Exercise, index: number) => (
            <View key={exercise.name + index} style={styles.upcomingItem}>
              <View style={styles.upcomingIcon}>
                <Text style={styles.upcomingIconText}>{exercise.icon}</Text>
              </View>
              <View style={styles.upcomingInfo}>
                <Text style={styles.upcomingName}>{exercise.name}</Text>
                <Text style={styles.upcomingDuration}>{Math.floor(exercise.duration / 60)} menit</Text>
              </View>
              <View style={styles.upcomingStatus}>
                <Text style={styles.upcomingStatusText}>{index === 0 ? "Selanjutnya" : `Lanjutan ${index + 1}`}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

// Screen untuk selesai latihan
const WorkoutCompleteScreen = ({ workout, onBack, userId, navigation }: { workout: WorkoutVideo; onBack: () => void; userId?: number; navigation: any }) => {
  const [isWorkoutSaved, setIsWorkoutSaved] = useState(false);
  const [workoutHistory, setWorkoutHistory] = useState<any[]>([]);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    // Check if workout was saved today - TAMBAHKAN userId
    checkWorkoutSaved();
    // Load recent workouts - TAMBAHKAN userId
    loadWorkoutHistory();
    // Load user data
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const data = await AsyncStorage.getItem("loggedInUser");
      if (data) {
        const user = JSON.parse(data);
        setUserData(user);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  const checkWorkoutSaved = () => {
    const isSaved = WorkoutDatabase.isWorkoutCompletedToday(workout.id, userId); // TAMBAHKAN userId
    setIsWorkoutSaved(isSaved);
  };

  const loadWorkoutHistory = () => {
    const history = WorkoutDatabase.getWorkoutHistory(userId, 5); // TAMBAHKAN userId
    setWorkoutHistory(history);
  };

  const handleGoToTracking = () => {
    navigation?.navigate("tracking");
    onBack();
  };

  const handleShare = async () => {
    try {
      const message = `🎉 Saya baru saja menyelesaikan latihan "${workout.title}"!\n\n🏃 ${workout.totalTime}\n🔥 ${workout.calories} kalori terbakar\n💪 ${workout.totalExercises} latihan\n\n#FitnessJourney #WorkoutComplete`;

      await Share.share({
        message: message,
        title: "Pencapaian Latihan Saya",
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const date = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <View style={styles.completeContainer}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.completeContent}>
          {/* Celebration Icon */}
          <View style={styles.checkmarkContainer}>
            <View style={styles.checkmarkCircle}>
              <Ionicons name="checkmark" size={64} color="#fff" />
            </View>
            <View style={styles.confetti}>
              <Text style={styles.confettiIcon}>🎉</Text>
              <Text style={styles.confettiIcon}>🏆</Text>
              <Text style={styles.confettiIcon}>🔥</Text>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.completeTitle}>Latihan Selesai!</Text>
          <Text style={styles.completeSubtitle}>Selamat! Anda telah menyelesaikan sesi latihan hari ini.</Text>

          {/* User Info */}
          {userData && (
            <View style={styles.userInfoContainer}>
              <Text style={styles.userInfoText}>Data tersimpan untuk: {userData.username || userData.email?.split("@")[0] || "User"}</Text>
            </View>
          )}

          {/* Save Status */}
          {isWorkoutSaved && (
            <View style={styles.savedBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text style={styles.savedText}>Latihan sudah tersimpan di tracking activity</Text>
            </View>
          )}

          {/* Stats Cards */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: "#f0f9ff" }]}>
                <Ionicons name="time" size={24} color="#3b82f6" />
              </View>
              <Text style={styles.statValue}>{workout.totalTime}</Text>
              <Text style={styles.statLabel}>Total Waktu</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: "#f0f9ff" }]}>
                <Ionicons name="flame" size={24} color="#ef4444" />
              </View>
              <Text style={styles.statValue}>{workout.calories}</Text>
              <Text style={styles.statLabel}>Kalori Terbakar</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: "#f0f9ff" }]}>
                <Ionicons name="barbell" size={24} color="#10b981" />
              </View>
              <Text style={styles.statValue}>{workout.totalExercises}</Text>
              <Text style={styles.statLabel}>Latihan</Text>
            </View>
          </View>

          {/* Workout Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Ringkasan Latihan</Text>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Program</Text>
              <Text style={styles.summaryValue}>{workout.title}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Tanggal</Text>
              <Text style={styles.summaryValue}>{date}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Intensitas</Text>
              <View
                style={[
                  styles.difficultyBadge,
                  {
                    backgroundColor: workout.difficulty === "beginner" ? "#10b981" : workout.difficulty === "intermediate" ? "#f59e0b" : "#ef4444",
                  },
                ]}
              >
                <Text style={styles.difficultyText}>{workout.difficulty === "beginner" ? "Pemula" : workout.difficulty === "intermediate" ? "Menengah" : "Lanjutan"}</Text>
              </View>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Kategori</Text>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{workout.category}</Text>
              </View>
            </View>
          </View>

          {/* Recent Workouts */}
          {workoutHistory.length > 0 && (
            <View style={styles.recentWorkoutsCard}>
              <Text style={styles.recentWorkoutsTitle}>Latihan Terakhir Anda</Text>
              {workoutHistory.slice(0, 3).map((item, index) => (
                <View key={index} style={styles.recentWorkoutItem}>
                  <View style={styles.recentWorkoutInfo}>
                    <Text style={styles.recentWorkoutName}>{item.workout_title}</Text>
                    <Text style={styles.recentWorkoutTime}>
                      {item.duration_minutes} menit • {item.calories_burned} kalori
                    </Text>
                  </View>
                  <Text style={styles.recentWorkoutDate}>
                    {new Date(item.completed_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                    })}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Tracking Notice */}
          <View style={styles.trackingNotice}>
            <Ionicons name="checkmark-circle" size={24} color="#10b981" />
            <View style={styles.trackingNoticeText}>
              <Text style={styles.trackingNoticeTitle}>Kalori Tersimpan</Text>
              <Text style={styles.trackingNoticeDescription}>Latihan ini sudah otomatis ditambahkan ke tracking activity Anda hari ini. Kalori yang dibakar akan mengurangi total kalori harian.</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={onBack}>
              <Ionicons name="home-outline" size={20} color="#64748b" />
              <Text style={styles.actionButtonText}>Beranda</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={onBack}>
              <Ionicons name="repeat-outline" size={20} color="#64748b" />
              <Text style={styles.actionButtonText}>Ulangi</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleGoToTracking}>
              <Ionicons name="stats-chart-outline" size={20} color="#64748b" />
              <Text style={styles.actionButtonText}>Tracking</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Main Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.trackingButton} onPress={handleGoToTracking}>
          <Ionicons name="trending-up" size={20} color="#fff" />
          <Text style={styles.trackingButtonText}>Lihat Tracking Activity</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.doneButton} onPress={onBack}>
          <Text style={styles.doneButtonText}>Selesai</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Main Workout Screen
export default function WorkoutScreen({ navigation }: { navigation: any }) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [currentScreen, setCurrentScreen] = useState<"list" | "start" | "complete">("list");
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutVideo | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [userData, setUserData] = useState<any>(null);

  const insets = useSafeAreaInsets();

  // Get user ID on component mount
  useEffect(() => {
    const getUser = async () => {
      try {
        const data = await AsyncStorage.getItem("loggedInUser");
        if (data) {
          const user = JSON.parse(data);
          setUserData(user);

          // Get user from database by email to get userId
          const { UserDatabase } = require("../db");
          const dbUser = UserDatabase.getUserByEmail(user.email);
          if (dbUser) {
            setUserId(dbUser.id_user);
          } else {
            console.warn("User not found in database");
          }
        }
      } catch (error) {
        console.error("Error getting user:", error);
      }
    };
    getUser();
  }, []);

  // Filter video berdasarkan kategori dan kesulitan
  const filteredVideos = workoutVideos.filter((video) => {
    const matchesCategory = selectedCategory === "all" || video.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === "all" || video.difficulty === selectedDifficulty;

    return matchesCategory && matchesDifficulty;
  });

  const handleStartWorkout = (workout: WorkoutVideo) => {
    setSelectedWorkout(workout);
    setCurrentScreen("start");
  };

  const handleCompleteWorkout = (success: boolean) => {
    setCurrentScreen("complete");
  };

  const handleBackToList = () => {
    setCurrentScreen("list");
    setSelectedWorkout(null);
  };

  const renderCategoryButton = (category: (typeof categories)[0]) => (
    <TouchableOpacity key={category.id} style={[styles.categoryButton, selectedCategory === category.id && styles.categoryButtonActive]} onPress={() => setSelectedCategory(category.id)}>
      {category.icon && <Text style={styles.categoryIcon}>{category.icon}</Text>}
      <Text style={[styles.categoryButtonText, selectedCategory === category.id && styles.categoryButtonTextActive]}>{category.name}</Text>
    </TouchableOpacity>
  );

  const renderDifficultyChip = (level: (typeof difficultyLevels)[0]) => (
    <TouchableOpacity
      key={level.id}
      style={[
        styles.difficultyChip,
        selectedDifficulty === level.id && {
          backgroundColor: level.color || "#3b82f6",
        },
      ]}
      onPress={() => setSelectedDifficulty(level.id)}
    >
      <Text style={[styles.difficultyChipText, selectedDifficulty === level.id && styles.difficultyChipTextActive]}>{level.name}</Text>
    </TouchableOpacity>
  );

  const renderWorkoutCard = (workout: WorkoutVideo) => {
    // Check if this workout was completed today - TAMBAHKAN userId
    const isCompletedToday = WorkoutDatabase.isWorkoutCompletedToday(workout.id, userId || undefined);

    return (
      <ThemedView key={workout.id} style={styles.workoutCard}>
        {/* Workout Thumbnail */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: workout.thumbnail }} style={styles.workoutImage} resizeMode="cover" />
          <View style={styles.imageOverlay}>
            <View style={styles.difficultyBadgeWorkout}>
              <Text style={styles.difficultyBadgeText}>{workout.difficulty === "beginner" ? "Pemula" : workout.difficulty === "intermediate" ? "Menengah" : "Lanjutan"}</Text>
            </View>
            <View style={styles.durationBadge}>
              <Ionicons name="time-outline" size={12} color="#fff" />
              <Text style={styles.durationText}>{workout.duration}</Text>
            </View>
          </View>

          {/* Completed Badge */}
          {isCompletedToday && (
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#fff" />
              <Text style={styles.completedText}>Selesai</Text>
            </View>
          )}
        </View>

        <View style={styles.workoutInfo}>
          <View style={styles.workoutHeader}>
            <Text style={styles.workoutTitle}>{workout.title}</Text>
            {isCompletedToday && (
              <View style={styles.completedIndicator}>
                <Ionicons name="checkmark" size={16} color="#10b981" />
              </View>
            )}
          </View>

          <Text style={styles.workoutDescription}>{workout.description}</Text>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Ionicons name="flame-outline" size={16} color="#ef4444" />
              </View>
              <Text style={styles.statText}>{workout.calories} kalori</Text>
            </View>
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Ionicons name="barbell-outline" size={16} color="#10b981" />
              </View>
              <Text style={styles.statText}>{workout.totalExercises} latihan</Text>
            </View>
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Ionicons name="fitness-outline" size={16} color="#3b82f6" />
              </View>
              <Text style={styles.statText}>{workout.totalTime}</Text>
            </View>
          </View>

          <View style={styles.focusContainer}>
            <Text style={styles.focusTitle}>Fokus Latihan:</Text>
            <View style={styles.focusTags}>
              {workout.focus.slice(0, 3).map((item, index) => (
                <View key={index} style={styles.focusTag}>
                  <Text style={styles.focusTagText}>{item}</Text>
                </View>
              ))}
              {workout.focus.length > 3 && (
                <View style={styles.focusTag}>
                  <Text style={styles.focusTagText}>+{workout.focus.length - 3}</Text>
                </View>
              )}
            </View>
          </View>

          {workout.equipment.length > 0 && (
            <View style={styles.equipmentContainer}>
              <Text style={styles.equipmentTitle}>Perlengkapan:</Text>
              <View style={styles.equipmentTags}>
                {workout.equipment.slice(0, 2).map((item, index) => (
                  <View key={index} style={styles.equipmentTag}>
                    <Ionicons name="checkmark-circle-outline" size={14} color="#10b981" />
                    <Text style={styles.equipmentTagText}>{item}</Text>
                  </View>
                ))}
                {workout.equipment.length > 2 && (
                  <View style={styles.equipmentTag}>
                    <Text style={styles.equipmentTagText}>+{workout.equipment.length - 2}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Start Workout Button */}
          <View style={styles.workoutActions}>
            <TouchableOpacity style={[styles.startWorkoutButton, isCompletedToday && styles.completedWorkoutButton]} onPress={() => handleStartWorkout(workout)}>
              <Ionicons name={isCompletedToday ? "checkmark-circle" : "play-circle"} size={20} color="#fff" />
              <Text style={styles.startWorkoutButtonText}>{isCompletedToday ? "Ulangi Latihan" : "Mulai Latihan"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ThemedView>
    );
  };

  // Render berdasarkan screen yang aktif
  if (currentScreen === "start" && selectedWorkout) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <WorkoutStartScreen workout={selectedWorkout} onBack={handleBackToList} onComplete={handleCompleteWorkout} userId={userId || undefined} navigation={navigation} />
      </View>
    );
  }

  if (currentScreen === "complete" && selectedWorkout) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <WorkoutCompleteScreen workout={selectedWorkout} onBack={handleBackToList} userId={userId || undefined} navigation={navigation} />
      </View>
    );
  }

  // Default: List Screen
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Program Latihan</Text>
            <Text style={styles.headerSubtitle}>
              Pilih program latihan yang sesuai dengan tujuan dan level Anda
              {userId && <Text style={styles.userIdText}> • ID: {userId}</Text>}
            </Text>
          </View>
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kategori Latihan</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll} contentContainerStyle={styles.categoriesContainer}>
            {categories.map(renderCategoryButton)}
          </ScrollView>
        </View>

        {/* Difficulty Levels */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tingkat Kesulitan</Text>
          <View style={styles.difficultyContainer}>{difficultyLevels.map(renderDifficultyChip)}</View>
        </View>

        {/* Workout Videos */}
        <View style={styles.section}>
          <View style={styles.recommendationHeader}>
            <Text style={styles.sectionTitle}>Rekomendasi Latihan</Text>
            <Text style={styles.videoCount}>({filteredVideos.length} program)</Text>
          </View>

          {filteredVideos.length > 0 ? (
            filteredVideos.map(renderWorkoutCard)
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="fitness-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyStateText}>Tidak ditemukan latihan dengan filter yang dipilih</Text>
              <TouchableOpacity
                style={styles.resetFilterButton}
                onPress={() => {
                  setSelectedCategory("all");
                  setSelectedDifficulty("all");
                }}
              >
                <Text style={styles.resetFilterButtonText}>Reset Filter</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  // List Screen Styles
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#64748b",
    lineHeight: 20,
  },
  userIdText: {
    fontSize: 12,
    color: "#94a3b8",
    fontStyle: "italic",
  },
  userInfoContainer: {
    backgroundColor: "#f0f9ff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: "center",
  },
  userInfoText: {
    fontSize: 12,
    color: "#3b82f6",
    fontWeight: "600",
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 12,
  },
  recommendationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  videoCount: {
    fontSize: 14,
    color: "#64748b",
    marginLeft: 8,
  },
  categoriesScroll: {
    flexGrow: 0,
  },
  categoriesContainer: {
    paddingRight: 16,
    gap: 8,
  },
  categoryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 8,
  },
  categoryButtonActive: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },
  categoryIcon: {
    fontSize: 16,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
  categoryButtonTextActive: {
    color: "#fff",
  },
  difficultyContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  difficultyChip: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  difficultyChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
  },
  difficultyChipTextActive: {
    color: "#fff",
  },
  workoutCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  imageContainer: {
    width: "100%",
    height: 200,
    position: "relative",
  },
  workoutImage: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.2)",
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  difficultyBadgeWorkout: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  difficultyBadgeText: {
    color: "#0f172a",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  durationBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  durationText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  completedBadge: {
    position: "absolute",
    bottom: 16,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.9)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  completedText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  workoutInfo: {
    padding: 16,
  },
  workoutHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  workoutTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
    flex: 1,
  },
  completedIndicator: {
    padding: 4,
    backgroundColor: "#f0fdf4",
    borderRadius: 20,
  },
  workoutDescription: {
    fontSize: 14,
    color: "#64748b",
    lineHeight: 20,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  statText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    flex: 1,
  },
  focusContainer: {
    marginBottom: 16,
  },
  focusTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 8,
  },
  focusTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  focusTag: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  focusTagText: {
    fontSize: 12,
    color: "#3b82f6",
    fontWeight: "600",
  },
  equipmentContainer: {
    marginBottom: 16,
  },
  equipmentTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 8,
  },
  equipmentTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  equipmentTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  equipmentTagText: {
    fontSize: 12,
    color: "#166534",
    fontWeight: "600",
  },
  workoutActions: {
    marginTop: 8,
  },
  startWorkoutButton: {
    backgroundColor: "#10b981",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  completedWorkoutButton: {
    backgroundColor: "#3b82f6",
  },
  startWorkoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 60,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
  },
  resetFilterButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#3b82f6",
    borderRadius: 8,
  },
  resetFilterButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  // Workout Start Screen Styles
  workoutStartContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  workoutHeaderStart: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  workoutHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  scrollContent: {
    paddingBottom: 24,
  },
  progressContainer: {
    padding: 16,
    backgroundColor: "#fff",
    marginBottom: 8,
    marginTop: 8,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3b82f6",
  },
  progressPercentage: {
    fontSize: 14,
    color: "#64748b",
  },
  progressBar: {
    height: 6,
    backgroundColor: "#e2e8f0",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#3b82f6",
    borderRadius: 3,
  },
  exerciseContainer: {
    padding: 24,
    backgroundColor: "#fff",
    alignItems: "center",
    marginBottom: 16,
  },
  exerciseTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 24,
    textAlign: "center",
  },
  timerContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  timerText: {
    fontSize: 48,
    fontWeight: "700",
    color: "#0f172a",
    fontVariant: ["tabular-nums"],
  },
  timerLabel: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
  },
  exerciseImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  exerciseImage: {
    fontSize: 64,
  },
  exerciseInfo: {
    flexDirection: "row",
    gap: 32,
    marginBottom: 20,
  },
  infoItem: {
    alignItems: "center",
    gap: 8,
  },
  infoText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#334155",
  },
  exerciseDescription: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  startShareButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#f0f9ff",
  },
  startShareButtonText: {
    fontSize: 14,
    color: "#3b82f6",
    fontWeight: "600",
  },
  controlsContainer: {
    padding: 24,
    backgroundColor: "#fff",
    marginBottom: 16,
  },
  mainControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  previousButton: {
    alignItems: "center",
    gap: 8,
    minWidth: 80,
  },
  nextButton: {
    alignItems: "center",
    gap: 8,
    minWidth: 80,
  },
  playPauseButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#3b82f6",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  controlButtonText: {
    fontSize: 14,
    color: "#3b82f6",
    fontWeight: "600",
  },
  disabledButtonText: {
    color: "#cbd5e1",
  },
  upcomingContainer: {
    padding: 16,
    backgroundColor: "#fff",
  },
  upcomingTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 16,
  },
  upcomingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  upcomingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  upcomingIconText: {
    fontSize: 20,
  },
  upcomingInfo: {
    flex: 1,
  },
  upcomingName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 2,
  },
  upcomingDuration: {
    fontSize: 14,
    color: "#64748b",
  },
  upcomingStatus: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "#f0f9ff",
    borderRadius: 12,
  },
  upcomingStatusText: {
    fontSize: 12,
    color: "#3b82f6",
    fontWeight: "600",
  },

  // Workout Complete Screen Styles
  completeContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  completeContent: {
    flex: 1,
    alignItems: "center",
    padding: 24,
    paddingBottom: 100,
  },
  checkmarkContainer: {
    marginBottom: 32,
    alignItems: "center",
  },
  checkmarkCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#10b981",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#10b981",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    position: "relative",
  },
  confetti: {
    flexDirection: "row",
    position: "absolute",
    top: -20,
    width: "120%",
    justifyContent: "space-between",
  },
  confettiIcon: {
    fontSize: 24,
  },
  completeTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 12,
    textAlign: "center",
  },
  completeSubtitle: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
  },
  savedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 24,
  },
  savedText: {
    fontSize: 14,
    color: "#065f46",
    fontWeight: "600",
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: "#64748b",
  },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 16,
  },
  summaryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  summaryLabel: {
    fontSize: 14,
    color: "#64748b",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#f0f9ff",
  },
  categoryText: {
    color: "#3b82f6",
    fontSize: 12,
    fontWeight: "600",
  },
  recentWorkoutsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  recentWorkoutsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 16,
  },
  recentWorkoutItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  recentWorkoutInfo: {
    flex: 1,
  },
  recentWorkoutName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 4,
  },
  recentWorkoutTime: {
    fontSize: 12,
    color: "#64748b",
  },
  recentWorkoutDate: {
    fontSize: 12,
    color: "#94a3b8",
    marginLeft: 12,
  },
  trackingNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#f0fdf4",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    width: "100%",
    gap: 12,
  },
  trackingNoticeText: {
    flex: 1,
  },
  trackingNoticeTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#065f46",
    marginBottom: 4,
  },
  trackingNoticeDescription: {
    fontSize: 14,
    color: "#64748b",
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 32,
    width: "100%",
    justifyContent: "center",
  },
  actionButton: {
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    minWidth: 90,
  },
  actionButtonText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },
  completeShareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#f0f9ff",
    width: "100%",
    marginBottom: 24,
  },
  completeShareButtonText: {
    fontSize: 16,
    color: "#3b82f6",
    fontWeight: "600",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    gap: 12,
  },
  trackingButton: {
    backgroundColor: "#10b981",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  trackingButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  doneButton: {
    backgroundColor: "#3b82f6",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  doneButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
