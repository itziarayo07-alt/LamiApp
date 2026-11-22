import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { auth } from "../config/firebaseConfig";
import {
  completarEjercicioAsignado,
  escucharTareasDelPsicologo,
} from "../services/lamiSyncService";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const TEST_REMINDER_DATE_KEY = "testDiarioReminderDate";
const TEST_REMINDER_1120_KEY = "testDiarioReminder_1120";
const TEST_REMINDER_1900_KEY = "testDiarioReminder_1900";

const ejerciciosIniciales = [
  {
    id: 1,
    titulo: "Respiración 4-7-8",
    descripcion: "Inhala 4 segundos, mantén 7, exhala 8. Hazlo 4 veces.",
    duracion: "3 - 5 minutos",
  },
  {
    id: 2,
    titulo: "Escaneo corporal",
    descripcion:
      "Lleva tu atención desde la cabeza hasta los pies, observando tensiones.",
    duracion: "5 - 10 minutos",
  },
  {
    id: 3,
    titulo: "Anclaje con los sentidos",
    descripcion:
      "Nombra 5 cosas que ves, 4 que tocas, 3 que oyes, 2 que hueles y 1 que saboreas.",
    duracion: "5 minutos",
  },
  {
    id: 4,
    titulo: "Descubre cómo se da la ansiedad",
    descripcion:
      "Un espacio para leer, entender qué es la ansiedad y por qué tu cuerpo reacciona como lo hace. Conocerla también es una forma de cuidarte.",
    duracion: "Lectura breve",
    esInfoAnsiedad: true,
  },
];

const imagenTestDiario = require("../assets/emociones.jpg");
const imagenTestPersonalidad = require("../assets/personalidad.jpg");
const imagenTecnicaABCDE = require("../assets/ilustrar.jpg");
const imagenPreguntaDefault = require("../assets/preguntas.jpg");
const imagenMapaDetonantes = require("../assets/ansiedad.jpg");
const imagenPlanCalma = require("../assets/escaneo.jpg");

const imagenesEjercicios = {
  1: require("../assets/respracion.gif"), // Respiración 4-7-8
  2: require("../assets/corporal.png"), // Escaneo corporal
  3: require("../assets/sentidos.jpg"), // Anclaje con los sentidos
  4: require("../assets/ansiedad.jpg"), // Descubre cómo se da la ansiedad
};

function identificarClaveEjercicio(tarea) {
  const tituloNorm = String(tarea?.titulo || "")
    .trim()
    .toLowerCase();
  const plantillaNorm = String(tarea?.plantillaId || "")
    .trim()
    .toLowerCase();

  if (plantillaNorm === "abcde" || tituloNorm.includes("abcde")) {
    return "abcde";
  }
  if (
    plantillaNorm === "respiracion-478" ||
    tituloNorm.includes("respiración") ||
    tituloNorm.includes("respiracion")
  ) {
    return "respiracion";
  }
  if (plantillaNorm === "escaneo-corporal" || tituloNorm.includes("escaneo")) {
    return "escaneo";
  }
  if (
    plantillaNorm === "anclaje-sentidos" ||
    tituloNorm.includes("sentidos") ||
    tituloNorm.includes("anclaje")
  ) {
    return "sentidos";
  }
  if (
    plantillaNorm === "registro-disparadores" ||
    tituloNorm.includes("detonantes") ||
    tituloNorm.includes("disparadores")
  ) {
    return "detonantes";
  }
  if (
    plantillaNorm === "plan-calma-crisis" ||
    tituloNorm.includes("plan de calma") ||
    tituloNorm.includes("momentos difíciles") ||
    tituloNorm.includes("momentos dificiles")
  ) {
    return "plan-calma";
  }

  return "otro";
}

function obtenerImagenTareaAsignada(tarea) {
  if (tarea?.categoriaEnvio === "pregunta") return imagenPreguntaDefault;
  const clave = identificarClaveEjercicio(tarea);
  if (clave === "abcde") return imagenTecnicaABCDE;
  if (clave === "respiracion") return imagenesEjercicios[1];
  if (clave === "escaneo") return imagenesEjercicios[2];
  if (clave === "sentidos") return imagenesEjercicios[3];
  if (clave === "detonantes") return imagenMapaDetonantes;
  if (clave === "plan-calma") return imagenPlanCalma;
  return imagenTecnicaABCDE;
}

function resolverRutaEjercicioAsignado(tarea) {
  const clave = identificarClaveEjercicio(tarea);
  if (clave === "abcde") return "TecnicaABCDE";
  if (clave === "respiracion") return "Respiracion";
  if (clave === "escaneo") return "Escaneo";
  if (clave === "sentidos") return "Sentidos";
  if (clave === "detonantes") return "MapaDetonantes";
  if (clave === "plan-calma") return "PlanCalmaCrisis";
  return "EjercicioDinamico";
}

function calcularProximoISO(tarea, ahoraMs = Date.now()) {
  if (tarea?.frecuenciaTipo !== "recurrente") return null;
  const horas = Number(tarea?.intervaloHoras || 24);
  return new Date(ahoraMs + horas * 60 * 60 * 1000).toISOString();
}

function obtenerTextoAvisoRecurrencia(tarea) {
  const freqLabel = tarea?.frecuenciaLabel || "Única vez";
  if (tarea?.frecuenciaTipo === "recurrente") {
    return `Al iniciar este ejercicio quedará registrado y no volverá a mostrarse hasta pasadas las próximas horas indicadas (${freqLabel}). Realízalo con calma y sin distracciones.`;
  }
  return "Al iniciar este ejercicio quedará registrado como completado y saldrá de tus pendientes. Realizalo sin distracciones.";
}

export default function CheckingScreen({ navigation }) {
  const [ejercicios] = useState(ejerciciosIniciales);
  const [activeNav, setActiveNav] = useState(2); // 0=Calma, 1=Calendario, 2=Checking, 3=Perfil

  const [testRealizadoHoy, setTestRealizadoHoy] = useState(false);
  const [testPersonalidadHecho, setTestPersonalidadHecho] = useState(false);

  const [puedeHacerTestHoy, setPuedeHacerTestHoy] = useState(false);
  const [tareasPsicologo, setTareasPsicologo] = useState([]);
  const [ahoraTick, setAhoraTick] = useState(Date.now());

  const [idsEnTransicionSalida, setIdsEnTransicionSalida] = useState([]);
  const timersSalidaRef = useRef({});

  const [respuestasPorTarea, setRespuestasPorTarea] = useState({});
  const [enviandoTareaId, setEnviandoTareaId] = useState(null);

  const [modalAviso, setModalAviso] = useState({
    visible: false,
    tipo: "exito",
    badge: "LAMI • CHECKING",
    titulo: "",
    mensaje: "",
  });

  const mostrarModal = ({
    tipo = "exito",
    badge = "LAMI • CHECKING",
    titulo = "",
    mensaje = "",
  }) => {
    setModalAviso({
      visible: true,
      tipo,
      badge,
      titulo,
      mensaje,
    });
  };

  const cerrarModal = () => {
    setModalAviso((prev) => ({ ...prev, visible: false }));
  };

  const marcarTareaLocalCompletada = (tarea) => {
    const ahoraMs = Date.now();
    const esRecurrente = tarea?.frecuenciaTipo === "recurrente";
    const proximoISO = calcularProximoISO(tarea, ahoraMs);

    setTareasPsicologo((prev) =>
      prev.map((item) =>
        item.id === tarea.id
          ? {
              ...item,
              completado: esRecurrente ? false : true,
              ultimaVezCompletadoISO: new Date(ahoraMs).toISOString(),
              proximoDisponibleISO: proximoISO,
              vecesCompletado: Number(item.vecesCompletado || 0) + 1,
            }
          : item,
      ),
    );
    setAhoraTick(ahoraMs);
  };

  useEffect(() => {
    cargarEstado();

    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const unsubscribe = escucharTareasDelPsicologo(uid, (nuevasTareas) => {
      setTareasPsicologo(nuevasTareas || []);
    });

    return () => {
      unsubscribe();
      Object.values(timersSalidaRef.current).forEach((t) => clearTimeout(t));
    };
  }, []);

  useEffect(() => {
    const intervalo = setInterval(() => {
      setAhoraTick(Date.now());
    }, 30000);
    return () => clearInterval(intervalo);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setAhoraTick(Date.now());
    }, []),
  );

  const ensureNotifPermission = async () => {
    if (!Device.isDevice) return false;

    const { status } = await Notifications.getPermissionsAsync();
    if (status === "granted") return true;

    const req = await Notifications.requestPermissionsAsync();
    return req.status === "granted";
  };

  const cancelTestReminders = async () => {
    const id1120 = await AsyncStorage.getItem(TEST_REMINDER_1120_KEY);
    const id1900 = await AsyncStorage.getItem(TEST_REMINDER_1900_KEY);

    if (id1120) {
      try {
        await Notifications.cancelScheduledNotificationAsync(id1120);
      } catch (e) {}
    }
    if (id1900) {
      try {
        await Notifications.cancelScheduledNotificationAsync(id1900);
      } catch (e) {}
    }

    await AsyncStorage.multiRemove([
      TEST_REMINDER_1120_KEY,
      TEST_REMINDER_1900_KEY,
      TEST_REMINDER_DATE_KEY,
    ]);
  };

  const scheduleTestRemindersIfNeeded = async (hechoHoy) => {
    if (hechoHoy) {
      await cancelTestReminders();
      return;
    }

    const ok = await ensureNotifPermission();
    if (!ok) return;

    const today = new Date().toISOString().slice(0, 10);
    const already = await AsyncStorage.getItem(TEST_REMINDER_DATE_KEY);

    if (already === today) return;

    const now = new Date();

    const makeDate = (h, m) => {
      const d = new Date();
      d.setHours(h, m, 0, 0);

      if (now > d) d.setSeconds(d.getSeconds() + 5);
      return d;
    };

    const date1120 = makeDate(5, 0);
    const date1900 = makeDate(19, 0);

    const id1120 = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Test diario disponible 💜",
        body: "No olvides responder tu test diario. Te tomará solo un minuto ✨",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: date1120,
      },
    });

    const id1900 = await Notifications.scheduleNotificationAsync({
      content: {
        title: "¿Ya hiciste tu test diario? 💭",
        body: "Aún estás a tiempo de registrar cómo te sentiste hoy 💜",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: date1900,
      },
    });

    await AsyncStorage.setItem(TEST_REMINDER_1120_KEY, id1120);
    await AsyncStorage.setItem(TEST_REMINDER_1900_KEY, id1900);
    await AsyncStorage.setItem(TEST_REMINDER_DATE_KEY, today);
  };

  const cargarEstado = async () => {
    try {
      const storedFechaTest = await AsyncStorage.getItem("ultimaFechaTest");
      const ahora = new Date();
      const hoyStr = ahora.toISOString().slice(0, 10);

      const hechoHoy = storedFechaTest === hoyStr;
      setTestRealizadoHoy(hechoHoy);

      await scheduleTestRemindersIfNeeded(hechoHoy);

      const hora = ahora.getHours();
      const yaEs1120 = hora >= 5;

      setPuedeHacerTestHoy(!hechoHoy && yaEs1120);

      const storedPers = await AsyncStorage.getItem("testPersonalidadHecho");
      if (storedPers === "SI") {
        setTestPersonalidadHecho(true);
      }
    } catch (e) {
      console.log("Cargando nuestro Checking:", e);
    }
  };

  const handleEmpezarEjercicio = async (item) => {
    if (item.esInfoAnsiedad) {
      navigation.navigate("PantallaRapida");
      return;
    }

    if (item.id === 1) {
      navigation.navigate("Respiracion");
      return;
    }

    if (item.id === 2) {
      navigation.navigate("Escaneo");
      return;
    }

    if (item.id === 3) {
      navigation.navigate("Sentidos");
      return;
    }
  };

  const handleTecnicaABCDE = () => {
    navigation.navigate("TecnicaABCDE");
  };

  const handleTestDiario = async () => {
    if (testRealizadoHoy || !puedeHacerTestHoy) {
      return;
    }

    try {
      const hoyStr = new Date().toISOString().slice(0, 10);
      await AsyncStorage.setItem("ultimaFechaTest", hoyStr);

      await cancelTestReminders();

      setTestRealizadoHoy(true);
      setPuedeHacerTestHoy(false);
      navigation.navigate("TestDiario");
    } catch (e) {
      console.log("Error guardando test diario:", e);
    }
  };

  const handleTestPersonalidad = async () => {
    try {
      const testYaHecho = await AsyncStorage.getItem("testPersonalidadHecho");

      if (testYaHecho === "SI" || testPersonalidadHecho) {
        setTestPersonalidadHecho(true);
        mostrarModal({
          tipo: "aviso",
          badge: "TEST COMPLETADO",
          titulo: "Ya completaste este test",
          mensaje:
            "Por el momento este test de personalidad ya fue respondido.",
        });
        return;
      }

      navigation.navigate("TestPersonalidad");
    } catch (error) {
      console.log("Error revisando test personalidad:", error);
    }
  };

  const cambiarValorPasoTarea = (tareaId, pasoIdx, valor) => {
    setRespuestasPorTarea((prev) => ({
      ...prev,
      [tareaId]: {
        ...(prev[tareaId] || {}),
        [pasoIdx]: valor,
      },
    }));
  };

  const programarDesaparicionEn4Segundos = (tarea, detalleRespuestasMap) => {
    const uid = auth.currentUser?.uid;

    setIdsEnTransicionSalida((prev) =>
      prev.includes(tarea.id) ? prev : [...prev, tarea.id],
    );

    if (uid) {
      completarEjercicioAsignado(
        uid,
        tarea.id,
        detalleRespuestasMap,
        tarea,
      ).catch((err) => {
        console.log("Error guardando ejecución:", err);
      });
    }

    if (timersSalidaRef.current[tarea.id]) {
      clearTimeout(timersSalidaRef.current[tarea.id]);
    }

    timersSalidaRef.current[tarea.id] = setTimeout(() => {
      marcarTareaLocalCompletada(tarea);
      setIdsEnTransicionSalida((prev) => prev.filter((id) => id !== tarea.id));
      delete timersSalidaRef.current[tarea.id];
    }, 4000);
  };

  const handleEnviarRespuestaPregunta = async (tarea) => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      mostrarModal({
        tipo: "aviso",
        badge: "SESIÓN REQUERIDA",
        titulo: "Inicia sesión para responder",
        mensaje: "Necesitas tener tu sesión activa para enviar tu respuesta.",
      });
      return;
    }

    const pasos =
      Array.isArray(tarea.pasos) && tarea.pasos.length > 0
        ? tarea.pasos
        : [{ tipo: "pregunta", label: tarea.descripcion || "Tu respuesta" }];

    const respuestasActuales = respuestasPorTarea[tarea.id] || {};
    const tieneAlMenosUnaRespuesta = pasos.some((paso, idx) => {
      if (paso.tipo === "instruccion") return true;
      const val = respuestasActuales[idx];
      return val !== undefined && String(val).trim() !== "";
    });

    if (!tieneAlMenosUnaRespuesta) {
      mostrarModal({
        tipo: "aviso",
        badge: "RESPUESTA PENDIENTE",
        titulo: "Completa tu respuesta",
        mensaje:
          "Escribe tu respuesta o selecciona un puntaje antes de enviarla.",
      });
      return;
    }

    try {
      setEnviandoTareaId(tarea.id);

      setRespuestasPorTarea((prev) => {
        const copia = { ...prev };
        delete copia[tarea.id];
        return copia;
      });

      programarDesaparicionEn4Segundos(tarea, respuestasActuales);

      mostrarModal({
        tipo: "exito",
        badge: "RESPUESTA ENVIADA",
        titulo: "¡Listo! Respuesta enviada",
        mensaje:
          "Tu respuesta quedó registrada para tu especialista y se actualizará en unos segundos.",
      });
    } finally {
      setEnviandoTareaId(null);
    }
  };

  const handleAbrirEjercicioAsignado = async (tarea) => {
    const destino = resolverRutaEjercicioAsignado(tarea);
    programarDesaparicionEn4Segundos(tarea, {
      0: `Ejercicio iniciado/realizado: ${tarea.titulo}`,
    });

    if (destino !== "EjercicioDinamico") {
      navigation.navigate(destino, { tarea });
    } else {
      mostrarModal({
        tipo: "exito",
        badge: "EJERCICIO INICIADO",
        titulo: "Ejercicio en curso",
        mensaje:
          "Realízalo con calma. Quedará registrado y saldrá de tus pendientes en unos segundos.",
      });
    }
  };

  const tareasDisponiblesAhora = tareasPsicologo.filter((tarea) => {
    const esRecurrente = tarea.frecuenciaTipo === "recurrente";
    const proximoMs = tarea.proximoDisponibleISO
      ? new Date(tarea.proximoDisponibleISO).getTime()
      : 0;

    if (esRecurrente) {
      if (proximoMs > ahoraTick) return false;
      return true;
    }

    return !Boolean(tarea.completado);
  });

  const visibleEjercicios = ejercicios;
  const canGoTestDiario = !testRealizadoHoy && puedeHacerTestHoy;
  const tieneHistorialEspecialista = tareasPsicologo.length > 0;
  const todoRespondidoPorHoy =
    tieneHistorialEspecialista &&
    tareasDisponiblesAhora.length === 0 &&
    idsEnTransicionSalida.length === 0;

  return (
    <LinearGradient
      colors={["#F8FAFC", "#F5F3FF", "#FDF2F8"]}
      style={styles.container}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
        >
          <View style={styles.navBar}>
            {[
              ["leaf-outline", "Calma"],
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
                {activeNav === i && (
                  <Text style={styles.navLabelActive}>{label}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.headerBlock}>
              <Text style={styles.headerPill}>MI ESPACIO DE BIENESTAR</Text>
              <Text style={styles.titulo}>Ejercicios del día</Text>
              <Text style={styles.subtitulo}>
                {tieneHistorialEspecialista
                  ? "Actividades y preguntas enviadas por tu especialista junto con tus tests"
                  : "Elige un ejercicio o recurso para acompañarte en este momento"}
              </Text>
            </View>

            {/* 1. TEST DIARIO */}
            <View style={styles.priorityCard}>
              <View style={styles.cardImageBox}>
                <Image
                  source={imagenTestDiario}
                  style={styles.cardImage}
                  resizeMode="cover"
                />
              </View>

              <Text style={styles.priorityTitle}>Test diario</Text>
              <Text style={styles.priorityText}>
                Una vez al día, tómate unos minutos para registrar cómo estás.
                Este espacio es solo para ti
              </Text>

              <TouchableOpacity
                style={[
                  styles.priorityButton,
                  (!canGoTestDiario || testRealizadoHoy) &&
                    styles.priorityButtonDone,
                ]}
                onPress={handleTestDiario}
                activeOpacity={canGoTestDiario ? 0.9 : 1}
              >
                <Text style={styles.priorityButtonText}>
                  {testRealizadoHoy
                    ? "Test realizado"
                    : !puedeHacerTestHoy
                      ? "Disponible a las 5:00 am"
                      : "Hacer test"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* 2. TEST PERSONALIDAD */}
            <View style={styles.priorityCard}>
              <View style={styles.cardImageBox}>
                <Image
                  source={imagenTestPersonalidad}
                  style={styles.cardImage}
                  resizeMode="cover"
                />
              </View>

              <Text style={styles.priorityTitle}>Descubre tu personalidad</Text>
              <Text style={styles.priorityText}>
                Un test para descubrir tu personalidad y explorar cómo actúa la
                ansiedad en ti.
              </Text>

              <TouchableOpacity
                style={[
                  styles.priorityButton,
                  testPersonalidadHecho && styles.priorityButtonDone,
                ]}
                onPress={handleTestPersonalidad}
                activeOpacity={testPersonalidadHecho ? 1 : 0.9}
              >
                <Text style={styles.priorityButtonText}>
                  {testPersonalidadHecho
                    ? "Test completado"
                    : "Hacer test de personalidad"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* ACTIVIDADES Y PREGUNTAS DEL ESPECIALISTA (EXCLUSIVO CUANDO EL ESPECIALISTA ENVÍA) */}
            {tieneHistorialEspecialista ? (
              <>
                <View style={styles.psicologoBanner}>
                  <View style={styles.psicologoBannerRow}>
                    <Ionicons name="medkit-outline" size={20} color="#4C1D95" />
                    <Text style={styles.psicologoBannerTitle}>
                      Enviado por tu especialista
                    </Text>
                  </View>
                  <Text style={styles.psicologoBannerSub}>
                    Completa o responde lo asignado según su frecuencia.
                  </Text>
                </View>

                {todoRespondidoPorHoy ? (
                  <View style={styles.doneForTodayCard}>
                    <Ionicons
                      name="checkmark-done-circle"
                      size={40}
                      color="#0F766E"
                    />
                    <Text style={styles.doneForTodayTitle}>
                      ¡Es todo por hoy!
                    </Text>
                    <Text style={styles.doneForTodayText}>
                      Ya respondiste o completaste lo pendiente por hoy. Vuelve
                      mañana para continuar con tu seguimiento.
                    </Text>
                  </View>
                ) : (
                  tareasDisponiblesAhora.map((tarea) => {
                    const esPregunta = tarea.categoriaEnvio === "pregunta";
                    const esRecurrente = tarea.frecuenciaTipo === "recurrente";
                    const imagenTarea = obtenerImagenTareaAsignada(tarea);
                    const enSalida = idsEnTransicionSalida.includes(tarea.id);

                    const pasos =
                      Array.isArray(tarea.pasos) && tarea.pasos.length > 0
                        ? tarea.pasos
                        : [
                            {
                              tipo: "pregunta",
                              label: tarea.descripcion || "",
                            },
                          ];

                    const respuestasActuales =
                      respuestasPorTarea[tarea.id] || {};

                    return (
                      <View
                        key={tarea.id}
                        style={[styles.card, enSalida && styles.cardSalida]}
                      >
                        <View style={styles.cardImageBox}>
                          <Image
                            source={imagenTarea}
                            style={styles.cardImage}
                            resizeMode="cover"
                          />
                        </View>

                        <View style={styles.tareaTopRow}>
                          <Text style={styles.tareaTipoTag}>
                            {esPregunta
                              ? "💬 ENVIADO POR TU ESPECIALISTA"
                              : `🩺 ${tarea.enfoque?.toUpperCase() || "EJERCICIO"}`}
                          </Text>
                          <Text
                            style={[
                              styles.tareaFreqBadge,
                              {
                                color: esRecurrente ? "#047857" : "#6D28D9",
                                backgroundColor: esRecurrente
                                  ? "#D1FAE5"
                                  : "#EDE9FE",
                              },
                            ]}
                          >
                            {tarea.frecuenciaLabel ||
                              (esRecurrente ? "Recurrente" : "Única vez")}
                          </Text>
                        </View>

                        <Text style={styles.cardTitulo}>{tarea.titulo}</Text>

                        {!esPregunta && tarea.descripcion ? (
                          <Text style={styles.cardDescripcion}>
                            {tarea.descripcion}
                          </Text>
                        ) : null}

                        {!esPregunta && (
                          <View style={styles.noticeBox}>
                            <Ionicons
                              name="time-outline"
                              size={16}
                              color="#5B21B6"
                            />
                            <Text style={styles.noticeBoxText}>
                              {obtenerTextoAvisoRecurrencia(tarea)}
                            </Text>
                          </View>
                        )}

                        {esPregunta ? (
                          <View style={styles.preguntaBox}>
                            {pasos.map((paso, idx) => {
                              const valActual = respuestasActuales[idx];
                              return (
                                <View key={idx} style={styles.pasoItemBox}>
                                  <Text style={styles.pasoLabelText}>
                                    {idx + 1}. {paso.label}
                                  </Text>

                                  {paso.tipo === "escala" ? (
                                    <View style={styles.escalaRow}>
                                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(
                                        (n) => {
                                          const sel = Number(valActual) === n;
                                          return (
                                            <TouchableOpacity
                                              key={n}
                                              disabled={enSalida}
                                              onPress={() =>
                                                cambiarValorPasoTarea(
                                                  tarea.id,
                                                  idx,
                                                  n,
                                                )
                                              }
                                              style={[
                                                styles.escalaChip,
                                                sel && styles.escalaChipActive,
                                              ]}
                                            >
                                              <Text
                                                style={[
                                                  styles.escalaChipText,
                                                  sel && { color: "#FFFFFF" },
                                                ]}
                                              >
                                                {n}
                                              </Text>
                                            </TouchableOpacity>
                                          );
                                        },
                                      )}
                                    </View>
                                  ) : paso.tipo === "instruccion" ? (
                                    <TouchableOpacity
                                      disabled={enSalida}
                                      onPress={() =>
                                        cambiarValorPasoTarea(
                                          tarea.id,
                                          idx,
                                          valActual === "Realizado ✓"
                                            ? ""
                                            : "Realizado ✓",
                                        )
                                      }
                                      style={[
                                        styles.checkInstruccionBtn,
                                        valActual === "Realizado ✓" &&
                                          styles.checkInstruccionBtnActive,
                                      ]}
                                    >
                                      <Text
                                        style={[
                                          styles.checkInstruccionText,
                                          valActual === "Realizado ✓" && {
                                            color: "#FFFFFF",
                                          },
                                        ]}
                                      >
                                        {valActual === "Realizado ✓"
                                          ? "Indicación marcada ✓"
                                          : "Marcar indicación como realizada"}
                                      </Text>
                                    </TouchableOpacity>
                                  ) : (
                                    <TextInput
                                      style={styles.respuestaInput}
                                      multiline
                                      editable={!enSalida}
                                      placeholder="Escribe tu respuesta aquí..."
                                      placeholderTextColor="#94A3B8"
                                      value={valActual ? String(valActual) : ""}
                                      onChangeText={(txt) =>
                                        cambiarValorPasoTarea(
                                          tarea.id,
                                          idx,
                                          txt,
                                        )
                                      }
                                    />
                                  )}
                                </View>
                              );
                            })}

                            <TouchableOpacity
                              style={[
                                styles.boton,
                                enSalida && styles.botonSalida,
                              ]}
                              disabled={
                                enSalida || enviandoTareaId === tarea.id
                              }
                              onPress={() =>
                                handleEnviarRespuestaPregunta(tarea)
                              }
                              activeOpacity={0.9}
                            >
                              <Text style={styles.botonTexto}>
                                {enSalida
                                  ? "Enviado • Retirando en unos segundos..."
                                  : enviandoTareaId === tarea.id
                                    ? "Enviando respuesta..."
                                    : "Enviar respuesta"}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={[
                              styles.boton,
                              enSalida && styles.botonSalida,
                            ]}
                            disabled={enSalida || enviandoTareaId === tarea.id}
                            onPress={() => handleAbrirEjercicioAsignado(tarea)}
                            activeOpacity={0.9}
                          >
                            <Text style={styles.botonTexto}>
                              {enSalida
                                ? "Iniciado • Desaparecerá en unos segundos..."
                                : enviandoTareaId === tarea.id
                                  ? "Preparando..."
                                  : "Hacer ejercicio"}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })
                )}
              </>
            ) : (
              <>
                <View style={styles.priorityCard}>
                  <View style={styles.cardImageBox}>
                    <Image
                      source={imagenTecnicaABCDE}
                      style={styles.cardImage}
                      resizeMode="cover"
                    />
                  </View>

                  <Text style={styles.priorityTitle}>
                    Técnica cognitiva ABCDE
                  </Text>
                  <Text style={styles.priorityText}>
                    Diagnostica tus pensamientos automáticos (A-B-C), debátelos
                    (D-E) y obtén tu interpretación clínica.
                  </Text>

                  <TouchableOpacity
                    style={styles.priorityButton}
                    onPress={handleTecnicaABCDE}
                    activeOpacity={0.9}
                  >
                    <Text style={styles.priorityButtonText}>
                      Empezar técnica ABCDE
                    </Text>
                  </TouchableOpacity>
                </View>

                {visibleEjercicios.map((item) => (
                  <View key={item.id} style={styles.card}>
                    <View style={styles.cardImageBox}>
                      <Image
                        source={imagenesEjercicios[item.id]}
                        style={styles.cardImage}
                        resizeMode="cover"
                      />
                    </View>

                    <Text style={styles.cardTitulo}>{item.titulo}</Text>
                    <Text style={styles.cardDescripcion}>
                      {item.descripcion}
                    </Text>
                    <Text style={styles.cardDuracion}>
                      Duración: {item.duracion}
                    </Text>

                    <TouchableOpacity
                      style={styles.boton}
                      onPress={() => handleEmpezarEjercicio(item)}
                      activeOpacity={0.9}
                    >
                      <Text style={styles.botonTexto}>
                        {item.esInfoAnsiedad
                          ? "Leer sobre la ansiedad"
                          : "Empezar ejercicio"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}
          </ScrollView>

          <Modal
            visible={modalAviso.visible}
            transparent
            animationType="fade"
            onRequestClose={cerrarModal}
          >
            <View style={styles.modalBackdrop}>
              <View style={styles.modalCard}>
                <View
                  style={[
                    styles.modalBadge,
                    modalAviso.tipo === "exito"
                      ? { backgroundColor: "#D1FAE5" }
                      : { backgroundColor: "#EDE9FE" },
                  ]}
                >
                  <Ionicons
                    name={
                      modalAviso.tipo === "exito"
                        ? "checkmark-circle"
                        : "sparkles"
                    }
                    size={16}
                    color={modalAviso.tipo === "exito" ? "#047857" : "#5B21B6"}
                  />
                  <Text
                    style={[
                      styles.modalBadgeText,
                      modalAviso.tipo === "exito"
                        ? { color: "#047857" }
                        : { color: "#5B21B6" },
                    ]}
                  >
                    {modalAviso.badge}
                  </Text>
                </View>

                <Text style={styles.modalTitle}>{modalAviso.titulo}</Text>
                <Text style={styles.modalMessage}>{modalAviso.mensaje}</Text>

                <TouchableOpacity
                  style={styles.modalBtn}
                  onPress={cerrarModal}
                  activeOpacity={0.9}
                >
                  <Text style={styles.modalBtnText}>Entendido</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  navBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EDE9FE",
    elevation: 4,
  },

  navItem: {
    alignItems: "center",
    width: SCREEN_WIDTH * 0.22,
  },

  navLabelActive: {
    color: "#7C3AED",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "700",
  },

  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
  },

  scrollContent: {
    paddingBottom: 140,
  },

  headerBlock: {
    alignItems: "center",
    marginBottom: 16,
  },
  headerPill: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#6D28D9",
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    letterSpacing: 0.6,
    marginBottom: 6,
  },

  cardImageBox: {
    width: "100%",
    height: 128,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#EDE9FE",
    marginBottom: 12,
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },

  priorityCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#DDD6FE",
    elevation: 2,
  },
  priorityTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#4C1D95",
    marginBottom: 6,
  },
  priorityText: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
    marginBottom: 12,
  },
  priorityButton: {
    backgroundColor: "#7C3AED",
    paddingVertical: 11,
    borderRadius: 24,
    alignItems: "center",
  },
  priorityButtonDone: {
    backgroundColor: "#9CA3AF",
  },
  priorityButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },

  psicologoBanner: {
    backgroundColor: "#EDE9FE",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#C4B5FD",
  },
  psicologoBannerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  psicologoBannerTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#4C1D95",
  },
  psicologoBannerSub: {
    fontSize: 12,
    color: "#5B21B6",
    marginTop: 3,
    lineHeight: 17,
  },

  noticeBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#F5F3FF",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#DDD6FE",
  },
  noticeBoxText: {
    flex: 1,
    fontSize: 12,
    color: "#4C1D95",
    lineHeight: 17,
    fontWeight: "600",
  },

  doneForTodayCard: {
    backgroundColor: "#ECFDF5",
    borderRadius: 20,
    padding: 22,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: "#6EE7B7",
    alignItems: "center",
    gap: 6,
  },
  doneForTodayTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#065F46",
  },
  doneForTodayText: {
    fontSize: 13.5,
    color: "#047857",
    textAlign: "center",
    lineHeight: 19,
  },

  tareaTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  tareaTipoTag: {
    fontSize: 11,
    fontWeight: "800",
    color: "#7C3AED",
    flex: 1,
  },
  tareaFreqBadge: {
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },

  preguntaBox: {
    marginTop: 6,
    gap: 10,
  },
  pasoItemBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E5D2FF",
  },
  pasoLabelText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
  },
  respuestaInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
    borderRadius: 10,
    padding: 10,
    minHeight: 62,
    fontSize: 13.5,
    color: "#1E293B",
    textAlignVertical: "top",
  },
  escalaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  escalaChip: {
    width: 30,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  escalaChipActive: {
    backgroundColor: "#6D28D9",
  },
  escalaChipText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#4C1D95",
  },
  checkInstruccionBtn: {
    backgroundColor: "#F3E8FF",
    borderWidth: 1,
    borderColor: "#C4B5FD",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  checkInstruccionBtnActive: {
    backgroundColor: "#0F766E",
    borderColor: "#0F766E",
  },
  checkInstruccionText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#4C1D95",
  },

  titulo: {
    fontSize: 23,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 4,
    color: "#3F3B7A",
  },
  subtitulo: {
    fontSize: 13.5,
    textAlign: "center",
    color: "#475569",
    lineHeight: 19,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    borderWidth: 1.5,
    borderColor: "#C4B5FD",
  },
  cardSalida: {
    opacity: 0.75,
    borderColor: "#A7F3D0",
  },
  cardTitulo: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
    color: "#1E293B",
  },
  cardDescripcion: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 19,
    marginBottom: 10,
  },
  cardDuracion: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 12,
  },
  boton: {
    backgroundColor: "#6D28D9",
    paddingVertical: 11,
    borderRadius: 24,
    alignItems: "center",
    marginTop: 4,
  },
  botonSalida: {
    backgroundColor: "#0F766E",
  },
  botonTexto: {
    color: "white",
    fontWeight: "800",
    fontSize: 14,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DDD6FE",
  },
  modalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  modalBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#1E293B",
    marginTop: 10,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 13,
    color: "#475569",
    textAlign: "center",
    lineHeight: 19,
    marginTop: 6,
  },
  modalBtn: {
    width: "100%",
    backgroundColor: "#7C3AED",
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
    marginTop: 16,
  },
  modalBtnText: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "800",
  },
});
