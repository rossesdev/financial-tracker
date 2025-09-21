import { View } from "react-native";
import { LineChart } from "react-native-chart-kit";

const data = {
  labels: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "June",
    "June",
    "June",
  ],
  datasets: [
    {
      data: [20, 45, 28, 80, 99, 43],
      color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
      strokeWidth: 2,
    },
  ],
};

export default function FinanceLineChart() {
  return (
    <View>
      <LineChart
        data={data}
        width={350}
        height={220}
        chartConfig={{
          backgroundColor: "#e26a00",
          backgroundGradientFrom: "#fb8c00",
          backgroundGradientTo: "#ffa726",
          decimalPlaces: 2, // optional, defaults to 2dp
          color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
          style: {
            borderRadius: 16,
          },
        }}
      />
    </View>
  );
}
