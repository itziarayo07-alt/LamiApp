import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Imágenes por pregunta
const ILLUSTRATIONS = {
  2: require("../assets/p2.jpg"),
  3: require("../assets/p3.jpg"),
  4: require("../assets/p4.jpg"),
  5: require("../assets/p5.jpg"),
  6: require("../assets/p6.jpg"),
  7: require("../assets/p7.jpg"),
  8: require("../assets/p8.jpg"),
  9: require("../assets/p9.jpg"),
  10: require("../assets/p10.jpg"),
  11: require("../assets/p11.jpg"),
  12: require("../assets/p12.jpg"),
};

const PREGUNTAS = [
  {
    id: 1,
    tipo: "mood",
    titulo: "¿Cómo te sientes hoy?",
  },
  {
    id: 2,
    tipo: "scale",
    titulo: "¿Cómo ha sido tu nivel de preocupación general hoy?",
    opciones: [
      { id: "nada", label: "Nada" },
      { id: "poco", label: "Poco" },
      { id: "moderado", label: "Moderado" },
      { id: "alto", label: "Alto" },
    ],
  },
  {
    id: 3,
    tipo: "scale",
    titulo: "¿Qué tan intensa ha sido tu tensión física?",
    opciones: [
      { id: "nada", label: "Nada" },
      { id: "leve", label: "Leve" },
      { id: "moderada", label: "Moderada" },
      { id: "fuerte", label: "Fuerte" },
    ],
  },
  {
    id: 4,
    tipo: "scale",
    titulo: "¿Sentiste pensamientos repetitivos difíciles de detener?",
    opciones: [
      { id: "no", label: "No" },
      { id: "un_poco", label: "Un poco" },
      { id: "varias_veces", label: "Varias veces" },
      { id: "muchas_veces", label: "Muchas veces" },
    ],
  },
  {
    id: 5,
    tipo: "scale",
    titulo: "¿Cómo estuvo tu nivel de energía hoy?",
    opciones: [
      { id: "muy_baja", label: "Muy baja" },
      { id: "baja", label: "Baja" },
      { id: "normal", label: "Normal" },
      { id: "alta", label: "Alta" },
    ],
  },
  {
    id: 6,
    tipo: "scale",
    titulo: "¿Qué tan difícil fue concentrarte en tus actividades?",
    opciones: [
      { id: "no_dificil", label: "No fue difícil" },
      { id: "poco_dificil", label: "Un poco difícil" },
      { id: "bastante_dificil", label: "Bastante difícil" },
      { id: "muy_dificil", label: "Muy difícil" },
    ],
  },
  {
    id: 7,
    tipo: "scale",
    titulo: "¿Tuviste sensación de inquietud o necesidad de moverte?",
    opciones: [
      { id: "no", label: "No" },
      { id: "leve", label: "Leve" },
      { id: "moderada", label: "Moderada" },
      { id: "alta", label: "Alta" },
    ],
  },
  {
    id: 8,
    tipo: "scale",
    titulo: "¿Cómo manejaste el estrés hoy?",
    opciones: [
      { id: "muy_bien", label: "Muy bien" },
      { id: "bien", label: "Bien" },
      { id: "regular", label: "Regular" },
      { id: "mal", label: "Mal" },
    ],
  },
  {
    id: 9,
    tipo: "scale",
    titulo: "¿Tuviste pensamientos negativos sobre ti misma?",
    opciones: [
      { id: "nunca", label: "Nunca" },
      { id: "a_veces", label: "A veces" },
      { id: "varias_veces", label: "Varias veces" },
      { id: "muy_frecuentes", label: "Muy frecuentes" },
    ],
  },
  {
    id: 10,
    tipo: "scale",
    titulo: "¿Te sentiste apoyada por alguien hoy?",
    opciones: [
      { id: "mucho", label: "Sí, mucho" },
      { id: "un_poco", label: "Sí, un poco" },
      { id: "poco", label: "Poco" },
      { id: "nada", label: "Nada" },
    ],
  },
  {
    id: 11,
    tipo: "scale",
    titulo: "¿Tuviste momentos de calma o tranquilidad?",
    opciones: [
      { id: "varios", label: "Sí, varios" },
      { id: "algunos", label: "Sí, algunos" },
      { id: "pocos", label: "Muy pocos" },
      { id: "ninguno", label: "Ninguno" },
    ],
  },
  {
    id: 12,
    tipo: "scale",
    titulo: "Nivel general de bienestar del día:",
    opciones: [
      { id: "bueno", label: "Bueno" },
      { id: "regular", label: "Regular" },
      { id: "dificil", label: "Difícil" },
      { id: "muy_dificil", label: "Muy difícil" },
    ],
  },
];

// Mapeo de puntajes de la pregunta 1 (caritas)
const MOOD_SCORE_MAP = {
  extasis: 0,
  muy_feliz: 0,
  feliz: 1,
  emocion: 1,
  calma: 1,
  neutral: 2,
  triste: 3,
  estres: 3,
  muy_triste: 4,
  ansiedad: 4,
};

// Emociones (pregunta 1)
const EMOCIONES = [
  {
    id: "extasis",
    label: "Éxtasis",
    emoji: "🤩",
    color: "#FDBA74",
    anim: "pop",
  },
  {
    id: "muy_feliz",
    label: "Muy feliz",
    emoji: "😁",
    color: "#FBBF24",
    anim: "bounceUp",
  },
  {
    id: "feliz",
    label: "Feliz",
    emoji: "😊",
    color: "#A3E635",
    anim: "bounceUp",
  },
  {
    id: "neutral",
    label: "Neutral",
    emoji: "😐",
    color: "#FACC15",
    anim: "subtle",
  },
  {
    id: "triste",
    label: "Triste",
    emoji: "🙁",
    color: "#93C5FD",
    anim: "bounceDown",
  },
  {
    id: "muy_triste",
    label: "Muy triste",
    emoji: "😢",
    color: "#60A5FA",
    anim: "bounceDown",
  },
  {
    id: "ansiedad",
    label: "Ansiedad",
    emoji: "😰",
    color: "#C4B5FD",
    anim: "shake",
  },
  {
    id: "estres",
    label: "Estrés",
    emoji: "😫",
    color: "#FB7185",
    anim: "shake",
  },
  {
    id: "emocion",
    label: "Emoción",
    emoji: "🤗",
    color: "#34D399",
    anim: "wobble",
  },
  {
    id: "calma",
    label: "Calma",
    emoji: "😌",
    color: "#6EE7B7",
    anim: "subtle",
  },
];

//  Mapeo del mood del test a la emoción del CalendarioEmocional
function mapMoodToCalendarEmotion(moodId) {
  switch (moodId) {
    case "extasis":
      return { label: "Éxtasis 🤩", color: "#FFB74D", value: 6 };
    case "muy_feliz":
      return { label: "Muy Feliz 😀", color: "#FFD54F", value: 5 };
    case "feliz":
    case "emocion":
      return { label: "Feliz 🙂", color: "#AED581", value: 4 };
    case "neutral":
      return { label: "Neutral 😐", color: "#90A4AE", value: 3 };
    case "calma":
      return { label: "Calmado 😌", color: "#81C784", value: 4 };
    case "triste":
      return { label: "Triste 🙁", color: "#64B5F6", value: 2 };
    case "muy_triste":
      return { label: "Muy Triste 😢", color: "#42A5F5", value: 1 };
    case "ansiedad":
      return { label: "Ansioso 😰", color: "#BA68C8", value: 2 };
    case "estres":
      return { label: "Estresado 😓", color: "#E57373", value: 1 };
    default:
      return { label: "Sin registro", color: "#9CA3AF", value: 0 };
  }
}

// Guardar la emoción del día en AsyncStorage para el calendario
async function guardarEmocionEnCalendario(moodId) {
  if (!moodId) return;

  const emotion = mapMoodToCalendarEmotion(moodId);

  const today = new Date();
  const dateKey = today.toISOString().slice(0, 10); // YYYY-MM-DD

  try {
    const existing = await AsyncStorage.getItem("dayFeelings_v1");
    let parsed = {};
    if (existing) {
      parsed = JSON.parse(existing);
    }

    parsed[dateKey] = emotion;

    await AsyncStorage.setItem("dayFeelings_v1", JSON.stringify(parsed));

    console.log("Emoción guardada para", dateKey, emotion);
  } catch (e) {
    console.warn("Error guardando emoción en calendario:", e);
  }
}

function MoodItem({ emotion, selected, onSelect }) {
  const animValue = useRef(new Animated.Value(0)).current;

  const startAnimation = () => {
    animValue.setValue(0);
    Animated.sequence([
      Animated.timing(animValue, {
        toValue: 1,
        duration: 240,
        useNativeDriver: true,
      }),
      Animated.spring(animValue, {
        toValue: 0,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();
  };

  useEffect(() => {
    if (selected) {
      startAnimation();
    }
  }, [selected]);

  const handlePress = () => {
    onSelect(emotion);
    startAnimation();
  };

  let scaleRange = [1, 1.05];
  let translateYRange = [0, 0];
  let rotateRange = ["0deg", "0deg"];
  let useShake = false;

  switch (emotion.anim) {
    case "pop":
      scaleRange = [1, 1.2];
      break;
    case "bounceUp":
      translateYRange = [0, -10];
      scaleRange = [1, 1.12];
      break;
    case "bounceDown":
      translateYRange = [0, 8];
      scaleRange = [1, 1.06];
      break;
    case "shake":
      useShake = true;
      scaleRange = [1, 1.07];
      break;
    case "wobble":
      rotateRange = ["0deg", "8deg"];
      scaleRange = [1, 1.08];
      break;
    case "subtle":
      translateYRange = [0, -3];
      scaleRange = [1, 1.03];
      break;
  }

  if (selected && !useShake) {
    scaleRange = [scaleRange[0] * 1.02, scaleRange[1] * 1.1];
  }

  const scale = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: scaleRange,
  });

  const translateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: translateYRange,
  });

  const translateX = useShake
    ? animValue.interpolate({
        inputRange: [0, 0.25, 0.5, 0.75, 1],
        outputRange: [0, -5, 5, -3, 0],
      })
    : 0;

  const rotate = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: rotateRange,
  });

  const sparkleOpacity =
    emotion.anim === "pop"
      ? animValue.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0, 1, 0],
        })
      : 0;

  const sparkleScale =
    emotion.anim === "pop"
      ? animValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0.8, 1.4],
        })
      : 1;

  return (
    <TouchableOpacity
      style={styles.moodItem}
      activeOpacity={0.85}
      onPress={handlePress}
    >
      {emotion.anim === "pop" && (
        <Animated.View
          style={[
            styles.sparkleWrapper,
            {
              opacity: sparkleOpacity,
              transform: [{ scale: sparkleScale }],
            },
          ]}
        >
          <Text style={styles.sparkleText}>✨</Text>
        </Animated.View>
      )}

      <Animated.View style={styles.moodCircleOuter}>
        <Animated.View
          style={[
            styles.moodCircle,
            { backgroundColor: emotion.color },
            selected && styles.moodCircleSelected,
            {
              transform: [{ scale }, { translateY }, { translateX }, { rotate }],
            },
          ]}
        >
          <Text style={styles.moodEmoji}>{emotion.emoji}</Text>
        </Animated.View>
      </Animated.View>

      <Text
        style={[styles.moodLabel, selected && styles.moodLabelSelected]}
        numberOfLines={2}
      >
        {emotion.label}
      </Text>
    </TouchableOpacity>
  );
}

export default function TestDiario({ navigation }) {
  const [currentIndex, setCurrentIndex] = useState(0); // 0..11
  const [selectedMood, setSelectedMood] = useState(null);
  const [answers, setAnswers] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);
  const successAnim = useRef(new Animated.Value(0)).current;

  const currentQuestion = PREGUNTAS[currentIndex];
  const isMoodStep = currentQuestion.tipo === "mood";
  const isLastQuestion = currentQuestion.id === 12;

  const selectedEmotion =
    EMOCIONES.find((e) => e.id === selectedMood) || null;

  const irASiguiente = () => {
    if (currentIndex < PREGUNTAS.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleSelectMood = (emotion) => {
    setSelectedMood(emotion.id);
    setAnswers((prev) => ({ ...prev, 1: emotion.id }));
  };

  const handleContinueFromMood = () => {
    if (!selectedMood) return;
    irASiguiente();
  };

  // ahora SOLO marca selección, no avanza
  const handleSelectScaleOption = (question, option) => {
    setAnswers((prev) => ({
      ...prev,
      [question.id]: option.id,
    }));
  };

  const calcularPuntajes = () => {
    const scoresByQuestion = {};

    if (answers[1]) {
      scoresByQuestion[1] = MOOD_SCORE_MAP[answers[1]] ?? 0;
    }

    PREGUNTAS.forEach((q) => {
      if (q.tipo === "scale") {
        const sel = answers[q.id];
        if (!sel) return;
        const idx = q.opciones.findIndex((o) => o.id === sel);
        scoresByQuestion[q.id] = idx >= 0 ? idx : 0;
      }
    });

    const totalScore = Object.values(scoresByQuestion).reduce(
      (acc, v) => acc + v,
      0
    );

    return { scoresByQuestion, totalScore };
  };

  const mostrarCartaExitoYNavegar = (payload) => {
    setShowSuccess(true);
    successAnim.setValue(0);

    Animated.timing(successAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      Animated.timing(successAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setShowSuccess(false);
        navigation.navigate("Anxiosimetro", payload);
      });
    }, 1100);
  };

  const handleFinish = async () => {
    const { scoresByQuestion, totalScore } = calcularPuntajes();

    const payload = {
      answers,
      moodId: selectedMood,
      scores: scoresByQuestion,
      totalScore,
    };

    console.log("RESULTADO COMPLETO TEST:", payload);

    // Guardar emoción del día para el calendario
    try {
      await guardarEmocionEnCalendario(selectedMood);
    } catch (e) {
      console.warn("Error al guardar emoción del día:", e);
    }

    mostrarCartaExitoYNavegar(payload);
  };

  // opciones con cambio de color (rosa) para todas las preguntas de escala
  const renderScaleQuestion = (question) => {
    const selectedId = answers[question.id];

    return (
      <View style={styles.scaleContainer}>
        {question.opciones.map((op) => {
          const selected = selectedId === op.id;

          return (
            <TouchableOpacity
              key={op.id}
              style={[
                styles.scaleOption,
                selected && styles.scaleOptionSelected,
              ]}
              activeOpacity={0.9}
              onPress={() => handleSelectScaleOption(question, op)}
            >
              <Text
                style={[
                  styles.scaleOptionText,
                  selected && styles.scaleOptionTextSelected,
                ]}
              >
                {op.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const isMoodContinueDisabled = !selectedMood;
  const canGoNextScale =
    currentQuestion.tipo === "scale" && !!answers[currentQuestion.id];

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color="#4B2E83" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Test diario</Text>

          <View style={styles.stepPill}>
            <Text style={styles.stepPillText}>
              {currentIndex + 1} / {PREGUNTAS.length}
            </Text>
          </View>
        </View>

        {/* BODY */}
        <View style={styles.body}>
          {isMoodStep ? (
            <>
              <View style={styles.questionHeader}>
                <Text style={styles.questionMainTitle}>
                  {currentQuestion.titulo}
                </Text>

                {selectedEmotion ? (
                  <View style={styles.selectedSummary}>
                    <Text style={styles.selectedSummaryText}>Te sientes</Text>
                    <View style={styles.selectedSummaryRow}>
                      <Text style={styles.selectedSummaryEmoji}>
                        {selectedEmotion.emoji}
                      </Text>
                      <Text style={styles.selectedSummaryLabel}>
                        {selectedEmotion.label}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.helperText}>
                    Toca la carita que más se parezca a cómo te sientes.
                  </Text>
                )}
              </View>

              <View style={styles.gridContainer}>
                {EMOCIONES.map((emo) => (
                  <MoodItem
                    key={emo.id}
                    emotion={emo}
                    selected={selectedMood === emo.id}
                    onSelect={handleSelectMood}
                  />
                ))}
              </View>

              {selectedEmotion?.id === "ansiedad" && (
                <TouchableOpacity
                  style={styles.breathingSuggestion}
                  onPress={() => navigation.navigate("PantallaTest")}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name="leaf-outline"
                    size={20}
                    color="#4B2E83"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.breathingSuggestionText}>
                    Click para hacer un ejercicio de respiración de 1 minuto.
                  </Text>
                </TouchableOpacity>
              )}

              <View style={styles.footer}>
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    isMoodContinueDisabled && styles.primaryButtonDisabled,
                  ]}
                  activeOpacity={isMoodContinueDisabled ? 1 : 0.9}
                  onPress={handleContinueFromMood}
                >
                  <View style={styles.primaryButtonContent}>
                    <Text style={styles.primaryButtonText}>Continuar</Text>
                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color="#F9FAFB"
                      style={{ marginLeft: 6 }}
                    />
                  </View>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.card}>
              <View style={styles.scaleQuestionWrapper}>
                <View style={[styles.questionHeader, styles.scaleQuestionHeader]}>
                  <Text style={styles.questionMainTitle}>
                    {currentQuestion.titulo}
                  </Text>
                  <Text style={styles.helperText}>
                    Elige la opción que mejor describa tu día.
                  </Text>
                </View>

                <View style={styles.questionContent}>
                  <View style={styles.illustrationBox}>
                    {ILLUSTRATIONS[currentQuestion.id] && (
                      <Image
                        source={ILLUSTRATIONS[currentQuestion.id]}
                        style={styles.illustrationImage}
                        resizeMode="contain"
                      />
                    )}
                  </View>

                  {renderScaleQuestion(currentQuestion)}

                  {/* Botón para avanzar en preguntas 2–11 */}
                  {!isLastQuestion && (
                    <View style={styles.footer}>
                      <TouchableOpacity
                        style={[
                          styles.primaryButton,
                          !canGoNextScale && styles.primaryButtonDisabled,
                        ]}
                        activeOpacity={canGoNextScale ? 0.9 : 1}
                        onPress={() => {
                          if (!canGoNextScale) return;
                          irASiguiente();
                        }}
                      >
                        <View style={styles.primaryButtonContent}>
                          <Text style={styles.primaryButtonText}>Siguiente</Text>
                          <Ionicons
                            name="arrow-forward"
                            size={18}
                            color="#F9FAFB"
                            style={{ marginLeft: 6 }}
                          />
                        </View>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Botón Guardar en la 12 */}
                  {isLastQuestion && (
                    <View style={styles.footer}>
                      <TouchableOpacity
                        style={styles.primaryButton}
                        activeOpacity={0.9}
                        onPress={handleFinish}
                      >
                        <View style={styles.primaryButtonContent}>
                          <Ionicons
                            name="checkmark-circle-outline"
                            size={20}
                            color="#F9FAFB"
                            style={{ marginRight: 6 }}
                          />
                          <Text style={styles.primaryButtonText}>Guardar</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}
        </View>

        {/* CARTA FLOTANTE "Datos registrados" */}
        {showSuccess && (
          <View style={styles.successOverlay}>
            <Animated.View
              style={[
                styles.successCard,
                {
                  opacity: successAnim,
                  transform: [
                    {
                      scale: successAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Ionicons
                name="checkmark-circle"
                size={32}
                color="#10B981"
                style={{ marginBottom: 6 }}
              />
              <Text style={styles.successTitle}>Datos registrados</Text>
            </Animated.View>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const ITEM_SIZE = (SCREEN_WIDTH - 60) / 3;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF7ED",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 6,
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  stepPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
  },
  stepPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4B5563",
  },

  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    justifyContent: "center",
  },

  card: {
    backgroundColor: "#FEFCE8",
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 16,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  scaleQuestionWrapper: {
    paddingTop: 4,
    paddingBottom: 8,
  },
  scaleQuestionHeader: {
    marginBottom: 20,
  },

  questionHeader: {
    alignItems: "center",
    marginBottom: 18,
  },
  questionMainTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },
  helperText: {
    marginTop: 6,
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
  },

  questionContent: {
    marginTop: 8,
  },

  selectedSummary: {
    marginTop: 10,
    alignItems: "center",
  },
  selectedSummaryText: {
    fontSize: 13,
    color: "#6B7280",
  },
  selectedSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  selectedSummaryEmoji: {
    fontSize: 24,
    marginRight: 6,
  },
  selectedSummaryLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },

  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 10,
  },
  moodItem: {
    width: ITEM_SIZE,
    alignItems: "center",
    marginBottom: 22,
  },
  moodCircleOuter: {
    padding: 4,
    borderRadius: 999,
  },
  moodCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  moodCircleSelected: {
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
  },
  moodEmoji: {
    fontSize: 38,
  },
  moodLabel: {
    fontSize: 13,
    color: "#4B5563",
    textAlign: "center",
  },
  moodLabelSelected: {
    fontWeight: "700",
    color: "#111827",
  },

  sparkleWrapper: {
    position: "absolute",
    top: -6,
    right: 18,
  },
  sparkleText: {
    fontSize: 18,
  },

  illustrationBox: {
    height: 160,
    width: "76%",
    alignSelf: "center",
    borderRadius: 20,
    backgroundColor: "#EDE9FE",
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#DDD6FE",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  illustrationImage: {
    width: "100%",
    height: "100%",
  },

  scaleContainer: {
    marginTop: 4,
  },

  // opción base
  scaleOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 999,
    marginVertical: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EDE9FE",
    borderWidth: 1,
    borderColor: "#DDD6FE",
  },
  // opción seleccionada (rosa)
  scaleOptionSelected: {
    backgroundColor: "#F472B6",
    borderColor: "#F472B6",
  },
  scaleOptionText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4B2E83",
  },
  scaleOptionTextSelected: {
    color: "#FDF2F8",
  },

  breathingSuggestion: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F3E8FF",
    borderRadius: 14,
    marginTop: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  breathingSuggestionText: {
    fontSize: 14,
    color: "#4B2E83",
    fontWeight: "600",
    textAlign: "center",
  },

  footer: {
    marginTop: 12,
  },
  primaryButton: {
    backgroundColor: "#4B2E83",
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  primaryButtonDisabled: {
    backgroundColor: "#9CA3AF",
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#F9FAFB",
    fontSize: 16,
    fontWeight: "700",
  },

  // Carta flotante
  successOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.15)",
  },
  successCard: {
    backgroundColor: "#FEFCE8",
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
});
