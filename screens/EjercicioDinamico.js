import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "../config/firebaseConfig";
import { completarEjercicioAsignado } from "../services/lamiSyncService";

export default function EjercicioDinamico({ route, navigation }) {
  const { tarea } = route.params;
  const pasos = tarea.pasos && tarea.pasos.length > 0
    ? tarea.pasos
    : [{ tipo: "pregunta", label: "¿Cómo te sentiste al realizar esta indicación?" }];

  const [respuestas, setRespuestas] = useState({});
  const [guardando, setGuardando] = useState(false);

  const handleCompletar = async () => {
    try {
      setGuardando(true);
      const uid = auth.currentUser?.uid;
      if (uid && tarea.id) {
        await completarEjercicioAsignado(uid, tarea.id, respuestas);
      }
      Alert.alert(
        "¡Ejercicio completado! 💜",
        "Tu avance se sincronizó con tu especialista.",
        [{ text: "Listo", onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert("Error", "No se pudo guardar el progreso.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <LinearGradient colors={["#FDF2FF", "#E0F2FE"]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#4C1D95" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.badgeText}>
              🩺 {tarea.enfoque?.toUpperCase() || "INDICACIÓN CLÍNICA"}
            </Text>
            <Text style={styles.headerTitle}>{tarea.titulo}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {/* DESCRIPCIÓN */}
          <View style={styles.card}>
            <Text style={styles.descText}>{tarea.descripcion}</Text>
            <Text style={styles.durationText}>⏱ Duración sugerida: {tarea.duracion || "5 min"}</Text>
          </View>

          {/* PASOS DINÁMICOS DEL PSICÓLOGO */}
          {pasos.map((paso, index) => (
            <View key={index} style={styles.card}>
              <Text style={styles.stepTag}>Paso {index + 1}</Text>
              <Text style={styles.stepLabel}>{paso.label}</Text>

              {paso.tipo === "escala" ? (
                <View style={styles.scaleRow}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                    const activo = respuestas[index] === num;
                    return (
                      <TouchableOpacity
                        key={num}
                        onPress={() => setRespuestas({ ...respuestas, [index]: num })}
                        style={[styles.scaleBtn, activo && styles.scaleBtnActive]}
                      >
                        <Text style={[styles.scaleText, activo && { color: "#FFF" }]}>
                          {num}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <TextInput
                  style={styles.textInput}
                  multiline
                  placeholder="Escribe tu reflexión aquí..."
                  placeholderTextColor="#9CA3AF"
                  value={respuestas[index] || ""}
                  onChangeText={(txt) => setRespuestas({ ...respuestas, [index]: txt })}
                />
              )}
            </View>
          ))}

          <TouchableOpacity
            style={styles.finishBtn}
            disabled={guardando}
            onPress={handleCompletar}
          >
            <Text style={styles.finishBtnText}>
              {guardando ? "Sincronizando..." : "Marcar como completado ✓"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", padding: 16, gap: 10 },
  backBtn: { backgroundColor: "#FFF", padding: 8, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: "700", color: "#7C3AED" },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#111827" },
  scroll: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
  },
  descText: { fontSize: 14, color: "#374151", lineHeight: 20 },
  durationText: { fontSize: 12, color: "#7C3AED", fontWeight: "600", marginTop: 8 },
  stepTag: { fontSize: 11, fontWeight: "700", color: "#9CA3AF", marginBottom: 4 },
  stepLabel: { fontSize: 15, fontWeight: "700", color: "#1F2937", marginBottom: 10 },
  textInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 12,
    minHeight: 80,
    textAlignVertical: "top",
    fontSize: 14,
  },
  scaleRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  scaleBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F3E8FF",
    justifyContent: "center",
    alignItems: "center",
  },
  scaleBtnActive: { backgroundColor: "#7C3AED" },
  scaleText: { fontWeight: "700", color: "#4C1D95", fontSize: 13 },
  finishBtn: {
    backgroundColor: "#7C3AED",
    paddingVertical: 15,
    borderRadius: 999,
    alignItems: "center",
    marginTop: 8,
  },
  finishBtnText: { color: "#FFF", fontWeight: "700", fontSize: 15 },
});