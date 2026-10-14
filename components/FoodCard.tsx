import { Text, TouchableOpacity, View } from "react-native";

export default function FoodCard({
  food,
  onPress,
}: {
  food: any;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <View
        style={{
          backgroundColor: "#ffffff",
          borderRadius: 14,
          padding: 14,
          marginTop: 10,
          shadowColor: "#000",
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "700" }}>
          {food.name}
        </Text>

        <Text style={{ color: "#6b7280", marginTop: 4 }}>
          {food.kalori} kcal
        </Text>
      </View>
    </TouchableOpacity>
  );
}
