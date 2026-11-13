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
  const pasos =
    tarea.pasos && tarea.pasos.length > 0
      ? tarea.pasos
      : [
          {
            tipo: "pregunta",
            label: "¿Cómo te sentiste al realizar esta indicación?",
          },
        ];

  const [respuestas, setRespuestas] = useState({});
  const [guardando, setGuardando] = useState(false);

  const validarPasos = () => {
    for (let i = 0; i < pasos.length; i++) {
      const p = pasos[i];
      const val = respuestas[i];

      if (p.tipo === "pregunta" && (!val || !String(val).trim())) {
        Alert.alert(
          "Paso pendiente",
          `Por favor responde el Paso ${i + 1} antes de finalizar.`
        );
        return false;
      }
      if (p.tipo === "escala" && val === undefined) {
        Alert.alert(
          "Escala pendiente",
          `Por favor selecciona un valor del 1 al 10 en el Paso ${i + 1}.`
        );
        return false;
      }
      if (p.tipo === "instruccion" && !val) {
        Alert.alert(
          "Indicación pendiente",
          `Marca como realizada la indicación del Paso ${i + 1}.`
        );
        return false;
      }
    }
    return true;
  };

  const handleCompletar = async () => {
    if (!validarPasos()) return;

    try {
      setGuardando(true);
      const uid = auth.currentUser?.uid;
      if (uid && tarea.id) {
        await completarEjercicioAsignado(uid, tarea.id, respuestas, tarea);
      }

      const esRecurrente = tarea.frecuenciaTipo === "recurrente";
      Alert.alert(
        "¡Ejercicio completado! 💜",
        esRecurrente
          ? `Tus respuestas se enviaron a tu especialista. Podrás volver a realizar este ejercicio según la frecuencia indicada (${
              tarea.frecuenciaLabel || "Recurrente"
            }).`
          : "Tu avance y respuestas se sincronizaron en tiempo real con tu especialista.",
        [{ text: "Listo", onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.log("Error guardando ejercicio dinámico:", error);
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
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={24} color="#4C1D95" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.badgeText}>
              🩺 {tarea.enfoque?.toUpperCase() || "INDICACIÓN CLÍNICA"} •{" "}
              {tarea.frecuenciaLabel ||
                (tarea.frecuenciaTipo === "recurrente"
                  ? "RECURRENTE"
                  : "ÚNICA VEZ")}
            </Text>
            <Text style={styles.headerTitle}>{tarea.titulo}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {/* DESCRIPCIÓN */}
          <View style={styles.card}>
            <Text style={styles.descLabel}>Indicaciones de tu especialista:</Text>
            <Text style={styles.descText}>{tarea.descripcion}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.durationText}>
                ⏱ Duración sugerida: {tarea.duracion || "5 min"}
              </Text>
              {tarea.vecesCompletado > 0 && (
                <Text style={styles.completedCountText}>
                  ✓ Realizado {tarea.vecesCompletado}{" "}
                  {tarea.vecesCompletado === 1 ? "vez" : "veces"}
                </Text>
              )}
            </View>
          </View>

          {/* PASOS DINÁMICOS DEL PSICÓLOGO */}
          {pasos.map((paso, index) => {
            const tipo = paso.tipo || "pregunta";
            const checkActivo = Boolean(respuestas[index]);

            return (
              <View key={index} style={styles.card}>
                <View style={styles.stepTopRow}>
                  <Text style={styles.stepTag}>Paso {index + 1}</Text>
                  <Text style={styles.stepTypeBadge}>
                    {tipo === "escala"
                      ? "📊 Escala 1-10"
                      : tipo === "instruccion"
                      ? "✅ Acción / Indicación"
                      : "📝 Reflexión escrita"}
                  </Text>
                </View>

                <Text style={styles.stepLabel}>{paso.label}</Text>

                {tipo === "escala" ? (
                  <View style={styles.scaleRow}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                      const activo = respuestas[index] === num;
                      return (
                        <TouchableOpacity
                          key={num}
                          onPress={() =>
                            setRespuestas({ ...respuestas, [index]: num })
                          }
                          style={[
                            styles.scaleBtn,
                            activo && styles.scaleBtnActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.scaleText,
                              activo && { color: "#FFF" },
                            ]}
                          >
                            {num}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : tipo === "instruccion" ? (
                  <TouchableOpacity
                    style={[
                      styles.checkRow,
                      checkActivo && styles.checkRowActive,
                    ]}
                    onPress={() =>
                      setRespuestas({
                        ...respuestas,
                        [index]: checkActivo ? "" : "Completado ✓",
                      })
                    }
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name={checkActivo ? "checkbox" : "square-outline"}
                      size={24}
                      color={checkActivo ? "#059669" : "#6B7280"}
                    />
                    <Text
                      style={[
                        styles.checkText,
                        checkActivo && { color: "#065F46", fontWeight: "700" },
                      ]}
                    >
                      {checkActivo
                        ? "Ya realicé esta indicación ✓"
                        : "Toca aquí cuando hayas realizado esta indicación"}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TextInput
                    style={styles.textInput}
                    multiline
                    placeholder="Escribe tu respuesta o reflexión aquí..."
                    placeholderTextColor="#9CA3AF"
                    value={respuestas[index] || ""}
                    onChangeText={(txt) =>
                      setRespuestas({ ...respuestas, [index]: txt })
                    }
                  />
                )}
              </View>
            );
          })}

          <TouchableOpacity
            style={styles.finishBtn}
            disabled={guardando}
            onPress={handleCompletar}
          >
            <Text style={styles.finishBtnText}>
              {guardando
                ? "Sincronizando con tu especialista..."
                : "Enviar respuestas y completar ✓"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 10,
  },
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
  descLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 4,
  },
  descText: { fontSize: 14, color: "#374151", lineHeight: 20 },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  durationText: { fontSize: 12, color: "#7C3AED", fontWeight: "700" },
  completedCountText: { fontSize: 12, color: "#059669", fontWeight: "700" },
  stepTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  stepTag: { fontSize: 11, fontWeight: "800", color: "#7C3AED" },
  stepTypeBadge: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  stepLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 10,
    lineHeight: 21,
  },
  textInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 12,
    minHeight: 85,
    textAlignVertical: "top",
    fontSize: 14,
    color: "#1F2937",
  },
  scaleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "space-between",
  },
  scaleBtn: {
    width: 32,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F3E8FF",
    justifyContent: "center",
    alignItems: "center",
  },
  scaleBtnActive: { backgroundColor: "#7C3AED" },
  scaleText: { fontWeight: "700", color: "#4C1D95", fontSize: 13 },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 14,
  },
  checkRowActive: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  checkText: {
    flex: 1,
    fontSize: 13,
    color: "#4B5563",
  },
  finishBtn: {
    backgroundColor: "#7C3AED",
    paddingVertical: 15,
    borderRadius: 999,
    alignItems: "center",
    marginTop: 8,
    elevation: 2,
  },
  finishBtnText: { color: "#FFF", fontWeight: "700", fontSize: 15 },
});
