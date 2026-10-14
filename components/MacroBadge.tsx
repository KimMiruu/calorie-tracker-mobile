import { Text, View } from "react-native";

export default function MacroBadge({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View
      style={{
        backgroundColor: color,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginRight: 6,
      }}
    >
      <Text style={{ color: "white", fontSize: 12, fontWeight: "600" }}>
        {label}: {value}g
      </Text>
    </View>
  );
}
