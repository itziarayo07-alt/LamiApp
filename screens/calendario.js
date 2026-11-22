import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { LineChart } from "react-native-chart-kit";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
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

const MESES_LARGOS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
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

function formatPrettyHeaderDate(isoDate, todayKey) {
  if (!isoDate) return "";
  if (isoDate === todayKey) return `Hoy • ${isoDate}`;
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  const day = parseInt(parts[2], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  return `${day} de ${MESES_LARGOS[monthIdx] || parts[1]} ${parts[0]}`;
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
  const insets = useSafeAreaInsets();
  const todayKey = getTodayKey();

  const [selectedDay, setSelectedDay] = useState(todayKey);
  const [dayFeelings, setDayFeelings] = useState({});
  const [dayNotes, setDayNotes] = useState({});
  const [dayAppointments, setDayAppointments] = useState({});
  const [newNoteText, setNewNoteText] = useState("");
  const [notaGuardadaModal, setNotaGuardadaModal] = useState(false);
  const [exportandoPDF, setExportandoPDF] = useState(false);

  // Estados para cancelar cita con motivo
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [citaACancelar, setCitaACancelar] = useState(null);
  const [motivoCancelacion, setMotivoCancelacion] = useState("");
  const [cancelandoCita, setCancelandoCita] = useState(false);

  // Modal de confirmación elegante cuando el paciente cancela su cita
  const [cancelSuccessModal, setCancelSuccessModal] = useState(null);

  // Notificaciones del paciente (cuando el psicólogo cancela/elimina una consulta)
  const [notificacionesPaciente, setNotificacionesPaciente] = useState([]);
  const [notifCentroVisible, setNotifCentroVisible] = useState(false);
  const [alertaCancelacionPsiModal, setAlertaCancelacionPsiModal] =
    useState(null);
  const shownPsiNotifIdsRef = useRef(new Set());

  const [personalityDone, setPersonalityDone] = useState(false);
  const [personalityResult, setPersonalityResult] = useState(null);
  const [activeNav, setActiveNav] = useState(1);
  const chartRef = useRef();

  const emotions = [
    { label: "Éxtasis 🤩", color: "#FFB74D", softBg: "#FFF8EB", value: 6 },
    { label: "Muy Feliz 😀", color: "#FBC02D", softBg: "#FEFCE8", value: 5 },
    { label: "Feliz 🙂", color: "#8BC34A", softBg: "#F4FCEB", value: 4 },
    { label: "Neutral 😐", color: "#78909C", softBg: "#F1F5F9", value: 3 },
    { label: "Triste 🙁", color: "#42A5F5", softBg: "#EFF6FF", value: 2 },
    { label: "Muy Triste 😢", color: "#1E88E5", softBg: "#E0F2FE", value: 1 },
    { label: "Ansioso 😰", color: "#AB47BC", softBg: "#FAF5FF", value: 2 },
    { label: "Estresado 😓", color: "#EF5350", softBg: "#FEF2F2", value: 1 },
    { label: "Emocionado 🤩", color: "#EC407A", softBg: "#FDF2F8", value: 5 },
    { label: "Calmado 😌", color: "#66BB6A", softBg: "#ECFDF5", value: 4 },
  ];

  // Sincronización en tiempo real de citas (Firestore + AsyncStorage)
  useEffect(() => {
    let unsubFirestore = null;

    const iniciarEscuchaCitas = async () => {
      try {
        const localBase = {};
        const citasRaw = await AsyncStorage.getItem(CITAS_STORAGE_KEY);
        if (citasRaw) {
          const parsed = JSON.parse(citasRaw);
          Object.keys(parsed).forEach((fecha) => {
            localBase[fecha] = Array.isArray(parsed[fecha])
              ? [...parsed[fecha]]
              : [];
          });
        }

        const user = auth.currentUser;
        if (!user) {
          setDayAppointments(localBase);
          return;
        }

        const q = query(
          collection(db, "solicitudes_sesion"),
          where("pacienteId", "==", user.uid),
        );

        unsubFirestore = onSnapshot(q, async (snap) => {
          const merged = {};

          Object.keys(localBase).forEach((fecha) => {
            merged[fecha] = localBase[fecha].filter((c) => !c.fromFirestore);
            if (merged[fecha].length === 0) delete merged[fecha];
          });

          snap.forEach((docSnap) => {
            const sol = docSnap.data();
            if (
              sol.estado === "sin_disponibilidad" ||
              sol.estado === "cancelada"
            )
              return;

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
                : sol.lugarCita ||
                  "Consulta presencial (ubicación al confirmar)";

            const itemCita = {
              id: docSnap.id,
              fromFirestore: true,
              citaPsicologoId: sol.citaPsicologoId || "",
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
                c.id === docSnap.id ? { ...c, ...itemCita } : c,
              );
            }
          });

          setDayAppointments(merged);
        });
      } catch (e) {
        console.warn("Error sincronizando citas en tiempo real:", e);
      }
    };

    iniciarEscuchaCitas();
    return () => {
      if (unsubFirestore) unsubFirestore();
    };
  }, [todayKey]);

  // Escuchar notificaciones para el paciente cuando el psicólogo cancela/elimina una cita
  useEffect(() => {
    const user = auth.currentUser;
    if (!user?.uid) return;

    const qNotifPac = query(
      collection(db, "notificaciones_paciente"),
      where("pacienteId", "==", user.uid),
    );

    const unsubNotifPac = onSnapshot(qNotifPac, (snap) => {
      const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      lista.sort((a, b) => {
        const ta = a.creadaEn?.seconds || 0;
        const tb = b.creadaEn?.seconds || 0;
        return tb - ta;
      });
      setNotificacionesPaciente(lista);

      const nuevaNoLeida = lista.find(
        (n) => !n.leida && !shownPsiNotifIdsRef.current.has(n.id),
      );
      if (nuevaNoLeida) {
        shownPsiNotifIdsRef.current.add(nuevaNoLeida.id);
        setAlertaCancelacionPsiModal(nuevaNoLeida);
      }
    });

    return () => unsubNotifPac();
  }, []);

  const marcarNotificacionesPacienteLeidas = async () => {
    try {
      const noLeidas = notificacionesPaciente.filter((n) => !n.leida);
      for (const item of noLeidas) {
        await updateDoc(doc(db, "notificaciones_paciente", item.id), {
          leida: true,
        });
      }
    } catch (e) {
      console.warn("Error marcando notificaciones como leídas:", e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      // Refresca estados al volver a enfocar la pantalla
    }, []),
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
                item.color.length >= 4,
            );
            if (valid.length > 0) cleaned[k] = valid;
          });
          setDayFeelings(cleaned);
        }

        const notesStr = await AsyncStorage.getItem("dayNotes_v1");
        if (notesStr) setDayNotes(JSON.parse(notesStr));

        const done = await AsyncStorage.getItem("testPersonalidadHecho");
        if (done === "SI") setPersonalityDone(true);

        const resJson = await AsyncStorage.getItem(
          "testPersonalidadResultado_v1",
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
      (e) => console.warn("Error saving feelings:", e),
    );
  }, [dayFeelings]);

  useEffect(() => {
    AsyncStorage.setItem("dayNotes_v1", JSON.stringify(dayNotes)).catch((e) =>
      console.warn("Error saving notes:", e),
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
        item.color.length >= 4,
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
        "Añade un pensamiento o recordatorio antes de guardar.",
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
        `Conectando a la videollamada con ${cita.psicologoNombre}...`,
      );
    }
  };

  const handleAbrirCancelarCita = (cita) => {
    setCitaACancelar(cita);
    setMotivoCancelacion("");
    setCancelModalVisible(true);
  };

  const handleConfirmarCancelarCita = async () => {
    const motivoLimpio = motivoCancelacion.trim();
    if (!motivoLimpio) {
      Alert.alert(
        "Motivo requerido",
        "Por favor escribe el motivo por el cual cancelas tu cita.",
      );
      return;
    }

    if (!citaACancelar) return;

    setCancelandoCita(true);
    try {
      const user = auth.currentUser;
      const nombrePaciente =
        user?.displayName ||
        (user?.email ? user.email.split("@")[0] : "Paciente Lami");

      if (citaACancelar.psicologoId) {
        await addDoc(collection(db, "notificaciones_psicologo"), {
          psicologoId: citaACancelar.psicologoId,
          pacienteId: user?.uid || "",
          pacienteNombre: nombrePaciente,
          citaId: citaACancelar.id || "",
          fechaCita: citaACancelar.fecha || "",
          horaCita: citaACancelar.hora || "",
          modalidad: citaACancelar.modalidad || "Presencial",
          motivo: motivoLimpio,
          tipo: "cancelacion_cita",
          leida: false,
          creadaEn: serverTimestamp(),
        });
      }

      if (citaACancelar.citaPsicologoId) {
        await deleteDoc(
          doc(db, "citas_psicologo", citaACancelar.citaPsicologoId),
        );
      } else if (citaACancelar.psicologoId && user?.uid) {
        const qPsi = query(
          collection(db, "citas_psicologo"),
          where("psicologoId", "==", citaACancelar.psicologoId),
          where("pacienteId", "==", user.uid),
        );
        const snapPsi = await getDocs(qPsi);
        for (const docPsi of snapPsi.docs) {
          const dataPsi = docPsi.data();
          if (
            !citaACancelar.hora ||
            citaACancelar.hora === "Por confirmar horario" ||
            dataPsi.horario === citaACancelar.hora ||
            dataPsi.hora === citaACancelar.hora
          ) {
            await deleteDoc(doc(db, "citas_psicologo", docPsi.id));
          }
        }
      }

      if (citaACancelar.id) {
        await deleteDoc(doc(db, "solicitudes_sesion", citaACancelar.id));
      }

      const citasRaw = await AsyncStorage.getItem(CITAS_STORAGE_KEY);
      if (citasRaw) {
        const parsed = JSON.parse(citasRaw);
        const fechaKey = citaACancelar.fecha || selectedDay;
        if (Array.isArray(parsed[fechaKey])) {
          parsed[fechaKey] = parsed[fechaKey].filter(
            (c) => c.id !== citaACancelar.id,
          );
          if (parsed[fechaKey].length === 0) {
            delete parsed[fechaKey];
          }
          await AsyncStorage.setItem(CITAS_STORAGE_KEY, JSON.stringify(parsed));
        }
      }

      const resumenCancelacion = {
        psicologoNombre: citaACancelar.psicologoNombre,
        fecha: citaACancelar.fecha,
        hora: citaACancelar.hora,
        modalidad: citaACancelar.modalidad,
        motivo: motivoLimpio,
      };

      setCancelModalVisible(false);
      setCitaACancelar(null);
      setMotivoCancelacion("");
      setCancelSuccessModal(resumenCancelacion);
    } catch (error) {
      console.error("Error al cancelar cita:", error);
      Alert.alert(
        "Error",
        "No se pudo cancelar la cita en este momento. Intenta nuevamente.",
      );
    } finally {
      setCancelandoCita(false);
    }
  };

  const unreadNotifCount = notificacionesPaciente.filter(
    (n) => !n.leida,
  ).length;

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
    fillShadowGradientFromOpacity: 0.24,
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

  const exportToPDF = async () => {
    if (exportandoPDF) return;

    if (sortedDates.length === 0) {
      return Alert.alert(
        "No hay datos",
        "Registra al menos una emoción en el calendario para exportar tu reporte PDF.",
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
              setTimeout(() => reject(new Error("Timeout captura")), 2500),
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
                : escapeHtml(e.texto),
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
        e?.message || "No se pudo crear el archivo PDF.",
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

  const mesActualPrefix = todayKey.slice(0, 7);
  const diasRegistradosMes = sortedDates.filter((d) =>
    d.startsWith(mesActualPrefix),
  ).length;

  const selectedDayEntriesCount = selectedDay
    ? Array.isArray(dayFeelings[selectedDay])
      ? dayFeelings[selectedDay].length
      : dayFeelings[selectedDay]
        ? 1
        : 0
    : 0;

  return (
    <LinearGradient
      colors={["#F8F5FF", "#F1ECFF", "#EBF5FF", "#FAF7FF"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.screen}
    >
      <StatusBar backgroundColor="#F8F5FF" barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1 }}>
        {/* BARRA SUPERIOR FLOTANTE CON PÍLDORA ACTIVA */}
        <View
          style={[
            styles.navBar,
            {
              paddingTop: Math.max(insets.top * 0.25, 8),
            },
          ]}
        >
          {[
            ["leaf-outline", "Calma", "Anxiosimetro"],
            ["calendar", "Calendario", "Calendario"],
            ["heart-outline", "Checking", "Checking"],
            ["person-circle-outline", "Perfil", "Perfil"],
          ].map(([icon, label, screen], i) => {
            const isSelected = activeNav === i;
            return (
              <TouchableOpacity
                key={i}
                activeOpacity={0.85}
                style={[styles.navItem, isSelected && styles.navItemActive]}
                onPress={() => {
                  setActiveNav(i);
                  navigation.navigate(screen);
                }}
              >
                <Ionicons
                  name={icon}
                  size={21}
                  color={isSelected ? "#6D28D9" : "#94A3B8"}
                />
                {isSelected && (
                  <Text style={styles.navLabelActive}>{label}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.container}>
          <ScrollView
            contentContainerStyle={{ paddingBottom: 46 }}
            showsVerticalScrollIndicator={false}
          >
            {/* HERO EDITORIAL DEL CALENDARIO */}
            <LinearGradient
              colors={["#FFFFFF", "#F8F3FF", "#EEF6FF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroHeaderCard}
            >
              <View style={styles.heroOrbTop} />
              <View style={styles.heroOrbBottom} />

              <View style={styles.heroTopRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <View style={styles.heroKickerRow}>
                    <View style={styles.heroKickerDot} />
                    <Text style={styles.heroKickerText}>
                      MAPA DE BIENESTAR DIARIO
                    </Text>
                  </View>
                  <Text style={styles.title}>Calendario Emocional</Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.notifBellBtn}
                  onPress={() => {
                    setNotifCentroVisible(true);
                    marcarNotificacionesPacienteLeidas();
                  }}
                >
                  <Ionicons
                    name="notifications-outline"
                    size={21}
                    color="#6D28D9"
                  />
                  {unreadNotifCount > 0 && (
                    <View style={styles.notifBadge}>
                      <Text style={styles.notifBadgeText}>
                        {unreadNotifCount > 9 ? "9+" : unreadNotifCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.heroChipsRow}>
                <View style={styles.heroStatPill}>
                  <Ionicons name="color-palette" size={13} color="#7C3AED" />
                  <Text style={styles.heroStatPillText}>
                    {diasRegistradosMes}{" "}
                    {diasRegistradosMes === 1 ? "día pintado" : "días pintados"}{" "}
                    este mes
                  </Text>
                </View>

                {!isTodaySelected && (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => {
                      setSelectedDay(todayKey);
                      setNewNoteText("");
                    }}
                    style={styles.jumpTodayPill}
                  >
                    <Ionicons name="today-outline" size={13} color="#0F766E" />
                    <Text style={styles.jumpTodayText}>Volver a Hoy</Text>
                  </TouchableOpacity>
                )}
              </View>
            </LinearGradient>

            {/* CONTENEDOR PREMIUM DEL CALENDARIO (DISEÑO EXCLUSIVO INTERNO) */}
            <View style={styles.calendarCardShell}>
              <LinearGradient
                colors={["#FAF5FF", "#F0F9FF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.calendarTopBanner}
              >
                <View style={styles.calendarBannerLeft}>
                  <Ionicons name="sparkles" size={14} color="#7C3AED" />
                  <Text style={styles.calendarBannerText}>
                    {formatPrettyHeaderDate(selectedDay, todayKey)}
                  </Text>
                </View>
                <View style={styles.calendarBannerBadge}>
                  <Text style={styles.calendarBannerBadgeText}>
                    {selectedDayEntriesCount}/2 emociones
                  </Text>
                </View>
              </LinearGradient>

              <Calendar
                current={todayKey}
                extraData={{
                  dayFeelings,
                  selectedDay,
                  dayNotes,
                  dayAppointments,
                }}
                renderHeader={(date) => {
                  const dObj = new Date(date);
                  const mIdx = dObj.getMonth();
                  const yVal = dObj.getFullYear();
                  return (
                    <View style={styles.customCalHeader}>
                      <Text style={styles.customCalMonth}>
                        {MESES_LARGOS[mIdx]}
                      </Text>
                      <View style={styles.customCalYearPill}>
                        <Text style={styles.customCalYear}>{yVal}</Text>
                      </View>
                    </View>
                  );
                }}
                renderArrow={(direction) => (
                  <View style={styles.customCalArrowBtn}>
                    <Ionicons
                      name={
                        direction === "left"
                          ? "chevron-back"
                          : "chevron-forward"
                      }
                      size={16}
                      color="#6D28D9"
                    />
                  </View>
                )}
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
                  backgroundColor: "transparent",
                  calendarBackground: "transparent",
                  textSectionTitleColor: "#7C3AED",
                  textDayHeaderFontWeight: "800",
                  textDayHeaderFontSize: 11.5,
                  "stylesheet.calendar.header": {
                    week: {
                      marginTop: 6,
                      marginBottom: 8,
                      paddingVertical: 7,
                      paddingHorizontal: 4,
                      flexDirection: "row",
                      justifyContent: "space-around",
                      backgroundColor: "#F5F3FF",
                      borderRadius: 14,
                    },
                  },
                }}
              />

              {/* LEYENDA VISUAL EXCLUSIVA DEL CALENDARIO */}
              <View style={styles.calendarLegendFooter}>
                <View style={styles.calLegendItem}>
                  <View
                    style={[
                      styles.calLegendDot,
                      {
                        borderWidth: 2,
                        borderColor: "#7C3AED",
                        backgroundColor: "#F3E8FF",
                      },
                    ]}
                  />
                  <Text style={styles.calLegendLabel}>Seleccionado</Text>
                </View>

                <View style={styles.calLegendItem}>
                  <View
                    style={[
                      styles.calLegendDot,
                      { backgroundColor: "#0D9488" },
                    ]}
                  />
                  <Text style={styles.calLegendLabel}>Cita clínica</Text>
                </View>

                <View style={styles.calLegendItem}>
                  <View
                    style={[
                      styles.calLegendDot,
                      { backgroundColor: "#8B5CF6" },
                    ]}
                  />
                  <Text style={styles.calLegendLabel}>Con bitácora</Text>
                </View>
              </View>
            </View>

            {/* NOTA DESTACADA DE CITA CON TERAPEUTA */}
            {citasDiaSeleccionado.length > 0 && (
              <LinearGradient
                colors={["#F0FDFA", "#ECFEFF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.citaSectionCard}
              >
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

                        <View style={styles.citaNotaBox}>
                          <Ionicons
                            name={
                              esOnline ? "laptop-outline" : "location-outline"
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

                        <TouchableOpacity
                          activeOpacity={0.85}
                          onPress={() => handleAbrirCancelarCita(cita)}
                          style={styles.cancelCitaBtn}
                        >
                          <Ionicons
                            name="close-circle-outline"
                            size={16}
                            color="#DC2626"
                          />
                          <Text style={styles.cancelCitaBtnText}>
                            Cancelar cita
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              </LinearGradient>
            )}

            {/* SELECCIÓN DE EMOCIONES CON CÁPSULAS TINTADAS */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionCardHeader}>
                <LinearGradient
                  colors={["#F3E8FF", "#E9D5FF"]}
                  style={styles.sectionIconBadge}
                >
                  <Ionicons name="happy-outline" size={17} color="#7C3AED" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>
                    ¿Cómo te sientes{" "}
                    {isTodaySelected ? "hoy" : `el ${selectedDay}`}?
                  </Text>
                  <Text style={styles.sectionSubHelper}>
                    Toca hasta 2 emociones para pintar tu día
                  </Text>
                </View>
              </View>

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
                      activeOpacity={0.82}
                      style={[
                        styles.emotionBtn,
                        {
                          borderColor: chosen ? e.color : `${e.color}88`,
                          backgroundColor: chosen ? e.color : e.softBg,
                        },
                        chosen && styles.emotionBtnChosen,
                      ]}
                      onPress={() => saveFeeling(selectedDay, e)}
                    >
                      <View
                        style={[
                          styles.emotionColorDot,
                          {
                            backgroundColor: chosen ? "#FFFFFF" : e.color,
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.emotionText,
                          chosen && { color: "#FFFFFF", fontWeight: "800" },
                        ]}
                      >
                        {e.label}
                      </Text>
                      {chosen && (
                        <Ionicons
                          name="checkmark-circle"
                          size={15}
                          color="#FFFFFF"
                          style={{ marginLeft: 2 }}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* BITÁCORA INMUTABLE DEL DÍA */}
            {selectedDay && (
              <LinearGradient
                colors={["#FFFFFF", "#FAF5FF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.journalCard}
              >
                <View style={styles.journalHeaderRow}>
                  <View style={styles.journalTitleRow}>
                    <LinearGradient
                      colors={["#EDE9FE", "#DDD6FE"]}
                      style={styles.journalIconCircle}
                    >
                      <Ionicons
                        name="journal-outline"
                        size={17}
                        color="#6D28D9"
                      />
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.journalTitle}>
                        Bitácora del{" "}
                        {isTodaySelected ? `día (${selectedDay})` : selectedDay}
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
                      placeholderTextColor="#94A3B8"
                      value={newNoteText}
                      onChangeText={setNewNoteText}
                    />
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={addNoteForToday}
                      style={{ alignSelf: "flex-end", marginTop: 10 }}
                    >
                      <LinearGradient
                        colors={["#7C3AED", "#5B21B6"]}
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
              </LinearGradient>
            )}

            {/* GRÁFICA CURVA DE EVOLUCIÓN */}
            <View style={styles.chartCard}>
              <View style={styles.chartHeaderRow}>
                <View style={styles.chartTitleLeft}>
                  <LinearGradient
                    colors={["#CCFBF1", "#99F6E4"]}
                    style={styles.sectionIconBadge}
                  >
                    <Ionicons
                      name="analytics-outline"
                      size={17}
                      color="#0F766E"
                    />
                  </LinearGradient>
                  <View>
                    <Text style={styles.chartMainTitle}>
                      Curva de Evolución
                    </Text>
                    <Text style={styles.chartSubTitle}>
                      Bienestar registrado (escala 1 a 6)
                    </Text>
                  </View>
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
                        width={Math.max(screenWidth - 68, 260)}
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
                onPress={exportToPDF}
                disabled={exportandoPDF}
                activeOpacity={0.9}
                style={[
                  styles.pdfBtnShadow,
                  exportandoPDF && { opacity: 0.7 },
                ]}
              >
                <LinearGradient
                  colors={["#7C3AED", "#5B21B6", "#3730A3"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.pdfBtn}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={19}
                    color="#FFF"
                  />
                  <Text style={styles.pdfBtnText}>
                    {exportandoPDF
                      ? "Generando reporte PDF..."
                      : "Exportar reporte (PDF)"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* TEST DE PERSONALIDAD */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionCardHeader}>
                <LinearGradient
                  colors={["#FCE7F3", "#F3E8FF"]}
                  style={styles.sectionIconBadge}
                >
                  <Ionicons name="ribbon-outline" size={17} color="#9333EA" />
                </LinearGradient>
                <Text style={styles.sectionTitle}>Tu test de personalidad</Text>
              </View>

              {!personalityDone ? (
                <View style={styles.personalityReminderBox}>
                  <Text style={styles.personalityReminderText}>
                    No olvides realizar el test de personalidad. Te ayudará a
                    entender mejor cómo eres emocionalmente.
                  </Text>
                </View>
              ) : (
                <LinearGradient
                  colors={["#FDF4FF", "#F5F3FF"]}
                  style={styles.personalityResultBox}
                >
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
                </LinearGradient>
              )}
            </View>
          </ScrollView>
        </View>

        {/* MODAL PARA CANCELAR CITA ESCRIBIENDO UN MOTIVO */}
        <Modal
          visible={cancelModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => !cancelandoCita && setCancelModalVisible(false)}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={styles.modalCard}>
              <View style={styles.cancelIconRing}>
                <Ionicons name="calendar-clear" size={26} color="#DC2626" />
              </View>

              <Text style={styles.cancelBadge}>CANCELAR SESIÓN</Text>
              <Text style={styles.modalTitle}>¿Deseas cancelar tu cita?</Text>
              <Text style={styles.modalBody}>
                Escribe el motivo de cancelación. La cita se eliminará de tu
                calendario y se le notificará a{" "}
                <Text style={{ fontWeight: "700", color: "#1E293B" }}>
                  {citaACancelar?.psicologoNombre || "tu especialista"}
                </Text>
                .
              </Text>

              <TextInput
                style={styles.cancelReasonInput}
                multiline
                placeholder="Escribe aquí el motivo de tu cancelación..."
                placeholderTextColor="#9CA3AF"
                value={motivoCancelacion}
                onChangeText={setMotivoCancelacion}
                editable={!cancelandoCita}
              />

              <View style={styles.cancelModalActions}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.cancelKeepBtn}
                  onPress={() => setCancelModalVisible(false)}
                  disabled={cancelandoCita}
                >
                  <Text style={styles.cancelKeepBtnText}>Conservar cita</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.88}
                  style={[
                    styles.cancelConfirmBtn,
                    cancelandoCita && { opacity: 0.7 },
                  ]}
                  onPress={handleConfirmarCancelarCita}
                  disabled={cancelandoCita}
                >
                  {cancelandoCita ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.cancelConfirmBtnText}>
                      Cancelar y notificar
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* MODAL DE CONFIRMACIÓN DE CANCELACIÓN DEL PACIENTE */}
        <Modal
          visible={!!cancelSuccessModal}
          transparent
          animationType="fade"
          onRequestClose={() => setCancelSuccessModal(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.fancyModalCard}>
              <LinearGradient
                colors={["#FFF1F2", "#F5F3FF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.fancyModalHeader}
              >
                <LinearGradient
                  colors={["#E11D48", "#7C3AED"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.fancyIconCircle}
                >
                  <Ionicons name="checkmark-done" size={30} color="#FFFFFF" />
                </LinearGradient>

                <View style={styles.fancyPillBadge}>
                  <Ionicons name="send" size={11} color="#BE123C" />
                  <Text style={styles.fancyPillText}>AVISO ENVIADO</Text>
                </View>

                <Text style={styles.fancyModalTitle}>
                  Cita cancelada con éxito
                </Text>
                <Text style={styles.fancyModalSub}>
                  Se eliminó de tu calendario y notificamos a{" "}
                  <Text style={{ fontWeight: "800", color: "#1E293B" }}>
                    {cancelSuccessModal?.psicologoNombre || "tu especialista"}
                  </Text>
                  .
                </Text>
              </LinearGradient>

              {cancelSuccessModal && (
                <View style={styles.fancyTicketBox}>
                  <View style={styles.fancyTicketRow}>
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color="#7C3AED"
                    />
                    <Text style={styles.fancyTicketText}>
                      {cancelSuccessModal.fecha} • {cancelSuccessModal.hora}
                    </Text>
                  </View>
                  <View style={styles.fancyTicketRow}>
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={16}
                      color="#E11D48"
                    />
                    <Text style={styles.fancyTicketText}>
                      Motivo: "{cancelSuccessModal.motivo}"
                    </Text>
                  </View>
                </View>
              )}

              <TouchableOpacity
                activeOpacity={0.9}
                style={{ width: "100%" }}
                onPress={() => setCancelSuccessModal(null)}
              >
                <LinearGradient
                  colors={["#7C3AED", "#6366F1"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalBtn}
                >
                  <Text style={styles.modalBtnText}>Entendido</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* MODAL CUANDO EL PSICÓLOGO CANCELA UNA CONSULTA */}
        <Modal
          visible={!!alertaCancelacionPsiModal}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setAlertaCancelacionPsiModal(null);
            marcarNotificacionesPacienteLeidas();
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.fancyModalCard}>
              <LinearGradient
                colors={["#FEF2F2", "#EEF2FF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.fancyModalHeader}
              >
                <LinearGradient
                  colors={["#DC2626", "#7C3AED"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.fancyIconCircle}
                >
                  <Ionicons name="calendar-clear" size={28} color="#FFFFFF" />
                </LinearGradient>

                <View style={styles.fancyPillBadge}>
                  <Ionicons name="notifications" size={11} color="#DC2626" />
                  <Text style={styles.fancyPillText}>
                    ACTUALIZACIÓN DE AGENDA
                  </Text>
                </View>

                <Text style={styles.fancyModalTitle}>
                  Consulta cancelada por tu especialista
                </Text>
                <Text style={styles.fancyModalSub}>
                  <Text style={{ fontWeight: "800", color: "#1E293B" }}>
                    {alertaCancelacionPsiModal?.psicologoNombre ||
                      "Tu especialista"}
                  </Text>{" "}
                  ha cancelado la sesión programada y se ha retirado de tu
                  calendario.
                </Text>
              </LinearGradient>

              {alertaCancelacionPsiModal && (
                <View style={styles.fancyTicketBox}>
                  <View style={styles.fancyTicketRow}>
                    <Ionicons name="time-outline" size={16} color="#7C3AED" />
                    <Text style={styles.fancyTicketText}>
                      {alertaCancelacionPsiModal.fechaCita || ""}{" "}
                      {alertaCancelacionPsiModal.horaCita
                        ? `• ${alertaCancelacionPsiModal.horaCita}`
                        : ""}
                    </Text>
                  </View>
                  {alertaCancelacionPsiModal.motivo ? (
                    <View style={styles.fancyTicketRow}>
                      <Ionicons
                        name="document-text-outline"
                        size={16}
                        color="#DC2626"
                      />
                      <Text style={styles.fancyTicketText}>
                        Motivo: "{alertaCancelacionPsiModal.motivo}"
                      </Text>
                    </View>
                  ) : null}
                </View>
              )}

              <TouchableOpacity
                activeOpacity={0.9}
                style={{ width: "100%" }}
                onPress={() => {
                  setAlertaCancelacionPsiModal(null);
                  marcarNotificacionesPacienteLeidas();
                }}
              >
                <LinearGradient
                  colors={["#7C3AED", "#0D9488"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalBtn}
                >
                  <Text style={styles.modalBtnText}>Aceptar</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* CENTRO DE NOTIFICACIONES DEL PACIENTE */}
        <Modal
          visible={notifCentroVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setNotifCentroVisible(false)}
        >
          <View style={styles.notifDrawerOverlay}>
            <View style={styles.notifDrawerCard}>
              <View style={styles.modalHandleBar} />
              <View style={styles.notifDrawerHeader}>
                <View style={styles.notifDrawerTitleRow}>
                  <View style={styles.notifDrawerIcon}>
                    <Ionicons name="notifications" size={18} color="#7C3AED" />
                  </View>
                  <Text style={styles.notifDrawerTitle}>
                    Notificaciones ({notificacionesPaciente.length})
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setNotifCentroVisible(false)}
                  style={styles.notifCloseBtn}
                >
                  <Ionicons name="close" size={20} color="#1E293B" />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ gap: 10, paddingBottom: 14 }}
              >
                {notificacionesPaciente.length === 0 ? (
                  <View style={styles.emptyNotifBox}>
                    <Ionicons
                      name="notifications-off-outline"
                      size={32}
                      color="#94A3B8"
                    />
                    <Text style={styles.emptyNotifTitle}>
                      Sin notificaciones nuevas
                    </Text>
                    <Text style={styles.emptyNotifSub}>
                      Aquí te avisaremos si tu psicólogo cancela o modifica una
                      consulta.
                    </Text>
                  </View>
                ) : (
                  notificacionesPaciente.map((notif) => (
                    <View key={notif.id} style={styles.notifItemCard}>
                      <View style={styles.notifItemTop}>
                        <View style={styles.notifTagPill}>
                          <Text style={styles.notifTagText}>
                            Consulta Cancelada
                          </Text>
                        </View>
                        <Text style={styles.notifItemDate}>
                          {notif.fechaCita || ""}
                        </Text>
                      </View>
                      <Text style={styles.notifItemTitle}>
                        {notif.psicologoNombre || "Especialista"} canceló tu
                        cita ({notif.modalidad || "Sesión"})
                      </Text>
                      {notif.horaCita ? (
                        <Text style={styles.notifItemMeta}>
                          ⏰ Horario: {notif.horaCita}
                        </Text>
                      ) : null}
                      {notif.motivo ? (
                        <Text style={styles.notifItemMotivo}>
                          💬 Motivo: "{notif.motivo}"
                        </Text>
                      ) : null}
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

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

// Celda editorial del calendario con cápsula redondeada, brillo sutil e insignias clínicas
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
  const tieneCitaConfirmada = citasDelDia.some((c) => c.estado !== "pendiente");
  const tieneCitaOnline = citasDelDia.some(
    (c) =>
      c.esOnline ||
      (c.modalidad || "").toLowerCase() === "online" ||
      (c.modalidad || "").toLowerCase() === "en línea",
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.78}
      style={styles.dayTouchable}
    >
      <View
        style={[
          styles.dayOuter,
          !isDisabled && !hasColor && styles.dayOuterIdle,
          isToday && !isSelected && styles.dayOuterToday,
          tieneCita &&
            (tieneCitaConfirmada
              ? styles.dayOuterCitaConfirmada
              : styles.dayOuterCitaPendiente),
          isSelected && styles.dayOuterSelected,
        ]}
      >
        {isToday && !hasColor && (
          <View style={styles.todayTinyTag}>
            <Text style={styles.todayTinyTagText}>HOY</Text>
          </View>
        )}

        {firstColor && secondColor ? (
          <View style={styles.daySplitCircle}>
            <View style={{ flex: 1, backgroundColor: firstColor }} />
            <View style={{ flex: 1, backgroundColor: secondColor }} />
            <View style={styles.dayGlossOverlay} />
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
            {firstColor && <View style={styles.dayGlossOverlay} />}
            <Text
              style={[
                styles.dayText,
                isToday && !hasColor && { color: "#6D28D9", fontWeight: "900" },
                tieneCita &&
                  !hasColor && {
                    color: tieneCitaConfirmada ? "#0F766E" : "#B45309",
                    fontWeight: "900",
                  },
                isDisabled && { color: "#CBD5E1" },
                hasColor && styles.dayTextColored,
              ]}
            >
              {dayNumber}
            </Text>
          </View>
        )}

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
              size={8.5}
              color="#FFFFFF"
            />
          </View>
        )}

        {hasNotes && (
          <View
            style={[
              styles.noteIndicatorDot,
              hasColor && {
                backgroundColor: "#FFFFFF",
                borderColor: "rgba(0,0,0,0.15)",
                borderWidth: 0.5,
              },
            ]}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },

  navBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    paddingBottom: 11,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EDE9FE",
    shadowColor: "#4C1D95",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 13,
    borderRadius: 18,
    minWidth: screenWidth * 0.2,
  },
  navItemActive: {
    backgroundColor: "#F3E8FF",
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  navLabelActive: {
    color: "#6D28D9",
    fontSize: 11,
    marginTop: 2,
    fontWeight: "800",
    letterSpacing: 0.2,
  },

  // Hero Header Editorial
  heroHeaderCard: {
    borderRadius: 28,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E9D5FF",
    overflow: "hidden",
    position: "relative",
    shadowColor: "#5B21B6",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  heroOrbTop: {
    position: "absolute",
    top: -34,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(196, 181, 253, 0.25)",
  },
  heroOrbBottom: {
    position: "absolute",
    bottom: -40,
    left: 20,
    width: 105,
    height: 105,
    borderRadius: 52,
    backgroundColor: "rgba(186, 230, 253, 0.28)",
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroKickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 3,
  },
  heroKickerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#8B5CF6",
  },
  heroKickerText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#7C3AED",
    letterSpacing: 1.1,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1E1B4B",
    letterSpacing: -0.4,
  },
  notifBellBtn: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    shadowColor: "#6D28D9",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  notifBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  notifBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
  heroChipsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 11,
  },
  heroStatPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.88)",
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  heroStatPillText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#4C1D95",
  },
  jumpTodayPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#CCFBF1",
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#99F6E4",
  },
  jumpTodayText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#0F766E",
  },

  // Diseño Exclusivo del Calendario
  calendarCardShell: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: "#E9D5FF",
    shadowColor: "#4C1D95",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  calendarTopBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#EDE9FE",
  },
  calendarBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  calendarBannerText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#312E81",
  },
  calendarBannerBadge: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#DDD6FE",
  },
  calendarBannerBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#6D28D9",
  },
  customCalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  customCalMonth: {
    fontSize: 17,
    fontWeight: "900",
    color: "#1E1B4B",
    letterSpacing: -0.3,
  },
  customCalYearPill: {
    backgroundColor: "#F3E8FF",
    paddingHorizontal: 9,
    paddingVertical: 2.5,
    borderRadius: 999,
  },
  customCalYear: {
    fontSize: 12,
    fontWeight: "800",
    color: "#7C3AED",
  },
  customCalArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#E9D5FF",
    alignItems: "center",
    justifyContent: "center",
  },
  calendarLegendFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3E8FF",
  },
  calLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  calLegendDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  calLegendLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },

  // Celdas de días dentro del calendario
  dayTouchable: {
    paddingVertical: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  dayOuter: {
    width: 41,
    height: 43,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  dayOuterIdle: {
    backgroundColor: "#FAFAFF",
    borderWidth: 1,
    borderColor: "#F1EEFF",
  },
  dayOuterToday: {
    backgroundColor: "#F3E8FF",
    borderWidth: 1.5,
    borderColor: "#A78BFA",
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
  dayOuterSelected: {
    borderWidth: 2.2,
    borderColor: "#6D28D9",
    backgroundColor: "rgba(124, 58, 237, 0.12)",
    shadowColor: "#6D28D9",
    shadowOpacity: 0.22,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  todayTinyTag: {
    position: "absolute",
    top: 2,
    paddingHorizontal: 3,
  },
  todayTinyTagText: {
    fontSize: 7,
    fontWeight: "900",
    color: "#7C3AED",
    letterSpacing: 0.4,
  },
  citaCornerBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    elevation: 3,
  },
  daySolidCircle: {
    width: 33,
    height: 33,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  daySplitCircle: {
    width: 33,
    height: 33,
    borderRadius: 12,
    flexDirection: "row",
    overflow: "hidden",
    position: "relative",
  },
  dayGlossOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "45%",
    backgroundColor: "rgba(255, 255, 255, 0.22)",
  },
  dayNumberOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#1E1B4B",
  },
  dayTextColored: {
    color: "#FFFFFF",
    fontWeight: "900",
    textShadowColor: "rgba(0,0,0,0.24)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  noteIndicatorDot: {
    position: "absolute",
    bottom: 3,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#7C3AED",
  },

  // Secciones generales
  sectionCard: {
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: "#EDE9FE",
    shadowColor: "#312E81",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sectionCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  sectionIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E1B4B",
    letterSpacing: -0.2,
  },
  sectionSubHelper: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },

  // Tarjeta destacada de sesión con terapeuta
  citaSectionCard: {
    marginTop: 15,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#5EEAD4",
    shadowColor: "#0D9488",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  citaSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  citaHeaderIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 12,
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
    borderRadius: 18,
    padding: 14,
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
    paddingVertical: 11.5,
    borderRadius: 14,
  },
  joinCallBtnText: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "800",
  },
  cancelCitaBtn: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9.5,
    borderRadius: 13,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  cancelCitaBtnText: {
    color: "#DC2626",
    fontSize: 12.5,
    fontWeight: "700",
  },

  // Selector de Emociones
  emotionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },
  emotionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 9.5,
    paddingHorizontal: 13,
    borderRadius: 999,
    borderWidth: 1.3,
  },
  emotionBtnChosen: {
    shadowColor: "#1E1B4B",
    shadowOpacity: 0.14,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  emotionColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emotionText: {
    color: "#1E293B",
    fontSize: 13.5,
    fontWeight: "600",
  },
  emptyText: {
    color: "#64748B",
    fontStyle: "italic",
  },

  // Bitácora
  journalCard: {
    marginTop: 16,
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E9D5FF",
    shadowColor: "#4C1D95",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
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
    color: "#64748B",
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
    borderRadius: 16,
    padding: 13,
    borderLeftWidth: 3.5,
    borderLeftColor: "#7C3AED",
    borderWidth: 1,
    borderColor: "#EDE9FE",
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
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 15,
    padding: 13,
    borderWidth: 1,
    borderColor: "#EDE9FE",
  },
  emptyJournalText: {
    fontSize: 12.5,
    color: "#64748B",
    fontStyle: "italic",
  },
  noteInput: {
    minHeight: 78,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DDD6FE",
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 13.5,
    textAlignVertical: "top",
    backgroundColor: "#FFFFFF",
    color: "#1E293B",
  },
  saveNoteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 17,
    paddingVertical: 10,
    borderRadius: 999,
  },
  saveNoteBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
  },

  // Gráfica
  chartCard: {
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  chartHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  chartTitleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  chartMainTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E1B4B",
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
    paddingVertical: 4.5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#CCFBF1",
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
    borderRadius: 15,
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

  actions: {
    marginTop: 18,
    alignItems: "center",
  },
  pdfBtnShadow: {
    width: "100%",
    borderRadius: 20,
    shadowColor: "#5B21B6",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  pdfBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  pdfBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },

  // Modales
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
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
  fancyModalCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 20,
    alignItems: "center",
    gap: 12,
  },
  fancyModalHeader: {
    width: "100%",
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    gap: 6,
  },
  fancyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  fancyPillBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 999,
  },
  fancyPillText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#BE123C",
    letterSpacing: 0.6,
  },
  fancyModalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#1E293B",
    textAlign: "center",
  },
  fancyModalSub: {
    fontSize: 13,
    color: "#475569",
    textAlign: "center",
    lineHeight: 19,
  },
  fancyTicketBox: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  fancyTicketRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  fancyTicketText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "700",
    color: "#1E293B",
    lineHeight: 18,
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
  cancelIconRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  cancelBadge: {
    fontSize: 10,
    fontWeight: "800",
    color: "#DC2626",
    letterSpacing: 1,
    marginBottom: 4,
  },
  cancelReasonInput: {
    width: "100%",
    minHeight: 84,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    backgroundColor: "#FFFBFB",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    color: "#1E293B",
    textAlignVertical: "top",
    marginBottom: 14,
  },
  cancelModalActions: {
    flexDirection: "row",
    width: "100%",
    gap: 10,
  },
  cancelKeepBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelKeepBtnText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "700",
  },
  cancelConfirmBtn: {
    flex: 1.25,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelConfirmBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  modalHandleBar: {
    width: 42,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 12,
  },

  notifDrawerOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end",
  },
  notifDrawerCard: {
    maxHeight: "78%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
  },
  notifDrawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  notifDrawerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  notifDrawerIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
  },
  notifDrawerTitle: {
    fontSize: 16.5,
    fontWeight: "800",
    color: "#1E293B",
  },
  notifCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyNotifBox: {
    alignItems: "center",
    paddingVertical: 28,
    gap: 6,
  },
  emptyNotifTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#334155",
  },
  emptyNotifSub: {
    fontSize: 12.5,
    color: "#64748B",
    textAlign: "center",
  },
  notifItemCard: {
    backgroundColor: "#FFFBFB",
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: "#FECACA",
    gap: 5,
  },
  notifItemTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  notifTagPill: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  notifTagText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#DC2626",
  },
  notifItemDate: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  notifItemTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#1E293B",
  },
  notifItemMeta: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
  },
  notifItemMotivo: {
    fontSize: 12.5,
    color: "#991B1B",
    backgroundColor: "#FEF2F2",
    padding: 8,
    borderRadius: 10,
    marginTop: 2,
  },

  personalityReminderBox: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#FFF5FB",
    borderWidth: 1,
    borderColor: "#F8B4D9",
  },
  personalityReminderText: {
    fontSize: 13.5,
    color: "#8A4A63",
    lineHeight: 19,
  },
  personalityResultBox: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  personalityHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  personalityIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EDE9FE",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  personalityResultLabel: {
    fontSize: 11.5,
    color: "#7C3AED",
    marginBottom: 2,
    fontWeight: "700",
  },
  personalityResultTitle: {
    fontSize: 15.5,
    fontWeight: "800",
    color: "#3B0764",
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
    marginTop: 6,
    fontSize: 13,
    color: "#475569",
    lineHeight: 19,
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
    color: "#5B21B6",
    fontWeight: "700",
  },
  personalityResultNote: {
    fontSize: 12,
    color: "#7E6A8C",
    marginTop: 6,
  },
});