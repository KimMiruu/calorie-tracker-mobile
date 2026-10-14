// utils/goalConfig.ts

export type GoalType = "maintain" | "gain" | "loss";

export interface GoalConfig {
  /** encoding utk ML model */
  goal_enc: number;

  /** bias kalori terhadap sisa kalori harian */
  calorieBias: number;

  /** preferensi protein */
  highProtein: boolean;

  /** label UI */
  label: string;

  /** warna opsional (UI) */
  color: string;
}

export const GOAL_CONFIG: Record<GoalType, GoalConfig> = {
  maintain: {
    goal_enc: 1,          // jaga BB
    calorieBias: 0,       // netral
    highProtein: true,
    label: "Jaga BB",
    color: "#22c55e",
  },

  gain: {
    goal_enc: 2,          // naik BB
    calorieBias: +300,    // surplus
    highProtein: false,   // fleksibel
    label: "Naik BB",
    color: "#3b82f6",
  },

  loss: {
    goal_enc: 0,          // turun BB
    calorieBias: -300,    // defisit
    highProtein: true,    // penting
    label: "Turun BB",
    color: "#ef4444",
  },
};
