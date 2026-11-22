import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { getAuth } from "firebase/auth";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const LAMI_AVATAR = require("../assets/lami_1.png");
const auth = getAuth();

let AudioModule = null;
let VideoComponent = null;
try {
  const expoAv = require("expo-av");
  AudioModule = expoAv.Audio;
  VideoComponent = expoAv.Video;
} catch {
  AudioModule = null;
  VideoComponent = null;
}

const PASOS_RESPIRACION = [
  {
    titulo: "Inhala suave",
    ayuda: "Toma aire por la nariz en 4 segundos.",
    segundos: 4,
    escala: 1.14,
    bg: "#CCFBF1",
    color: "#0F766E",
  },
  {
    titulo: "Pausa breve",
    ayuda: "Solo un segundo, sin apretar.",
    segundos: 1,
    escala: 1.14,
    bg: "#E0F2FE",
    color: "#0369A1",
  },
  {
    titulo: "Suelta el aire lento",
    ayuda: "Exhala despacio en 6 segundos y baja hombros.",
    segundos: 6,
    escala: 0.96,
    bg: "#EAE8FC",
    color: "#3F3B7A",
  },
];

function obtenerFechaClaveLocal(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function NubeSuave({ style }) {
  return (
    <View style={[styles.nubeGrupo, style]} pointerEvents="none">
      <View style={styles.nubePuffIzq} />
      <View style={styles.nubePuffCentro} />
      <View style={styles.nubePuffDer} />
      <View style={styles.nubeBase} />
    </View>
  );
}

function PaisajeRespiracion({ haloScale }) {
  const nubeIzqX = useRef(new Animated.Value(0)).current;
  const nubeDerX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loopIzq = Animated.loop(
      Animated.sequence([
        Animated.timing(nubeIzqX, {
          toValue: 18,
          duration: 5200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(nubeIzqX, {
          toValue: -12,
          duration: 5200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    const loopDer = Animated.loop(
      Animated.sequence([
        Animated.timing(nubeDerX, {
          toValue: -16,
          duration: 6000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(nubeDerX, {
          toValue: 12,
          duration: 6000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    loopIzq.start();
    loopDer.start();

    return () => {
      loopIzq.stop();
      loopDer.stop();
    };
  }, [nubeIzqX, nubeDerX]);

  return (
    <View style={styles.paisajeBox} pointerEvents="none">
      <LinearGradient
        colors={["#B9DFEE", "#DCEEF7", "#E8E5F8"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        style={[styles.solHalo, { transform: [{ scale: haloScale }] }]}
      />
      <View style={styles.solDisco} />

      <Animated.View
        style={[
          styles.nubePosicionUno,
          { transform: [{ translateX: nubeIzqX }] },
        ]}
      >
        <NubeSuave />
      </Animated.View>

      <Animated.View
        style={[
          styles.nubePosicionDos,
          { transform: [{ translateX: nubeDerX }] },
        ]}
      >
        <NubeSuave />
      </Animated.View>

      <View style={styles.montanaIzq} />
      <View style={styles.montanaDer} />
      <View style={styles.colinaValle} />
      <View style={styles.praderaFrente} />
    </View>
  );
}

export default function PantallaEjercicios() {
  const navigation = useNavigation();

  const [vista, setVista] = useState("respiracion");
  const [pasoIdx, setPasoIdx] = useState(0);
  const [segundosRestantes, setSegundosRestantes] = useState(
    PASOS_RESPIRACION[0].segundos,
  );
  const [ciclosHechos, setCiclosHechos] = useState(0);
  const [audioOn, setAudioOn] = useState(true);
  const [alivioMarcado, setAlivioMarcado] = useState(false);
  const [rescatePaso, setRescatePaso] = useState(0);
  const [videoError, setVideoError] = useState(false);

  const soundRef = useRef(null);
  const videoRef = useRef(null);
  const saliendoRef = useRef(false);
  const registradoRef = useRef(false);

  const lamiScale = useRef(new Animated.Value(1)).current;
  const haloScale = useRef(new Animated.Value(1)).current;

  const pasoActual = PASOS_RESPIRACION[pasoIdx];

  const liberarAudio = useCallback(async () => {
    const actual = soundRef.current;
    soundRef.current = null;
    if (!actual) return;
    try {
      await actual.stopAsync();
    } catch {}
    try {
      await actual.unloadAsync();
    } catch {}
  }, []);

  const detenerVideo = useCallback(async () => {
    const vid = videoRef.current;
    if (!vid) return;
    try {
      await vid.pauseAsync();
    } catch {}
    try {
      await vid.unloadAsync();
    } catch {}
  }, []);

  const guardarAvanceCrisis = useCallback(
    async (resultado = "apoyo_usado") => {
      if (registradoRef.current && resultado === "apoyo_usado") return;
      registradoRef.current = true;

      try {
        const uid = auth.currentUser?.uid || "invitado";
        const key = `avancesCalendarioLami_${uid}`;
        const raw = await AsyncStorage.getItem(key);
        const lista = raw ? JSON.parse(raw) : [];
        const ahora = new Date();

        const nuevo = {
          id: `crisis_${Date.now()}`,
          ejercicio: "RespiracionEmergencia",
          tituloEjercicio: "Apoyo en crisis (Respiración / Rescate / Video)",
          fechaClave: obtenerFechaClaveLocal(ahora),
          fecha: ahora.toISOString(),
          ciclosHechos,
          resultado,
        };

        await AsyncStorage.setItem(key, JSON.stringify([nuevo, ...lista]));
      } catch (e) {
        console.log("Error guardando avance de crisis:", e);
      }
    },
    [ciclosHechos],
  );

  useEffect(() => {
    let activo = true;

    const cargarAudio = async () => {
      await liberarAudio();
      if (
        !AudioModule ||
        !audioOn ||
        vista !== "respiracion" ||
        saliendoRef.current ||
        !activo
      ) {
        return;
      }

      try {
        await AudioModule.setAudioModeAsync({
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
        });
        const { sound } = await AudioModule.Sound.createAsync(
          require("../assets/sounds/inhale.mp3"),
          {
            volume: 0.55,
            isLooping: true,
            rate: 0.6,
            shouldCorrectPitch: true,
          },
        );
        if (!activo || saliendoRef.current || vista !== "respiracion") {
          await sound.unloadAsync();
          return;
        }
        soundRef.current = sound;
        await sound.playAsync();
      } catch {}
    };

    cargarAudio();

    return () => {
      activo = false;
      liberarAudio();
    };
  }, [audioOn, vista, liberarAudio]);

  useEffect(() => {
    if (vista !== "video") {
      detenerVideo();
    }
  }, [vista, detenerVideo]);

  useEffect(() => {
    if (vista !== "respiracion") return;

    const durMs = pasoActual.segundos * 1000;
    Animated.parallel([
      Animated.timing(lamiScale, {
        toValue: pasoActual.escala,
        duration: durMs,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
      Animated.timing(haloScale, {
        toValue: pasoActual.escala * 1.1,
        duration: durMs,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
    ]).start();
  }, [pasoActual, vista, lamiScale, haloScale]);

  useEffect(() => {
    if (vista !== "respiracion" || saliendoRef.current) return;

    setSegundosRestantes(pasoActual.segundos);
    let actualSeg = pasoActual.segundos;

    const intervalo = setInterval(() => {
      actualSeg -= 1;
      if (actualSeg <= 0) {
        clearInterval(intervalo);
        setPasoIdx((prev) => {
          const next = (prev + 1) % PASOS_RESPIRACION.length;
          if (next === 0) {
            setCiclosHechos((c) => c + 1);
          }
          return next;
        });
      } else {
        setSegundosRestantes(actualSeg);
      }
    }, 1000);

    return () => clearInterval(intervalo);
  }, [pasoIdx, pasoActual.segundos, vista]);

  useEffect(() => {
    return () => {
      saliendoRef.current = true;
      liberarAudio();
      detenerVideo();
    };
  }, [liberarAudio, detenerVideo]);

  const abrirVideo = async () => {
    await liberarAudio();
    setVideoError(false);
    setVista("video");
  };

  const salirDelVideoARespiracion = async () => {
    await detenerVideo();
    setVista("respiracion");
  };

  const salirACalma = async (estado = "salio") => {
    saliendoRef.current = true;
    await guardarAvanceCrisis(estado);
    await liberarAudio();
    await detenerVideo();
    navigation.navigate("Anxiosimetro");
  };

  const marcarAlivio = async () => {
    setAlivioMarcado(true);
    registradoRef.current = false;
    await guardarAvanceCrisis("bajo_intensidad");
  };

  const pasosRescate = [
    {
      badge: "PASO 1 DE 3 · MIRADA",
      titulo: "Busca 1 objeto azul o claro cerca de ti",
      detalle:
        "Míralo unos segundos y nota su forma. Estás en este espacio, no en el pensamiento.",
    },
    {
      badge: "PASO 2 DE 3 · CUERPO",
      titulo: "Siente el apoyo de tus pies o manos",
      detalle:
        "Aprieta suave los dedos o apoya bien las plantas en el piso para sentir firmeza.",
    },
    {
      badge: "PASO 3 DE 3 · EXHALACIÓN",
      titulo: "Haz una exhalación larga por la boca",
      detalle:
        "Suelta el aire despacio como si empañaras un vidrio. Repite si lo necesitas.",
    },
  ];

  return (
    <LinearGradient
      colors={["#EAF4F7", "#F4F7FA", "#EAE8FC"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => salirACalma("regreso_manual")}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={22} color="#1E3A4C" />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.topTag}>APOYO EN CRISIS • PASO A PASO</Text>
            <Text style={styles.topTitle}>
              {vista === "video"
                ? "Meditación Guiada"
                : "Respiración de emergencia"}
            </Text>
          </View>

          {AudioModule && vista === "respiracion" && (
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => setAudioOn((v) => !v)}
              activeOpacity={0.85}
            >
              <Ionicons
                name={audioOn ? "volume-high-outline" : "volume-mute-outline"}
                size={18}
                color="#1E3A4C"
              />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {vista === "respiracion" && (
            <View style={styles.cardPrincipal}>
              <PaisajeRespiracion haloScale={haloScale} />

              <View style={styles.contenidoSobrePaisaje}>
                <View
                  style={[styles.pasoPill, { backgroundColor: pasoActual.bg }]}
                >
                  <Text
                    style={[styles.pasoPillText, { color: pasoActual.color }]}
                  >
                    {pasoActual.titulo.toUpperCase()} · {segundosRestantes}s
                  </Text>
                </View>

                <Text style={styles.instruccionCorta}>{pasoActual.ayuda}</Text>

                <View style={styles.lamiBox}>
                  <Animated.View
                    style={[
                      styles.halo,
                      {
                        backgroundColor: pasoActual.bg,
                        transform: [{ scale: haloScale }],
                      },
                    ]}
                  />
                  <Animated.View style={{ transform: [{ scale: lamiScale }] }}>
                    <Image
                      source={LAMI_AVATAR}
                      style={styles.lamiImg}
                      resizeMode="contain"
                    />
                  </Animated.View>
                </View>

                <View style={styles.contadorChip}>
                  <Text style={styles.contadorGrande}>
                    {segundosRestantes}s
                  </Text>
                  <Text style={styles.ciclosMeta}>
                    Ciclos: {ciclosHechos} · Inhala 4s · Pausa 1s · Exhala 6s
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.btnAlivio}
                  onPress={marcarAlivio}
                  activeOpacity={0.88}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={styles.btnAlivioText}>
                    {alivioMarcado
                      ? "Registrado · Me siento un poco mejor ✓"
                      : "Ya bajó un poco la tensión"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btnRescate}
                  onPress={() => {
                    setRescatePaso(0);
                    setVista("rescate_sensorial");
                  }}
                  activeOpacity={0.88}
                >
                  <Ionicons name="compass-outline" size={18} color="#3F3B7A" />
                  <Text style={styles.btnRescateText}>
                    Sigo agitado/a · Hacer anclaje de 3 pasos
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btnVideo}
                  onPress={abrirVideo}
                  activeOpacity={0.88}
                >
                  <Ionicons name="videocam-outline" size={18} color="#1E3A4C" />
                  <Text style={styles.btnVideoText}>
                    Ver video de meditación
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {vista === "rescate_sensorial" && (
            <View style={styles.cardPrincipal}>
              <PaisajeRespiracion haloScale={haloScale} />
              <View style={styles.contenidoSobrePaisaje}>
                <View style={[styles.pasoPill, { backgroundColor: "#EAE8FC" }]}>
                  <Text style={[styles.pasoPillText, { color: "#3F3B7A" }]}>
                    {pasosRescate[rescatePaso].badge}
                  </Text>
                </View>

                <Image
                  source={LAMI_AVATAR}
                  style={[
                    styles.lamiImg,
                    { width: 112, height: 112, marginVertical: 10 },
                  ]}
                  resizeMode="contain"
                />

                <View style={styles.textoLegibleBox}>
                  <Text style={styles.rescateTitulo}>
                    {pasosRescate[rescatePaso].titulo}
                  </Text>
                  <Text style={styles.rescateDetalle}>
                    {pasosRescate[rescatePaso].detalle}
                  </Text>
                </View>

                <View style={styles.filaBotones}>
                  <TouchableOpacity
                    style={styles.btnSecundario}
                    onPress={() => setVista("respiracion")}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.btnSecundarioText}>
                      Volver a respirar
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.btnPrimario}
                    onPress={() => {
                      if (rescatePaso < pasosRescate.length - 1) {
                        setRescatePaso((p) => p + 1);
                      } else {
                        salirACalma("rescate_completado");
                      }
                    }}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.btnPrimarioText}>
                      {rescatePaso < pasosRescate.length - 1
                        ? "Siguiente paso →"
                        : "Listo, volver"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {vista === "video" && (
            <View style={styles.cardPrincipal}>
              <View style={styles.contenidoSobrePaisaje}>
                <Text style={styles.rescateTitulo}>
                  Meditación guiada en video
                </Text>
                <Text style={styles.rescateDetalle}>
                  Sigue el ritmo del video con calma y deja que tu cuerpo
                  descanse.
                </Text>

                {VideoComponent && !videoError ? (
                  <VideoComponent
                    ref={videoRef}
                    source={require("../assets/meditacion.mp4")}
                    style={styles.video}
                    resizeMode="cover"
                    shouldPlay={vista === "video" && !saliendoRef.current}
                    isLooping
                    useNativeControls
                    onError={() => setVideoError(true)}
                  />
                ) : (
                  <View style={styles.videoFallback}>
                    <Image
                      source={LAMI_AVATAR}
                      style={{ width: 96, height: 96, marginBottom: 8 }}
                      resizeMode="contain"
                    />
                    <Text style={styles.videoFallbackText}>
                      El reproductor de video nativo no está disponible en este
                      entorno. Puedes seguir respirando lento con Lami.
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.btnSecundario,
                    { width: "100%", marginTop: 14 },
                  ]}
                  onPress={salirDelVideoARespiracion}
                  activeOpacity={0.85}
                >
                  <Text style={styles.btnSecundarioText}>
                    Volver a respiración guiada
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.notaPie}>
            <Text style={styles.notaTitulo}>
              Respaldo psicológico y uso libre
            </Text>
            <Text style={styles.notaTexto}>
              Basado en respiración pausada con exhalación prolongada, anclaje
              sensorial breve y meditación guiada utilizados en regulación
              emocional y atención plena para favorecer la calma ante picos de
              ansiedad.
            </Text>
            <Text style={styles.notaAviso}>
              Herramienta original de Lami con fines educativos y de
              autocuidado; no sustituye atención psicológica, médica ni de
              urgencias si estás en riesgo o el malestar es intenso.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#B3D3DA",
    alignItems: "center",
    justifyContent: "center",
  },
  topTag: {
    fontSize: 10,
    fontWeight: "800",
    color: "#6192A4",
    letterSpacing: 0.6,
  },
  topTitle: {
    fontSize: 18.5,
    fontWeight: "900",
    color: "#1E3A4C",
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#B3D3DA",
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  cardPrincipal: {
    backgroundColor: "transparent",
    borderRadius: 26,
    overflow: "hidden",
    borderWidth: 1.2,
    borderColor: "#9BC4D2",
    minHeight: 430,
  },
  contenidoSobrePaisaje: {
    padding: 20,
    alignItems: "center",
    width: "100%",
  },
  paisajeBox: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  solHalo: {
    position: "absolute",
    top: 8,
    right: 12,
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: "rgba(253, 224, 71, 0.42)",
  },
  solDisco: {
    position: "absolute",
    top: 24,
    right: 28,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FCD34D",
  },
  nubeGrupo: {
    width: 116,
    height: 38,
  },
  nubePosicionUno: {
    position: "absolute",
    top: 36,
    left: 16,
  },
  nubePosicionDos: {
    position: "absolute",
    top: 84,
    right: 20,
    transform: [{ scale: 0.85 }],
  },
  nubeBase: {
    position: "absolute",
    bottom: 0,
    left: 8,
    width: 100,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
  },
  nubePuffIzq: {
    position: "absolute",
    bottom: 6,
    left: 14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },
  nubePuffCentro: {
    position: "absolute",
    bottom: 9,
    left: 35,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
  },
  nubePuffDer: {
    position: "absolute",
    bottom: 5,
    left: 65,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
  },
  montanaIzq: {
    position: "absolute",
    bottom: 56,
    left: -65,
    width: 260,
    height: 155,
    borderTopLeftRadius: 140,
    borderTopRightRadius: 90,
    backgroundColor: "#8DB9C8",
  },
  montanaDer: {
    position: "absolute",
    bottom: 48,
    right: -60,
    width: 270,
    height: 145,
    borderTopLeftRadius: 95,
    borderTopRightRadius: 140,
    backgroundColor: "#7FAEB9",
  },
  colinaValle: {
    position: "absolute",
    bottom: -34,
    left: -30,
    width: "120%",
    height: 155,
    borderTopLeftRadius: 180,
    borderTopRightRadius: 160,
    backgroundColor: "#78B8A7",
  },
  praderaFrente: {
    position: "absolute",
    bottom: -64,
    right: -25,
    width: "118%",
    height: 128,
    borderTopLeftRadius: 150,
    borderTopRightRadius: 190,
    backgroundColor: "#A5D6C2",
  },
  pasoPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 8,
  },
  pasoPillText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  instruccionCorta: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#1E3A4C",
    textAlign: "center",
    lineHeight: 20,
    backgroundColor: "rgba(255, 255, 255, 0.86)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  lamiBox: {
    width: 176,
    height: 176,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
  },
  halo: {
    position: "absolute",
    width: 154,
    height: 154,
    borderRadius: 77,
    opacity: 0.72,
  },
  lamiImg: {
    width: 126,
    height: 126,
  },
  contadorChip: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(179, 211, 218, 0.85)",
  },
  contadorGrande: {
    fontSize: 32,
    fontWeight: "900",
    color: "#1E3A4C",
  },
  ciclosMeta: {
    fontSize: 11.5,
    color: "#2C4959",
    fontWeight: "700",
    marginTop: 2,
    textAlign: "center",
  },
  textoLegibleBox: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 18,
    padding: 14,
    width: "100%",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(179, 211, 218, 0.85)",
  },
  btnAlivio: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0F766E",
    paddingVertical: 14,
    borderRadius: 999,
  },
  btnAlivioText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  btnRescate: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(234, 232, 252, 0.95)",
    borderWidth: 1,
    borderColor: "#CEC7FD",
    paddingVertical: 13,
    borderRadius: 999,
    marginTop: 10,
  },
  btnRescateText: {
    color: "#3F3B7A",
    fontSize: 13.5,
    fontWeight: "800",
  },
  btnVideo: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(240, 247, 249, 0.95)",
    borderWidth: 1,
    borderColor: "#8BC1D1",
    paddingVertical: 12,
    borderRadius: 999,
    marginTop: 10,
  },
  btnVideoText: {
    color: "#1E3A4C",
    fontSize: 13.5,
    fontWeight: "700",
  },
  rescateTitulo: {
    fontSize: 17.5,
    fontWeight: "900",
    color: "#1E3A4C",
    textAlign: "center",
    marginBottom: 6,
  },
  rescateDetalle: {
    fontSize: 13.5,
    color: "#476475",
    textAlign: "center",
    lineHeight: 19,
  },
  filaBotones: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  btnSecundario: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#8BC1D1",
    backgroundColor: "#F0F7F9",
    alignItems: "center",
    justifyContent: "center",
  },
  btnSecundarioText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E3A4C",
  },
  btnPrimario: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 999,
    backgroundColor: "#7E83C2",
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimarioText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  video: {
    width: "100%",
    height: 240,
    borderRadius: 18,
    marginTop: 12,
  },
  videoFallback: {
    width: "100%",
    padding: 18,
    borderRadius: 18,
    backgroundColor: "#F4F7FA",
    borderWidth: 1,
    borderColor: "#D6E8EE",
    alignItems: "center",
    marginTop: 12,
  },
  videoFallbackText: {
    fontSize: 13,
    color: "#476475",
    textAlign: "center",
    lineHeight: 18,
  },
  notaPie: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D6E8EE",
  },
  notaTitulo: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#1E3A4C",
    marginBottom: 4,
  },
  notaTexto: {
    fontSize: 11,
    color: "#476475",
    lineHeight: 16,
    marginBottom: 6,
  },
  notaAviso: {
    fontSize: 10.5,
    color: "#617D8A",
    lineHeight: 15,
  },
});
