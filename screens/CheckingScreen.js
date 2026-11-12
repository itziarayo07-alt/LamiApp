import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { auth } from "../config/firebaseConfig";
import { escucharTareasDelPsicologo } from "../services/lamiSyncService";

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
    titulo: "Técnica cognitiva ABCDE",
    descripcion:
      "Diagnostica tus pensamientos automáticos (A-B-C), debátelos (D-E) y obtén tu interpretación clínica.",
    duracion: "5 - 8 minutos",
  },
  {
    id: 5,
    titulo: "Autoabrazo consciente",
    descripcion:
      "Cruza los brazos y abrázate. Inhala y exhala lento mientras repites: 'Estoy aquí conmigo'.",
    duracion: "2 - 4 minutos",
  },
];

const imagenTestDiario = require("../assets/emociones.jpg");
const imagenTestPersonalidad = require("../assets/personalidad.jpg");
const imagenInfoAnsiedad = require("../assets/ansiedad.jpg");

const imagenesEjercicios = {
  1: require("../assets/respracion.gif"), // Respiración 4-7-8
  2: require("../assets/corporal.png"), // Escaneo corporal
  3: require("../assets/sentidos.jpg"), // Anclaje con los sentidos
  4: require("../assets/ilustrar.jpg"), // Técnica cognitiva ABCDE
  5: require("../assets/autoabrazo.jpg"), // Autoabrazo consciente
};

export default function CheckingScreen({ navigation }) {
  const [ejercicios] = useState(ejerciciosIniciales);
  const [activeNav, setActiveNav] = useState(2); // 0=Anxiosímetro, 1=Calendario, 2=Checking, 3=Perfil

  const [hiddenMap, setHiddenMap] = useState({}); // { [id]: hiddenUntilISO }
  const [testRealizadoHoy, setTestRealizadoHoy] = useState(false);
  const [testPersonalidadHecho, setTestPersonalidadHecho] = useState(false);
  const [resultadoPersonalidad, setResultadoPersonalidad] = useState(null);

  // controla si hoy ya se puede hacer el test (después de las 5:00)
  const [puedeHacerTestHoy, setPuedeHacerTestHoy] = useState(false);
  const [tareasPsicologo, setTareasPsicologo] = useState([]);
  useEffect(() => {
    cargarEstado();

    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const unsubscribe = escucharTareasDelPsicologo(uid, (nuevasTareas) => {
      setTareasPsicologo(nuevasTareas);
    });

    return () => unsubscribe();
  }, []);

  const ensureNotifPermission = async () => {
    // En emulador a veces no funcionan bien debemos probar en apk niñasss
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
    // Si ya lo hizo hoy, cancelamos cualquier recordatorio pendiente.
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

    // CAMBIO: 11:20 -> 5:00 AM
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
      // Para ocultar ejercicios conforme se hayan realizado
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
            JSON.stringify(cleaned)
          );
        }
      }

      // Test diario - una vez por día y solo después de las 5:00 am
      const storedFechaTest = await AsyncStorage.getItem("ultimaFechaTest");
      const ahora = new Date();
      const hoyStr = ahora.toISOString().slice(0, 10); // YYYY-MM-DD

      // ¿ya se hizo el test hoy?
      const hechoHoy = storedFechaTest === hoyStr;
      setTestRealizadoHoy(hechoHoy);

      //programar notis del test (5:00 y 19:00) si no lo ha hecho hoy
      await scheduleTestRemindersIfNeeded(hechoHoy);

      // CAMBIO NIÑASSS--- ¿ya pasaron las 5:00 am? se desbloquea el test
      const hora = ahora.getHours(); // 0-23
      const minutos = ahora.getMinutes(); // 0-59
      const yaEs1120 = hora >= 5;

      // puedes hacer el test SOLO si:
      // - todavía no lo hiciste hoy
      // - y ya pasaron las 5:00
      setPuedeHacerTestHoy(!hechoHoy && yaEs1120);

      // Test personalidad, una vez
      const storedPers = await AsyncStorage.getItem("testPersonalidadHecho");
      if (storedPers === "SI") {
        setTestPersonalidadHecho(true);
      }

      // Leer resultado del test de personalidad (si existe)
      const storedResultado = await AsyncStorage.getItem(
        "testPersonalidadResultado_v1"
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

    // Temporalmente desactivado el bloqueo de 2 horas para pruebas
    /*
    const now = new Date();
    const hiddenUntil = new Date(
      now.getTime() + 2 * 60 * 60 * 1000
    ).toISOString(); // +2 horas

    try {
      const data = await AsyncStorage.getItem("checkingHiddenEjercicios");
      let map = data ? JSON.parse(data) : {};
      map[item.id] = hiddenUntil;

      await AsyncStorage.setItem(
        "checkingHiddenEjercicios",
        JSON.stringify(map)
      );

      setHiddenMap(map);
    } catch (e) {
      console.log("Error ocultando ejercicio:", e);
    }
    */

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

    if (item.id === 4) {
      navigation.navigate("TecnicaABCDE");
      return;
    }

    if (item.id === 5) {
      navigation.navigate("Autoabrazo");
      return;
    }
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

  // TEST PERSONALIDAD ------------------------------------------------chanchan
  const handleTestPersonalidad = async () => {
    try {
      const testYaHecho = await AsyncStorage.getItem("testPersonalidadHecho");

      if (testYaHecho === "SI" || testPersonalidadHecho) {
        setTestPersonalidadHecho(true);
        alert("Ya completaste este test 💜");
        return;
      }

      navigation.navigate("TestPersonalidad");
    } catch (error) {
      console.log("Error revisando test personalidad:", error);
    }
  };

  const handleLeerAnsiedad = () => {
    navigation.navigate("PantallaRapida");
  };

  // Mostramos todos los ejercicios sin filtrar durante las pruebas
  const visibleEjercicios = ejercicios;

  const canGoTestDiario = !testRealizadoHoy && puedeHacerTestHoy;

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/*Barra de navegacion*/}
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
            Elige un ejercicio o recurso para acompañarte en este momento 💫
          </Text>

          {/* PRIORIDAD: TEST DIARIO */}
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
              Una vez al día, tómate unos minutos para registrar cómo estás. Este
              espacio es solo para ti 💜
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

          {/* SEGUNDO TEST: PERSONALIDAD */}
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

          {/* INFO: LEER SOBRE LA ANSIEDAD */}
          <View style={styles.priorityCard}>
            <View style={styles.cardImageBox}>
              <Image
                source={imagenInfoAnsiedad}
                style={styles.cardImage}
                resizeMode="cover"
              />
            </View>

            <Text style={styles.priorityTitle}>
              Descubre cómo se da la ansiedad
            </Text>
            <Text style={styles.priorityText}>
              Un espacio para leer, entender qué es la ansiedad y por qué tu
              cuerpo reacciona como lo hace. Conocerla también es una forma de
              cuidarte.
            </Text>

            <TouchableOpacity
              style={styles.priorityButton}
              onPress={handleLeerAnsiedad}
              activeOpacity={0.9}
            >
              <Text style={styles.priorityButtonText}>
                Leer sobre la ansiedad
              </Text>
            </TouchableOpacity>
          </View>

          {/* LISTA DE EJERCICIOS */}
          {/* 👇 PEGA ESTE BLOQUE AQUÍ (ANTES DE LISTA DE EJERCICIOS) */}
          {tareasPsicologo
            .filter((t) => !t.completado)
            .map((tarea) => (
              <View
                key={tarea.id}
                style={[styles.card, { borderColor: "#7C3AED", borderWidth: 2 }]}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: "#7C3AED",
                    marginBottom: 4,
                  }}
                >
                  🩺 ASIGNADO POR TU PSICÓLOGO •{" "}
                  {tarea.enfoque?.toUpperCase() || "TERAPIA"}
                </Text>
                <Text style={styles.cardTitulo}>{tarea.titulo}</Text>
                <Text style={styles.cardDescripcion}>{tarea.descripcion}</Text>
                <Text style={styles.cardDuracion}>
                  Duración: {tarea.duracion || "5 min"}
                </Text>

                <TouchableOpacity
                  style={styles.boton}
                  onPress={() =>
                    navigation.navigate("EjercicioDinamico", { tarea })
                  }
                >
                  <Text style={styles.botonTexto}>
                    Realizar ejercicio asignado
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
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
                <Text style={styles.botonTexto}>Empezar ejercicio</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
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

  resultadoBox: {
    marginBottom: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#F3E8FF",
    borderWidth: 1,
    borderColor: "#D8B4FE",
  },
  resultadoLabel: {
    fontSize: 12,
    color: "#6B21A8",
    fontWeight: "700",
    marginBottom: 4,
  },
  resultadoTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#4C1D95",
    marginBottom: 4,
  },
  resultadoScore: {
    fontSize: 12,
    color: "#6B21A8",
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
    marginBottom: 8,
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
  },
  botonTexto: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
});
