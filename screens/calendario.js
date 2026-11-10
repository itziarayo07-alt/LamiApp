import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Calendar } from "react-native-calendars";

import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { LineChart } from "react-native-chart-kit";
import { SafeAreaView } from "react-native-safe-area-context";
import ViewShot from "react-native-view-shot";

const screenWidth = Dimensions.get("window").width;

function getTodayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export default function CalendarioEmocional({ navigation }) {
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayFeelings, setDayFeelings] = useState({});
  const [dayNotes, setDayNotes] = useState({});
  const [currentNote, setCurrentNote] = useState("");
  const [personalityDone, setPersonalityDone] = useState(false);
  const [personalityResult, setPersonalityResult] = useState(null);
  const [activeNav, setActiveNav] = useState(1); // 1 = Calendario
  const chartRef = useRef();

  const todayKey = getTodayKey();

  const emotions = [
    { label: "Éxtasis 🤩", color: "#FFB74D", value: 6 },
    { label: "Muy Feliz 😀", color: "#FFD54F", value: 5 },
    { label: "Feliz 🙂", color: "#AED581", value: 4 },
    { label: "Neutral 😐", color: "#90A4AE", value: 3 },
    { label: "Triste 🙁", color: "#64B5F6", value: 2 },
    { label: "Muy Triste 😢", color: "#42A5F5", value: 1 },
    { label: "Ansioso 😰", color: "#BA68C8", value: 2 },
    { label: "Estresado 😓", color: "#E57373", value: 1 },
    { label: "Emocionado 🤩", color: "#F06292", value: 5 },
    { label: "Calmado 😌", color: "#81C784", value: 4 },
  ];


  useEffect(() => {
    (async () => {
      try {
        // emociones por día
        const s = await AsyncStorage.getItem("dayFeelings_v1");
        if (s) setDayFeelings(JSON.parse(s));

        // notas por día
        const notesStr = await AsyncStorage.getItem("dayNotes_v1");
        if (notesStr) setDayNotes(JSON.parse(notesStr));

        // leer si el test de personalidad ya se hizo
        const done = await AsyncStorage.getItem("testPersonalidadHecho");
        if (done === "SI") setPersonalityDone(true);

        // leer resumen del resultado del test
        const resJson = await AsyncStorage.getItem(
          "testPersonalidadResultado_v1"
        );
        if (resJson) {
          try {
            const parsed = JSON.parse(resJson);
            setPersonalityResult(parsed);
          } catch (e) {
            console.warn("Error parseando resultado personalidad:", e);
          }
        }
      } catch (e) {
        console.warn("Error loading feelings/notes:", e);
      }
    })();
  }, []);

  
  useEffect(() => {
    AsyncStorage.setItem("dayFeelings_v1", JSON.stringify(dayFeelings)).catch(
      (e) => console.warn("Error saving feelings:", e)
    );
  }, [dayFeelings]);

  // guardar nots
  useEffect(() => {
    AsyncStorage.setItem("dayNotes_v1", JSON.stringify(dayNotes)).catch((e) =>
      console.warn("Error saving notes:", e)
    );
  }, [dayNotes]);

  // guardar emotion (hasta 2 por día)
  const saveFeeling = (date, emotion) => {
    if (!date) return Alert.alert("Selecciona una fecha primero");

    const existing = dayFeelings[date];
    let newValue;

    if (!existing) {
      // primera emoción del día
      newValue = [emotion];
    } else if (Array.isArray(existing)) {
      if (existing.length === 1) {
        // segunda emoción
        newValue = [...existing, emotion];
      } else {
        // ya hay 2 → reemplazamos la segunda por la nueva
        newValue = [existing[0], emotion];
      }
    } else {
      // dato viejo (una sola emoción como objeto)
      newValue = [existing, emotion];
    }

    const updated = { ...dayFeelings, [date]: newValue };
    setDayFeelings(updated);
  };

  // Guardar nota del día seleccionado
  const saveNoteForSelectedDay = () => {
    if (!selectedDay) {
      return Alert.alert("Selecciona una fecha primero");
    }
    if (selectedDay !== todayKey) {
      return Alert.alert(
        "Nota no editable",
        "Solo puedes modificar la nota del día actual."
      );
    }

    const trimmed = currentNote.trim();
    const updated = { ...dayNotes, [selectedDay]: trimmed };
    setDayNotes(updated);
    Alert.alert("Nota guardada", "Tu nota del día se ha guardado.");
  };

  // Chart data: promedio de valores si hay 2 emociones
  const sortedDates = Object.keys(dayFeelings).sort();
  const chartLabels = sortedDates.map((d) => d.slice(5));
  const chartValues = sortedDates.map((d) => {
    const f = dayFeelings[d];
    if (Array.isArray(f)) {
      if (f.length === 0) return 0;
      const sum = f.reduce((acc, e) => acc + (e.value || 0), 0);
      return sum / f.length;
    }
    return f?.value || 0;
  });

  const chartData = {
    labels: chartLabels.length ? chartLabels : ["-"],
    datasets: [{ data: chartValues.length ? chartValues : [0] }],
  };

  const weeklyAvg =
    chartValues.length > 0
      ? (chartValues.reduce((a, b) => a + b, 0) / chartValues.length).toFixed(2)
      : "N/A";

  const chartConfig = {
    backgroundColor: "#FFFFFF",
    backgroundGradientFrom: "#FFFFFF",
    backgroundGradientTo: "#FFFFFF",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(124, 58, 237, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    propsForDots: {
      r: "5",
      strokeWidth: "2",
      stroke: "#7C3AED",
    },
  };

  // PDF Export
  const exportToPDF = async () => {
    try {
      if (sortedDates.length === 0) {
        return Alert.alert(
          "No hay datos",
          "Registra al menos una emoción para exportar PDF."
        );
      }

      const uri = await chartRef.current.capture();

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: "base64",
      });

      const rowsHtml = sortedDates
        .map((d) => {
          const f = dayFeelings[d];
          let labelsText = "";
          let valueNumber = 0;

          if (Array.isArray(f)) {
            const labelsArray = f.map((e) => e.label);
            labelsText = labelsArray.join(" + ");
            if (f.length > 0) {
              const sum = f.reduce((acc, e) => acc + (e.value || 0), 0);
              valueNumber = sum / f.length;
            }
          } else if (f) {
            labelsText = f.label;
            valueNumber = f.value || 0;
          }

          const note = dayNotes[d] || "";

          return `<tr>
          <td style="padding:8px;border:1px solid #ddd;">${d}</td>
          <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(
            labelsText
          )}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:center;">${valueNumber.toFixed(
            2
          )}</td>
          <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(
            note
          )}</td>
        </tr>`;
        })
        .join("");

      const html = `
    <html>
      <head><meta charset="utf-8"/></head>
      <body style="font-family: Arial; padding:20px; color:#222;">
        <h1 style="color:#333;">Reporte Emocional</h1>

        <h2>Promedio general</h2>
        <p style="font-size:20px; font-weight:bold; color:#7C3AED;">
          ⭐ ${weeklyAvg}
        </p>
        
        <h2>Gráfica</h2>
        <img src="data:image/png;base64,${base64}" style="width:100%; border-radius:8px;" />

        <h2 style="margin-top:24px;">Historial registrado</h2>
        <table style="border-collapse:collapse; width:100%; font-size:14px;">
          <thead>
            <tr>
              <th style="padding:8px;border-bottom:2px solid #ccc;text-align:left;">Fecha</th>
              <th style="padding:8px;border-bottom:2px solid #ccc;text-align:left;">Emoción(es)</th>
              <th style="padding:8px;border-bottom:2px solid #ccc;">Valor</th>
              <th style="padding:8px;border-bottom:2px solid #ccc;text-align:left;">Nota</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>

        <p style="margin-top:40px; color:#999; font-size:12px;">
          Reporte generado el ${new Date().toLocaleDateString()}
        </p>
      </body>
    </html>
    `;

      const { uri: pdfUri } = await Print.printToFileAsync({ html });

      await Sharing.shareAsync(pdfUri);
    } catch (e) {
      console.error("PDF Error:", e);
      Alert.alert("Error al generar PDF", String(e));
    }
  };

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  const isTodaySelected = selectedDay === todayKey;

  return (
    <LinearGradient colors={["#f3e8ff", "#faf5ff"]} style={styles.screen}>
      <StatusBar backgroundColor="#7C3AED" barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }}>
        
        <View style={styles.navBar}>
          {[
            ["stats-chart-outline", "Anxiósometro"],
            ["calendar-outline", "Calendario"],
            ["heart-outline", "Checking"],
            ["person-circle-outline", "Perfil"],
          ].map(([icon, label], i) => (
            <TouchableOpacity
              key={i}
              style={styles.navItem}
              onPress={() => {
                setActiveNav(i);

                if (i === 0) navigation.navigate("Anxiosimetro");
                if (i === 1) navigation.navigate("Calendario");
                if (i === 2) navigation.navigate("Checking");
                if (i === 3) navigation.navigate("Perfil");
              }}
            >
              <Ionicons
                name={icon}
                size={26}
                color={activeNav === i ? "#7C3AED" : "#9CA3AF"}
              />

              
              <Text
                style={[
                  styles.navLabelActive,
                  { opacity: activeNav === i ? 1 : 0 },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        
        <View style={styles.container}>
          <ScrollView contentContainerStyle={{ paddingBottom: 50 }}>
            <Text style={styles.title}>Calendario Emocional</Text>

            {/* Calendario con día personalizado (dos colores) */}
            <Calendar
              dayComponent={({ date, state }) => {
                const dateString = date.dateString;
                const emotionsForDay = dayFeelings[dateString];
                const isSelected = selectedDay === dateString;
                const isToday = dateString === todayKey;

                return (
                  <DayWithEmotions
                    date={date}
                    state={state}
                    emotionsForDay={emotionsForDay}
                    isSelected={isSelected}
                    isToday={isToday}
                    onPress={() => {
                      setSelectedDay(dateString);
                      setCurrentNote(dayNotes[dateString] || "");
                    }}
                  />
                );
              }}
              theme={{
                todayTextColor: "#7C3AED",
                arrowColor: "#7C3AED",
              }}
            />

            {/* Selección de emociones */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Selecciona una emoción</Text>

              <View style={styles.emotionsGrid}>
                {emotions.map((e) => {
                  const entry = selectedDay ? dayFeelings[selectedDay] : null;
                  let labelsForDay = [];
                  if (Array.isArray(entry)) {
                    labelsForDay = entry.map((x) => x.label);
                  } else if (entry) {
                    labelsForDay = [entry.label];
                  }
                  const chosen = labelsForDay.includes(e.label);

                  return (
                    <TouchableOpacity
                      key={e.label}
                      style={[
                        styles.emotionBtn,
                        { borderColor: e.color },
                        chosen && { backgroundColor: e.color },
                      ]}
                      onPress={() => saveFeeling(selectedDay, e)}
                    >
                      <Text
                        style={[
                          styles.emotionText,
                          chosen && { color: "#fff", fontWeight: "700" },
                        ]}
                      >
                        {e.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={{ marginTop: 6, fontSize: 12, color: "#6B7280" }}>
                Puedes registrar hasta dos emociones por día. Si agregas más, se
                reemplazará la segunda.
              </Text>
            </View>

            {/* Nota del día */}
            {selectedDay && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Nota del día ({selectedDay})
                </Text>
                <TextInput
                  style={[
                    styles.noteInput,
                    !isTodaySelected && { backgroundColor: "#F3F4F6" },
                  ]}
                  multiline
                  placeholder="Escribe algo que quieras recordar de este día..."
                  value={currentNote}
                  onChangeText={setCurrentNote}
                  editable={isTodaySelected}
                />
                {isTodaySelected ? (
                  <TouchableOpacity
                    style={styles.saveNoteBtn}
                    onPress={saveNoteForSelectedDay}
                  >
                    <Text style={styles.saveNoteBtnText}>Guardar nota</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.noteReadonlyHint}>
                    Solo puedes editar la nota del día actual.
                  </Text>
                )}
              </View>
            )}

            {/* Grafica */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Semana / Histórico</Text>

              {sortedDates.length === 0 ? (
                <Text style={styles.emptyText}>
                  Aún no hay emociones registradas.
                </Text>
              ) : (
                <>
                  <ViewShot
                    ref={chartRef}
                    options={{
                      format: "png",
                      quality: 1,
                      result: "tmpfile",
                    }}
                  >
                    <LineChart
                      data={chartData}
                      width={Math.max(screenWidth - 40, 280)}
                      height={220}
                      chartConfig={chartConfig}
                      bezier
                      fromZero
                      style={{ borderRadius: 12 }}
                    />
                  </ViewShot>

                  <Text style={styles.avgText}>Promedio: ⭐ {weeklyAvg}</Text>
                </>
              )}
            </View>

            {/* Boton PDF, debemos probar en apk niñasss */}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.pdfBtn} onPress={exportToPDF}>
                <Text style={styles.pdfBtnText}>📄 Exportar reporte (PDF)</Text>
              </TouchableOpacity>
            </View>

            {/*test de personalidad */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tu test de personalidad</Text>

              {!personalityDone ? (
                <View style={styles.personalityReminderBox}>
                  <Text style={styles.personalityReminderText}>
                    No olvides realizar el test de personalidad. Te ayudará a
                    entender mejor cómo eres emocionalmente 💕
                  </Text>
                </View>
              ) : (
                <View style={styles.personalityResultBox}>
                  <View style={styles.personalityHeaderRow}>
                    <View style={styles.personalityIconCircle}>
                      <Ionicons
                        name="sparkles-outline"
                        size={20}
                        color="#7C3AED"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.personalityResultLabel}>
                        Tu perfil emocional
                      </Text>
                      <Text style={styles.personalityResultTitle}>
                        {personalityResult?.title || "Test completado"}
                      </Text>
                    </View>
                    {personalityResult?.score != null && (
                      <View style={styles.personalityScorePill}>
                        <Text style={styles.personalityScorePillText}>
                          {personalityResult.score} / 75
                        </Text>
                      </View>
                    )}
                  </View>

                  {personalityResult?.description && (
                    <Text style={styles.personalityResultDescription}>
                      {personalityResult.description}
                    </Text>
                  )}

                  {Array.isArray(personalityResult?.traits) &&
                    personalityResult.traits.length > 0 && (
                      <View style={styles.personalityTraitsRow}>
                        {personalityResult.traits.map((t, idx) => (
                          <View key={idx} style={styles.personalityTraitChip}>
                            <Text style={styles.personalityTraitChipText}>
                              {t}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                  <Text style={styles.personalityResultNote}>
                    Este test solo se responde una vez para cuidar tu proceso
                    emocional 💜
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

// dos colores en el calendario
function DayWithEmotions({
  date,
  state,
  emotionsForDay,
  isSelected,
  isToday,
  onPress,
}) {
  const dayNumber = date.day;
  const isDisabled = state === "disabled";

  let firstColor = null;
  let secondColor = null;

  if (emotionsForDay) {
    if (Array.isArray(emotionsForDay)) {
      if (emotionsForDay.length === 1) {
        firstColor = emotionsForDay[0]?.color;
      } else if (emotionsForDay.length >= 2) {
        firstColor = emotionsForDay[0]?.color;
        secondColor = emotionsForDay[1]?.color;
      }
    } else {
      firstColor = emotionsForDay?.color;
    }
  }

  const hasColor = !!firstColor || !!secondColor;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={{ paddingVertical: 2 }}
    >
      <View
        style={[
          styles.dayOuter,
          isSelected && styles.dayOuterSelected,
          isToday && styles.dayOuterToday,
        ]}
      >
        <View style={styles.dayInner}>
          {hasColor && !secondColor && (
            <View
              style={[
                StyleSheet.absoluteFillObject,
                { backgroundColor: firstColor, borderRadius: 16 },
              ]}
            />
          )}

          {hasColor && secondColor && (
            <View
              style={[
                StyleSheet.absoluteFillObject,
                { flexDirection: "row", borderRadius: 16, overflow: "hidden" },
              ]}
            >
              <View style={{ flex: 1, backgroundColor: firstColor }} />
              <View style={{ flex: 1, backgroundColor: secondColor }} />
            </View>
          )}

          <Text
            style={[
              styles.dayText,
              isDisabled && { color: "#D1D5DB" },
              hasColor && { color: "#F9FAFB" },
            ]}
          >
            {dayNumber}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

//styles
const styles = StyleSheet.create({
  screen: { flex: 1 },

  // CONTENEDOR BLANCO
  container: { flex: 1, backgroundColor: "#FFF", padding: 16 },

  // NAV BAR (copiado de Anxiosimetro)
  navBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "white",
    paddingVertical: 10,
    elevation: 5,
  },
  navItem: {
    alignItems: "center",
    width: screenWidth * 0.22,

 
    height: 48,
    justifyContent: "center",
  },
  navLabelActive: {
    color: "#7C3AED",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "700",
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#222",
    marginVertical: 8,
    textAlign: "center",
  },
  section: { marginTop: 18 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 10,
  },
  emotionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  emotionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  emotionText: { color: "#333", fontSize: 14 },
  emptyText: { color: "#666", fontStyle: "italic" },
  avgText: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: "700",
    color: "#7C3AED",
  },
  actions: { marginTop: 22, alignItems: "center" },
  pdfBtn: {
    backgroundColor: "#7C3AED",
    paddingVertical: 14,
    paddingHorizontal: 26,
    borderRadius: 12,
    elevation: 4,
  },
  pdfBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  noteInput: {
    minHeight: 80,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    textAlignVertical: "top",
    backgroundColor: "#F9FAFB",
  },
  saveNoteBtn: {
    marginTop: 8,
    alignSelf: "flex-end",
    backgroundColor: "#7C3AED",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  saveNoteBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  noteReadonlyHint: {
    marginTop: 6,
    fontSize: 12,
    color: "#6B7280",
  },

  // Día personalizado
  dayOuter: {
    alignItems: "center",
    justifyContent: "center",
  },
  dayOuterSelected: {
    borderRadius: 999,
    padding: 2,
    backgroundColor: "rgba(124, 58, 237, 0.12)",
  },
  dayOuterToday: {
    borderWidth: 1,
    borderColor: "#7C3AED",
    borderRadius: 999,
  },
  dayInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  dayText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },

  // estilos test de personalidad
  personalityReminderBox: {
    marginTop: 8,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#FFF5FB",
    borderWidth: 1,
    borderColor: "#F8B4D9",
  },
  personalityReminderText: {
    fontSize: 14,
    color: "#8A4A63",
  },
  personalityResultBox: {
    marginTop: 8,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FDF2FF",
    borderWidth: 1,
    borderColor: "#E4B4F5",
  },
  personalityHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  personalityIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#EDE9FE",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  personalityResultLabel: {
    fontSize: 12,
    color: "#7E6A8C",
    marginBottom: 2,
    fontWeight: "700",
  },
  personalityResultTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#4B275F",
  },
  personalityScorePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#7C3AED",
  },
  personalityScorePillText: {
    color: "#F9FAFB",
    fontSize: 12,
    fontWeight: "700",
  },
  personalityResultDescription: {
    marginTop: 8,
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
  },
  personalityTraitsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
    marginBottom: 4,
  },
  personalityTraitChip: {
    backgroundColor: "#EDE9FE",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
  },
  personalityTraitChipText: {
    fontSize: 11,
    color: "#4B2771",
    fontWeight: "600",
  },
  personalityResultNote: {
    fontSize: 12,
    color: "#7E6A8C",
    marginTop: 6,
  },
});

