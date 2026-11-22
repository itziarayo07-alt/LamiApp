import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import {
  Dimensions,
  Image,
  Modal,
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
const imagenPreguntaDefault = require("../assets/ansiedad.jpg");

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

  return "otro";
}

function obtenerImagenTareaAsignada(tarea) {
  const clave = identificarClaveEjercicio(tarea);
  if (clave === "abcde") return imagenTecnicaABCDE;
  if (clave === "respiracion") return imagenesEjercicios[1];
  if (clave === "escaneo") return imagenesEjercicios[2];
  if (clave === "sentidos") return imagenesEjercicios[3];
  if (tarea?.categoriaEnvio === "pregunta") return imagenPreguntaDefault;
  return imagenTecnicaABCDE;
}

function resolverRutaEjercicioAsignado(tarea) {
  const clave = identificarClaveEjercicio(tarea);
  if (clave === "abcde") return "TecnicaABCDE";
  if (clave === "respiracion") return "Respiracion";
  if (clave === "escaneo") return "Escaneo";
  if (clave === "sentidos") return "Sentidos";
  return "EjercicioDinamico";
}

export default function CheckingScreen({ navigation }) {
  const [ejercicios] = useState(ejerciciosIniciales);
  const [activeNav, setActiveNav] = useState(2); // 0=Calma, 1=Calendario, 2=Checking, 3=Perfil

  const [hiddenMap, setHiddenMap] = useState({}); // { [id]: hiddenUntilISO }
  const [testRealizadoHoy, setTestRealizadoHoy] = useState(false);
  const [testPersonalidadHecho, setTestPersonalidadHecho] = useState(false);
  const [resultadoPersonalidad, setResultadoPersonalidad] = useState(null);

  // controla si hoy ya se puede hacer el test (después de las 5:00)
  const [puedeHacerTestHoy, setPuedeHacerTestHoy] = useState(false);
  const [tareasPsicologo, setTareasPsicologo] = useState([]);
  const [ahoraTick, setAhoraTick] = useState(Date.now());

  // Ejercicio asignado que el paciente acaba de abrir para hacer
  const [ejercicioEnCurso, setEjercicioEnCurso] = useState(null);

  // Respuestas en línea para envíos tipo pregunta / escala / indicación
  const [respuestasPorTarea, setRespuestasPorTarea] = useState({});
  const [enviandoTareaId, setEnviandoTareaId] = useState(null);

  // Modal con diseño propio (reemplaza cualquier alerta por default)
  const [modalAviso, setModalAviso] = useState({
    visible: false,
    tipo: "exito", // "exito" | "aviso"
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

  useEffect(() => {
    cargarEstado();

    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const unsubscribe = escucharTareasDelPsicologo(uid, (nuevasTareas) => {
      setTareasPsicologo(nuevasTareas || []);
    });

    return () => unsubscribe();
  }, []);

  // Revisa periódicamente si ya venció el tiempo de espera de alguna actividad recurrente
  useEffect(() => {
    const intervalo = setInterval(() => {
      setAhoraTick(Date.now());
    }, 30000);
    return () => clearInterval(intervalo);
  }, []);

  // Al regresar de realizar un ejercicio asignado, registra su ejecución para aplicar recurrencia o desaparición
  useFocusEffect(
    useCallback(() => {
      setAhoraTick(Date.now());
      const uid = auth.currentUser?.uid;
      if (ejercicioEnCurso && uid) {
        const tareaCompletada = ejercicioEnCurso;
        setEjercicioEnCurso(null);
        completarEjercicioAsignado(
          uid,
          tareaCompletada.id,
          { 0: `Ejercicio completado: ${tareaCompletada.titulo}` },
          tareaCompletada,
        ).catch((err) => {
          console.log("Error al registrar ejercicio completado:", err);
        });
      }
    }, [ejercicioEnCurso]),
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
      const data = await AsyncStorage.getItem("checkingHiddenEjercicios");
      if (data) {
        const parsed = JSON.parse(data);
        const now = new Date();
        const cleaned = {};

        Object.keys(parsed).forEach((id) => {
          const fecha = new Date(parsed[id]);
          if (fecha > now) {
            cleaned[id] = parsed[id];
          }
        });

        setHiddenMap(cleaned);

        if (Object.keys(cleaned).length !== Object.keys(parsed).length) {
          await AsyncStorage.setItem(
            "checkingHiddenEjercicios",
            JSON.stringify(cleaned),
          );
        }
      }

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

      const storedResultado = await AsyncStorage.getItem(
        "testPersonalidadResultado_v1",
      );
      if (storedResultado) {
        setResultadoPersonalidad(JSON.parse(storedResultado));
      }
    } catch (e) {
      console.log("Cargando nuestro Checking:", e);
    }
  };

  const handleEmpezarEjercicio = async (item) => {
    console.log("Ejercicio seleccionado:", item.titulo);

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
      await completarEjercicioAsignado(
        uid,
        tarea.id,
        respuestasActuales,
        tarea,
      );

      setRespuestasPorTarea((prev) => {
        const copia = { ...prev };
        delete copia[tarea.id];
        return copia;
      });
      setAhoraTick(Date.now());

      mostrarModal({
        tipo: "exito",
        badge: "RESPUESTA ENVIADA",
        titulo: "¡Listo! Respuesta enviada",
        mensaje: "Tu especialista ya puede ver tu respuesta en su panel.",
      });
    } catch (e) {
      console.log("Error enviando respuesta de pregunta:", e);
      mostrarModal({
        tipo: "aviso",
        badge: "ERROR DE ENVÍO",
        titulo: "No se pudo enviar tu respuesta",
        mensaje: "Intenta de nuevo en unos momentos.",
      });
    } finally {
      setEnviandoTareaId(null);
    }
  };

  const handleAbrirEjercicioAsignado = async (tarea) => {
    const uid = auth.currentUser?.uid;
    const destino = resolverRutaEjercicioAsignado(tarea);

    if (destino === "EjercicioDinamico") {
      if (!uid) return;
      try {
        setEnviandoTareaId(tarea.id);
        await completarEjercicioAsignado(
          uid,
          tarea.id,
          { 0: `Ejercicio completado: ${tarea.titulo}` },
          tarea,
        );
        setAhoraTick(Date.now());
        mostrarModal({
          tipo: "exito",
          badge: "EJERCICIO COMPLETADO",
          titulo: "¡Ejercicio registrado!",
          mensaje: "Quedó registrado en el panel de tu especialista.",
        });
      } catch (e) {
        console.log("Error registrando ejercicio dinámico:", e);
      } finally {
        setEnviandoTareaId(null);
      }
      return;
    }

    setEjercicioEnCurso(tarea);
    navigation.navigate(destino, { tarea });
  };

  // Filtra tareas: si ya se completó una de única vez desaparece; si es recurrente desaparece hasta que llegue su próxima hora
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
    tieneHistorialEspecialista && tareasDisponiblesAhora.length === 0;

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Barra de navegación */}
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

        {/* SCROLLEABLE */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* TITULO PRINCIPAL */}
          <Text style={styles.titulo}>Ejercicios del día</Text>
          <Text style={styles.subtitulo}>
            {tieneHistorialEspecialista
              ? "Actividades y preguntas enviadas por tu especialista junto con tus tests"
              : "Elige un ejercicio o recurso para acompañarte en este momento"}
          </Text>

          {/* 1. TEST DIARIO (SIEMPRE VISIBLE) */}
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

          {/* 2. TEST PERSONALIDAD (SIEMPRE VISIBLE) */}
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

          {/* SI EL ESPECIALISTA HA ASIGNADO ACTIVIDADES, SE OCULTAN LOS EJERCICIOS POR DEFECTO */}
          {tieneHistorialEspecialista ? (
            <>
              <View style={styles.psicologoBanner}>
                <Text style={styles.psicologoBannerTitle}>
                  🩺 Enviado por tu especialista
                </Text>
                <Text style={styles.psicologoBannerSub}>
                  Completa o responde lo asignado según su frecuencia.
                </Text>
              </View>

              {todoRespondidoPorHoy ? (
                <View style={styles.doneForTodayCard}>
                  <Ionicons
                    name="checkmark-done-circle"
                    size={36}
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

                  const pasos =
                    Array.isArray(tarea.pasos) && tarea.pasos.length > 0
                      ? tarea.pasos
                      : [{ tipo: "pregunta", label: tarea.descripcion || "" }];

                  const respuestasActuales = respuestasPorTarea[tarea.id] || {};

                  return (
                    <View
                      key={tarea.id}
                      style={[
                        styles.card,
                        {
                          borderColor: "#7C3AED",
                          borderWidth: 2,
                        },
                      ]}
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
                      <Text style={styles.cardDescripcion}>
                        {tarea.descripcion}
                      </Text>

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
                                    placeholder="Escribe tu respuesta aquí..."
                                    placeholderTextColor="#94A3B8"
                                    value={valActual ? String(valActual) : ""}
                                    onChangeText={(txt) =>
                                      cambiarValorPasoTarea(tarea.id, idx, txt)
                                    }
                                  />
                                )}
                              </View>
                            );
                          })}

                          <TouchableOpacity
                            style={styles.boton}
                            disabled={enviandoTareaId === tarea.id}
                            onPress={() => handleEnviarRespuestaPregunta(tarea)}
                            activeOpacity={0.9}
                          >
                            <Text style={styles.botonTexto}>
                              {enviandoTareaId === tarea.id
                                ? "Enviando respuesta..."
                                : "Enviar respuesta"}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.boton}
                          disabled={enviandoTareaId === tarea.id}
                          onPress={() => handleAbrirEjercicioAsignado(tarea)}
                          activeOpacity={0.9}
                        >
                          <Text style={styles.botonTexto}>
                            {enviandoTareaId === tarea.id
                              ? "Registrando..."
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
              {/* ACTIVIDADES POR DEFECTO (CUANDO NO HAY ENVÍOS DEL ESPECIALISTA) */}
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
                  <Text style={styles.cardDescripcion}>{item.descripcion}</Text>
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

        {/* MODAL CON DISEÑO PROPIO PARA CONFIRMACIONES Y NOTAS */}
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
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  navBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "white",
    paddingVertical: 10,
    elevation: 5,
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
    paddingTop: 16,
  },

  scrollContent: {
    paddingBottom: 24,
  },

  cardImageBox: {
    width: "100%",
    height: 120,
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
    backgroundColor: "#F7EAFE",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#C4B5FD",
  },
  priorityTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4C1D95",
    marginBottom: 6,
  },
  priorityText: {
    fontSize: 13,
    color: "#4B5563",
    marginBottom: 12,
  },
  priorityButton: {
    backgroundColor: "#7C3AED",
    paddingVertical: 10,
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
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#C4B5FD",
  },
  psicologoBannerTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#4C1D95",
  },
  psicologoBannerSub: {
    fontSize: 12,
    color: "#5B21B6",
    marginTop: 2,
  },

  doneForTodayCard: {
    backgroundColor: "#ECFDF5",
    borderRadius: 18,
    padding: 20,
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
    backgroundColor: "#FFFFFF",
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
    backgroundColor: "#F8FAFC",
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
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 4,
    color: "#5633A9",
  },
  subtitulo: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
    color: "#555",
  },

  card: {
    backgroundColor: "#F7EAFE",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#E5D2FF",
  },
  cardTitulo: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 6,
    color: "#333",
  },
  cardDescripcion: {
    fontSize: 14,
    color: "#555",
    marginBottom: 8,
  },
  cardDuracion: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 12,
  },
  boton: {
    backgroundColor: "#6D28D9",
    paddingVertical: 10,
    borderRadius: 22,
    alignItems: "center",
    marginTop: 4,
  },
  botonTexto: {
    color: "white",
    fontWeight: "bold",
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
