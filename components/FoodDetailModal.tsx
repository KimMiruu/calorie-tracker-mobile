import { Modal, ScrollView, Text, View } from "react-native";
import MacroBadge from "./MacroBadge";

export default function FoodDetailModal({
  visible,
  food,
  onClose,
}: {
  visible: boolean;
  food: any;
  onClose: () => void;
}) {
  if (!food) return null;

  return (
    <Modal visible={visible} animationType="slide">
      <ScrollView style={{ padding: 20 }}>
        <Text style={{ fontSize: 22, fontWeight: "800" }}>
          {food.name}
        </Text>

        <Text style={{ marginTop: 6, color: "#6b7280" }}>
          {food.kalori} kcal
        </Text>

        {/* MACROS */}
        <View style={{ flexDirection: "row", marginTop: 12 }}>
          <MacroBadge label="Protein" value={food.protein} color="#16a34a" />
          <MacroBadge label="Carbs" value={food.carbs} color="#2563eb" />
          <MacroBadge label="Fat" value={food.fat} color="#ca8a04" />
        </View>

        {/* DESCRIPTION */}
        <Text style={{ marginTop: 16, fontWeight: "700" }}>
          Deskripsi
        </Text>
        <Text style={{ color: "#374151", marginTop: 4 }}>
          {food.description}
        </Text>

        {/* RECIPE */}
        {food.recipe && (
          <>
            <Text style={{ marginTop: 20, fontWeight: "700" }}>
              Resep
            </Text>

            {food.recipe.steps.map((step: string, idx: number) => (
              <Text key={idx} style={{ marginTop: 6 }}>
                {idx + 1}. {step}
              </Text>
            ))}
          </>
        )}

        <Text
          onPress={onClose}
          style={{
            marginTop: 30,
            color: "#2563eb",
            fontWeight: "700",
            textAlign: "center",
          }}
        >
          Tutup
        </Text>
      </ScrollView>
    </Modal>
  );
}
