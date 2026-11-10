// Autoabrazo.js
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const DURATIONS = [
  { label: "2 min", value: 120 },
  { label: "3 min", value: 180 },
  { label: "4 min", value: 240 },
];

const EMOJIS = ["🤗", "💗", "🌸", "🫶"];

export default function AutoabrazoScreen({ navigation }) {
  const [selectedDuration, setSelectedDuration] = useState(DURATIONS[1].value); // 3 min
  const [remaining, setRemaining] = useState(DURATIONS[1].value);
  const [isRunning, setIsRunning] = useState(false);

  const [breathPhase, setBreathPhase] = useState("Inhala suave");
  const [breathCount, setBreathCount] = useState(0);

  const [selectedFeeling, setSelectedFeeling] = useState(null);

  // Sonido suave
  const [soundOn, setSoundOn] = useState(false);
  const [sound, setSound] = useState(null); //guardamos el objeto de audio

  const [emojiIndex, setEmojiIndex] = useState(0);

  // ------------------ TIMER ------------------
  useEffect(() => {
    let timer = null;

    if (isRunning && remaining > 0) {
      timer = setInterval(() => {
        setRemaining((prev) => {
          const next = prev - 1;
          return next >= 0 ? next : 0;
        });

        setBreathCount((prev) => prev + 1);
      }, 1000);
    }

    if (remaining === 0 && isRunning) {
      setIsRunning(false);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRunning, remaining]);

  // Fase de respiración
  useEffect(() => {
    const cycle = breathCount % 10;
    if (cycle < 4) setBreathPhase("Inhala suave");
    else setBreathPhase("Exhala lento");
  }, [breathCount]);

  // Emoji que va cambiando
  useEffect(() => {
    const interval = setInterval(() => {
      setEmojiIndex((prev) => (prev + 1) % EMOJIS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Limpieza del sonido cuando se desmonta la pantalla
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const handlePlayPause = () => {
    if (remaining === 0) {
      setRemaining(selectedDuration);
      setBreathCount(0);
    }
    setIsRunning((prev) => !prev);
  };

  const handleChangeDuration = (value) => {
    setSelectedDuration(value);
    setRemaining(value);
    setIsRunning(false);
    setBreathCount(0);
  };

  const handleReset = () => {
    setRemaining(selectedDuration);
    setIsRunning(false);
    setBreathCount(0);
    setSelectedFeeling(null);
  };

  // 🔊 NUEVO: manejar encendido/apagado del sonido suave
  const handleToggleSound = async () => {
    const next = !soundOn;
    setSoundOn(next);

    try {
      if (next) {
        // Encender sonido
        let currentSound = sound;
        if (!currentSound) {
          const { sound: createdSound } = await Audio.Sound.createAsync(
            require("../assets/Respiracion/cancion.mp3"), 
            {
              isLooping: true,
            }
          );
          setSound(createdSound);
          currentSound = createdSound;
        }
        await currentSound.playAsync();
      } else {
        // Apagar sonido
        if (sound) {
          await sound.stopAsync();
        }
      }
    } catch (e) {
      console.log("Error al manejar el sonido suave:", e);
    }
  };

  const minutes = String(Math.floor(remaining / 60)).padStart(2, "0");
  const seconds = String(remaining % 60).padStart(2, "0");

  const progress = 1 - remaining / selectedDuration;
  const heartLevel = Math.min(5, Math.max(0, Math.round(progress * 5)));

  const feelingsOptions = ["Más tranquila", "Igual", "Un poco tensa"];

  return (
    <LinearGradient
      colors={["#FDF2FF", "#E0F2FE"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* HEADER */}
          <Text style={styles.title}>Autoabrazo consciente</Text>
          <Text style={styles.subtitle}>
            Cruza los brazos y abrázate. Inhala y exhala lento mientras repites:
            {"\n"}
            <Text style={styles.highlight}>"Estoy aquí conmigo."</Text>
          </Text>

          {/* TIMER PRINCIPAL */}
          <LinearGradient
            colors={["#FF8BD5", "#A855F7", "#60A5FA"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.timerCard}
          >
            <View style={styles.timerCircleOuter}>
              <View style={[styles.timerCircleProgress, { opacity: 0.25 }]} />
              <View
                style={[
                  styles.timerCircleProgress,
                  {
                    transform: [{ scale: 0.95 + progress * 0.08 }],
                    opacity: 0.5,
                    borderColor: "rgba(255,255,255,0.9)",
                  },
                ]}
              />

              <View style={styles.timerCircleInner}>
                <Text style={styles.bigEmoji}>{EMOJIS[emojiIndex]}</Text>

                <Text style={styles.timerLabel}>Tiempo restante</Text>
                <Text style={styles.timerText}>
                  {minutes}:{seconds}
                </Text>

                <TouchableOpacity
                  style={styles.playButton}
                  onPress={handlePlayPause}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={isRunning ? "pause" : "play"}
                    size={28}
                    color="#7C3AED"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>

          {/* DURACIÓN RECOMENDADA */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Duración recomendada</Text>
            <Text style={styles.sectionText}>
              Puedes ajustar el tiempo según lo que necesites hoy.{"\n"}
              <Text style={styles.highlight}>
                Elige un tiempo entre 2 y 4 minutos.
              </Text>
            </Text>

            <View style={styles.durationRow}>
              {DURATIONS.map((d) => {
                const active = d.value === selectedDuration;
                return (
                  <TouchableOpacity
                    key={d.value}
                    style={[
                      styles.durationChip,
                      active && styles.durationChipActive,
                    ]}
                    onPress={() => handleChangeDuration(d.value)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.durationChipText,
                        active && styles.durationChipTextActive,
                      ]}
                    >
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Toggle de sonido suave usando la canción */}
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[
                  styles.toggleChip,
                  soundOn && styles.toggleChipActive,
                ]}
                onPress={handleToggleSound}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={soundOn ? "volume-high" : "volume-mute"}
                  size={18}
                  color={soundOn ? "#4C1D95" : "#6B7280"}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.toggleChipText,
                    soundOn && styles.toggleChipTextActive,
                  ]}
                >
                  Sonido suave
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* GUÍA DE RESPIRACIÓN */}
          <View style={styles.card}>
            <View style={styles.rowAlign}>
              <LinearGradient
                colors={["#FDE7FF", "#BFDBFE"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconBubble}
              >
                <Text style={styles.iconText}>💞</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Guía de respiración</Text>
                <Text style={styles.sectionText}>
                  Mantén tu autoabrazo mientras sigues el ritmo.
                </Text>
              </View>
            </View>

            <LinearGradient
              colors={["#F9FAFB", "#F5E1FF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.breathBox}
            >
              <Text style={styles.breathPhase}>{breathPhase}</Text>
              <View style={styles.breathBarBackground}>
                <View
                  style={[
                    styles.breathBarFill,
                    {
                      width:
                        breathPhase === "Inhala suave" ? "40%" : "60%",
                    },
                  ]}
                />
              </View>
              <Text style={styles.breathHint}>
                Inhala 4 segundos, exhala 6.{"\n"}
                Imagina que cada exhalación ablanda un poquito más tus hombros.
              </Text>
            </LinearGradient>
          </View>

          {/* PEQUEÑOS LOGROS */}
          <View style={styles.cardAlt}>
            <Text style={styles.sectionTitle}>Pequeños logros de hoy</Text>
            <Text style={styles.sectionText}>
              A medida que el tiempo avanza, tus corazones se van llenando.
            </Text>

            <View style={styles.heartsRow}>
              {Array.from({ length: 5 }).map((_, index) => {
                const filled = index < heartLevel;
                return (
                  <Text
                    key={index}
                    style={[
                      styles.heartIcon,
                      filled && styles.heartIconFilled,
                    ]}
                  >
                    {filled ? "💖" : "🤍"}
                  </Text>
                );
              })}
            </View>
            <Text style={styles.heartsHint}>
              {heartLevel === 0
                ? "Cuando empieces, verás cómo se encienden."
                : heartLevel < 5
                ? "Sigue un poquito más, tus corazones casi se llenan."
                : "Completaste tu autoabrazo de hoy. Muy bien 💜"}
            </Text>
          </View>

          {/* TIPS EXTRA */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Tips para este momento</Text>
            <Text style={styles.sectionText}>
              Puedes probar algunas de estas ideas mientras te sostienes en el
              abrazo:
            </Text>

            <View style={styles.tipsRow}>
              {[
                "Respira por la nariz",
                "Relaja la mandíbula",
                "Suaviza la mirada",
              ].map((tip) => (
                <View key={tip} style={styles.tipChip}>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* REFLEXIÓN */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Después del autoabrazo</Text>
            <Text style={styles.sectionText}>
              Cuando termines, puedes notar cómo cambió tu cuerpo:
            </Text>
            <View style={styles.feelingsRow}>
              {feelingsOptions.map((label) => {
                const active = selectedFeeling === label;
                return (
                  <TouchableOpacity
                    key={label}
                    style={[
                      styles.feelingTag,
                      active && styles.feelingTagActive,
                    ]}
                    onPress={() => setSelectedFeeling(label)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.feelingText,
                        active && styles.feelingTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {selectedFeeling && (
              <Text style={styles.selectedFeelingNote}>
                Guardado mentalmente:{" "}
                <Text style={styles.highlight}>{selectedFeeling}</Text>. 💜
              </Text>
            )}
          </View>

          {/* BOTONES */}
          <View style={styles.footerButtons}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleReset}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Reiniciar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation && navigation.goBack()}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Volver</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#312E81",
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 16,
  },
  highlight: {
    color: "#7C3AED",
    fontWeight: "600",
  },
  timerCard: {
    borderRadius: 28,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  timerCircleOuter: {
    alignItems: "center",
    justifyContent: "center",
  },
  timerCircleProgress: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 10,
    borderColor: "rgba(255,255,255,0.8)",
  },
  timerCircleInner: {
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "rgba(255,255,255,0.97)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  bigEmoji: {
    fontSize: 30,
    marginBottom: 4,
  },
  timerLabel: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 4,
  },
  timerText: {
    fontSize: 36,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  playButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#E0D4FF",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  cardAlt: {
    backgroundColor: "#FEF3FF",
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#F9A8FF",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  sectionText: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 8,
  },
  durationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  durationChip: {
    flex: 1,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  durationChipActive: {
    backgroundColor: "#E0D4FF",
    borderColor: "#A855F7",
  },
  durationChipText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  durationChipTextActive: {
    color: "#4C1D95",
  },
  toggleRow: {
    flexDirection: "row",
    marginTop: 10,
  },
  toggleChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  toggleChipActive: {
    backgroundColor: "#F3E8FF",
    borderColor: "#A855F7",
  },
  toggleChipText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  toggleChipTextActive: {
    color: "#4C1D95",
  },
  rowAlign: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  iconBubble: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  iconText: {
    fontSize: 24,
  },
  breathBox: {
    marginTop: 6,
    padding: 10,
    borderRadius: 18,
  },
  breathPhase: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4C1D95",
    marginBottom: 6,
    textAlign: "center",
  },
  breathBarBackground: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
    marginBottom: 6,
  },
  breathBarFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#A855F7",
  },
  breathHint: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
  heartsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 4,
    marginBottom: 4,
  },
  heartIcon: {
    fontSize: 26,
    marginHorizontal: 4,
    opacity: 0.5,
  },
  heartIconFilled: {
    opacity: 1,
  },
  heartsHint: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 4,
  },
  tipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
  },
  tipChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#DBEAFE",
    marginRight: 6,
    marginTop: 6,
  },
  tipText: {
    fontSize: 12,
    color: "#1D4ED8",
  },
  feelingsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
  },
  feelingTag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#EFF6FF",
    marginRight: 6,
    marginTop: 6,
  },
  feelingTagActive: {
    backgroundColor: "#A855F7",
  },
  feelingText: {
    fontSize: 12,
    color: "#374151",
  },
  feelingTextActive: {
    color: "#FFFFFF",
  },
  selectedFeelingNote: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 8,
  },
  footerButtons: {
    flexDirection: "row",
    marginTop: 8,
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#4B5563",
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "#A855F7",
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

