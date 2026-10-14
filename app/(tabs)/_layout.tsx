// app/tabs/_layout.tsx
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

const PRIMARY_BLUE = "#3b82f6";
const PRIMARY_GREEN = "#10b981";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: PRIMARY_BLUE,
        tabBarInactiveTintColor: "#9ca3af",
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: "white",
          borderTopWidth: 1,
          borderTopColor: "#e5e7eb",
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
          elevation: 8,
          shadowColor: "#000",
          shadowOpacity: 0.06,
          shadowOffset: { width: 0, height: 4 },
          shadowRadius: 6,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      }}
    >
      {/* HOME TAB */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />,
        }}
      />

      {/* PROGRESS TAB - DITAMBAHKAN */}
      <Tabs.Screen
        name="progress"
        options={{
          title: "Progress",
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "trending-up" : "trending-up-outline"} size={24} color={color} />,
        }}
      />

      {/* WORKOUT TAB */}
      <Tabs.Screen
        name="workout"
        options={{
          title: "Workout",
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "barbell" : "barbell-outline"} size={24} color={color} />,
        }}
      />

      {/* TRACKING TAB */}
      <Tabs.Screen
        name="tracking"
        options={{
          title: "Tracking",
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "stats-chart" : "stats-chart-outline"} size={24} color={color} />,
        }}
      />

      <Tabs.Screen
  name="recommendation"
  options={{
    title: "Rekomendasi",
    tabBarIcon: ({ color, focused }) => (
      <Ionicons
        name={focused ? "restaurant" : "restaurant-outline"}
        size={24}
        color={color}
      />
    ),
  }}
/>


      {/* PROFILE TAB */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "person" : "person-outline"} size={24} color={color} />,
        }}
      />
    </Tabs>
    
  );
}