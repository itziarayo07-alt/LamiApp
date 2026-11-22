import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import * as Speech from "expo-speech";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  Path,
  Rect,
  Stop,
  LinearGradient as SvgLinearGradient,
} from "react-native-svg";

const AnimatedView = Animated.createAnimatedComponent(View);

// Duración total máxima: 35 + 35 + 40 + 40 = 150 segundos (2 minutos y medio)
const SECCIONES = [
  {
    key: "cabeza",
    titulo: "Cabeza y rostro",
    segundos: 35,
    guiaVoz:
      "Zona 1...Cabeza y rostro...Con mucha calma... llevamos la atención a tu cabeza y tu rostro... Observa tu frente, tus ojos y tu mandíbula... Sin prisa... y si sientes tensión, déjala suavizarse despacito.",
    descripcion:
      "Lleva tu atención a la frente, el entrecejo, los párpados y la mandíbula. Observa sin juzgar si hay rigidez o cansancio.",
    sugerencia:
      "Al exhalar, permite que la mandíbula se suelte un poco y que tu rostro descanse.",
    colorLaser: "#7E83C2",
  },
  {
    key: "hombros",
    titulo: "Cuello y hombros",
    segundos: 35,
    guiaVoz:
      "Zona 2...Cuello y hombros......Ahora... ponemos atención en tu cuello y tus hombros... Nota cómo se sienten... Y al soltar el aire, deja que caigan con suavidad... como quitándoles un poquito de peso.",
    descripcion:
      "Dirige tu atención a la nuca, el cuello y ambos hombros, donde suele acumularse el esfuerzo del día.",
    sugerencia:
      "Suelta un poco el peso de tus hombros con cada exhalación, sin forzarte.",
    colorLaser: "#6192A4",
  },
  {
    key: "pecho",
    titulo: "Pecho y respiración",
    segundos: 40,
    guiaVoz:
      "Zona 3...Pecho y respiración...Llevamos la atención a tu pecho y a tu respiración.................... Solo observa cómo sube y baja suavemente... sin intentar cambiar nada... a tu propio ritmo.",
    descripcion:
      "Observa el movimiento de tu pecho al respirar y cómo sube y baja de forma natural.",
    sugerencia: "Acompaña el ritmo de tu respiración con calma y sin exigirte.",
    colorLaser: "#0F766E",
  },
  {
    key: "abdomen",
    titulo: "Abdomen, piernas y pies",
    segundos: 40,
    guiaVoz:
      "Zona 4...Abdomen, piernas y pies......Recorre tu abdomen, tus piernas y tus pies... Siente el apoyo donde estás... y deja que una calma suave se extienda poco a poco.",
    descripcion:
      "Extiende tu atención al abdomen, las piernas y los pies, notando su apoyo y soltando tensiones.",
    sugerencia:
      "Imagina una ola tranquila que recorre tu cuerpo hasta los pies al exhalar.",
    colorLaser: "#7C3AED",
  },
];

const DURACION_TOTAL_SEG = SECCIONES.reduce((acc, s) => acc + s.segundos, 0); // 150s (2:30)

function formatTiempo(seg) {
  const safe = Math.max(0, seg);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function LamiEscanerCojin({ colorLaser = "#6192A4", escanerActivo = true }) {
  const flotarCojinY = useRef(new Animated.Value(0)).current;
  const laserY = useRef(new Animated.Value(24)).current;
  const parpadeoY = useRef(new Animated.Value(1)).current;
  const [sonriendo, setSonriendo] = useState(false);

  useEffect(() => {
    const loopFlotar = Animated.loop(
      Animated.sequence([
        Animated.timing(flotarCojinY, {
          toValue: -7,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(flotarCojinY, {
          toValue: 3,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loopFlotar.start();
    return () => loopFlotar.stop();
  }, [flotarCojinY]);

  useEffect(() => {
    laserY.stopAnimation();
    if (!escanerActivo) {
      laserY.setValue(85);
      return;
    }

    const loopLaser = Animated.loop(
      Animated.sequence([
        Animated.timing(laserY, {
          toValue: 146,
          duration: 2100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(laserY, {
          toValue: 24,
          duration: 2100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loopLaser.start();
    return () => loopLaser.stop();
  }, [escanerActivo, laserY]);

  useEffect(() => {
    const timer = setInterval(() => {
      Animated.sequence([
        Animated.timing(parpadeoY, {
          toValue: 0.08,
          duration: 85,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(parpadeoY, {
          toValue: 1,
          duration: 110,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }, 3200);

    return () => clearInterval(timer);
  }, [parpadeoY]);

  useEffect(() => {
    let timeoutId = null;
    const intervalId = setInterval(() => {
      setSonriendo(true);
      timeoutId = setTimeout(() => {
        setSonriendo(false);
      }, 1700);
    }, 5200);

    return () => {
      clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return (
    <View style={styles.stageBox}>
      <AnimatedView
        style={[
          styles.lamiFloatingWrap,
          { transform: [{ translateY: flotarCojinY }] },
        ]}
      >
        <Svg width={180} height={165} viewBox="0 0 180 165">
          <Defs>
            <SvgLinearGradient
              id="lamiBodyScan"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <Stop offset="0%" stopColor="#99F6E4" />
              <Stop offset="55%" stopColor="#5EEAD4" />
              <Stop offset="100%" stopColor="#2DD4BF" />
            </SvgLinearGradient>
          </Defs>

          <Path
            d="M90 16 C120 16, 134 42, 139 70 C144 98, 160 120, 146 140 C135 156, 106 150, 90 140 C74 150, 45 156, 34 140 C20 120, 36 98, 41 70 C46 42, 60 16, 90 16 Z"
            fill="url(#lamiBodyScan)"
          />

          <Path
            d="M36 86 Q16 93 20 106 Q24 112 35 103"
            fill="#5EEAD4"
            stroke="#14B8A6"
            strokeWidth="2.3"
            strokeLinecap="round"
          />
          <Path
            d="M144 86 Q164 93 160 106 Q156 112 145 103"
            fill="#5EEAD4"
            stroke="#14B8A6"
            strokeWidth="2.3"
            strokeLinecap="round"
          />

          <Ellipse
            cx="62"
            cy="88"
            rx={sonriendo ? 10.5 : 8.5}
            ry={sonriendo ? 6 : 5}
            fill="#FDA4AF"
            opacity={sonriendo ? 0.85 : 0.6}
          />
          <Ellipse
            cx="118"
            cy="88"
            rx={sonriendo ? 10.5 : 8.5}
            ry={sonriendo ? 6 : 5}
            fill="#FDA4AF"
            opacity={sonriendo ? 0.85 : 0.6}
          />

          <Path
            d={sonriendo ? "M63 60 Q71 54 79 59" : "M63 64 Q71 60 79 63"}
            stroke="#0F3D42"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d={sonriendo ? "M101 59 Q109 54 117 60" : "M101 63 Q109 60 117 64"}
            stroke="#0F3D42"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />

          {sonriendo ? (
            <Path d="M74 95 Q90 112 106 95 Z" fill="#0F3D42" />
          ) : (
            <Path
              d="M79 96 Q90 104 101 96"
              stroke="#0F3D42"
              strokeWidth="3.4"
              strokeLinecap="round"
              fill="none"
            />
          )}
        </Svg>

        <AnimatedView
          pointerEvents="none"
          style={[styles.eyesOverlay, { transform: [{ scaleY: parpadeoY }] }]}
        >
          <Svg width={70} height={26} viewBox="0 0 70 26">
            <Circle cx="20" cy="13" r="6.8" fill="#0F3D42" />
            <Circle cx="17.8" cy="10.8" r="2.3" fill="#FFFFFF" />
            <Circle cx="50" cy="13" r="6.8" fill="#0F3D42" />
            <Circle cx="47.8" cy="10.8" r="2.3" fill="#FFFFFF" />
          </Svg>
        </AnimatedView>

        <AnimatedView
          pointerEvents="none"
          style={[
            styles.laserBeamWrap,
            { transform: [{ translateY: laserY }] },
          ]}
        >
          <View
            style={[
              styles.laserGlow,
              { backgroundColor: colorLaser, opacity: 0.22 },
            ]}
          />
          <View
            style={[
              styles.laserLine,
              { backgroundColor: colorLaser, shadowColor: colorLaser },
            ]}
          />
        </AnimatedView>
      </AnimatedView>

      <Svg width={170} height={42} viewBox="0 0 170 42" style={styles.cojinSvg}>
        <Ellipse cx="85" cy="34" rx="58" ry="6" fill="#0F172A" opacity="0.12" />
        <Path
          d="M28 18 Q85 6 142 18 Q152 25 140 32 Q85 38 30 32 Q18 25 28 18 Z"
          fill="#CEC7FD"
          stroke="#A374CC"
          strokeWidth="2"
        />
        <Ellipse cx="85" cy="21" rx="34" ry="4" fill="#EDE9FE" opacity="0.8" />
        <Rect
          x="82"
          y="18"
          width="6"
          height="6"
          rx="2"
          fill="#A374CC"
          opacity="0.55"
        />
      </Svg>
    </View>
  );
}

export default function EscaneoCorporal({ navigation }) {
  const [indice, setIndice] = useState(0);
  const [segundosRestantes, setSegundosRestantes] = useState(
    SECCIONES[0].segundos,
  );
  const [corriendo, setCorriendo] = useState(true);
  const [vozActiva, setVozActiva] = useState(true);
  const [completado, setCompletado] = useState(false);

  const saliendoRef = useRef(false);
  const pantallaEnfocadaRef = useRef(true);
  const zonasHabladasRef = useRef(new Set());

  const seccionActual = SECCIONES[indice];
  const esUltima = indice === SECCIONES.length - 1;

  const detenerVozSeguro = useCallback(() => {
    try {
      Speech.stop();
    } catch (e) {
      console.log("Error deteniendo Speech:", e);
    }
  }, []);

  const hablarInstruccion = useCallback(
    (texto) => {
      if (
        !vozActiva ||
        !texto ||
        saliendoRef.current ||
        !pantallaEnfocadaRef.current
      ) {
        return;
      }
      try {
        Speech.stop();
        Speech.speak(texto, {
          language: "es-MX",
          rate: 0.75,
          pitch: 1.14,
        });
      } catch (e) {
        console.log("Error en expo-speech:", e);
      }
    },
    [vozActiva],
  );

  // Detiene el audio siempre que la pantalla pierde el foco o vuelve a enfocarse
  useFocusEffect(
    useCallback(() => {
      pantallaEnfocadaRef.current = true;
      saliendoRef.current = false;

      return () => {
        pantallaEnfocadaRef.current = false;
        saliendoRef.current = true;
        detenerVozSeguro();
      };
    }, [detenerVozSeguro]),
  );

  // Solo establece los segundos de la zona cuando cambia el índice de zona
  useEffect(() => {
    if (completado || saliendoRef.current) return;
    setSegundosRestantes(SECCIONES[indice].segundos);
  }, [indice, completado]);

  // Reproduce la guía una sola vez por zona mientras esté corriendo y enfocada
  useEffect(() => {
    if (
      completado ||
      !corriendo ||
      !vozActiva ||
      saliendoRef.current ||
      !pantallaEnfocadaRef.current
    ) {
      return;
    }
    if (zonasHabladasRef.current.has(indice)) return;

    zonasHabladasRef.current.add(indice);
    hablarInstruccion(SECCIONES[indice].guiaVoz);
  }, [indice, completado, corriendo, vozActiva, hablarInstruccion]);

  const toggleVoz = () => {
    const siguiente = !vozActiva;
    setVozActiva(siguiente);
    if (!siguiente) {
      detenerVozSeguro();
    } else if (
      !completado &&
      corriendo &&
      !saliendoRef.current &&
      !zonasHabladasRef.current.has(indice)
    ) {
      zonasHabladasRef.current.add(indice);
      hablarInstruccion(seccionActual.guiaVoz);
    }
  };

  const cambiarAZona = useCallback(
    (nuevoIndice) => {
      if (saliendoRef.current) return;
      detenerVozSeguro();
      if (nuevoIndice < SECCIONES.length) {
        setIndice(nuevoIndice);
        setSegundosRestantes(SECCIONES[nuevoIndice].segundos);
        setCorriendo(true);
      } else {
        setCompletado(true);
        setCorriendo(false);
        if (vozActiva && pantallaEnfocadaRef.current && !saliendoRef.current) {
          Speech.speak(
            "Escaneo corporal completado... Toma un momento suave para sentir cómo estás.",
            { language: "es-MX", rate: 0.75, pitch: 1.14 },
          );
        }
      }
    },
    [vozActiva, detenerVozSeguro],
  );

  useEffect(() => {
    if (!corriendo || completado || saliendoRef.current) return;

    const interval = setInterval(() => {
      setSegundosRestantes((prev) => {
        if (prev > 1) return prev - 1;

        Vibration.vibrate([0, 140, 90, 140]);
        if (vozActiva && pantallaEnfocadaRef.current && !saliendoRef.current) {
          detenerVozSeguro();
          Speech.speak(
            indice < SECCIONES.length - 1
              ? "Muy bien... pasamos despacito a la siguiente zona."
              : "Listo... terminamos con mucha calma.",
            { language: "es-MX", rate: 0.75, pitch: 1.14 },
          );
        }

        if (indice < SECCIONES.length - 1) {
          setIndice((idx) => idx + 1);
          return SECCIONES[indice + 1].segundos;
        } else {
          setCompletado(true);
          setCorriendo(false);
          return 0;
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [corriendo, completado, indice, vozActiva, detenerVozSeguro]);

  useEffect(() => {
    return () => {
      saliendoRef.current = true;
      pantallaEnfocadaRef.current = false;
      detenerVozSeguro();
    };
  }, [detenerVozSeguro]);

  const handleSiguiente = () => {
    cambiarAZona(indice + 1);
  };

  const handleAnterior = () => {
    if (indice > 0) {
      cambiarAZona(indice - 1);
    }
  };

  const handleReiniciar = () => {
    saliendoRef.current = false;
    pantallaEnfocadaRef.current = true;
    detenerVozSeguro();
    zonasHabladasRef.current.clear();
    setCompletado(false);
    setIndice(0);
    setSegundosRestantes(SECCIONES[0].segundos);
    setCorriendo(true);
  };

  const handleSalir = () => {
    saliendoRef.current = true;
    pantallaEnfocadaRef.current = false;
    setCorriendo(false);
    detenerVozSeguro();
    navigation.navigate("Anxiosimetro");
  };

  return (
    <LinearGradient
      colors={["#EAF4F7", "#F4F7FA", "#EAE8FC"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.root}
    >
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleSalir}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={22} color="#1E3A4C" />
          </TouchableOpacity>

          <View style={styles.headerTextBlock}>
            <Text style={styles.headerLabel}>
              BODY SCAN (MINDFULNESS) · MÁX. 2:30
            </Text>
            <Text style={styles.headerTitle}>Escaneo corporal</Text>
          </View>

          <TouchableOpacity
            style={styles.voiceBtn}
            onPress={toggleVoz}
            activeOpacity={0.85}
          >
            <Ionicons
              name={vozActiva ? "volume-high-outline" : "volume-mute-outline"}
              size={18}
              color="#1E3A4C"
            />
            <Text style={styles.voiceBtnText}>
              {vozActiva ? "Voz ON" : "Voz OFF"}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.cardShell}>
            <View style={styles.techniqueBanner}>
              <Ionicons
                name="shield-checkmark-outline"
                size={16}
                color="#1E3A4C"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.techniqueBannerText}>
                Técnica psicológica de{" "}
                <Text style={{ fontWeight: "800" }}>
                  Escaneo Corporal (MBSR)
                </Text>{" "}
                · Duración total {formatTiempo(DURACION_TOTAL_SEG)} · Licencia
                libre y fines de ayuda
              </Text>
            </View>

            {completado ? (
              <View style={styles.completedBox}>
                <LamiEscanerCojin colorLaser="#53988E" escanerActivo={false} />
                <Text style={styles.completedTitle}>
                  Escaneo completado (2:30 máx.)
                </Text>
                <Text style={styles.completedText}>
                  Recorriste las 4 zonas corporales junto a Lami con guía por
                  voz y ritmo pausado. Esta técnica de atención plena ayuda a
                  notar tensiones y favorecer la calma.
                </Text>

                <TouchableOpacity
                  onPress={handleReiniciar}
                  activeOpacity={0.9}
                  style={{ width: "100%", marginTop: 14 }}
                >
                  <LinearGradient
                    colors={["#6192A4", "#7E83C2"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryFullBtn}
                  >
                    <Text style={styles.primaryButtonText}>
                      Repetir escaneo
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryFullBtn}
                  onPress={handleSalir}
                  activeOpacity={0.85}
                >
                  <Text style={styles.secondaryButtonText}>Volver</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.timerRow}>
                  <View>
                    <Text style={styles.zoneCounter}>
                      Zona {indice + 1} de {SECCIONES.length}
                    </Text>
                    <Text style={styles.sectionTitle}>
                      {seccionActual.titulo}
                    </Text>
                  </View>

                  <View style={styles.timerBadge}>
                    <Ionicons
                      name="timer-outline"
                      size={16}
                      color={seccionActual.colorLaser}
                    />
                    <Text
                      style={[
                        styles.timerText,
                        { color: seccionActual.colorLaser },
                      ]}
                    >
                      {formatTiempo(segundosRestantes)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        setCorriendo((prev) => {
                          const next = !prev;
                          if (!next) detenerVozSeguro();
                          return next;
                        });
                      }}
                      style={styles.pauseMiniBtn}
                    >
                      <Ionicons
                        name={corriendo ? "pause" : "play"}
                        size={14}
                        color="#1E3A4C"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <LamiEscanerCojin
                  colorLaser={seccionActual.colorLaser}
                  escanerActivo={corriendo}
                />

                <View style={styles.dotsRow}>
                  {SECCIONES.map((sec, i) => (
                    <View
                      key={sec.key}
                      style={[
                        styles.dot,
                        i === indice && {
                          backgroundColor: seccionActual.colorLaser,
                          width: 18,
                        },
                        i < indice && { backgroundColor: "#53988E" },
                      ]}
                    />
                  ))}
                </View>

                <Text style={styles.paragraph}>
                  {seccionActual.descripcion}
                </Text>

                <View style={styles.tipBox}>
                  <Ionicons
                    name="sparkles-outline"
                    size={18}
                    color="#3F3B7A"
                    style={{ marginRight: 8, marginTop: 1 }}
                  />
                  <Text style={styles.tipText}>{seccionActual.sugerencia}</Text>
                </View>

                <View style={styles.buttonsRow}>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={indice > 0 ? handleAnterior : handleSalir}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.secondaryButtonText}>
                      {indice > 0 ? "Anterior" : "Salir"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={handleSiguiente}
                    activeOpacity={0.9}
                  >
                    <Text style={styles.primaryButtonText}>
                      {esUltima ? "Finalizar" : "Siguiente zona"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            <Text style={styles.footnote}>
              Técnica psicológica de Escaneo Corporal (Mindfulness / MBSR) de
              licencia libre y con fines de ayuda y bienestar ( No sustituye la
              atención profesional).
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 8,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#B3D3DA",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextBlock: {
    flex: 1,
  },
  headerLabel: {
    fontSize: 9.5,
    color: "#6192A4",
    letterSpacing: 0.6,
    fontWeight: "800",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#1E3A4C",
  },
  voiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#8BC1D1",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  voiceBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1E3A4C",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  cardShell: {
    borderRadius: 26,
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderWidth: 1,
    borderColor: "#B3D3DA",
    shadowColor: "#6192A4",
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  techniqueBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F7F9",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#D6E8EE",
    marginBottom: 12,
  },
  techniqueBannerText: {
    flex: 1,
    fontSize: 11,
    color: "#2C4959",
    lineHeight: 15,
  },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 4,
  },
  zoneCounter: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#6192A4",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#1E3A4C",
  },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F4F7FA",
    borderWidth: 1,
    borderColor: "#D6E8EE",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  timerText: {
    fontSize: 15,
    fontWeight: "900",
  },
  pauseMiniBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E2EEF2",
    alignItems: "center",
    justifyContent: "center",
  },
  stageBox: {
    height: 215,
    alignItems: "center",
    justifyContent: "flex-end",
    marginVertical: 4,
  },
  lamiFloatingWrap: {
    width: 180,
    height: 165,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  eyesOverlay: {
    position: "absolute",
    top: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  laserBeamWrap: {
    position: "absolute",
    top: 0,
    width: 144,
    alignItems: "center",
    justifyContent: "center",
  },
  laserGlow: {
    position: "absolute",
    width: 132,
    height: 14,
    borderRadius: 7,
  },
  laserLine: {
    width: 136,
    height: 3,
    borderRadius: 2,
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 4,
  },
  cojinSvg: {
    marginTop: -6,
    zIndex: 1,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 6,
    marginBottom: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#D6E8EE",
    marginHorizontal: 4,
  },
  paragraph: {
    fontSize: 13.5,
    color: "#2C4959",
    lineHeight: 20,
    marginBottom: 10,
  },
  tipBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#EAE8FC",
    borderWidth: 1,
    borderColor: "#CEC7FD",
    borderRadius: 14,
    padding: 11,
    marginBottom: 10,
  },
  tipText: {
    fontSize: 12.5,
    color: "#3F3B7A",
    lineHeight: 18,
    flex: 1,
    fontWeight: "500",
  },
  buttonsRow: {
    flexDirection: "row",
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#8BC1D1",
    backgroundColor: "#F0F7F9",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontSize: 14,
    color: "#1E3A4C",
    fontWeight: "700",
  },
  primaryButton: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: "#7E83C2",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "800",
  },
  completedBox: {
    alignItems: "center",
    paddingVertical: 6,
  },
  completedTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#1E3A4C",
    marginTop: 6,
    textAlign: "center",
  },
  completedText: {
    fontSize: 13.5,
    color: "#3A5A6B",
    lineHeight: 20,
    textAlign: "center",
    marginTop: 6,
  },
  primaryFullBtn: {
    paddingVertical: 13,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryFullBtn: {
    width: "100%",
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#8BC1D1",
    backgroundColor: "#F0F7F9",
    alignItems: "center",
  },
  footnote: {
    marginTop: 12,
    fontSize: 10.5,
    color: "#617D8A",
    textAlign: "center",
    lineHeight: 15,
  },
});
