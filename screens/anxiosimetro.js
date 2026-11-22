import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import * as Notifications from "expo-notifications";
import { getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  AppState,
  Easing,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../config/firebaseConfig";
import { notificarAlertaAlEspecialista } from "../services/lamiSyncService";

const auth = getAuth();
const CONGRATS_IDS_KEY = "@congrats_notif_ids";
const INICIO_STORAGE_KEY = "inicioAnsiedad";
const LAMI_IMAGEN = require("../assets/lami_1.png");
const TRES_MINUTOS_MS = 3 * 60 * 1000;
const ACCIONES_LAMI = ["saludar", "saltar", "sonreir"];

const COLORES_BARRAS = [
  ["#A78BFA", "días"],
  ["#38BDF8", "horas"],
  ["#34D399", "minutos"],
  ["#F472B6", "segundos"],
];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function LamiEnMovimiento({
  size = 175,
  accionActual = "saludar",
  onPressLami,
}) {
  const flotarY = useRef(new Animated.Value(0)).current;
  const gestoRot = useRef(new Animated.Value(0)).current;
  const gestoSaltoY = useRef(new Animated.Value(0)).current;
  const gestoEscala = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loopFlotar = Animated.loop(
      Animated.sequence([
        Animated.timing(flotarY, {
          toValue: -5,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(flotarY, {
          toValue: 3,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    loopFlotar.start();
    return () => loopFlotar.stop();
  }, [flotarY]);

  useEffect(() => {
    gestoRot.stopAnimation();
    gestoSaltoY.stopAnimation();
    gestoEscala.stopAnimation();

    gestoRot.setValue(0);
    gestoSaltoY.setValue(0);
    gestoEscala.setValue(1);

    if (accionActual === "saludar") {
      Animated.sequence([
        Animated.timing(gestoRot, {
          toValue: -1,
          duration: 220,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(gestoRot, {
          toValue: 1,
          duration: 240,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(gestoRot, {
          toValue: -0.6,
          duration: 200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(gestoRot, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    } else if (accionActual === "saltar") {
      Animated.sequence([
        Animated.timing(gestoSaltoY, {
          toValue: -18,
          duration: 240,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(gestoSaltoY, {
          toValue: 0,
          duration: 240,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(gestoSaltoY, {
          toValue: -10,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(gestoSaltoY, {
          toValue: 0,
          duration: 180,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    } else if (accionActual === "sonreir") {
      Animated.sequence([
        Animated.timing(gestoEscala, {
          toValue: 1.09,
          duration: 280,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(gestoEscala, {
          toValue: 0.98,
          duration: 200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(gestoEscala, {
          toValue: 1,
          duration: 240,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [accionActual, gestoEscala, gestoRot, gestoSaltoY]);

  const rotacionDeg = gestoRot.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ["-9deg", "0deg", "9deg"],
  });

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPressLami}
      style={styles.lamiTouchArea}
    >
      <Animated.View
        style={{
          transform: [
            { translateY: Animated.add(flotarY, gestoSaltoY) },
            { scale: gestoEscala },
            { rotate: rotacionDeg },
          ],
        }}
      >
        <Image
          source={LAMI_IMAGEN}
          style={[styles.image, { width: size, height: size }]}
          resizeMode="contain"
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function Anxiosimetro({ navigation, route }) {
  const { width: SCREEN_WIDTH } = useWindowDimensions();

  const clamp = (n, min, max) => Math.max(min, Math.min(n, max));

  const NAV_ITEM_W = SCREEN_WIDTH * 0.22;
  const CARD_W = Math.min(SCREEN_WIDTH - 40, 430);
  const IMAGE_SIZE = clamp(SCREEN_WIDTH * 0.45, 150, 185);
  const BAR_H = clamp(SCREEN_WIDTH * 0.13, 50, 58);
  const BAR_TRIANGLE_H = BAR_H;

  const [tiempo, setTiempo] = useState({
    dias: 0,
    horas: 0,
    minutos: 0,
    segundos: 0,
  });

  const [activeNav, setActiveNav] = useState(0);
  const [monitorActivo, setMonitorActivo] = useState(false);
  const [fraseIndex, setFraseIndex] = useState(0);
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [accionIndex, setAccionIndex] = useState(0);

  const frases = [
    "Este proceso es valioso; cada paso cuenta.",
    "Respira y reconoce lo que has logrado hoy.",
    "Pequeños avances construyen grandes cambios.",
    "Tu bienestar importa; cuida de ti mismo/a.",
    "Un minuto a la vez: estás avanzando.",
    "Permítete sentir y seguir adelante con calma.",
    "Celebra las pequeñas victorias del día.",
    "La constancia hoy crea resiliencia mañana.",
    "Tu tiempo de avance es válido y real.",
    "Sigue cuidándote con paciencia y respeto.",
  ];

  const animSec = useRef(new Animated.Value(0)).current;
  const animMin = useRef(new Animated.Value(0)).current;
  const animHor = useRef(new Animated.Value(0)).current;
  const animDia = useRef(new Animated.Value(0)).current;

  const intervalRef = useRef(null);
  const inicioActivoRef = useRef(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const animarBarras = useCallback(
    (t) => {
      const secPct = (t.segundos % 60) / 59;
      const minPct = (t.minutos % 60) / 59;
      const horPct = (t.horas % 24) / 23;
      const diaPct = Math.min((t.dias % 365) / 365, 1);

      Animated.parallel([
        Animated.timing(animSec, {
          toValue: secPct,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(animMin, {
          toValue: minPct,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(animHor, {
          toValue: horPct,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(animDia, {
          toValue: diaPct,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start();
    },
    [animDia, animHor, animMin, animSec],
  );

  const actualizarDesdeFecha = useCallback(
    (fechaInicioISO) => {
      if (!fechaInicioISO) return;
      const inicioMs = new Date(fechaInicioISO).getTime();
      if (Number.isNaN(inicioMs)) return;

      const diff = Math.max(0, Date.now() - inicioMs);

      const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
      const horas = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutos = Math.floor((diff / (1000 * 60)) % 60);
      const segundos = Math.floor((diff / 1000) % 60);

      const nuevo = { dias, horas, minutos, segundos };
      setTiempo(nuevo);
      animarBarras(nuevo);

      if (segundos % 15 === 0) {
        setFraseIndex((i) => (i + 1) % frases.length);
      }
    },
    [animarBarras, frases.length],
  );

  const iniciarIntervaloContinuo = useCallback(
    (fechaInicioISO) => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      inicioActivoRef.current = fechaInicioISO;
      setMonitorActivo(true);
      actualizarDesdeFecha(fechaInicioISO);

      intervalRef.current = setInterval(() => {
        if (inicioActivoRef.current) {
          actualizarDesdeFecha(inicioActivoRef.current);
        }
      }, 1000);
    },
    [actualizarDesdeFecha],
  );

  // ---------- NOTIFICACIONES (limpieza segura y programación controlada) ----------
  const ensureNotifPermission = async () => {
    try {
      const { status: existing } = await Notifications.getPermissionsAsync();
      if (existing === "granted") return true;

      const { status } = await Notifications.requestPermissionsAsync();
      return status === "granted";
    } catch {
      return false;
    }
  };

  const cancelCongratsScheduled = async () => {
    try {
      const raw = await AsyncStorage.getItem(CONGRATS_IDS_KEY);
      const ids = raw ? JSON.parse(raw) : [];

      for (let i = 0; i < ids.length; i++) {
        try {
          await Notifications.cancelScheduledNotificationAsync(ids[i]);
        } catch {}
      }

      try {
        await Notifications.cancelAllScheduledNotificationsAsync();
      } catch {}

      await AsyncStorage.removeItem(CONGRATS_IDS_KEY);
    } catch (e) {
      console.log("Error cancelando felicitaciones:", e);
    }
  };

  const scheduleCongratsForDays = async (inicioISO, daysToSchedule = 7) => {
    try {
      const ok = await ensureNotifPermission();
      if (!ok) return;

      await cancelCongratsScheduled();

      const baseTime = new Date(inicioISO).getTime();
      if (Number.isNaN(baseTime)) return;

      const ahoraMs = Date.now();
      const ids = [];

      for (let d = 1; d <= daysToSchedule; d++) {
        const targetDate = new Date(baseTime + d * 24 * 60 * 60 * 1000);
        if (targetDate.getTime() <= ahoraMs) continue;

        try {
          const id = await Notifications.scheduleNotificationAsync({
            content: {
              title: "¡Felicidades! 🎉",
              body: `Hola, acabas de cumplir ${d} día${d === 1 ? "" : "s"} de calma y constancia 💜`,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: targetDate,
            },
          });
          if (id) ids.push(id);
        } catch (errSched) {
          console.log(
            "Límite de alarmas alcanzado en el sistema:",
            errSched?.message,
          );
          break;
        }
      }

      await AsyncStorage.setItem(CONGRATS_IDS_KEY, JSON.stringify(ids));
    } catch (e) {
      console.log("Error programando notificaciones:", e?.message);
    }
  };

  const sincronizarTiempoGuardado = useCallback(async () => {
    try {
      const fechaInicio = await AsyncStorage.getItem(INICIO_STORAGE_KEY);
      if (fechaInicio) {
        iniciarIntervaloContinuo(fechaInicio);
      } else if (route?.params?.start) {
        const ahora = new Date().toISOString();
        await AsyncStorage.setItem(INICIO_STORAGE_KEY, ahora);
        iniciarIntervaloContinuo(ahora);
      }
    } catch (e) {
      console.error("Error sincronizando tiempo continuo:", e);
    }
  }, [iniciarIntervaloContinuo, route?.params?.start]);

  const obtenerPerfilUsuario = async (uid) => {
    try {
      const docRef = doc(db, "usuarios", uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setNombreUsuario(data.nombre || "");
      }
    } catch (e) {
      console.log("Error al obtener perfil de usuario:", e);
    }
  };

  useEffect(() => {
    sincronizarTiempoGuardado();

    if (auth.currentUser) {
      obtenerPerfilUsuario(auth.currentUser.uid);
    }

    const appStateSub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        sincronizarTiempoGuardado();
      }
    });

    return () => {
      appStateSub.remove();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [sincronizarTiempoGuardado]);

  useFocusEffect(
    useCallback(() => {
      setActiveNav(0);
      sincronizarTiempoGuardado();
    }, [sincronizarTiempoGuardado]),
  );

  const startMonitoring = async (forceStartDate = null) => {
    let inicio = forceStartDate;

    if (!inicio) {
      const existing = await AsyncStorage.getItem(INICIO_STORAGE_KEY);
      inicio = existing || new Date().toISOString();
      await AsyncStorage.setItem(INICIO_STORAGE_KEY, inicio);
    }

    iniciarIntervaloContinuo(inicio);
  };

  useEffect(() => {
    const timerTresMin = setInterval(() => {
      setAccionIndex((prev) => (prev + 1) % ACCIONES_LAMI.length);
    }, TRES_MINUTOS_MS);

    return () => clearInterval(timerTresMin);
  }, []);

  const dispararAccionManual = () => {
    setAccionIndex((prev) => (prev + 1) % ACCIONES_LAMI.length);
  };

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.12,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.98,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.delay(900),
      ]),
    ).start();
  }, [scaleAnim]);

  const hacerPop = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.86,
        duration: 110,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1.12,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start(() => {
      scaleAnim.setValue(1.0);
    });
  };

  const secWidth = animSec.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });
  const minWidth = animMin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });
  const horWidth = animHor.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });
  const diaWidth = animDia.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const accionActual = ACCIONES_LAMI[accionIndex];

  return (
    <LinearGradient colors={["#f3e8ff", "#faf5ff"]} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* NAV BAR */}
        <View style={styles.navBar}>
          {[
            ["leaf-outline", "Calma", "Calma"],
            ["calendar-outline", "Calendario", "Calendario"],
            ["heart-outline", "Checking", "Checking"],
            ["person-circle-outline", "Perfil", "Perfil"],
          ].map(([icon, label, ruta], i) => (
            <TouchableOpacity
              key={i}
              style={[styles.navItem, { width: NAV_ITEM_W }]}
              onPress={() => {
                setActiveNav(i);
                navigation.navigate(ruta);
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
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Tiempo en calma:</Text>

          {COLORES_BARRAS.map(([color, label], i) => {
            const widths = [diaWidth, horWidth, minWidth, secWidth];
            const values = [
              tiempo.dias,
              tiempo.horas,
              tiempo.minutos,
              tiempo.segundos,
            ];

            return (
              <View key={i} style={[styles.barContainer, { height: BAR_H }]}>
                <Animated.View
                  style={[
                    styles.barFill,
                    { width: widths[i], backgroundColor: color },
                  ]}
                >
                  <View
                    style={[
                      styles.triangle,
                      {
                        borderLeftColor: color,
                        borderBottomWidth: BAR_TRIANGLE_H,
                      },
                    ]}
                  />
                </Animated.View>

                <Text style={styles.barText}>
                  {values[i]} {label}
                </Text>
              </View>
            );
          })}

          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
          >
            <View style={[styles.whiteCard, { width: CARD_W }]}>
              <LamiEnMovimiento
                size={IMAGE_SIZE}
                accionActual={accionActual}
                onPressLami={dispararAccionManual}
              />

              <View style={styles.saludoBox}>
                <Text style={styles.saludoText}>
                  Hola {nombreUsuario || "amiga/o"}! No olvides que este proceso
                  vale la pena.{"\n"}
                  {frases[fraseIndex]}
                </Text>
              </View>

              <View style={styles.controlsRow}>
                {!monitorActivo ? (
                  <TouchableOpacity
                    style={styles.monitorButton}
                    onPress={async () => {
                      const now = new Date().toISOString();
                      await AsyncStorage.setItem(INICIO_STORAGE_KEY, now);
                      startMonitoring(now);
                      await scheduleCongratsForDays(now, 7);
                    }}
                  >
                    <Text style={styles.monitorText}>Iniciar Monitoreo</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{ alignItems: "center", width: "100%" }}>
                    <Animated.View
                      style={{
                        transform: [{ scale: scaleAnim }],
                        alignItems: "center",
                      }}
                    >
                      <View style={styles.yellowGlow} />

                      <TouchableOpacity
                        activeOpacity={0.85}
                        style={styles.fabButton}
                        onPress={async () => {
                          hacerPop();
                          const now = new Date().toISOString();
                          await AsyncStorage.setItem(INICIO_STORAGE_KEY, now);
                          startMonitoring(now);
                          await scheduleCongratsForDays(now, 7);

                          try {
                            await notificarAlertaAlEspecialista({
                              origen: "anxiosimetro_apoyo",
                              emocion: "Ansiedad (Necesito Apoyo)",
                              animoScore: 2,
                              notaClinica:
                                "🚨 Presionó 'Necesito Apoyo' en el Anxiosímetro",
                            });
                          } catch (e) {
                            console.warn(
                              "No se pudo enviar aviso al especialista:",
                              e,
                            );
                          }

                          navigation.navigate("PantallaEjercicios");
                        }}
                      >
                        <Ionicons
                          name="flash-outline"
                          size={28}
                          color="white"
                        />
                      </TouchableOpacity>
                    </Animated.View>

                    <Text style={styles.smallLabel}>Necesito Apoyo</Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  navBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "white",
    paddingVertical: 10,
    elevation: 5,
  },

  navItem: {
    alignItems: "center",
  },

  navLabelActive: {
    color: "#7C3AED",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "700",
  },

  scrollContent: {
    alignItems: "center",
    padding: 10,
    paddingBottom: 30,
    marginTop: 10,
  },

  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },

  barContainer: {
    width: "90%",
    backgroundColor: "#E2E8F0",
    borderRadius: 14,
    marginVertical: 6,
    justifyContent: "center",
    overflow: "hidden",
  },

  barFill: {
    position: "absolute",
    left: 0,
    height: "100%",
  },

  barText: {
    textAlign: "left",
    color: "#1E293B",
    fontWeight: "900",
    fontSize: 18,
    textShadowColor: "rgba(255,255,255,0.55)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    paddingLeft: 14,
  },

  triangle: {
    position: "absolute",
    right: -9,
    width: 0,
    height: "100%",
    borderLeftWidth: 10,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
  },

  whiteCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 10,
    alignItems: "center",
    elevation: 6,
    marginBottom: 14,
  },

  lamiTouchArea: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 6,
  },

  image: {
    borderRadius: 12,
  },

  saludoBox: {
    backgroundColor: "#E9D5FF",
    width: "100%",
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
  },

  saludoText: {
    color: "#5B21B6",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 20,
  },

  controlsRow: {
    flexDirection: "row",
    marginTop: 16,
    width: "100%",
    justifyContent: "center",
  },

  monitorButton: {
    backgroundColor: "#7C3AED",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 30,
  },

  monitorText: {
    color: "white",
    fontWeight: "600",
  },

  fabButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#7C3AED",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 2,
  },

  yellowGlow: {
    position: "absolute",
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: "rgba(250,204,21,0.16)",
    shadowColor: "#edd26693",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 22,
    elevation: 6,
    zIndex: 1,
    top: -15,
    alignSelf: "center",
  },

  smallLabel: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: "700",
    color: "#4B2771",
    textTransform: "lowercase",
  },
});
