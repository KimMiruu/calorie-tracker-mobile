// app/db.ts
import * as SQLite from "expo-sqlite";

const DB_NAME = "simplefit.db";

const getDatabase = () => {
  try {
    return (SQLite as any).openDatabaseSync(DB_NAME);
  } catch (error) {
    console.error("Error initializing database (openDatabaseSync):", error);
    return null;
  }
};

const db: any = getDatabase();

const escapeParam = (param: any) => {
  if (param === null || param === undefined) return "NULL";
  if (typeof param === "number") return String(param);
  if (typeof param === "boolean") return param ? "1" : "0";
  const s = String(param).replace(/'/g, "''");
  return `'${s}'`;
};

const formatQueryWithParams = (query: string, params: any[]): string => {
  let formatted = query;
  for (let i = 0; i < params.length; i++) {
    const escaped = escapeParam(params[i]);
    formatted = formatted.replace("?", escaped);
  }
  return formatted;
};

export const initDB = (): boolean => {
  if (!db) {
    console.warn("SQLite not available in this environment (db is null).");
    return false;
  }

  try {
    // Create users table
    db.execSync(
      `CREATE TABLE IF NOT EXISTS users (
         id_user INTEGER PRIMARY KEY AUTOINCREMENT,
         username TEXT,
         email TEXT UNIQUE,
         password TEXT,
         usia INTEGER,
         berat REAL,
         tinggi REAL,
         jenis_kelamin TEXT,
         target_kalori INTEGER,
         created_at TEXT DEFAULT (datetime('now'))
       );`
    );

    // Create food_items table with user_id
    db.execSync(
      `CREATE TABLE IF NOT EXISTS food_items (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         name TEXT NOT NULL,
         calories REAL NOT NULL,
         protein REAL DEFAULT 0,
         carbs REAL DEFAULT 0,
         fat REAL DEFAULT 0,
         quantity REAL DEFAULT 1,
         unit TEXT DEFAULT 'serving',
         meal_type TEXT NOT NULL,
         date TEXT NOT NULL,
         user_id INTEGER,
         created_at TEXT DEFAULT (datetime('now')),
         FOREIGN KEY (user_id) REFERENCES users(id_user) ON DELETE CASCADE
       );`
    );

    // Create exercises table with user_id
    db.execSync(
      `CREATE TABLE IF NOT EXISTS exercises (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         name TEXT NOT NULL,
         calories_burned REAL NOT NULL,
         duration INTEGER NOT NULL,
         type TEXT NOT NULL,
         date TEXT NOT NULL,
         user_id INTEGER,
         created_at TEXT DEFAULT (datetime('now')),
         FOREIGN KEY (user_id) REFERENCES users(id_user) ON DELETE CASCADE
       );`
    );

    // Create daily_goals table with user_id
    db.execSync(
      `CREATE TABLE IF NOT EXISTS daily_goals (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         date TEXT NOT NULL,
         calorie_goal REAL DEFAULT 2000,
         protein_goal REAL DEFAULT 0,
         carbs_goal REAL DEFAULT 0,
         fat_goal REAL DEFAULT 0,
         user_id INTEGER,
         created_at TEXT DEFAULT (datetime('now')),
         FOREIGN KEY (user_id) REFERENCES users(id_user) ON DELETE CASCADE,
         UNIQUE(date, user_id)
       );`
    );

    // Create drinks table with user_id
    db.execSync(
      `CREATE TABLE IF NOT EXISTS drinks (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         name TEXT NOT NULL,
         volume REAL NOT NULL,
         date TEXT NOT NULL,
         time TEXT NOT NULL,
         user_id INTEGER,
         created_at TEXT DEFAULT (datetime('now')),
         FOREIGN KEY (user_id) REFERENCES users(id_user) ON DELETE CASCADE
       );`
    );

    // Create progress_history table with user_id
    db.execSync(
      `CREATE TABLE IF NOT EXISTS progress_history (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         date TEXT NOT NULL,
         streak_days INTEGER DEFAULT 0,
         total_calories_burned REAL DEFAULT 0,
         total_workouts INTEGER DEFAULT 0,
         achievement TEXT,
         user_id INTEGER,
         created_at TEXT DEFAULT (datetime('now')),
         FOREIGN KEY (user_id) REFERENCES users(id_user) ON DELETE CASCADE,
         UNIQUE(date, user_id)
       );`
    );

    // Create workouts_history table with user_id
    db.execSync(
      `CREATE TABLE IF NOT EXISTS workouts_history (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         workout_id TEXT NOT NULL,
         workout_title TEXT NOT NULL,
         workout_category TEXT NOT NULL,
         workout_difficulty TEXT NOT NULL,
         duration_minutes INTEGER NOT NULL,
         calories_burned REAL NOT NULL,
         total_exercises INTEGER NOT NULL,
         completed_at TEXT DEFAULT (datetime('now')),
         user_id INTEGER,
         FOREIGN KEY (user_id) REFERENCES users(id_user) ON DELETE CASCADE
       );`
    );

    // Create workout_exercises table with user_id
    db.execSync(
      `CREATE TABLE IF NOT EXISTS workout_exercises (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         workout_history_id INTEGER,
         exercise_name TEXT NOT NULL,
         exercise_duration INTEGER NOT NULL,
         exercise_sets TEXT NOT NULL,
         completed_at TEXT DEFAULT (datetime('now')),
         user_id INTEGER,
         FOREIGN KEY (workout_history_id) REFERENCES workouts_history(id) ON DELETE CASCADE,
         FOREIGN KEY (user_id) REFERENCES users(id_user) ON DELETE CASCADE
       );`
    );

    console.log("Database initialized with user isolation.");
    return true;
  } catch (error) {
    console.error("initDB error:", error);
    return false;
  }
};

export const executeParamQuery = (query: string, params: any[] = []): any => {
  if (!db) {
    console.warn("Database not available");
    return [];
  }

  try {
    const trimmed = query.trim().toUpperCase();
    if (trimmed.startsWith("SELECT")) {
      const result = db.getAllSync(query, params);
      return result || [];
    } else {
      // FIX: pakai runSync dengan params, bukan format manual
      return db.runSync(query, params);
    }
  } catch (error) {
    console.error("executeParamQuery error:", error, { query, params });
    return [];
  }
};

export const listTables = (): any[] => {
  if (!db) return [];
  try {
    const rows = db.getAllSync("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'", []);
    return rows || [];
  } catch (err) {
    console.error("listTables error:", err);
    return [];
  }
};

export const checkDatabaseConnection = (): boolean => {
  if (!db) return false;
  try {
    const r = db.getAllSync("SELECT 1 as test", []);
    return Array.isArray(r);
  } catch (err) {
    console.error("checkDatabaseConnection failed:", err);
    return false;
  }
};

export const runTransaction = (operations: (() => void)[]): boolean => {
  if (!db) {
    console.warn("Database not available");
    return false;
  }

  try {
    db.execSync("BEGIN TRANSACTION;");
    try {
      operations.forEach((op) => op());
      db.execSync("COMMIT;");
      return true;
    } catch (opErr) {
      db.execSync("ROLLBACK;");
      console.error("Transaction operation error:", opErr);
      return false;
    }
  } catch (err) {
    console.error("runTransaction error:", err);
    return false;
  }
};

// Food Items Operations dengan user_id
export const FoodDatabase = {
  addFoodItem: (foodItem: { name: string; calories: number; protein: number; carbs: number; fat: number; quantity: number; unit: string; mealType: string; date: string; userId?: number }): number => {
  try {
    const safeItem = {
      name: foodItem.name || '',
      calories: isNaN(Number(foodItem.calories)) ? 0 : Number(foodItem.calories),
      protein: isNaN(Number(foodItem.protein)) ? 0 : Number(foodItem.protein),
      carbs: isNaN(Number(foodItem.carbs)) ? 0 : Number(foodItem.carbs),
      fat: isNaN(Number(foodItem.fat)) ? 0 : Number(foodItem.fat),
      quantity: isNaN(Number(foodItem.quantity)) ? 1 : Number(foodItem.quantity),
      unit: foodItem.unit || 'serving',
      mealType: foodItem.mealType || '',
      date: foodItem.date || '',
      userId: foodItem.userId ?? null,
    };

    executeParamQuery(
      `INSERT INTO food_items 
       (name, calories, protein, carbs, fat, quantity, unit, meal_type, date, user_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [safeItem.name, safeItem.calories, safeItem.protein, safeItem.carbs, safeItem.fat, safeItem.quantity, safeItem.unit, safeItem.mealType, safeItem.date, safeItem.userId]
    );

    const lastInsertResult = executeParamQuery("SELECT last_insert_rowid() as id", []);
    return lastInsertResult[0]?.id || 0;
  } catch (error) {
    console.error("Error adding food item:", error);
    return 0;
  }
},

  getFoodItemsByDate: (date: string, userId?: number): any[] => {
    try {
      if (userId) {
        return executeParamQuery(`SELECT * FROM food_items WHERE date = ? AND user_id = ? ORDER BY created_at DESC`, [date, userId]);
      } else {
        return executeParamQuery(`SELECT * FROM food_items WHERE date = ? ORDER BY created_at DESC`, [date]);
      }
    } catch (error) {
      console.error("Error getting food items by date:", error);
      return [];
    }
  },

  getFoodItemsByMealType: (date: string, userId?: number): Record<string, any[]> => {
    try {
      let foodItems;
      if (userId) {
        foodItems = executeParamQuery(`SELECT * FROM food_items WHERE date = ? AND user_id = ? ORDER BY meal_type, created_at DESC`, [date, userId]);
      } else {
        foodItems = executeParamQuery(`SELECT * FROM food_items WHERE date = ? ORDER BY meal_type, created_at DESC`, [date]);
      }

      const meals: Record<string, any[]> = {
        breakfast: [],
        lunch: [],
        dinner: [],
        snacks: [],
      };

      if (foodItems && Array.isArray(foodItems)) {
        foodItems.forEach((item: any) => {
          if (item.meal_type && meals[item.meal_type]) {
            meals[item.meal_type].push({
              id: item.id?.toString() || "",
              name: item.name || "",
              calories: item.calories || 0,
              protein: item.protein || 0,
              carbs: item.carbs || 0,
              fat: item.fat || 0,
              quantity: item.quantity || 1,
              unit: item.unit || "serving",
            });
          }
        });
      }

      return meals;
    } catch (error) {
      console.error("Error getting food items by meal type:", error);
      return { breakfast: [], lunch: [], dinner: [], snacks: [] };
    }
  },

  deleteFoodItem: (id: number, userId?: number): boolean => {
    try {
      if (userId) {
        executeParamQuery("DELETE FROM food_items WHERE id = ? AND user_id = ?", [id, userId]);
      } else {
        executeParamQuery("DELETE FROM food_items WHERE id = ?", [id]);
      }
      return true;
    } catch (error) {
      console.error("Error deleting food item:", error);
      return false;
    }
  },

  updateFoodItem: (
    id: number,
    updates: {
      name?: string;
      calories?: number;
      protein?: number;
      carbs?: number;
      fat?: number;
      quantity?: number;
      unit?: string;
      mealType?: string;
    },
    userId?: number
  ): boolean => {
    try {
      const setClause = Object.keys(updates)
        .map((key) => `${key} = ?`)
        .join(", ");
      const values = Object.values(updates);

      if (userId) {
        values.push(id, userId);
        executeParamQuery(`UPDATE food_items SET ${setClause} WHERE id = ? AND user_id = ?`, values);
      } else {
        values.push(id);
        executeParamQuery(`UPDATE food_items SET ${setClause} WHERE id = ?`, values);
      }
      return true;
    } catch (error) {
      console.error("Error updating food item:", error);
      return false;
    }
  },

  getTotalCaloriesByDateRange: (startDate: string, endDate: string, userId?: number): number => {
    try {
      if (userId) {
        const result = executeParamQuery(
          `SELECT COALESCE(SUM(calories), 0) as total FROM food_items 
           WHERE date BETWEEN ? AND ? AND user_id = ?`,
          [startDate, endDate, userId]
        );
        return result[0]?.total || 0;
      } else {
        const result = executeParamQuery(
          `SELECT COALESCE(SUM(calories), 0) as total FROM food_items 
           WHERE date BETWEEN ? AND ?`,
          [startDate, endDate]
        );
        return result[0]?.total || 0;
      }
    } catch (error) {
      console.error("Error getting total calories by date range:", error);
      return 0;
    }
  },

  getTopFoodsByCalories: (limit: number = 10, userId?: number): any[] => {
    try {
      if (userId) {
        return executeParamQuery(
          `SELECT name, SUM(calories) as total_calories, COUNT(*) as count 
           FROM food_items 
           WHERE user_id = ?
           GROUP BY name 
           ORDER BY total_calories DESC 
           LIMIT ?`,
          [userId, limit]
        );
      } else {
        return executeParamQuery(
          `SELECT name, SUM(calories) as total_calories, COUNT(*) as count 
           FROM food_items 
           GROUP BY name 
           ORDER BY total_calories DESC 
           LIMIT ?`,
          [limit]
        );
      }
    } catch (error) {
      console.error("Error getting top foods by calories:", error);
      return [];
    }
  },
};

// Exercises Operations dengan user_id
export const ExerciseDatabase = {
  addExercise: (exercise: { name: string; caloriesBurned: number; duration: number; type: string; date: string; userId?: number }): number => {
    try {
      executeParamQuery(
        `INSERT INTO exercises 
         (name, calories_burned, duration, type, date, user_id) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [exercise.name, exercise.caloriesBurned, exercise.duration, exercise.type, exercise.date, exercise.userId]
      );

      const lastInsertResult = executeParamQuery("SELECT last_insert_rowid() as id", []);
      return lastInsertResult[0]?.id || 0;
    } catch (error) {
      console.error("Error adding exercise:", error);
      return 0;
    }
  },

  getExercisesByDate: (date: string, userId?: number): any[] => {
    try {
      let exercises;
      if (userId) {
        exercises = executeParamQuery(`SELECT * FROM exercises WHERE date = ? AND user_id = ? ORDER BY created_at DESC`, [date, userId]);
      } else {
        exercises = executeParamQuery(`SELECT * FROM exercises WHERE date = ? ORDER BY created_at DESC`, [date]);
      }

      if (exercises && Array.isArray(exercises)) {
        return exercises.map((item: any) => ({
          id: item.id?.toString() || "",
          name: item.name || "",
          caloriesBurned: item.calories_burned || 0,
          duration: item.duration || 0,
          type: item.type || "",
        }));
      }

      return [];
    } catch (error) {
      console.error("Error getting exercises by date:", error);
      return [];
    }
  },

  deleteExercise: (id: number, userId?: number): boolean => {
    try {
      if (userId) {
        executeParamQuery("DELETE FROM exercises WHERE id = ? AND user_id = ?", [id, userId]);
      } else {
        executeParamQuery("DELETE FROM exercises WHERE id = ?", [id]);
      }
      return true;
    } catch (error) {
      console.error("Error deleting exercise:", error);
      return false;
    }
  },

  updateExercise: (id: number, updates: { name?: string; caloriesBurned?: number; duration?: number; type?: string }, userId?: number): boolean => {
    try {
      const setClause = Object.keys(updates)
        .map((key) => {
          const dbKey = key === "caloriesBurned" ? "calories_burned" : key;
          return `${dbKey} = ?`;
        })
        .join(", ");
      const values = Object.values(updates);

      if (userId) {
        values.push(id, userId);
        executeParamQuery(`UPDATE exercises SET ${setClause} WHERE id = ? AND user_id = ?`, values);
      } else {
        values.push(id);
        executeParamQuery(`UPDATE exercises SET ${setClause} WHERE id = ?`, values);
      }
      return true;
    } catch (error) {
      console.error("Error updating exercise:", error);
      return false;
    }
  },

  getTotalCaloriesBurnedByDateRange: (startDate: string, endDate: string, userId?: number): number => {
    try {
      if (userId) {
        const result = executeParamQuery(
          `SELECT COALESCE(SUM(calories_burned), 0) as total FROM exercises 
           WHERE date BETWEEN ? AND ? AND user_id = ?`,
          [startDate, endDate, userId]
        );
        return result[0]?.total || 0;
      } else {
        const result = executeParamQuery(
          `SELECT COALESCE(SUM(calories_burned), 0) as total FROM exercises 
           WHERE date BETWEEN ? AND ?`,
          [startDate, endDate]
        );
        return result[0]?.total || 0;
      }
    } catch (error) {
      console.error("Error getting total calories burned by date range:", error);
      return 0;
    }
  },

  getMostFrequentExercises: (limit: number = 10, userId?: number): any[] => {
    try {
      if (userId) {
        return executeParamQuery(
          `SELECT name, COUNT(*) as count, SUM(calories_burned) as total_calories 
           FROM exercises 
           WHERE user_id = ?
           GROUP BY name 
           ORDER BY count DESC 
           LIMIT ?`,
          [userId, limit]
        );
      } else {
        return executeParamQuery(
          `SELECT name, COUNT(*) as count, SUM(calories_burned) as total_calories 
           FROM exercises 
           GROUP BY name 
           ORDER BY count DESC 
           LIMIT ?`,
          [limit]
        );
      }
    } catch (error) {
      console.error("Error getting most frequent exercises:", error);
      return [];
    }
  },
};

// Daily Goals Operations dengan user_id
export const GoalsDatabase = {
  setDailyGoal: (goal: { date: string; calorieGoal: number; proteinGoal?: number; carbsGoal?: number; fatGoal?: number; userId?: number }): boolean => {
    try {
      if (goal.userId) {
        executeParamQuery(
          `INSERT OR REPLACE INTO daily_goals 
           (date, calorie_goal, protein_goal, carbs_goal, fat_goal, user_id) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [goal.date, goal.calorieGoal, goal.proteinGoal || 0, goal.carbsGoal || 0, goal.fatGoal || 0, goal.userId]
        );
      } else {
        executeParamQuery(
          `INSERT OR REPLACE INTO daily_goals 
           (date, calorie_goal, protein_goal, carbs_goal, fat_goal) 
           VALUES (?, ?, ?, ?, ?)`,
          [goal.date, goal.calorieGoal, goal.proteinGoal || 0, goal.carbsGoal || 0, goal.fatGoal || 0]
        );
      }
      return true;
    } catch (error) {
      console.error("Error setting daily goal:", error);
      return false;
    }
  },

  getDailyGoal: (date: string, userId?: number): any => {
    try {
      let result;
      if (userId) {
        result = executeParamQuery("SELECT * FROM daily_goals WHERE date = ? AND user_id = ?", [date, userId]);
      } else {
        result = executeParamQuery("SELECT * FROM daily_goals WHERE date = ?", [date]);
      }

      if (result && result.length > 0) {
        const item = result[0];
        return {
          calorieGoal: item.calorie_goal || 2000,
          proteinGoal: item.protein_goal || 0,
          carbsGoal: item.carbs_goal || 0,
          fatGoal: item.fat_goal || 0,
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error("Error getting daily goal:", error);
      return null;
    }
  },

  getGoalAchievementRate: (startDate: string, endDate: string, userId?: number): number => {
    try {
      if (userId) {
        const result = executeParamQuery(
          `SELECT 
            COUNT(*) as total_days,
            SUM(CASE WHEN f.total_calories <= g.calorie_goal THEN 1 ELSE 0 END) as days_on_target
           FROM daily_goals g
           LEFT JOIN (
             SELECT date, SUM(calories) as total_calories 
             FROM food_items 
             WHERE user_id = ?
             GROUP BY date
           ) f ON g.date = f.date
           WHERE g.date BETWEEN ? AND ? AND g.user_id = ?`,
          [userId, startDate, endDate, userId]
        );

        if (result && result.length > 0 && result[0].total_days > 0) {
          return (result[0].days_on_target / result[0].total_days) * 100;
        }
      } else {
        const result = executeParamQuery(
          `SELECT 
            COUNT(*) as total_days,
            SUM(CASE WHEN f.total_calories <= g.calorie_goal THEN 1 ELSE 0 END) as days_on_target
           FROM daily_goals g
           LEFT JOIN (
             SELECT date, SUM(calories) as total_calories 
             FROM food_items 
             GROUP BY date
           ) f ON g.date = f.date
           WHERE g.date BETWEEN ? AND ?`,
          [startDate, endDate]
        );

        if (result && result.length > 0 && result[0].total_days > 0) {
          return (result[0].days_on_target / result[0].total_days) * 100;
        }
      }
      return 0;
    } catch (error) {
      console.error("Error getting goal achievement rate:", error);
      return 0;
    }
  },
};

// Drinks Operations dengan user_id
export const DrinksDatabase = {
  addDrink: (drink: { name: string; volume: number; date: string; time: string; userId?: number }): number => {
    try {
      executeParamQuery(
        `INSERT INTO drinks 
         (name, volume, date, time, user_id) 
         VALUES (?, ?, ?, ?, ?)`,
        [drink.name, drink.volume, drink.date, drink.time, drink.userId]
      );

      const lastInsertResult = executeParamQuery("SELECT last_insert_rowid() as id", []);
      return lastInsertResult[0]?.id || 0;
    } catch (error) {
      console.error("Error adding drink:", error);
      return 0;
    }
  },

  getTodayWaterIntake: (date: string, userId?: number): number => {
    try {
      if (userId) {
        const result = executeParamQuery(
          `SELECT COALESCE(SUM(volume), 0) as totalVolume
           FROM drinks WHERE date = ? AND user_id = ?`,
          [date, userId]
        );
        return result[0]?.totalVolume || 0;
      } else {
        const result = executeParamQuery(
          `SELECT COALESCE(SUM(volume), 0) as totalVolume
           FROM drinks WHERE date = ?`,
          [date]
        );
        return result[0]?.totalVolume || 0;
      }
    } catch (error) {
      console.error("Error getting today's water intake:", error);
      return 0;
    }
  },

  getDrinksByDate: (date: string, userId?: number): any[] => {
    try {
      if (userId) {
        return executeParamQuery(`SELECT * FROM drinks WHERE date = ? AND user_id = ? ORDER BY time DESC`, [date, userId]);
      } else {
        return executeParamQuery(`SELECT * FROM drinks WHERE date = ? ORDER BY time DESC`, [date]);
      }
    } catch (error) {
      console.error("Error getting drinks by date:", error);
      return [];
    }
  },

  deleteDrink: (id: number, userId?: number): boolean => {
    try {
      if (userId) {
        executeParamQuery("DELETE FROM drinks WHERE id = ? AND user_id = ?", [id, userId]);
      } else {
        executeParamQuery("DELETE FROM drinks WHERE id = ?", [id]);
      }
      return true;
    } catch (error) {
      console.error("Error deleting drink:", error);
      return false;
    }
  },

  getRecentDrinks: (date: string, userId?: number): any[] => {
    try {
      if (userId) {
        return executeParamQuery(`SELECT * FROM drinks WHERE date = ? AND user_id = ? ORDER BY time DESC LIMIT 5`, [date, userId]);
      } else {
        return executeParamQuery(`SELECT * FROM drinks WHERE date = ? ORDER BY time DESC LIMIT 5`, [date]);
      }
    } catch (error) {
      console.error("Error getting recent drinks:", error);
      return [];
    }
  },

  getAverageWaterIntake: (startDate: string, endDate: string, userId?: number): number => {
    try {
      if (userId) {
        const result = executeParamQuery(
          `SELECT AVG(daily_total) as average
           FROM (
             SELECT date, SUM(volume) as daily_total
             FROM drinks
             WHERE date BETWEEN ? AND ? AND user_id = ?
             GROUP BY date
           )`,
          [startDate, endDate, userId]
        );
        return result[0]?.average || 0;
      } else {
        const result = executeParamQuery(
          `SELECT AVG(daily_total) as average
           FROM (
             SELECT date, SUM(volume) as daily_total
             FROM drinks
             WHERE date BETWEEN ? AND ?
             GROUP BY date
           )`,
          [startDate, endDate]
        );
        return result[0]?.average || 0;
      }
    } catch (error) {
      console.error("Error getting average water intake:", error);
      return 0;
    }
  },
};

// Workout Database Operations dengan user_id
export const WorkoutDatabase = {
  saveCompletedWorkout: (workoutData: {
    workout_id: string;
    workout_title: string;
    workout_category: string;
    workout_difficulty: string;
    duration_minutes: number;
    calories_burned: number;
    total_exercises: number;
    user_id?: number;
  }): number => {
    try {
      executeParamQuery(
        `INSERT INTO workouts_history 
         (workout_id, workout_title, workout_category, workout_difficulty, 
          duration_minutes, calories_burned, total_exercises, user_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [workoutData.workout_id, workoutData.workout_title, workoutData.workout_category, workoutData.workout_difficulty, workoutData.duration_minutes, workoutData.calories_burned, workoutData.total_exercises, workoutData.user_id]
      );

      const lastInsertResult = executeParamQuery("SELECT last_insert_rowid() as id", []);
      return lastInsertResult[0]?.id || 0;
    } catch (error) {
      console.error("Error saving completed workout:", error);
      return 0;
    }
  },

  saveWorkoutExercises: (
    workoutHistoryId: number,
    exercises: {
      name: string;
      duration: number;
      sets: string;
    }[],
    userId?: number
  ): boolean => {
    try {
      runTransaction([
        () => {
          exercises.forEach((exercise) => {
            executeParamQuery(
              `INSERT INTO workout_exercises 
               (workout_history_id, exercise_name, exercise_duration, exercise_sets, user_id) 
               VALUES (?, ?, ?, ?, ?)`,
              [workoutHistoryId, exercise.name, exercise.duration, exercise.sets, userId]
            );
          });
        },
      ]);
      return true;
    } catch (error) {
      console.error("Error saving workout exercises:", error);
      return false;
    }
  },

  getWorkoutHistory: (userId?: number, limit: number = 50): any[] => {
    try {
      let query = `SELECT * FROM workouts_history`;
      const params: any[] = [];

      if (userId) {
        query += ` WHERE user_id = ?`;
        params.push(userId);
      }

      query += ` ORDER BY completed_at DESC LIMIT ?`;
      params.push(limit);

      const result = executeParamQuery(query, params);

      return (result || []).map((item: any) => ({
        id: item.id,
        workout_id: item.workout_id,
        workout_title: item.workout_title,
        workout_category: item.workout_category,
        workout_difficulty: item.workout_difficulty,
        duration_minutes: item.duration_minutes,
        calories_burned: item.calories_burned,
        total_exercises: item.total_exercises,
        completed_at: item.completed_at,
        user_id: item.user_id,
      }));
    } catch (error) {
      console.error("Error getting workout history:", error);
      return [];
    }
  },

  getTodayWorkouts: (userId?: number): any[] => {
    try {
      const today = new Date().toISOString().split("T")[0];
      let query = `SELECT * FROM workouts_history WHERE DATE(completed_at) = ?`;
      const params: any[] = [today];

      if (userId) {
        query += ` AND user_id = ?`;
        params.push(userId);
      }

      query += ` ORDER BY completed_at DESC`;

      const result = executeParamQuery(query, params);
      return result || [];
    } catch (error) {
      console.error("Error getting today's workouts:", error);
      return [];
    }
  },

  getWorkoutExercises: (workoutHistoryId: number, userId?: number): any[] => {
    try {
      let query = `SELECT * FROM workout_exercises WHERE workout_history_id = ?`;
      const params: any[] = [workoutHistoryId];

      if (userId) {
        query += ` AND user_id = ?`;
        params.push(userId);
      }

      query += ` ORDER BY completed_at`;

      const result = executeParamQuery(query, params);
      return result || [];
    } catch (error) {
      console.error("Error getting workout exercises:", error);
      return [];
    }
  },

  getWorkoutStatistics: (userId?: number): any => {
    try {
      let query = `SELECT 
        COUNT(*) as total_workouts,
        SUM(duration_minutes) as total_minutes,
        SUM(calories_burned) as total_calories_burned,
        AVG(duration_minutes) as avg_duration,
        AVG(calories_burned) as avg_calories,
        MAX(calories_burned) as max_calories_workout,
        workout_category,
        COUNT(*) as category_count
      FROM workouts_history`;

      const params: any[] = [];

      if (userId) {
        query += ` WHERE user_id = ?`;
        params.push(userId);
      }

      query += ` GROUP BY workout_category`;

      const result = executeParamQuery(query, params);

      // Get overall statistics
      let overallQuery = `SELECT 
        COUNT(*) as total_workouts,
        SUM(duration_minutes) as total_minutes,
        SUM(calories_burned) as total_calories_burned,
        COUNT(DISTINCT DATE(completed_at)) as active_days,
        MIN(completed_at) as first_workout_date,
        MAX(completed_at) as last_workout_date
      FROM workouts_history`;

      const overallParams: any[] = [];

      if (userId) {
        overallQuery += ` WHERE user_id = ?`;
        overallParams.push(userId);
      }

      const overallStats = executeParamQuery(overallQuery, overallParams)[0] || {};

      // Calculate streak
      const streakQuery = `SELECT 
        DATE(completed_at) as workout_date
      FROM workouts_history
      ${userId ? "WHERE user_id = ?" : ""}
      GROUP BY DATE(completed_at)
      ORDER BY workout_date DESC`;

      const streakParams = userId ? [userId] : [];
      const workoutDates = executeParamQuery(streakQuery, streakParams);

      let streak = 0;
      const today = new Date().toISOString().split("T")[0];
      let currentDate = new Date(today);

      for (let i = 0; i < workoutDates.length; i++) {
        const workoutDate = new Date(workoutDates[i].workout_date);
        if (workoutDate.toISOString().split("T")[0] === currentDate.toISOString().split("T")[0]) {
          streak++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else {
          break;
        }
      }

      return {
        overall: {
          total_workouts: overallStats.total_workouts || 0,
          total_minutes: overallStats.total_minutes || 0,
          total_calories_burned: overallStats.total_calories_burned || 0,
          active_days: overallStats.active_days || 0,
          first_workout_date: overallStats.first_workout_date,
          last_workout_date: overallStats.last_workout_date,
          streak: streak,
        },
        by_category: result || [],
      };
    } catch (error) {
      console.error("Error getting workout statistics:", error);
      return {
        overall: {
          total_workouts: 0,
          total_minutes: 0,
          total_calories_burned: 0,
          active_days: 0,
          streak: 0,
        },
        by_category: [],
      };
    }
  },

  getWeeklyWorkoutSummary: (userId?: number): any[] => {
    try {
      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);

      const startDate = weekAgo.toISOString().split("T")[0];
      const endDate = today.toISOString().split("T")[0];

      let query = `SELECT 
        DATE(completed_at) as workout_date,
        COUNT(*) as workout_count,
        SUM(duration_minutes) as total_minutes,
        SUM(calories_burned) as total_calories
      FROM workouts_history
      WHERE DATE(completed_at) BETWEEN ? AND ?`;

      const params: any[] = [startDate, endDate];

      if (userId) {
        query += ` AND user_id = ?`;
        params.push(userId);
      }

      query += ` GROUP BY DATE(completed_at) ORDER BY workout_date`;

      const result = executeParamQuery(query, params);
      return result || [];
    } catch (error) {
      console.error("Error getting weekly workout summary:", error);
      return [];
    }
  },

  getMonthlyWorkoutProgress: (year: number, month: number, userId?: number): any[] => {
    try {
      const startDate = `${year}-${month.toString().padStart(2, "0")}-01`;
      const endDate = `${year}-${month.toString().padStart(2, "0")}-31`;

      let query = `SELECT 
        DATE(completed_at) as workout_date,
        COUNT(*) as workout_count,
        SUM(duration_minutes) as total_minutes,
        SUM(calories_burned) as total_calories,
        GROUP_CONCAT(DISTINCT workout_category) as categories
      FROM workouts_history
      WHERE DATE(completed_at) BETWEEN ? AND ?`;

      const params: any[] = [startDate, endDate];

      if (userId) {
        query += ` AND user_id = ?`;
        params.push(userId);
      }

      query += ` GROUP BY DATE(completed_at) ORDER BY workout_date`;

      const result = executeParamQuery(query, params);
      return result || [];
    } catch (error) {
      console.error("Error getting monthly workout progress:", error);
      return [];
    }
  },

  deleteWorkoutHistory: (id: number, userId?: number): boolean => {
    try {
      if (userId) {
        executeParamQuery("DELETE FROM workout_exercises WHERE workout_history_id = ? AND user_id = ?", [id, userId]);
        executeParamQuery("DELETE FROM workouts_history WHERE id = ? AND user_id = ?", [id, userId]);
      } else {
        executeParamQuery("DELETE FROM workout_exercises WHERE workout_history_id = ?", [id]);
        executeParamQuery("DELETE FROM workouts_history WHERE id = ?", [id]);
      }
      return true;
    } catch (error) {
      console.error("Error deleting workout history:", error);
      return false;
    }
  },

  isWorkoutCompletedToday: (workoutId: string, userId?: number): boolean => {
    try {
      const today = new Date().toISOString().split("T")[0];
      let query = `SELECT 1 FROM workouts_history 
                   WHERE workout_id = ? AND DATE(completed_at) = ?`;
      const params: any[] = [workoutId, today];

      if (userId) {
        query += ` AND user_id = ?`;
        params.push(userId);
      }

      const result = executeParamQuery(query, params);
      return result.length > 0;
    } catch (error) {
      console.error("Error checking if workout completed today:", error);
      return false;
    }
  },
};

// Analytics Database Operations dengan user_id
export const AnalyticsDatabase = {
  getDailySummary: (date: string, userId?: number): any => {
    try {
      // Get food data
      let foodResult;
      if (userId) {
        foodResult = executeParamQuery(
          `SELECT 
            COALESCE(SUM(calories), 0) as totalCalories,
            COALESCE(SUM(protein), 0) as totalProtein,
            COALESCE(SUM(carbs), 0) as totalCarbs,
            COALESCE(SUM(fat), 0) as totalFat
           FROM food_items WHERE date = ? AND user_id = ?`,
          [date, userId]
        );
      } else {
        foodResult = executeParamQuery(
          `SELECT 
            COALESCE(SUM(calories), 0) as totalCalories,
            COALESCE(SUM(protein), 0) as totalProtein,
            COALESCE(SUM(carbs), 0) as totalCarbs,
            COALESCE(SUM(fat), 0) as totalFat
           FROM food_items WHERE date = ?`,
          [date]
        );
      }

      const foodData = foodResult[0] || {
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
      };

      // Get exercise data
      let exerciseResult;
      if (userId) {
        exerciseResult = executeParamQuery(
          `SELECT COALESCE(SUM(calories_burned), 0) as totalBurned 
           FROM exercises WHERE date = ? AND user_id = ?`,
          [date, userId]
        );
      } else {
        exerciseResult = executeParamQuery(
          `SELECT COALESCE(SUM(calories_burned), 0) as totalBurned 
           FROM exercises WHERE date = ?`,
          [date]
        );
      }

      const exerciseData = exerciseResult[0] || {
        totalBurned: 0,
      };

      // Get workout data
      let workoutQuery = `SELECT COALESCE(SUM(calories_burned), 0) as workoutCalories 
                         FROM workouts_history WHERE DATE(completed_at) = ?`;
      const workoutParams: any[] = [date];

      if (userId) {
        workoutQuery += ` AND user_id = ?`;
        workoutParams.push(userId);
      }

      const workoutResult = executeParamQuery(workoutQuery, workoutParams);
      const workoutData = workoutResult[0] || {
        workoutCalories: 0,
      };

      // Get water intake
      const waterResult = DrinksDatabase.getTodayWaterIntake(date, userId);

      // Get today's workouts
      const todayWorkouts = WorkoutDatabase.getTodayWorkouts(userId);

      return {
        foodCalories: foodData.totalCalories || 0,
        exerciseCalories: exerciseData.totalBurned || 0,
        workoutCalories: workoutData.workoutCalories || 0,
        totalCaloriesBurned: (exerciseData.totalBurned || 0) + (workoutData.workoutCalories || 0),
        netCalories: (foodData.totalCalories || 0) - (exerciseData.totalBurned || 0) - (workoutData.workoutCalories || 0),
        protein: foodData.totalProtein || 0,
        carbs: foodData.totalCarbs || 0,
        fat: foodData.totalFat || 0,
        water: waterResult || 0,
        workoutsCompleted: todayWorkouts.length,
        todayWorkouts: todayWorkouts,
      };
    } catch (error) {
      console.error("Error getting daily summary:", error);
      return {
        foodCalories: 0,
        exerciseCalories: 0,
        workoutCalories: 0,
        totalCaloriesBurned: 0,
        netCalories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        water: 0,
        workoutsCompleted: 0,
        todayWorkouts: [],
      };
    }
  },

  getWeeklySummary: (startDate: string, endDate: string, userId?: number): any[] => {
    try {
      let query;
      let params: any[] = [];

      if (userId) {
        query = `SELECT 
          date,
          COALESCE(SUM(food_calories), 0) as foodCalories,
          COALESCE(SUM(exercise_calories), 0) as exerciseCalories,
          COALESCE(SUM(workout_calories), 0) as workoutCalories,
          (COALESCE(SUM(food_calories), 0) - COALESCE(SUM(exercise_calories), 0) - COALESCE(SUM(workout_calories), 0)) as netCalories
         FROM (
           SELECT date, calories as food_calories, 0 as exercise_calories, 0 as workout_calories FROM food_items
           WHERE date BETWEEN ? AND ? AND user_id = ?
           UNION ALL
           SELECT date, 0 as food_calories, calories_burned as exercise_calories, 0 as workout_calories FROM exercises
           WHERE date BETWEEN ? AND ? AND user_id = ?
           UNION ALL
           SELECT DATE(completed_at) as date, 0 as food_calories, 0 as exercise_calories, calories_burned as workout_calories FROM workouts_history
           WHERE DATE(completed_at) BETWEEN ? AND ? AND user_id = ?
         )
         GROUP BY date
         ORDER BY date`;

        params = [startDate, endDate, userId, startDate, endDate, userId, startDate, endDate, userId];
      } else {
        query = `SELECT 
          date,
          COALESCE(SUM(food_calories), 0) as foodCalories,
          COALESCE(SUM(exercise_calories), 0) as exerciseCalories,
          COALESCE(SUM(workout_calories), 0) as workoutCalories,
          (COALESCE(SUM(food_calories), 0) - COALESCE(SUM(exercise_calories), 0) - COALESCE(SUM(workout_calories), 0)) as netCalories
         FROM (
           SELECT date, calories as food_calories, 0 as exercise_calories, 0 as workout_calories FROM food_items
           WHERE date BETWEEN ? AND ?
           UNION ALL
           SELECT date, 0 as food_calories, calories_burned as exercise_calories, 0 as workout_calories FROM exercises
           WHERE date BETWEEN ? AND ?
           UNION ALL
           SELECT DATE(completed_at) as date, 0 as food_calories, 0 as exercise_calories, calories_burned as workout_calories FROM workouts_history
           WHERE DATE(completed_at) BETWEEN ? AND ?
         )
         GROUP BY date
         ORDER BY date`;

        params = [startDate, endDate, startDate, endDate, startDate, endDate];
      }

      const result = executeParamQuery(query, params);
      return result || [];
    } catch (error) {
      console.error("Error getting weekly summary:", error);
      return [];
    }
  },

  getMonthlyProgress: (year: number, month: number, userId?: number): any[] => {
    try {
      const startDate = `${year}-${month.toString().padStart(2, "0")}-01`;
      const endDate = `${year}-${month.toString().padStart(2, "0")}-31`;

      let query;
      let params: any[] = [];

      if (userId) {
        query = `SELECT 
          date,
          COALESCE(SUM(food_calories), 0) as foodCalories,
          COALESCE(SUM(exercise_calories), 0) as exerciseCalories,
          COALESCE(SUM(workout_calories), 0) as workoutCalories,
          (COALESCE(SUM(food_calories), 0) - COALESCE(SUM(exercise_calories), 0) - COALESCE(SUM(workout_calories), 0)) as netCalories
         FROM (
           SELECT date, calories as food_calories, 0 as exercise_calories, 0 as workout_calories FROM food_items
           WHERE date BETWEEN ? AND ? AND user_id = ?
           UNION ALL
           SELECT date, 0 as food_calories, calories_burned as exercise_calories, 0 as workout_calories FROM exercises
           WHERE date BETWEEN ? AND ? AND user_id = ?
           UNION ALL
           SELECT DATE(completed_at) as date, 0 as food_calories, 0 as exercise_calories, calories_burned as workout_calories FROM workouts_history
           WHERE DATE(completed_at) BETWEEN ? AND ? AND user_id = ?
         )
         GROUP BY date
         ORDER BY date`;

        params = [startDate, endDate, userId, startDate, endDate, userId, startDate, endDate, userId];
      } else {
        query = `SELECT 
          date,
          COALESCE(SUM(food_calories), 0) as foodCalories,
          COALESCE(SUM(exercise_calories), 0) as exerciseCalories,
          COALESCE(SUM(workout_calories), 0) as workoutCalories,
          (COALESCE(SUM(food_calories), 0) - COALESCE(SUM(exercise_calories), 0) - COALESCE(SUM(workout_calories), 0)) as netCalories
         FROM (
           SELECT date, calories as food_calories, 0 as exercise_calories, 0 as workout_calories FROM food_items
           WHERE date BETWEEN ? AND ?
           UNION ALL
           SELECT date, 0 as food_calories, calories_burned as exercise_calories, 0 as workout_calories FROM exercises
           WHERE date BETWEEN ? AND ?
           UNION ALL
           SELECT DATE(completed_at) as date, 0 as food_calories, 0 as exercise_calories, calories_burned as workout_calories FROM workouts_history
           WHERE DATE(completed_at) BETWEEN ? AND ?
         )
         GROUP BY date
         ORDER BY date`;

        params = [startDate, endDate, startDate, endDate, startDate, endDate];
      }

      const result = executeParamQuery(query, params);
      return result || [];
    } catch (error) {
      console.error("Error getting monthly progress:", error);
      return [];
    }
  },

  getYearlySummary: (year: number, userId?: number): any[] => {
    try {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;

      let query;
      let params: any[] = [];

      if (userId) {
        query = `SELECT 
          strftime('%m', date) as month,
          COALESCE(SUM(food_calories), 0) as foodCalories,
          COALESCE(SUM(exercise_calories), 0) as exerciseCalories,
          COALESCE(SUM(workout_calories), 0) as workoutCalories,
          (COALESCE(SUM(food_calories), 0) - COALESCE(SUM(exercise_calories), 0) - COALESCE(SUM(workout_calories), 0)) as netCalories
         FROM (
           SELECT date, calories as food_calories, 0 as exercise_calories, 0 as workout_calories FROM food_items
           WHERE date BETWEEN ? AND ? AND user_id = ?
           UNION ALL
           SELECT date, 0 as food_calories, calories_burned as exercise_calories, 0 as workout_calories FROM exercises
           WHERE date BETWEEN ? AND ? AND user_id = ?
           UNION ALL
           SELECT DATE(completed_at) as date, 0 as food_calories, 0 as exercise_calories, calories_burned as workout_calories FROM workouts_history
           WHERE DATE(completed_at) BETWEEN ? AND ? AND user_id = ?
         )
         GROUP BY strftime('%m', date)
         ORDER BY month`;

        params = [startDate, endDate, userId, startDate, endDate, userId, startDate, endDate, userId];
      } else {
        query = `SELECT 
          strftime('%m', date) as month,
          COALESCE(SUM(food_calories), 0) as foodCalories,
          COALESCE(SUM(exercise_calories), 0) as exerciseCalories,
          COALESCE(SUM(workout_calories), 0) as workoutCalories,
          (COALESCE(SUM(food_calories), 0) - COALESCE(SUM(exercise_calories), 0) - COALESCE(SUM(workout_calories), 0)) as netCalories
         FROM (
           SELECT date, calories as food_calories, 0 as exercise_calories, 0 as workout_calories FROM food_items
           WHERE date BETWEEN ? AND ?
           UNION ALL
           SELECT date, 0 as food_calories, calories_burned as exercise_calories, 0 as workout_calories FROM exercises
           WHERE date BETWEEN ? AND ?
           UNION ALL
           SELECT DATE(completed_at) as date, 0 as food_calories, 0 as exercise_calories, calories_burned as workout_calories FROM workouts_history
           WHERE DATE(completed_at) BETWEEN ? AND ?
         )
         GROUP BY strftime('%m', date)
         ORDER BY month`;

        params = [startDate, endDate, startDate, endDate, startDate, endDate];
      }

      const result = executeParamQuery(query, params);
      return result || [];
    } catch (error) {
      console.error("Error getting yearly summary:", error);
      return [];
    }
  },

  getMacroDistribution: (startDate: string, endDate: string, userId?: number): any => {
    try {
      let query;
      let params: any[] = [];

      if (userId) {
        query = `SELECT 
          COALESCE(SUM(protein), 0) as totalProtein,
          COALESCE(SUM(carbs), 0) as totalCarbs,
          COALESCE(SUM(fat), 0) as totalFat
         FROM food_items
         WHERE date BETWEEN ? AND ? AND user_id = ?`;
        params = [startDate, endDate, userId];
      } else {
        query = `SELECT 
          COALESCE(SUM(protein), 0) as totalProtein,
          COALESCE(SUM(carbs), 0) as totalCarbs,
          COALESCE(SUM(fat), 0) as totalFat
         FROM food_items
         WHERE date BETWEEN ? AND ?`;
        params = [startDate, endDate];
      }

      const result = executeParamQuery(query, params);
      const data = result[0] || { totalProtein: 0, totalCarbs: 0, totalFat: 0 };
      const total = data.totalProtein + data.totalCarbs + data.totalFat;

      if (total > 0) {
        return {
          protein: (data.totalProtein / total) * 100,
          carbs: (data.totalCarbs / total) * 100,
          fat: (data.totalFat / total) * 100,
          total: total,
        };
      }

      return {
        protein: 0,
        carbs: 0,
        fat: 0,
        total: 0,
      };
    } catch (error) {
      console.error("Error getting macro distribution:", error);
      return {
        protein: 0,
        carbs: 0,
        fat: 0,
        total: 0,
      };
    }
  },

  getCurrentStreak: (userId?: number): number => {
    try {
      let query;
      let params: any[] = [];

      if (userId) {
        query = `SELECT date FROM (
           SELECT DISTINCT date FROM food_items WHERE user_id = ?
           UNION
           SELECT DISTINCT date FROM exercises WHERE user_id = ?
           UNION
           SELECT DISTINCT DATE(completed_at) as date FROM workouts_history WHERE user_id = ?
         )
         WHERE date >= date('now', '-30 days')
         ORDER BY date DESC`;
        params = [userId, userId, userId];
      } else {
        query = `SELECT date FROM (
           SELECT DISTINCT date FROM food_items
           UNION
           SELECT DISTINCT date FROM exercises
           UNION
           SELECT DISTINCT DATE(completed_at) as date FROM workouts_history
         )
         WHERE date >= date('now', '-30 days')
         ORDER BY date DESC`;
        params = [];
      }

      const result = executeParamQuery(query, params);

      if (!result || result.length === 0) {
        return 0;
      }

      let streak = 0;
      const today = new Date().toISOString().split("T")[0];
      let expectedDate = today;

      for (const row of result) {
        const activeDate = row.date;
        if (activeDate === expectedDate) {
          streak++;
          const dateObj = new Date(expectedDate);
          dateObj.setDate(dateObj.getDate() - 1);
          expectedDate = dateObj.toISOString().split("T")[0];
        } else {
          break;
        }
      }

      return streak;
    } catch (error) {
      console.error("Error calculating streak:", error);
      return 0;
    }
  },

  getProgressTrends: (period: "week" | "month" | "year", userId?: number): any => {
    try {
      const today = new Date();
      let startDate: string;
      let endDate: string = today.toISOString().split("T")[0];

      if (period === "week") {
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        startDate = weekAgo.toISOString().split("T")[0];
      } else if (period === "month") {
        const monthAgo = new Date(today);
        monthAgo.setMonth(today.getMonth() - 1);
        startDate = monthAgo.toISOString().split("T")[0];
      } else {
        const yearAgo = new Date(today);
        yearAgo.setFullYear(today.getFullYear() - 1);
        startDate = yearAgo.toISOString().split("T")[0];
      }

      // Get calorie trends
      let calorieQuery;
      let calorieParams: any[] = [];

      if (userId) {
        calorieQuery = `SELECT 
          date,
          COALESCE(SUM(calories), 0) as foodCalories,
          COALESCE(SUM(calories_burned), 0) as exerciseCalories,
          COALESCE(SUM(workout_calories), 0) as workoutCalories
         FROM (
           SELECT date, calories, 0 as calories_burned, 0 as workout_calories FROM food_items
           WHERE date BETWEEN ? AND ? AND user_id = ?
           UNION ALL
           SELECT date, 0 as calories, calories_burned, 0 as workout_calories FROM exercises
           WHERE date BETWEEN ? AND ? AND user_id = ?
           UNION ALL
           SELECT DATE(completed_at) as date, 0 as calories, 0 as calories_burned, calories_burned as workout_calories FROM workouts_history
           WHERE DATE(completed_at) BETWEEN ? AND ? AND user_id = ?
         )
         GROUP BY date
         ORDER BY date`;

        calorieParams = [startDate, endDate, userId, startDate, endDate, userId, startDate, endDate, userId];
      } else {
        calorieQuery = `SELECT 
          date,
          COALESCE(SUM(calories), 0) as foodCalories,
          COALESCE(SUM(calories_burned), 0) as exerciseCalories,
          COALESCE(SUM(workout_calories), 0) as workoutCalories
         FROM (
           SELECT date, calories, 0 as calories_burned, 0 as workout_calories FROM food_items
           WHERE date BETWEEN ? AND ?
           UNION ALL
           SELECT date, 0 as calories, calories_burned, 0 as workout_calories FROM exercises
           WHERE date BETWEEN ? AND ?
           UNION ALL
           SELECT DATE(completed_at) as date, 0 as calories, 0 as calories_burned, calories_burned as workout_calories FROM workouts_history
           WHERE DATE(completed_at) BETWEEN ? AND ?
         )
         GROUP BY date
         ORDER BY date`;

        calorieParams = [startDate, endDate, startDate, endDate, startDate, endDate];
      }

      const calorieTrends = executeParamQuery(calorieQuery, calorieParams);

      // Get workout trends
      let workoutQuery;
      let workoutParams: any[] = [];

      if (userId) {
        workoutQuery = `SELECT 
          DATE(completed_at) as date,
          COUNT(*) as workout_count,
          SUM(duration_minutes) as total_minutes,
          SUM(calories_burned) as total_calories
        FROM workouts_history
        WHERE DATE(completed_at) BETWEEN ? AND ? AND user_id = ?
        GROUP BY DATE(completed_at) ORDER BY date`;
        workoutParams = [startDate, endDate, userId];
      } else {
        workoutQuery = `SELECT 
          DATE(completed_at) as date,
          COUNT(*) as workout_count,
          SUM(duration_minutes) as total_minutes,
          SUM(calories_burned) as total_calories
        FROM workouts_history
        WHERE DATE(completed_at) BETWEEN ? AND ?
        GROUP BY DATE(completed_at) ORDER BY date`;
        workoutParams = [startDate, endDate];
      }

      const workoutTrends = executeParamQuery(workoutQuery, workoutParams);

      return {
        calorieTrends: calorieTrends || [],
        workoutTrends: workoutTrends || [],
        period,
        startDate,
        endDate,
      };
    } catch (error) {
      console.error("Error getting progress trends:", error);
      return {
        calorieTrends: [],
        workoutTrends: [],
        period: "week",
        startDate: "",
        endDate: "",
      };
    }
  },
};

// Progress Database Operations dengan user_id
export const ProgressDatabase = {
  recordDailyProgress: (
    date: string,
    progress: {
      streakDays?: number;
      totalCaloriesBurned?: number;
      totalWorkouts?: number;
      achievement?: string;
    },
    userId?: number
  ): boolean => {
    try {
      if (userId) {
        executeParamQuery(
          `INSERT OR REPLACE INTO progress_history 
           (date, streak_days, total_calories_burned, total_workouts, achievement, user_id) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [date, progress.streakDays || 0, progress.totalCaloriesBurned || 0, progress.totalWorkouts || 0, progress.achievement || "", userId]
        );
      } else {
        executeParamQuery(
          `INSERT OR REPLACE INTO progress_history 
           (date, streak_days, total_calories_burned, total_workouts, achievement) 
           VALUES (?, ?, ?, ?, ?)`,
          [date, progress.streakDays || 0, progress.totalCaloriesBurned || 0, progress.totalWorkouts || 0, progress.achievement || ""]
        );
      }
      return true;
    } catch (error) {
      console.error("Error recording daily progress:", error);
      return false;
    }
  },

  getProgressByDate: (date: string, userId?: number): any => {
    try {
      let result;
      if (userId) {
        result = executeParamQuery("SELECT * FROM progress_history WHERE date = ? AND user_id = ?", [date, userId]);
      } else {
        result = executeParamQuery("SELECT * FROM progress_history WHERE date = ?", [date]);
      }
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error("Error getting progress by date:", error);
      return null;
    }
  },

  getProgressHistory: (startDate: string, endDate: string, userId?: number): any[] => {
    try {
      if (userId) {
        return executeParamQuery("SELECT * FROM progress_history WHERE date BETWEEN ? AND ? AND user_id = ? ORDER BY date DESC", [startDate, endDate, userId]);
      } else {
        return executeParamQuery("SELECT * FROM progress_history WHERE date BETWEEN ? AND ? ORDER BY date DESC", [startDate, endDate]);
      }
    } catch (error) {
      console.error("Error getting progress history:", error);
      return [];
    }
  },

  getAchievements: (userId?: number): any[] => {
    try {
      if (userId) {
        return executeParamQuery("SELECT * FROM progress_history WHERE achievement != '' AND user_id = ? ORDER BY date DESC", [userId]);
      } else {
        return executeParamQuery("SELECT * FROM progress_history WHERE achievement != '' ORDER BY date DESC", []);
      }
    } catch (error) {
      console.error("Error getting achievements:", error);
      return [];
    }
  },

  updateStreak: (date: string, userId?: number): number => {
    try {
      const yesterday = new Date(date);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      // Check if user was active yesterday
      let wasActiveYesterday = false;

      if (userId) {
        const foodActive = executeParamQuery("SELECT 1 FROM food_items WHERE date = ? AND user_id = ? LIMIT 1", [yesterdayStr, userId]).length > 0;

        const exerciseActive = executeParamQuery("SELECT 1 FROM exercises WHERE date = ? AND user_id = ? LIMIT 1", [yesterdayStr, userId]).length > 0;

        const workoutActive = executeParamQuery("SELECT 1 FROM workouts_history WHERE DATE(completed_at) = ? AND user_id = ? LIMIT 1", [yesterdayStr, userId]).length > 0;

        wasActiveYesterday = foodActive || exerciseActive || workoutActive;

        // Get yesterday's streak
        const yesterdayProgress = ProgressDatabase.getProgressByDate(yesterdayStr, userId);
        const yesterdayStreak = yesterdayProgress ? yesterdayProgress.streak_days : 0;

        // Calculate new streak
        const newStreak = wasActiveYesterday ? yesterdayStreak + 1 : 1;

        // Get today's data
        const exerciseCalories = ExerciseDatabase.getTotalCaloriesBurnedByDateRange(date, date, userId);

        const workoutResult = executeParamQuery("SELECT COALESCE(SUM(calories_burned), 0) as total FROM workouts_history WHERE DATE(completed_at) = ? AND user_id = ?", [date, userId]);
        const workoutCalories = workoutResult[0]?.total || 0;

        const workoutCountResult = executeParamQuery("SELECT COUNT(*) as count FROM workouts_history WHERE DATE(completed_at) = ? AND user_id = ?", [date, userId]);
        const workoutCount = workoutCountResult[0]?.count || 0;

        const exerciseCountResult = executeParamQuery("SELECT COUNT(*) as count FROM exercises WHERE date = ? AND user_id = ?", [date, userId]);
        const exerciseCount = exerciseCountResult[0]?.count || 0;

        // Update today's progress
        ProgressDatabase.recordDailyProgress(
          date,
          {
            streakDays: newStreak,
            totalCaloriesBurned: exerciseCalories + workoutCalories,
            totalWorkouts: workoutCount + exerciseCount,
          },
          userId
        );

        return newStreak;
      } else {
        // For global streak (without user)
        const foodActive = executeParamQuery("SELECT 1 FROM food_items WHERE date = ? LIMIT 1", [yesterdayStr]).length > 0;

        const exerciseActive = executeParamQuery("SELECT 1 FROM exercises WHERE date = ? LIMIT 1", [yesterdayStr]).length > 0;

        const workoutActive = executeParamQuery("SELECT 1 FROM workouts_history WHERE DATE(completed_at) = ? LIMIT 1", [yesterdayStr]).length > 0;

        wasActiveYesterday = foodActive || exerciseActive || workoutActive;

        const yesterdayProgress = ProgressDatabase.getProgressByDate(yesterdayStr);
        const yesterdayStreak = yesterdayProgress ? yesterdayProgress.streak_days : 0;

        const newStreak = wasActiveYesterday ? yesterdayStreak + 1 : 1;

        const exerciseCalories = ExerciseDatabase.getTotalCaloriesBurnedByDateRange(date, date);

        const workoutResult = executeParamQuery("SELECT COALESCE(SUM(calories_burned), 0) as total FROM workouts_history WHERE DATE(completed_at) = ?", [date]);
        const workoutCalories = workoutResult[0]?.total || 0;

        const workoutCountResult = executeParamQuery("SELECT COUNT(*) as count FROM workouts_history WHERE DATE(completed_at) = ?", [date]);
        const workoutCount = workoutCountResult[0]?.count || 0;

        const exerciseCountResult = executeParamQuery("SELECT COUNT(*) as count FROM exercises WHERE date = ?", [date]);
        const exerciseCount = exerciseCountResult[0]?.count || 0;

        ProgressDatabase.recordDailyProgress(date, {
          streakDays: newStreak,
          totalCaloriesBurned: exerciseCalories + workoutCalories,
          totalWorkouts: workoutCount + exerciseCount,
        });

        return newStreak;
      }
    } catch (error) {
      console.error("Error updating streak:", error);
      return 0;
    }
  },

  getStatistics: (userId?: number): any => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().split("T")[0];

      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      const monthAgoStr = monthAgo.toISOString().split("T")[0];

      // Get data based on user
      const totalCaloriesConsumed = FoodDatabase.getTotalCaloriesByDateRange("2020-01-01", today, userId);
      const totalExerciseCalories = ExerciseDatabase.getTotalCaloriesBurnedByDateRange("2020-01-01", today, userId);

      let totalWorkoutCaloriesQuery;
      let totalWorkoutParams: any[] = [];

      if (userId) {
        totalWorkoutCaloriesQuery = "SELECT COALESCE(SUM(calories_burned), 0) as total FROM workouts_history WHERE user_id = ?";
        totalWorkoutParams = [userId];
      } else {
        totalWorkoutCaloriesQuery = "SELECT COALESCE(SUM(calories_burned), 0) as total FROM workouts_history";
      }

      const totalWorkoutCaloriesResult = executeParamQuery(totalWorkoutCaloriesQuery, totalWorkoutParams);
      const totalWorkoutCalories = totalWorkoutCaloriesResult[0]?.total || 0;

      const totalCaloriesBurned = totalExerciseCalories + totalWorkoutCalories;

      let totalWorkoutsQuery;
      let totalWorkoutsParams: any[] = [];

      if (userId) {
        totalWorkoutsQuery = "SELECT COUNT(*) as count FROM workouts_history WHERE user_id = ?";
        totalWorkoutsParams = [userId];
      } else {
        totalWorkoutsQuery = "SELECT COUNT(*) as count FROM workouts_history";
      }

      const totalWorkoutsResult = executeParamQuery(totalWorkoutsQuery, totalWorkoutsParams);
      const totalWorkouts = totalWorkoutsResult[0]?.count || 0;

      const totalExercisesResult = executeParamQuery("SELECT COUNT(*) as count FROM exercises" + (userId ? " WHERE user_id = ?" : ""), userId ? [userId] : []);
      const totalExercises = totalExercisesResult[0]?.count || 0;

      const currentStreak = AnalyticsDatabase.getCurrentStreak(userId);
      const weeklyAvgCalories = FoodDatabase.getTotalCaloriesByDateRange(weekAgoStr, today, userId) / 7;
      const monthlyAvgCalories = FoodDatabase.getTotalCaloriesByDateRange(monthAgoStr, today, userId) / 30;

      const workoutStats = WorkoutDatabase.getWorkoutStatistics(userId);

      return {
        totalCaloriesConsumed: totalCaloriesConsumed || 0,
        totalCaloriesBurned: totalCaloriesBurned || 0,
        totalWorkouts: totalWorkouts + totalExercises || 0,
        currentStreak: currentStreak || 0,
        weeklyAvgCalories: Math.round(weeklyAvgCalories) || 0,
        monthlyAvgCalories: Math.round(monthlyAvgCalories) || 0,
        netCalories: (totalCaloriesConsumed || 0) - (totalCaloriesBurned || 0),
        workoutStats: workoutStats,
      };
    } catch (error) {
      console.error("Error getting statistics:", error);
      return {
        totalCaloriesConsumed: 0,
        totalCaloriesBurned: 0,
        totalWorkouts: 0,
        currentStreak: 0,
        weeklyAvgCalories: 0,
        monthlyAvgCalories: 0,
        netCalories: 0,
        workoutStats: {
          overall: {
            total_workouts: 0,
            total_minutes: 0,
            total_calories_burned: 0,
            active_days: 0,
            streak: 0,
          },
          by_category: [],
        },
      };
    }
  },
};

// User Database Operations
export const UserDatabase = {
  createUser: (user: { username: string; email: string; password: string; usia?: number; berat?: number; tinggi?: number; jenis_kelamin?: string; target_kalori?: number }): number => {
    try {
      executeParamQuery(
        `INSERT INTO users 
         (username, email, password, usia, berat, tinggi, jenis_kelamin, target_kalori) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [user.username, user.email, user.password, user.usia || null, user.berat || null, user.tinggi || null, user.jenis_kelamin || null, user.target_kalori || null]
      );

      const lastInsertResult = executeParamQuery("SELECT last_insert_rowid() as id", []);
      return lastInsertResult[0]?.id || 0;
    } catch (error) {
      console.error("Error creating user:", error);
      return 0;
    }
  },

  getUserByEmail: (email: string): any => {
    try {
      const result = executeParamQuery("SELECT * FROM users WHERE email = ?", [email]);
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error("Error getting user by email:", error);
      return null;
    }
  },

  getUserById: (id: number): any => {
    try {
      const result = executeParamQuery("SELECT * FROM users WHERE id_user = ?", [id]);
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error("Error getting user by ID:", error);
      return null;
    }
  },

  updateUserProfile: (
    id: number,
    updates: {
      username?: string;
      usia?: number;
      berat?: number;
      tinggi?: number;
      jenis_kelamin?: string;
      target_kalori?: number;
    }
  ): boolean => {
    try {
      const setClause = Object.keys(updates)
        .map((key) => `${key} = ?`)
        .join(", ");
      const values = Object.values(updates);
      values.push(id);

      executeParamQuery(`UPDATE users SET ${setClause} WHERE id_user = ?`, values);
      return true;
    } catch (error) {
      console.error("Error updating user profile:", error);
      return false;
    }
  },

  getUserProgress: (userId: number): any => {
    try {
      const user = UserDatabase.getUserById(userId);
      if (!user) return null;

      const today = new Date().toISOString().split("T")[0];
      const dailySummary = AnalyticsDatabase.getDailySummary(today, userId);
      const streak = ProgressDatabase.updateStreak(today, userId);
      const statistics = ProgressDatabase.getStatistics(userId);
      const workoutHistory = WorkoutDatabase.getWorkoutHistory(userId, 10);
      const workoutStats = WorkoutDatabase.getWorkoutStatistics(userId);

      let bmi = null;
      if (user.tinggi && user.berat) {
        const heightInMeters = user.tinggi / 100;
        bmi = (user.berat / (heightInMeters * heightInMeters)).toFixed(1);
      }

      return {
        user,
        dailySummary,
        streak,
        statistics,
        bmi,
        workoutHistory,
        workoutStats,
      };
    } catch (error) {
      console.error("Error getting user progress:", error);
      return null;
    }
  },

  getAllUsers: (): any[] => {
    try {
      return executeParamQuery("SELECT id_user, username, email, created_at FROM users ORDER BY created_at DESC", []);
    } catch (error) {
      console.error("Error getting all users:", error);
      return [];
    }
  },

  deleteUser: (id: number): boolean => {
    try {
      executeParamQuery("DELETE FROM users WHERE id_user = ?", [id]);
      return true;
    } catch (error) {
      console.error("Error deleting user:", error);
      return false;
    }
  },
};

// Export all databases
export const Database = {
  initDB,
  checkDatabaseConnection,
  listTables,
  runTransaction,
  executeParamQuery,
  FoodDatabase,
  ExerciseDatabase,
  GoalsDatabase,
  DrinksDatabase,
  WorkoutDatabase,
  AnalyticsDatabase,
  ProgressDatabase,
  UserDatabase,
};

export default db;
