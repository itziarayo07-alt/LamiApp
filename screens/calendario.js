import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Modal,
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
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Calendar } from "react-native-calendars";

import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { collection, getDocs, query, where } from "firebase/firestore";
import { LineChart } from "react-native-chart-kit";
import { SafeAreaView } from "react-native-safe-area-context";
import ViewShot from "react-native-view-shot";
import { auth, db } from "../config/firebaseConfig";
import { notificarAlertaAlEspecialista } from "../services/lamiSyncService";

const screenWidth = Dimensions.get("window").width;
const CITAS_STORAGE_KEY = "@citas_agendadas_v1";

const MESES_CORTOS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

function getTodayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatShortDate(isoDate, todayKey) {
  if (isoDate === todayKey) return "Hoy";
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  const day = parts[2];
  const monthIdx = parseInt(parts[1], 10) - 1;
  return `${day} ${MESES_CORTOS[monthIdx] || parts[1]}`;
}

function getNormalizedEntries(rawNote) {
  if (!rawNote) return [];
  if (Array.isArray(rawNote)) return rawNote;
  if (typeof rawNote === "string" && rawNote.trim() !== "") {
    return [{ id: "legacy", texto: rawNote.trim(), hora: "" }];
  }
  return [];
}

export default function CalendarioEmocional({ navigation }) {
  const todayKey = getTodayKey();

  const [selectedDay, setSelectedDay] = useState(todayKey);
  const [dayFeelings, setDayFeelings] = useState({});
  const [dayNotes, setDayNotes] = useState({});
  const [dayAppointments, setDayAppointments] = useState({});
  const [newNoteText, setNewNoteText] = useState("");
  const [notaGuardadaModal, setNotaGuardadaModal] = useState(false);
  const [exportandoPDF, setExportandoPDF] = useState(false);

  const [personalityDone, setPersonalityDone] = useState(false);
  const [personalityResult, setPersonalityResult] = useState(null);
  const [activeNav, setActiveNav] = useState(1);
  const chartRef = useRef();

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

  // Carga citas locales + solicitudes/citas sincronizadas desde Firestore
  const loadAppointments = async () => {
    try {
      const merged = {};

      // 1. Citas confirmadas guardadas localmente desde Perfil
      const citasRaw = await AsyncStorage.getItem(CITAS_STORAGE_KEY);
      if (citasRaw) {
        const parsed = JSON.parse(citasRaw);
        Object.keys(parsed).forEach((fecha) => {
          merged[fecha] = Array.isArray(parsed[fecha]) ? [...parsed[fecha]] : [];
        });
      }

      // 2. Sincronizar con solicitudes_sesion en Firestore (pendientes o confirmadas)
      const user = auth.currentUser;
      if (user) {
        const q = query(
          collection(db, "solicitudes_sesion"),
          where("pacienteId", "==", user.uid)
        );
        const snap = await getDocs(q);
        snap.forEach((docSnap) => {
          const sol = docSnap.data();
          if (sol.estado === "sin_disponibilidad") return;

          // Si ya tiene fechaCita se coloca en esa fecha; si sigue pendiente, se muestra hoy como aviso
          const fechaTarget = sol.fechaCita || todayKey;
          const modRaw = (
            sol.modalidadConfirmada ||
            sol.modalidadSolicitada ||
            "presencial"
          ).toLowerCase();
          const esOnline = modRaw === "online" || modRaw === "en línea";

          const ub = sol.ubicacionConfirmada;
          const lugarStr = esOnline
            ? "Videollamada en Sala de Teleconsulta Lami"
            : ub
            ? `${ub.nombreLugar || "Consultorio privado"} • ${ub.direccion}${
                ub.pisoConsultorio ? ` (${ub.pisoConsultorio})` : ""
              }${ub.ciudad ? `, ${ub.ciudad}` : ""}`
            : sol.lugarCita || "Consulta presencial (ubicación al confirmar)";

          const itemCita = {
            id: docSnap.id,
            fecha: fechaTarget,
            hora: sol.horaCita || "Por confirmar horario",
            psicologoId: sol.psicologoId || "",
            psicologoNombre: sol.psicologoNombre || "Especialista",
            modalidad: esOnline ? "Online" : "Presencial",
            esOnline,
            estado: sol.estado || "pendiente",
            lugar: lugarStr,
            mensajeTerapeuta: sol.respuestaTerapeuta || sol.mensaje || "",
          };

          const listaDia = Array.isArray(merged[fechaTarget])
            ? merged[fechaTarget]
            : [];
          const yaExiste = listaDia.some((c) => c.id === docSnap.id);
          if (!yaExiste) {
            merged[fechaTarget] = [...listaDia, itemCita];
          } else {
            merged[fechaTarget] = listaDia.map((c) =>
              c.id === docSnap.id ? { ...c, ...itemCita } : c
            );
          }
        });
      }

      setDayAppointments(merged);
    } catch (e) {
      console.warn("Error cargando citas en calendario:", e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAppointments();
    }, [])
  );

  useEffect(() => {
    (async () => {
      try {
        const s = await AsyncStorage.getItem("dayFeelings_v1");
        if (s) {
          const parsed = JSON.parse(s);
          const cleaned = {};
          Object.keys(parsed).forEach((k) => {
            const arr = Array.isArray(parsed[k]) ? parsed[k] : [parsed[k]];
            const valid = arr.filter(
              (item) =>
                item &&
                typeof item.color === "string" &&
                item.color.startsWith("#") &&
                item.color.length >= 4
            );
            if (valid.length > 0) cleaned[k] = valid;
          });
          setDayFeelings(cleaned);
        }

        const notesStr = await AsyncStorage.getItem("dayNotes_v1");
        if (notesStr) setDayNotes(JSON.parse(notesStr));

        await loadAppointments();

        const done = await AsyncStorage.getItem("testPersonalidadHecho");
        if (done === "SI") setPersonalityDone(true);

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

  useEffect(() => {
    AsyncStorage.setItem("dayNotes_v1", JSON.stringify(dayNotes)).catch((e) =>
      console.warn("Error saving notes:", e)
    );
  }, [dayNotes]);

  const saveFeeling = async (date, emotion) => {
    if (!date) return Alert.alert("Selecciona una fecha primero");

    const existing = dayFeelings[date];
    const validExisting = (
      Array.isArray(existing) ? existing : existing ? [existing] : []
    ).filter(
      (item) =>
        item &&
        typeof item.color === "string" &&
        item.color.startsWith("#") &&
        item.color.length >= 4
    );

    let newValue;
    if (validExisting.length === 0) {
      newValue = [emotion];
    } else if (validExisting.length === 1) {
      newValue = [...validExisting, emotion];
    } else {
      newValue = [validExisting[0], emotion];
    }

    const updated = { ...dayFeelings, [date]: newValue };
    setDayFeelings(updated);

    const labelLower = (emotion.label || "").toLowerCase();
    const esAnsiedadOTristeza =
      labelLower.includes("ansios") || labelLower.includes("triste");

    if (esAnsiedadOTristeza) {
      try {
        await notificarAlertaAlEspecialista({
          origen: "calendario",
          emocion: emotion.label,
          animoScore: emotion.value || 2,
          notaClinica: `📅 Registró "${emotion.label}" en su Calendario (${date})`,
        });
      } catch (e) {
        console.warn("No se pudo sincronizar alerta del calendario:", e);
      }
    }
  };

  const addNoteForToday = () => {
    if (!selectedDay) {
      return Alert.alert("Selecciona una fecha primero");
    }
    if (selectedDay !== todayKey) {
      return;
    }

    const trimmed = newNoteText.trim();
    if (!trimmed) {
      return Alert.alert(
        "Escribe algo primero",
        "Añade un pensamiento o recordatorio antes de guardar."
      );
    }

    const horaActual = new Date().toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const entradasPrevias = getNormalizedEntries(dayNotes[todayKey]);
    const nuevaEntrada = {
      id: `${Date.now()}`,
      texto: trimmed,
      hora: horaActual,
    };

    const updated = {
      ...dayNotes,
      [todayKey]: [...entradasPrevias, nuevaEntrada],
    };

    setDayNotes(updated);
    setNewNoteText("");
    setNotaGuardadaModal(true);
  };

  // Unirse a la videollamada de teleconsulta
  const handleUnirseVideollamada = (cita) => {
    try {
      navigation.navigate("SalaTeleconsulta", {
        citaId: cita.id,
        psicologoId: cita.psicologoId,
        psicologoNombre: cita.psicologoNombre,
        rol: "paciente",
      });
    } catch (e) {
      Alert.alert(
        "Sala de Teleconsulta",
        `Conectando a la videollamada con ${cita.psicologoNombre}...`
      );
    }
  };

  const sortedDates = Object.keys(dayFeelings).sort();
  const recentDates = sortedDates.slice(-7);

  const chartLabels = recentDates.map((d) => formatShortDate(d, todayKey));
  const chartValues = recentDates.map((d) => {
    const f = dayFeelings[d];
    if (Array.isArray(f)) {
      if (f.length === 0) return 0;
      const sum = f.reduce((acc, e) => acc + (e.value || 0), 0);
      return Number((sum / f.length).toFixed(1));
    }
    return Number((f?.value || 0).toFixed(1));
  });

  const allValues = sortedDates.map((d) => {
    const f = dayFeelings[d];
    if (Array.isArray(f)) {
      if (f.length === 0) return 0;
      const sum = f.reduce((acc, e) => acc + (e.value || 0), 0);
      return sum / f.length;
    }
    return f?.value || 0;
  });

  const weeklyAvg =
    allValues.length > 0
      ? (allValues.reduce((a, b) => a + b, 0) / allValues.length).toFixed(1)
      : "N/A";

  const ultimoDiaRegistrado = sortedDates[sortedDates.length - 1];
  const ultimaEmocionRaw = ultimoDiaRegistrado
    ? dayFeelings[ultimoDiaRegistrado]
    : null;
  const ultimaEmocionTexto = Array.isArray(ultimaEmocionRaw)
    ? ultimaEmocionRaw.map((e) => e.label).join(" + ")
    : ultimaEmocionRaw?.label || "";
  const ultimoValor =
    chartValues.length > 0 ? chartValues[chartValues.length - 1] : null;
  const esAlertaReciente =
    ultimaEmocionTexto.toLowerCase().includes("ansios") ||
    ultimaEmocionTexto.toLowerCase().includes("triste") ||
    ultimaEmocionTexto.toLowerCase().includes("estres");

  const chartData = {
    labels: chartLabels.length ? chartLabels : ["Hoy"],
    datasets: [
      {
        data: chartValues.length ? chartValues : [0],
        color: (opacity = 1) => `rgba(14, 165, 164, ${opacity})`,
        strokeWidth: 3,
      },
      {
        data: [6],
        withDots: false,
        color: () => "transparent",
        strokeWidth: 0,
      },
      {
        data: [0],
        withDots: false,
        color: () => "transparent",
        strokeWidth: 0,
      },
    ],
  };

  const chartConfig = {
    backgroundColor: "#FFFFFF",
    backgroundGradientFrom: "#FFFFFF",
    backgroundGradientTo: "#FFFFFF",
    fillShadowGradientFrom: "#14B8A6",
    fillShadowGradientFromOpacity: 0.22,
    fillShadowGradientTo: "#FFFFFF",
    fillShadowGradientToOpacity: 0.0,
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(14, 165, 164, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(71, 85, 105, ${opacity})`,
    propsForBackgroundLines: {
      strokeDasharray: "",
      stroke: "#F1F5F9",
      strokeWidth: 1,
    },
    propsForDots: {
      r: "5",
      strokeWidth: "2.5",
      stroke: "#0D9488",
      fill: "#FFFFFF",
    },
  };

  // Exportar reporte PDF con respaldo nativo para Expo Go y APK
  const exportToPDF = async () => {
    if (exportandoPDF) return;

    if (sortedDates.length === 0) {
      return Alert.alert(
        "No hay datos",
        "Registra al menos una emoción en el calendario para exportar tu reporte PDF."
      );
    }

    try {
      setExportandoPDF(true);

      let chartImgHtml = "";
      try {
        if (chartRef.current?.capture) {
          const dataUri = await Promise.race([
            chartRef.current.capture(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Timeout captura")), 2500)
            ),
          ]);

          if (typeof dataUri === "string" && dataUri.startsWith("data:image")) {
            chartImgHtml = `
              <h2 style="color:#1E293B; margin-top:20px; font-size:16px;">Curva de Evolución</h2>
              <img src="${dataUri}" style="width:100%; max-height:240px; object-fit:contain; border-radius:12px; border:1px solid #E2E8F0;" />
            `;
          }
        }
      } catch (captureErr) {
        console.warn("Captura de gráfica omitida en PDF:", captureErr);
      }

      const rowsHtml = sortedDates
        .map((d) => {
          const f = dayFeelings[d];
          let labelsText = "";
          let valueNumber = 0;

          if (Array.isArray(f)) {
            const valid = f.filter((e) => e && e.label);
            labelsText = valid.map((e) => e.label).join(" + ");
            if (valid.length > 0) {
              const sum = valid.reduce((acc, e) => acc + (e.value || 0), 0);
              valueNumber = sum / valid.length;
            }
          } else if (f) {
            labelsText = f.label || "";
            valueNumber = f.value || 0;
          }

          const entries = getNormalizedEntries(dayNotes[d]);
          const note = entries
            .map((e) =>
              e.hora
                ? `<strong>[${escapeHtml(e.hora)}]</strong> ${escapeHtml(e.texto)}`
                : escapeHtml(e.texto)
            )
            .join("<br/>");

          return `<tr>
            <td style="padding:10px; border:1px solid #E2E8F0; font-weight:bold; white-space:nowrap;">${d}</td>
            <td style="padding:10px; border:1px solid #E2E8F0;">${escapeHtml(labelsText)}</td>
            <td style="padding:10px; border:1px solid #E2E8F0; text-align:center;">${valueNumber.toFixed(1)} / 6</td>
            <td style="padding:10px; border:1px solid #E2E8F0;">${note || "-"}</td>
          </tr>`;
        })
        .join("");

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8"/>
            <style>
              body { font-family: Helvetica, Arial, sans-serif; padding: 24px; color: #1E293B; }
              table { border-collapse: collapse; width: 100%; font-size: 13px; margin-top: 10px; }
              th { background: #F8FAFC; padding: 10px; border: 1px solid #E2E8F0; text-align: left; color: #475569; }
            </style>
          </head>
          <body>
            <div style="background:#F5F3FF; padding:16px 20px; border-radius:14px; border-left:5px solid #7C3AED;">
              <h1 style="margin:0; color:#4C1D95; font-size:22px;">Reporte Emocional • Lami</h1>
              <p style="margin:4px 0 0; color:#64748B; font-size:13px;">Generado el ${new Date().toLocaleDateString("es-MX")}</p>
            </div>

            <div style="margin-top:18px; padding:14px; background:#F0FDFA; border-radius:12px; border:1px solid #CCFBF1;">
              <span style="font-size:13px; color:#0F766E; font-weight:bold;">PROMEDIO GENERAL DE BIENESTAR:</span>
              <span style="font-size:20px; font-weight:bold; color:#0D9488; margin-left:8px;">${weeklyAvg} / 6.0</span>
            </div>

            ${chartImgHtml}

            <h2 style="margin-top:24px; color:#1E293B; font-size:16px;">Historial Registrado</h2>
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Emoción(es)</th>
                  <th style="text-align:center;">Puntaje</th>
                  <th>Bitácora del día</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </body>
        </html>
      `;

      const { uri: pdfUri } = await Print.printToFileAsync({ html });

      try {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(pdfUri, {
            UTI: ".pdf",
            mimeType: "application/pdf",
            dialogTitle: "Guardar o compartir Reporte Emocional",
          });
        } else {
          await Print.printAsync({ html });
        }
      } catch (shareErr) {
        await Print.printAsync({ html });
      }
    } catch (e) {
      console.error("PDF Error:", e);
      Alert.alert(
        "Error al generar PDF",
        e?.message || "No se pudo crear el archivo PDF."
      );
    } finally {
      setExportandoPDF(false);
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
  const entradasDiaSeleccionado = selectedDay
    ? getNormalizedEntries(dayNotes[selectedDay])
    : [];
  const citasDiaSeleccionado =
    selectedDay && Array.isArray(dayAppointments[selectedDay])
      ? dayAppointments[selectedDay]
      : [];

  return (
    <LinearGradient colors={["#f3e8ff", "#faf5ff"]} style={styles.screen}>
      <StatusBar backgroundColor="#7C3AED" barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }}>
        {/* BARRA SUPERIOR */}
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
          <ScrollView
            contentContainerStyle={{ paddingBottom: 50 }}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>Calendario Emocional</Text>

            {/* CALENDARIO CON CÍRCULOS DE COLOR E INSIGNIA DESTACADA DE CITA */}
            <Calendar
              current={todayKey}
              extraData={{
                dayFeelings,
                selectedDay,
                dayNotes,
                dayAppointments,
              }}
              dayComponent={({ date, state }) => {
                const dateString = date.dateString;
                const emotionsForDay = dayFeelings[dateString];
                const isSelected = selectedDay === dateString;
                const isToday = dateString === todayKey;
                const hasNotes =
                  getNormalizedEntries(dayNotes[dateString]).length > 0;
                const citasDelDia = Array.isArray(dayAppointments[dateString])
                  ? dayAppointments[dateString]
                  : [];

                return (
                  <DayWithEmotions
                    date={date}
                    state={state}
                    emotionsForDay={emotionsForDay}
                    isSelected={isSelected}
                    isToday={isToday}
                    hasNotes={hasNotes}
                    citasDelDia={citasDelDia}
                    onPress={() => {
                      setSelectedDay(dateString);
                      setNewNoteText("");
                    }}
                  />
                );
              }}
              theme={{
                todayTextColor: "#7C3AED",
                arrowColor: "#7C3AED",
              }}
            />

            {/* NOTA DESTACADA DE CITA CON TERAPEUTA (PRESENCIAL / ONLINE + BOTÓN VIDEOLLAMADA) */}
            {citasDiaSeleccionado.length > 0 && (
              <View style={styles.citaSectionCard}>
                <View style={styles.citaSectionHeader}>
                  <View style={styles.citaHeaderIconCircle}>
                    <Ionicons name="medkit" size={16} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.citaSectionTitle}>
                      Sesión con tu terapeuta ({selectedDay})
                    </Text>
                    <Text style={styles.citaSectionSubtitle}>
                      Detalles de tu consulta programada
                    </Text>
                  </View>
                </View>

                <View style={{ gap: 10 }}>
                  {citasDiaSeleccionado.map((cita, idx) => {
                    const modLower = (cita.modalidad || "").toLowerCase();
                    const esOnline =
                      cita.esOnline ||
                      modLower === "online" ||
                      modLower === "en línea";
                    const esPendiente = cita.estado === "pendiente";

                    return (
                      <View key={cita.id || idx} style={styles.citaItemCard}>
                        <View style={styles.citaItemTopRow}>
                          <Text style={styles.citaPsiName}>
                            {cita.psicologoNombre}
                          </Text>

                          <View
                            style={[
                              styles.citaModalidadBadge,
                              esOnline
                                ? styles.citaBadgeOnline
                                : styles.citaBadgePresencial,
                            ]}
                          >
                            <Ionicons
                              name={
                                esOnline
                                  ? "videocam-outline"
                                  : "business-outline"
                              }
                              size={12}
                              color={esOnline ? "#0F766E" : "#4338CA"}
                            />
                            <Text
                              style={[
                                styles.citaModalidadBadgeText,
                                { color: esOnline ? "#0F766E" : "#4338CA" },
                              ]}
                            >
                              {esOnline ? "Modalidad Online" : "Presencial"}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.citaTimeText}>
                          ⏰ {cita.hora}{" "}
                          {esPendiente
                            ? "• Solicitud pendiente de confirmar"
                            : "• Cita confirmada"}
                        </Text>

                        {/* Nota clara indicando si es presencial (con dirección) o en línea */}
                        <View style={styles.citaNotaBox}>
                          <Ionicons
                            name={
                              esOnline
                                ? "laptop-outline"
                                : "location-outline"
                            }
                            size={15}
                            color={esOnline ? "#0D9488" : "#4F46E5"}
                            style={{ marginTop: 1 }}
                          />
                          <Text style={styles.citaNotaText}>
                            {esOnline
                              ? "Tu sesión es en modalidad Online. Únete desde aquí cuando llegue la hora de tu consulta."
                              : `Tu sesión es Presencial: ${cita.lugar}`}
                          </Text>
                        </View>

                        {cita.mensajeTerapeuta ? (
                          <Text style={styles.citaTerapeutaMsg}>
                            💬 "{cita.mensajeTerapeuta}"
                          </Text>
                        ) : null}

                        {/* Botón Unirse a la videollamada */}
                        {esOnline && (
                          <TouchableOpacity
                            activeOpacity={0.88}
                            onPress={() => handleUnirseVideollamada(cita)}
                            style={{ marginTop: 6 }}
                          >
                            <LinearGradient
                              colors={["#0D9488", "#0284C7"]}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                              style={styles.joinCallBtn}
                            >
                              <Ionicons
                                name="videocam"
                                size={17}
                                color="#FFFFFF"
                              />
                              <Text style={styles.joinCallBtnText}>
                                Unirse a la videollamada
                              </Text>
                            </LinearGradient>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* SELECCIÓN DE EMOCIONES */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Selecciona una emoción {selectedDay ? `(${selectedDay})` : ""}
              </Text>

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
                Puedes registrar hasta dos emociones por día. El círculo se
                pintará con los colores elegidos.
              </Text>
            </View>

            {/* BITÁCORA INMUTABLE DEL DÍA */}
            {selectedDay && (
              <View style={styles.journalCard}>
                <View style={styles.journalHeaderRow}>
                  <View style={styles.journalTitleRow}>
                    <View style={styles.journalIconCircle}>
                      <Ionicons
                        name="journal-outline"
                        size={17}
                        color="#7C3AED"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.journalTitle}>
                        Bitácora del{" "}
                        {isTodaySelected
                          ? `día (${selectedDay})`
                          : selectedDay}
                      </Text>
                      <Text style={styles.journalSubtitle}>
                        {isTodaySelected
                          ? "Tus notas guardadas se conservan intactas; puedes añadir más."
                          : "Historial guardado de este día (solo lectura)."}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.lockBadge}>
                    <Ionicons name="lock-closed" size={11} color="#6D28D9" />
                    <Text style={styles.lockBadgeText}>Inmutable</Text>
                  </View>
                </View>

                {entradasDiaSeleccionado.length > 0 ? (
                  <View style={styles.entriesList}>
                    {entradasDiaSeleccionado.map((item, idx) => (
                      <View key={item.id || idx} style={styles.savedEntryCard}>
                        <View style={styles.savedEntryHeader}>
                          <View style={styles.entryDot} />
                          <Text style={styles.savedEntryMeta}>
                            {item.hora
                              ? `Guardada a las ${item.hora}`
                              : `Registro #${idx + 1}`}
                          </Text>
                          <Ionicons
                            name="checkmark-done"
                            size={14}
                            color="#0D9488"
                          />
                        </View>
                        <Text style={styles.savedEntryText}>{item.texto}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyJournalBox}>
                    <Text style={styles.emptyJournalText}>
                      {isTodaySelected
                        ? "Aún no has escrito en tu bitácora hoy. Escribe abajo para guardar tu primer registro."
                        : "No se registraron notas en esta fecha."}
                    </Text>
                  </View>
                )}

                {isTodaySelected && (
                  <View style={{ marginTop: 12 }}>
                    <TextInput
                      style={styles.noteInput}
                      multiline
                      placeholder="Añade un pensamiento nuevo de hoy..."
                      placeholderTextColor="#9CA3AF"
                      value={newNoteText}
                      onChangeText={setNewNoteText}
                    />
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={addNoteForToday}
                      style={{ alignSelf: "flex-end", marginTop: 10 }}
                    >
                      <LinearGradient
                        colors={["#7C3AED", "#6366F1"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.saveNoteBtn}
                      >
                        <Ionicons
                          name="add-circle-outline"
                          size={16}
                          color="#FFFFFF"
                        />
                        <Text style={styles.saveNoteBtnText}>
                          {entradasDiaSeleccionado.length > 0
                            ? "Agregar otra nota"
                            : "Guardar en bitácora"}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* GRÁFICA CURVA DE EVOLUCIÓN */}
            <View style={styles.chartCard}>
              <View style={styles.chartHeaderRow}>
                <View>
                  <Text style={styles.chartMainTitle}>Curva de Evolución</Text>
                  <Text style={styles.chartSubTitle}>
                    Bienestar registrado (escala 1 a 6)
                  </Text>
                </View>

                <View style={styles.legendPill}>
                  <View style={styles.legendDot} />
                  <Text style={styles.legendText}>Ánimo</Text>
                </View>
              </View>

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
                      quality: 0.9,
                      result: "data-uri",
                    }}
                  >
                    <View style={{ backgroundColor: "#FFFFFF", paddingTop: 6 }}>
                      <LineChart
                        data={chartData}
                        width={Math.max(screenWidth - 64, 260)}
                        height={210}
                        fromZero
                        segments={6}
                        yAxisInterval={1}
                        chartConfig={chartConfig}
                        bezier
                        style={{
                          borderRadius: 12,
                          marginLeft: -12,
                        }}
                      />
                    </View>
                  </ViewShot>

                  <View
                    style={[
                      styles.insightBanner,
                      esAlertaReciente
                        ? styles.insightBannerAlert
                        : styles.insightBannerCalm,
                    ]}
                  >
                    <Ionicons
                      name={
                        esAlertaReciente ? "alert-circle" : "sparkles-outline"
                      }
                      size={18}
                      color={esAlertaReciente ? "#E11D48" : "#0D9488"}
                    />
                    <Text
                      style={[
                        styles.insightBannerText,
                        { color: esAlertaReciente ? "#9F1239" : "#115E59" },
                      ]}
                    >
                      <Text style={{ fontWeight: "800" }}>
                        Promedio: {weeklyAvg}/6 •{" "}
                      </Text>
                      Último registro (
                      {formatShortDate(ultimoDiaRegistrado, todayKey)}):{" "}
                      {ultimaEmocionTexto} ({ultimoValor}/6).
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* BOTÓN EXPORTAR PDF ACTIVO */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.pdfBtn, exportandoPDF && { opacity: 0.7 }]}
                onPress={exportToPDF}
                disabled={exportandoPDF}
                activeOpacity={0.88}
              >
                <Ionicons name="document-text-outline" size={19} color="#FFF" />
                <Text style={styles.pdfBtnText}>
                  {exportandoPDF
                    ? "Generando reporte PDF..."
                    : "Exportar reporte (PDF)"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* TEST DE PERSONALIDAD */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tu test de personalidad</Text>

              {!personalityDone ? (
                <View style={styles.personalityReminderBox}>
                  <Text style={styles.personalityReminderText}>
                    No olvides realizar el test de personalidad. Te ayudará a
                    entender mejor cómo eres emocionalmente.
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
                    emocional.
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>

        {/* MODAL CREATIVO DE NOTA GUARDADA */}
        <Modal
          visible={notaGuardadaModal}
          transparent
          animationType="fade"
          onRequestClose={() => setNotaGuardadaModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <LinearGradient
                colors={["#7C3AED", "#14B8A6"]}
                style={styles.modalIconRing}
              >
                <Ionicons name="bookmark" size={26} color="#FFFFFF" />
              </LinearGradient>

              <Text style={styles.modalBadge}>BITÁCORA PROTEGIDA</Text>
              <Text style={styles.modalTitle}>
                Tu nota del día se ha guardado
              </Text>
              <Text style={styles.modalBody}>
                Este pensamiento quedó resguardado en tu historial de hoy. No se
                puede editar ni borrar, pero puedes seguir agregando más notas
                cuando lo necesites.
              </Text>

              <TouchableOpacity
                activeOpacity={0.9}
                style={{ width: "100%", marginTop: 8 }}
                onPress={() => setNotaGuardadaModal(false)}
              >
                <LinearGradient
                  colors={["#7C3AED", "#6366F1"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalBtn}
                >
                  <Text style={styles.modalBtnText}>Continuar</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

// Círculo de cada día + insignia sobresaliente si tiene cita con el terapeuta
function DayWithEmotions({
  date,
  state,
  emotionsForDay,
  isSelected,
  isToday,
  hasNotes,
  citasDelDia = [],
  onPress,
}) {
  const dayNumber = date.day;
  const isDisabled = state === "disabled";

  const validColors = (
    Array.isArray(emotionsForDay) ? emotionsForDay : [emotionsForDay]
  )
    .map((item) => item?.color)
    .filter((c) => typeof c === "string" && c.startsWith("#") && c.length >= 4);

  const firstColor = validColors[0] || null;
  const secondColor = validColors[1] || null;
  const hasColor = validColors.length > 0;

  const tieneCita = citasDelDia.length > 0;
  const tieneCitaConfirmada = citasDelDia.some(
    (c) => c.estado !== "pendiente"
  );
  const tieneCitaOnline = citasDelDia.some(
    (c) =>
      c.esOnline ||
      (c.modalidad || "").toLowerCase() === "online" ||
      (c.modalidad || "").toLowerCase() === "en línea"
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={styles.dayTouchable}
    >
      <View
        style={[
          styles.dayOuter,
          isSelected && styles.dayOuterSelected,
          isToday && styles.dayOuterToday,
          tieneCita &&
            (tieneCitaConfirmada
              ? styles.dayOuterCitaConfirmada
              : styles.dayOuterCitaPendiente),
        ]}
      >
        {firstColor && secondColor ? (
          <View style={styles.daySplitCircle}>
            <View style={{ flex: 1, backgroundColor: firstColor }} />
            <View style={{ flex: 1, backgroundColor: secondColor }} />
            <View style={styles.dayNumberOverlay}>
              <Text style={[styles.dayText, styles.dayTextColored]}>
                {dayNumber}
              </Text>
            </View>
          </View>
        ) : (
          <View
            style={[
              styles.daySolidCircle,
              firstColor && { backgroundColor: firstColor },
            ]}
          >
            <Text
              style={[
                styles.dayText,
                isToday && !hasColor && { color: "#7C3AED", fontWeight: "800" },
                tieneCita &&
                  !hasColor && {
                    color: tieneCitaConfirmada ? "#0F766E" : "#B45309",
                    fontWeight: "900",
                  },
                isDisabled && { color: "#D1D5DB" },
                hasColor && styles.dayTextColored,
              ]}
            >
              {dayNumber}
            </Text>
          </View>
        )}

        {/* Insignia sobresaliente en la esquina superior derecha cuando hay sesión */}
        {tieneCita && (
          <View
            style={[
              styles.citaCornerBadge,
              {
                backgroundColor: tieneCitaConfirmada ? "#0D9488" : "#F59E0B",
              },
            ]}
          >
            <Ionicons
              name={tieneCitaOnline ? "videocam" : "medkit"}
              size={8}
              color="#FFFFFF"
            />
          </View>
        )}

        {hasNotes && (
          <View
            style={[
              styles.noteIndicatorDot,
              hasColor && { backgroundColor: "#FFFFFF" },
            ]}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { flex: 1, backgroundColor: "#FFF", padding: 16 },
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

  // Tarjeta destacada de sesión con terapeuta debajo del calendario
  citaSectionCard: {
    marginTop: 14,
    backgroundColor: "#F0FDFA",
    borderRadius: 22,
    padding: 15,
    borderWidth: 1.5,
    borderColor: "#5EEAD4",
    shadowColor: "#0D9488",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  citaSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  citaHeaderIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: "#0D9488",
    alignItems: "center",
    justifyContent: "center",
  },
  citaSectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F766E",
  },
  citaSectionSubtitle: {
    fontSize: 11.5,
    color: "#115E59",
  },
  citaItemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: "#CCFBF1",
    gap: 6,
  },
  citaItemTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  citaPsiName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E293B",
    flex: 1,
  },
  citaModalidadBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  citaBadgeOnline: {
    backgroundColor: "#CCFBF1",
  },
  citaBadgePresencial: {
    backgroundColor: "#EEF2FF",
  },
  citaModalidadBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  citaTimeText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0D9488",
  },
  citaNotaBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  citaNotaText: {
    flex: 1,
    fontSize: 12.5,
    color: "#334155",
    lineHeight: 18,
    fontWeight: "600",
  },
  citaTerapeutaMsg: {
    fontSize: 12,
    color: "#64748B",
    fontStyle: "italic",
  },
  joinCallBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 11,
    borderRadius: 14,
  },
  joinCallBtnText: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "800",
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

  // Bitácora creativa e inmutable
  journalCard: {
    marginTop: 18,
    backgroundColor: "#FAF8FF",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  journalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 12,
  },
  journalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  journalIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
  },
  journalTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E1B4B",
  },
  journalSubtitle: {
    fontSize: 11.5,
    color: "#6B7280",
    marginTop: 1,
  },
  lockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  lockBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#6D28D9",
  },
  entriesList: {
    gap: 8,
  },
  savedEntryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    borderLeftWidth: 3.5,
    borderLeftColor: "#7C3AED",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  savedEntryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  entryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#14B8A6",
  },
  savedEntryMeta: {
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  savedEntryText: {
    fontSize: 13.5,
    color: "#1E293B",
    lineHeight: 19,
  },
  emptyJournalBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  emptyJournalText: {
    fontSize: 12.5,
    color: "#6B7280",
    fontStyle: "italic",
  },
  noteInput: {
    minHeight: 76,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DDD6FE",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    textAlignVertical: "top",
    backgroundColor: "#FFFFFF",
    color: "#111827",
  },
  saveNoteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
  },
  saveNoteBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },

  // Gráfica curva de evolución
  chartCard: {
    marginTop: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  chartHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  chartMainTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  chartSubTitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  legendPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F0FDFA",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#14B8A6",
  },
  legendText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#0F766E",
  },
  insightBanner: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  insightBannerCalm: {
    backgroundColor: "#F0FDFA",
    borderColor: "#CCFBF1",
  },
  insightBannerAlert: {
    backgroundColor: "#FFF1F2",
    borderColor: "#FECDD3",
  },
  insightBannerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },

  actions: { marginTop: 22, alignItems: "center" },
  pdfBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#7C3AED",
    paddingVertical: 14,
    paddingHorizontal: 26,
    borderRadius: 14,
    elevation: 4,
  },
  pdfBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  // Círculos de días del calendario + insignia sobresaliente de cita
  dayTouchable: {
    paddingVertical: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  dayOuter: {
    width: 39,
    height: 39,
    borderRadius: 19.5,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  dayOuterSelected: {
    borderWidth: 2,
    borderColor: "#7C3AED",
    backgroundColor: "rgba(124, 58, 237, 0.08)",
  },
  dayOuterToday: {
    borderWidth: 1.5,
    borderColor: "#7C3AED",
  },
  dayOuterCitaConfirmada: {
    borderWidth: 2,
    borderColor: "#0D9488",
    backgroundColor: "rgba(13, 148, 136, 0.12)",
  },
  dayOuterCitaPendiente: {
    borderWidth: 2,
    borderColor: "#F59E0B",
    backgroundColor: "rgba(245, 158, 11, 0.12)",
  },
  citaCornerBadge: {
    position: "absolute",
    top: -1,
    right: -1,
    width: 15,
    height: 15,
    borderRadius: 7.5,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    elevation: 3,
  },
  daySolidCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  daySplitCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    flexDirection: "row",
    overflow: "hidden",
    position: "relative",
  },
  dayNumberOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: {
    fontSize: 13.5,
    fontWeight: "600",
    color: "#111827",
  },
  dayTextColored: {
    color: "#FFFFFF",
    fontWeight: "800",
    textShadowColor: "rgba(0,0,0,0.22)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  noteIndicatorDot: {
    position: "absolute",
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#7C3AED",
  },

  // Modal creativo nota guardada
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
  },
  modalIconRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modalBadge: {
    fontSize: 10,
    fontWeight: "800",
    color: "#7C3AED",
    letterSpacing: 1,
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#1E293B",
    textAlign: "center",
  },
  modalBody: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 19,
    marginTop: 6,
    marginBottom: 16,
  },
  modalBtn: {
    paddingVertical: 13,
    borderRadius: 999,
    alignItems: "center",
  },
  modalBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  // Estilos test de personalidad
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