import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// sonidos
import exhaleSoundFile from "../assets/sounds/exhale.mp3";
import inhaleSoundFile from "../assets/sounds/inhale.mp3";

const PHASES = [
  {
    key: "inhale",
    label: "Inhala",
    seconds: 4,
    message: "Invita calma a tu cuerpo…",
    bg: "#FFEAF2",
  },
  {
    key: "hold",
    label: "Mantén",
    seconds: 7,
    message: "Permite que tu energía se estabilice…",
    bg: "#F4ECFF",
  },
  {
    key: "exhale",
    label: "Exhala",
    seconds: 8,
    message: "Deja ir la tensión… libérate…",
    bg: "#EAF7FF",
  },
];

const TOTAL_CYCLES = 4;

export default function Respiration478Screen({ navigation }) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(PHASES[0].seconds);
  const [cycle, setCycle] = useState(1);
  const [isRunning, setIsRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [soundOn, setSoundOn] = useState(false);

  const circleScale = useRef(new Animated.Value(1)).current;
  const timerRef = useRef(null);
  const currentPhase = PHASES[phaseIndex];

  // refs para audio y video
  const inhaleSoundRef = useRef(null);
  const exhaleSoundRef = useRef(null);
  const videoRef = useRef(null);

  // cargar sonidos
  useEffect(() => {
    async function loadSounds() {
      try {
        const inhaleObj = await Audio.Sound.createAsync(inhaleSoundFile);
        const exhaleObj = await Audio.Sound.createAsync(exhaleSoundFile);
        inhaleSoundRef.current = inhaleObj.sound;
        exhaleSoundRef.current = exhaleObj.sound;
      } catch (e) {
        console.log("Error cargando sonidos:", e);
      }
    }
    loadSounds();

    return () => {
      if (inhaleSoundRef.current) inhaleSoundRef.current.unloadAsync();
      if (exhaleSoundRef.current) exhaleSoundRef.current.unloadAsync();
    };
  }, []);

  // reproducir sonidos según fase
  useEffect(() => {
    async function playPhaseSound() {
      if (!soundOn) return;
      try {
        if (currentPhase.key === "inhale" && inhaleSoundRef.current) {
          await inhaleSoundRef.current.replayAsync();
        } else if (currentPhase.key === "exhale" && exhaleSoundRef.current) {
          await exhaleSoundRef.current.replayAsync();
        }
      } catch (e) {
        console.log("Error al reproducir sonido:", e);
      }
    }
    playPhaseSound();
  }, [currentPhase.key, soundOn]);

  // animación círculo
  const animateCircle = (phaseKey) => {
    let toValue = 1;
    if (phaseKey === "inhale") toValue = 1.25;
    if (phaseKey === "hold") toValue = 1.35;
    if (phaseKey === "exhale") toValue = 0.9;

    Animated.timing(circleScale, {
      toValue,
      duration: 600,
      useNativeDriver: true,
    }).start();
  };

  // temporizador
  useEffect(() => {
    if (!isRunning || finished) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    animateCircle(currentPhase.key);

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev > 1) return prev - 1;

        // cambio de fase
        if (phaseIndex < PHASES.length - 1) {
          const nextIdx = phaseIndex + 1;
          setPhaseIndex(nextIdx);
          return PHASES[nextIdx].seconds;
        }

        // terminó exhalación 
        if (cycle < TOTAL_CYCLES) {
          const nextCycle = cycle + 1;
          setCycle(nextCycle);
          setPhaseIndex(0);
          return PHASES[0].seconds;
        }

        // terminó todo
        setFinished(true);
        setIsRunning(false);
        return 0;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, phaseIndex, cycle, finished, currentPhase.key]);

  const handleStart = () => {
    if (finished) return;
    setIsRunning(true);
    setPhaseIndex(0);
    setSecondsLeft(PHASES[0].seconds);
    setCycle(1);
    setFinished(false);
  };

  const handleRepeat = () => {
    setPhaseIndex(0);
    setSecondsLeft(PHASES[0].seconds);
    setCycle(1);
    setFinished(false);
    setIsRunning(true);
    if (videoRef.current) {
      videoRef.current.setPositionAsync(0);
    }
  };

  const handleBackToChecking = () => {
    navigation.navigate("Checking");
  };

  const handleBackToAnxiosimetro = () => {
    navigation.navigate("Anxiosimetro");
  };

  const renderCycleDots = () => {
    const dots = [];
    for (let i = 1; i <= TOTAL_CYCLES; i++) {
      const active = i <= cycle && !finished;
      const done = finished;
      dots.push(
        <View
          key={i}
          style={[
            styles.cycleDot,
            active && styles.cycleDotActive,
            done && styles.cycleDotDone,
          ]}
        />
      );
    }
    return <View style={styles.cycleRow}>{dots}</View>;
  };

  //  PANTALLA FINAL 
  if (finished) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />

        <View style={styles.finishedBackground}>
          {/* Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={handleBackToChecking}>
              <Ionicons name="chevron-back" size={26} color="#2B223D" />
            </TouchableOpacity>
            <Text style={styles.smallVersion}>Respira 4·7·8</Text>
            <View style={{ width: 26 }} />
          </View>

          {/* Scroll para que siempre se vean botones + video */}
          <ScrollView
            contentContainerStyle={styles.finishedContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.appTitle}>Ejercicio completado</Text>
            <Text style={styles.sectionLabel}>Tu momento de calma</Text>

            <View style={styles.resultCardMindmate}>
              <Text style={styles.finishedEmoji}>✨</Text>
              <Text style={styles.finishedTitle}>¡Lo lograste!</Text>
              <Text style={styles.finishedText}>
                Completaste los 4 ciclos de respiración. Tu cuerpo recibió un
                mensaje de calma y tu mente tiene un poquito más de espacio para
                descansar.
              </Text>
            </View>

            <View style={styles.chipRow}>
              <View style={[styles.chip, { backgroundColor: "#E5F7E9" }]}>
                <Text style={[styles.chipText, { color: "#2D7A46" }]}>
                  Calm ↓
                </Text>
              </View>
              <View style={[styles.chip, { backgroundColor: "#FDEBFF" }]}>
                <Text style={[styles.chipText, { color: "#B454B4" }]}>
                  Ansiedad ↘
                </Text>
              </View>
              <View style={[styles.chip, { backgroundColor: "#EAF3FF" }]}>
                <Text style={[styles.chipText, { color: "#4460B6" }]}>
                  Sueño 😴
                </Text>
              </View>
            </View>

            <View style={styles.tipCard}>
              <Text style={styles.tipTitle}>Tip para ti 🌷</Text>
              <Text style={styles.tipText}>
                Usa esta respiración antes de dormir, después de una discusión,
                o cuando sientas que todo va muy rápido. Tu respiración siempre
                es un lugar al que puedes volver.
              </Text>
            </View>

            {/* Video */}
            <View style={styles.videoCard}>
              <Text style={styles.tipTitle}>Profundiza con el video 🎬</Text>
              <Text style={styles.tipText}>
                Aquí tienes un video de respiración guiada para seguir
                practicando cuando lo necesites. Ponte audífonos si puedes y
                regálate unos minutos más de calma.
              </Text>

              <Video
                ref={videoRef}
                source={require("../assets/Respiracion/respiracion478.mp4")}
                style={styles.video}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                isLooping
                shouldPlay
              />
            </View>

            {/* Botones */}
            <TouchableOpacity onPress={handleRepeat} style={{ marginTop: 20 }}>
              <LinearGradient
                colors={["#FFB4C6", "#FFD9A0"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientButton}
              >
                <Text style={styles.gradientButtonText}>
                  Repetir ejercicio
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleBackToChecking}
            >
              <Text style={styles.secondaryButtonText}>
                Volver a Checking
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, { marginTop: 10 }]}
              onPress={handleBackToAnxiosimetro}
            >
              <Text style={styles.secondaryButtonText}>
                Volver a Anxiosímetro
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  // PANTALLA PRINCIPAL
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View
        style={[
          styles.pastelBackground,
          { backgroundColor: currentPhase.bg },
        ]}
      >
        {/* HEADER */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={handleBackToChecking}>
            <Ionicons name="chevron-back" size={26} color="#2B223D" />
          </TouchableOpacity>

          <View style={styles.pill}>
            <Text style={styles.pillText}>Respira 4·7·8</Text>
          </View>

          <TouchableOpacity>
            <Ionicons name="ellipsis-horizontal" size={22} color="#C4B4D9" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* HERO */}
          <View style={styles.heroCard}>
            <Text style={styles.heroTitle}>Unlock the power of your breath</Text>
            <Text style={styles.heroSubtitle}>
              Inhala 4, mantén 7, exhala 8. Vamos a hacer 4 ciclos juntas para
              darle a tu mente un pequeño descanso.
            </Text>

            <View style={styles.chipRow}>
              <View style={styles.chip}>
                <Text style={styles.chipText}>Calma mental</Text>
              </View>
              <View style={[styles.chip, { backgroundColor: "#FFEAF6" }]}>
                <Text style={[styles.chipText, { color: "#C23C85" }]}>
                  Ansiedad alta
                </Text>
              </View>
              <View style={[styles.chip, { backgroundColor: "#EAF7FF" }]}>
                <Text style={[styles.chipText, { color: "#3F70A9" }]}>
                  3–5 min
                </Text>
              </View>
            </View>
          </View>

          {/* Centro: círculo + texto de fase */}
          <View style={styles.centerBlock}>
            <Animated.View
              style={[
                styles.breathCircle,
                { transform: [{ scale: circleScale }] },
              ]}
            >
              <Text style={styles.phaseLabel}>{currentPhase.label}</Text>
              <Text style={styles.timerText}>
                {String(secondsLeft).padStart(2, "0")}s
              </Text>
            </Animated.View>

            <Text style={styles.phaseMessage}>{currentPhase.message}</Text>
            {renderCycleDots()}
            <Text style={styles.cycleLabel}>
              Ciclo {cycle} de {TOTAL_CYCLES}
            </Text>
          </View>

          {/* Parte de abajo */}
          <View style={styles.bottomBlock}>
            <TouchableOpacity
              style={[
                styles.audioToggle,
                soundOn && styles.audioToggleActive,
              ]}
              onPress={() => setSoundOn((prev) => !prev)}
            >
              <Ionicons
                name={soundOn ? "volume-high" : "volume-mute"}
                size={18}
                color={soundOn ? "#FFFFFF" : "#4D4768"}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.audioToggleText,
                  soundOn && { color: "#FFFFFF" },
                ]}
              >
                Guía con sonido
              </Text>
            </TouchableOpacity>

            <View style={styles.tipMiniBox}>
              <Text style={styles.tipMiniText}>
                Baja los hombros, relaja la cara, y deja que el aire entre
                suave. No necesitas hacerlo perfecto, solo presente. 💜
              </Text>
            </View>

            <TouchableOpacity onPress={handleStart}>
              <LinearGradient
                colors={["#FFB4C6", "#FFD9A0"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.gradientButton,
                  isRunning && { opacity: 0.85 },
                ]}
              >
                <Text style={styles.gradientButtonText}>
                  {isRunning ? "Respirando…" : "Empezar respiración"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ESTILOS 
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4E8FF",
  },
  pastelBackground: {
    flex: 1,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    elevation: 2,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#7D5CA6",
  },
  smallVersion: {
    fontSize: 12,
    fontWeight: "700",
    color: "#A889B9",
  },

  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
    justifyContent: "space-between",
  },

  heroCard: {
    padding: 18,
    borderRadius: 26,
    backgroundColor: "#FFFFFF",
    shadowColor: "#D7C2F0",
    shadowOpacity: 0.6,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#2B223D",
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 13,
    color: "#6A6682",
    lineHeight: 18,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 14,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#EAF4FF",
    marginRight: 8,
    marginBottom: 6,
  },
  chipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4460B6",
  },

  centerBlock: {
    alignItems: "center",
    marginTop: 10,
  },
  breathCircle: {
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#E1BDD7",
    shadowOpacity: 0.7,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  phaseLabel: {
    fontSize: 20,
    fontWeight: "800",
    color: "#2B223D",
  },
  timerText: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: "900",
    color: "#F49AB3",
  },
  phaseMessage: {
    marginTop: 14,
    fontSize: 14,
    color: "#4D4768",
    textAlign: "center",
    lineHeight: 20,
  },

  cycleRow: {
    flexDirection: "row",
    marginTop: 16,
  },
  cycleDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 4,
    backgroundColor: "#E2CFEF",
  },
  cycleDotActive: {
    backgroundColor: "#F49AB3",
  },
  cycleDotDone: {
    backgroundColor: "#7EC4A6",
  },
  cycleLabel: {
    marginTop: 6,
    fontSize: 13,
    color: "#7A6E95",
  },

  bottomBlock: {
    marginTop: 10,
  },
  audioToggle: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#F4E9FF",
  },
  audioToggleActive: {
    backgroundColor: "#F49AB3",
  },
  audioToggleText: {
    fontSize: 12,
    color: "#4D4768",
    fontWeight: "600",
  },
  tipMiniBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },
  tipMiniText: {
    fontSize: 13,
    color: "#4D4768",
    lineHeight: 18,
  },

  gradientButton: {
    marginTop: 16,
    width: "100%",
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  gradientButtonText: {
    color: "#2B223D",
    fontWeight: "800",
    fontSize: 15,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },

  finishedBackground: {
    flex: 1,
    backgroundColor: "#F6ECFF",
  },
  finishedContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#2B223D",
    textAlign: "center",
  },
  sectionLabel: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "700",
    color: "#A889B9",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
  resultCardMindmate: {
    marginTop: 18,
    padding: 22,
    borderRadius: 30,
    backgroundColor: "#FFFFFF",
    shadowColor: "#D7C2F0",
    shadowOpacity: 0.7,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 5,
  },
  finishedEmoji: {
    fontSize: 32,
    textAlign: "center",
    marginBottom: 6,
  },
  finishedTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#2B223D",
    textAlign: "center",
  },
  finishedText: {
    marginTop: 8,
    fontSize: 14,
    color: "#4D4768",
    lineHeight: 20,
    textAlign: "center",
  },

  tipCard: {
    marginTop: 18,
    padding: 18,
    borderRadius: 24,
    backgroundColor: "#FFF7E8",
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#C57A34",
    marginBottom: 6,
  },
  tipText: {
    fontSize: 13,
    color: "#7A5A36",
    lineHeight: 18,
    fontWeight: "500",
  },

  videoCard: {
    marginTop: 16,
    padding: 18,
    borderRadius: 24,
    backgroundColor: "#EAF7FF",
  },
  video: {
    width: "100%",
    height: 220,
    borderRadius: 20,
    marginTop: 12,
    backgroundColor: "#000",
  },

  secondaryButton: {
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F49AB3",
    backgroundColor: "transparent",
  },
  secondaryButtonText: {
    color: "#F49AB3",
    fontWeight: "700",
    fontSize: 15,
    letterSpacing: 1,
  },
});




