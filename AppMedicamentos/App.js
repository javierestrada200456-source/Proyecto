import React from "react";
import { Alert, Button, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { NativeModules } from "react-native";

const { AlarmModule } = NativeModules;

export default function App() {
  const handleSchedule = () => {
    if (!AlarmModule?.scheduleAlarm) {
      Alert.alert("Error", "AlarmModule no está disponible");
      return;
    }

    AlarmModule.scheduleAlarm(10);
    Alert.alert("Alarma programada", "Sonará en 10 segundos");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>AppMedicamentos</Text>
        <Button title="Programar alarma en 10s" onPress={handleSchedule} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0E1A2B",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  title: {
    fontSize: 22,
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
