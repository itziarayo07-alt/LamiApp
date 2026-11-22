import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Reactivos adaptados en español a partir del dominio público IPIP Big-Five (Goldberg, 1992).
// Escala de 1 a 5 (con ítems inversos normalizados para el puntaje total).
const QUESTIONS = [
  // SECCIÓN 1 — Extraversión
  {
    id: 1,
    section: "Extraversión",
    trait: "extraversion",
    question: "¿Cómo describes tu energía y animación al convivir?",
    reverse: false,
    options: [
      { label: "Muy baja", emoji: "🪫", value: 1 },
      { label: "Baja", emoji: "😴", value: 2 },
      { label: "Normal", emoji: "🙂", value: 3 },
      { label: "Buena", emoji: "🌤️", value: 4 },
      { label: "Muy alta", emoji: "⚡", value: 5 },
    ],
  },
  {
    id: 2,
    section: "Extraversión",
    trait: "extraversion",
    question: "¿Qué tanto sueles quedarte en silencio o en segundo plano?",
    subtitle: "Piensa en tu ritmo habitual en reuniones o grupos.",
    reverse: true,
    options: [
      { label: "Casi nunca", emoji: "🗣️", value: 1 },
      { label: "Pocas veces", emoji: "💬", value: 2 },
      { label: "A veces", emoji: "🙂", value: 3 },
      { label: "A menudo", emoji: "🎧", value: 4 },
      { label: "Casi siempre", emoji: "🤫", value: 5 },
    ],
  },

  // SECCIÓN 2 — Amabilidad
  {
    id: 3,
    section: "Amabilidad",
    trait: "agreeableness",
    question:
      "¿Cómo sueles responder ante lo que sienten o necesitan los demás?",
    reverse: false,
    options: [
      { label: "Me cuesta conectar", emoji: "🧊", value: 1 },
      { label: "Con poca atención", emoji: "😐", value: 2 },
      { label: "Intento escuchar", emoji: "👂", value: 3 },
      { label: "Con empatía", emoji: "🤝", value: 4 },
      { label: "Con mucha calidez", emoji: "💛", value: 5 },
    ],
  },
  {
    id: 4,
    section: "Amabilidad",
    trait: "agreeableness",
    question:
      "¿Qué tanto te cuesta mostrar interés por los problemas de otros?",
    reverse: true,
    options: [
      { label: "Nada", emoji: "🤍", value: 1 },
      { label: "Muy poco", emoji: "🙂", value: 2 },
      { label: "Algo", emoji: "😕", value: 3 },
      { label: "Bastante", emoji: "🙄", value: 4 },
      { label: "Mucho", emoji: "🙅", value: 5 },
    ],
  },

  // SECCIÓN 3 — Responsabilidad
  {
    id: 5,
    section: "Responsabilidad",
    trait: "conscientiousness",
    question:
      "¿Qué tan constante y organizada/o sueles ser con tus pendientes?",
    reverse: false,
    options: [
      { label: "Muy poco", emoji: "🌪️", value: 1 },
      { label: "A ratos", emoji: "📝", value: 2 },
      { label: "Normal", emoji: "🙂", value: 3 },
      { label: "Constante", emoji: "📋", value: 4 },
      { label: "Muy constante", emoji: "✅", value: 5 },
    ],
  },
  {
    id: 6,
    section: "Responsabilidad",
    trait: "conscientiousness",
    question: "¿Qué tan seguido dejas cosas sin ordenar o pospones tareas?",
    reverse: true,
    options: [
      { label: "Casi nunca", emoji: "🎯", value: 1 },
      { label: "Pocas veces", emoji: "🗓️", value: 2 },
      { label: "A veces", emoji: "⏳", value: 3 },
      { label: "Frecuentemente", emoji: "😅", value: 4 },
      { label: "Casi siempre", emoji: "🦥", value: 5 },
    ],
  },

  // SECCIÓN 4 — Estabilidad emocional
  {
    id: 7,
    section: "Estabilidad emocional",
    trait: "emotionalStability",
    question: "¿Qué emoción predomina en tu día a día habitualmente?",
    subtitle: "Elige la que más se parezca a tu estado frecuente.",
    reverse: false,
    options: [
      { label: "Muy triste o tensa", emoji: "⛈️", value: 1 },
      { label: "Inquieta o baja", emoji: "🌧️", value: 2 },
      { label: "Neutral", emoji: "☁️", value: 3 },
      { label: "Tranquila o animada", emoji: "🌿", value: 4 },
      { label: "Muy serena y estable", emoji: "☀️", value: 5 },
    ],
  },
  {
    id: 8,
    section: "Estabilidad emocional",
    trait: "emotionalStability",
    question: "¿Qué tanto sientes que te estresas o te alteras ante presiones?",
    reverse: true,
    options: [
      { label: "Muy poco", emoji: "🪷", value: 1 },
      { label: "Poco", emoji: "😌", value: 2 },
      { label: "Moderado", emoji: "😐", value: 3 },
      { label: "Bastante", emoji: "😣", value: 4 },
      { label: "Muchísimo", emoji: "💥", value: 5 },
    ],
  },

  // SECCIÓN 5 — Apertura a la experiencia
  {
    id: 9,
    section: "Apertura a la experiencia",
    trait: "openness",
    question:
      "¿Qué tan a gusto te sientes con ideas nuevas, creatividad o aprender?",
    reverse: false,
    options: [
      { label: "Muy poco", emoji: "🔒", value: 1 },
      { label: "Un poco", emoji: "📖", value: 2 },
      { label: "Normal", emoji: "🙂", value: 3 },
      { label: "Bastante", emoji: "💡", value: 4 },
      { label: "Muchísimo", emoji: "🎨", value: 5 },
    ],
  },
  {
    id: 10,
    section: "Apertura a la experiencia",
    trait: "openness",
    question: "¿Qué tanto te cuesta adaptarte a cambios o rutinas distintas?",
    reverse: true,
    options: [
      { label: "Nada", emoji: "🧭", value: 1 },
      { label: "Muy poco", emoji: "🌱", value: 2 },
      { label: "Algo", emoji: "🤔", value: 3 },
      { label: "Bastante", emoji: "🧩", value: 4 },
      { label: "Mucho", emoji: "🛑", value: 5 },
    ],
  },
];

const MAX_SCORE = QUESTIONS.length * 5; // 50 puntos

const DIMENSION_GUIDES = [
  {
    key: "extraversion",
    name: "Extraversión",
    summary:
      "Refleja cómo recargas energía: puntajes bajos suelen asociarse a necesitar espacios tranquilos o a solas; puntajes altos, a disfrutar la interacción social y el movimiento.",
  },
  {
    key: "agreeableness",
    name: "Amabilidad",
    summary:
      "Muestra tu inclinación a la empatía, consideración y cooperación. Un puntaje alto indica cercanía y cuidado hacia los demás; conviene cuidar también tus propios límites.",
  },
  {
    key: "conscientiousness",
    name: "Responsabilidad",
    summary:
      "Describe tu tendencia al orden, la constancia y la planeación. Si es moderada o baja, dividir metas en pasos pequeños ayuda a reducir la sensación de pendiente.",
  },
  {
    key: "emotionalStability",
    name: "Estabilidad emocional",
    summary:
      "Indica qué tan fácil o difícil resulta mantener la calma ante presiones o cambios de ánimo. Un puntaje menor señala mayor reactividad, útil para priorizar pausas y regulación.",
  },
  {
    key: "openness",
    name: "Apertura a la experiencia",
    summary:
      "Refleja curiosidad, creatividad y flexibilidad ante ideas o rutinas nuevas. Equilibra la exploración con rutinas base que te den seguridad.",
  },
];

const getNormalizedValue = (question, rawValue) => {
  if (!rawValue) return 0;
  return question.reverse ? 6 - rawValue : rawValue;
};

const getResultSummary = (answers) => {
  const traitTotals = {
    extraversion: 0,
    agreeableness: 0,
    conscientiousness: 0,
    emotionalStability: 0,
    openness: 0,
  };

  QUESTIONS.forEach((q) => {
    const raw = answers[q.id];
    if (raw) {
      traitTotals[q.trait] += getNormalizedValue(q, raw);
    }
  });

  const totalScore = Object.values(traitTotals).reduce((acc, v) => acc + v, 0);

  let typeLabel = "TIPO DE PERSONALIDAD: EQUILIBRADO Y ADAPTABLE";
  let title = "Perfil equilibrado con matices cotidianos";
  let description =
    "Muestras un balance flexible entre tu energía social, tu trato hacia los demás, tu organización y tu capacidad de regular emociones. Sueles adaptarte según la situación sin extremos rígidos.";
  let improvements = [
    "Mantén un registro breve diario para notar qué actividades te dan más calma o energía.",
    "Refuerza tus hábitos en la dimensión donde obtuviste menor puntaje con metas pequeñas y realistas.",
    "Conserva espacios de descanso reales antes de que se acumule el cansancio.",
  ];

  if (totalScore <= 22) {
    typeLabel = "TIPO DE PERSONALIDAD: SENSIBLE Y REFLEXIVO";
    title = "Perfil sensible con alta reactividad emocional o cautela";
    description =
      "Tiendes a percibir con intensidad lo que ocurre a tu alrededor y dentro de ti. Dar pausas, cuidar tu descanso y contar con espacios tranquilos ayuda mucho a mantener tu bienestar.";
    improvements = [
      "Practica pausas cortas de respiración o anclaje cuando notes saturación o tensión.",
      "Evita juzgarte por sentir con intensidad; trata tu ritmo como una señal de cuidado.",
      "Apóyate en rutinas predecibles y en personas o profesionales de confianza cuando lo necesites.",
    ];
  } else if (totalScore > 36) {
    typeLabel = "TIPO DE PERSONALIDAD: ESTABLE Y RESOLUTIVO";
    title = "Perfil estable, abierto y con buena autorregulación";
    description =
      "Sueles mantener calma ante cambios o presiones, organizar tus actividades con constancia y mostrarte abierta/o a nuevas ideas o perspectivas.";
    improvements = [
      "Cuida no exigirte estar al 100% todo el tiempo; también vale bajar el ritmo sin culpa.",
      "Revisa si asumes demasiadas responsabilidades de otros por tener buena capacidad de resolver.",
      "Usa tu estabilidad como base para sostener hábitos preventivos de autocuidado a largo plazo.",
    ];
  }

  const bullets = [
    `Extraversión: ${traitTotals.extraversion} / 10`,
    `Amabilidad: ${traitTotals.agreeableness} / 10`,
    `Responsabilidad: ${traitTotals.conscientiousness} / 10`,
    `Estabilidad emocional: ${traitTotals.emotionalStability} / 10`,
    `Apertura: ${traitTotals.openness} / 10`,
  ];

  return {
    totalScore,
    typeLabel,
    title,
    description,
    improvements,
    bullets,
    traitTotals,
  };
};

export default function TestPersonalidad() {
  const navigation = useNavigation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResult, setShowResult] = useState(false);
  const [savedResult, setSavedResult] = useState(null);
  const [mostrarGuiaProfunda, setMostrarGuiaProfunda] = useState(false);

  const currentQuestion = QUESTIONS[currentIndex];

  const handleSelectOption = (option) => {
    if (savedResult) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: option.value,
    }));
  };

  const handleNext = () => {
    if (savedResult) return;
    if (currentIndex < QUESTIONS.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setShowResult(true);
    }
  };

  const {
    totalScore,
    typeLabel,
    title,
    description,
    improvements,
    bullets,
    traitTotals,
  } = getResultSummary(answers);

  const handleSave = async () => {
    if (savedResult) return;

    const dataToSave = {
      score: totalScore,
      maxScore: MAX_SCORE,
      typeLabel,
      title,
      description,
      improvements,
      traits: traitTotals,
      answers,
      createdAt: new Date().toISOString(),
      source: "IPIP Big-Five (Goldberg, 1992) — Uso libre",
    };

    try {
      await AsyncStorage.setItem("testPersonalidadHecho", "SI");
      await AsyncStorage.setItem(
        "testPersonalidadResultado_v1",
        JSON.stringify({
          score: dataToSave.score,
          maxScore: MAX_SCORE,
          typeLabel: dataToSave.typeLabel,
          title: dataToSave.title,
          description: dataToSave.description,
          improvements: dataToSave.improvements,
          traits: dataToSave.traits,
        }),
      );
      setSavedResult(dataToSave);
    } catch (e) {
      console.log("Error guardando resultado de personalidad:", e);
    }
  };

  const handleGoBackToAnxiosimetro = () => {
    navigation.navigate("Anxiosimetro");
  };

  if (showResult || savedResult) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />

        <View style={styles.pastelBackground}>
          <ScrollView
            contentContainerStyle={styles.resultScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.appTitle}>Test Personalidad</Text>
            <Text style={styles.sectionLabel}>Resultado final</Text>

            <View style={styles.resultCard}>
              <Text style={styles.typePill}>{typeLabel}</Text>
              <Text style={styles.resultScore}>
                Puntaje general: {totalScore} / {MAX_SCORE}
              </Text>
              <Text style={styles.resultTitle}>{title}</Text>
              <Text style={styles.resultDescription}>{description}</Text>

              <View style={styles.divider} />

              {bullets.map((b, i) => (
                <Text key={i} style={styles.resultBullet}>
                  • {b}
                </Text>
              ))}

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setMostrarGuiaProfunda((prev) => !prev)}
                style={styles.learnMoreBtn}
              >
                <Text style={styles.learnMoreBtnText}>
                  {mostrarGuiaProfunda
                    ? "Ocultar lectura detallada"
                    : "Leer más sobre tu resultado y mejoras"}
                </Text>
              </TouchableOpacity>

              {mostrarGuiaProfunda && (
                <View style={styles.deepGuideBox}>
                  <Text style={styles.deepSectionHeading}>
                    Mejoras sugeridas para tu día a día
                  </Text>
                  {improvements.map((imp, idx) => (
                    <Text key={idx} style={styles.deepItemText}>
                      • {imp}
                    </Text>
                  ))}

                  <View style={styles.divider} />

                  <Text style={styles.deepSectionHeading}>
                    Qué significa cada dimensión (Big Five)
                  </Text>
                  {DIMENSION_GUIDES.map((dim) => (
                    <View key={dim.key} style={styles.dimBlock}>
                      <Text style={styles.dimTitle}>
                        {dim.name} ({traitTotals[dim.key]}/10)
                      </Text>
                      <Text style={styles.dimDesc}>{dim.summary}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.tipCard}>
              <Text style={styles.tipTitle}>Cómo leer este perfil</Text>
              <Text style={styles.tipText}>
                Este perfil resume tus tendencias habituales en cinco
                dimensiones psicológicas. No define quién eres como persona ni
                equivale a un diagnóstico clínico.
              </Text>
            </View>

            <View style={styles.savedBox}>
              {savedResult ? (
                <>
                  <Text style={styles.savedTitle}>
                    Resultado de personalidad guardado
                  </Text>
                  <Text style={styles.savedText}>
                    Ya guardaste tu resultado de personalidad en el dispositivo.
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.savedTitle}>
                    Guardar resultado de personalidad
                  </Text>
                  <Text style={styles.savedText}>
                    Al tocar GUARDAR se almacenará únicamente el resultado de tu
                    test de personalidad.
                  </Text>
                </>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                savedResult && styles.primaryButtonDisabled,
              ]}
              disabled={!!savedResult}
              onPress={handleSave}
            >
              <Text style={styles.primaryButtonText}>
                {savedResult ? "GUARDADO" : "GUARDAR"}
              </Text>
            </TouchableOpacity>

            <Text style={styles.sourceFootnote}>
              Fuente: International Personality Item Pool (IPIP) — Big-Five
              Factor Markers (Goldberg, 1992). Uso libre y gratuito; fines de
              autocuidado y autoconocimiento, no diagnóstico clínico.
            </Text>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  const selectedValue = answers[currentQuestion.id];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.pastelBackground}>
        <ScrollView
          contentContainerStyle={styles.centeredScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.centeredWrapper}>
            <Text style={styles.appTitle}>Test Personalidad</Text>
            <Text style={styles.sectionLabel}>{currentQuestion.section}</Text>
            <Text style={styles.progressText}>
              Pregunta {currentIndex + 1} de {QUESTIONS.length}
            </Text>

            <View style={styles.questionCard}>
              <Text style={styles.questionText}>
                {currentQuestion.question}
              </Text>
              {currentQuestion.subtitle && (
                <Text style={styles.subtitleText}>
                  {currentQuestion.subtitle}
                </Text>
              )}

              {currentQuestion.options.map((opt) => {
                const isSelected = selectedValue === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.label}
                    style={[
                      styles.optionCard,
                      isSelected && styles.optionCardSelected,
                    ]}
                    onPress={() => handleSelectOption(opt)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.optionTextContainer}>
                      <Text
                        style={[
                          styles.optionLabel,
                          isSelected && styles.optionLabelSelected,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </View>
                    <Text style={styles.optionEmoji}>{opt.emoji}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                !selectedValue && styles.primaryButtonDisabled,
              ]}
              disabled={!selectedValue}
              onPress={handleNext}
            >
              <Text style={styles.primaryButtonText}>
                {currentIndex === QUESTIONS.length - 1
                  ? "Ver resultado"
                  : "Continuar"}
              </Text>
            </TouchableOpacity>

            <Text style={styles.sourceFootnote}>
              Fuente: IPIP Big-Five Factor Markers (Goldberg, 1992) · Uso libre
              y gratuito.
            </Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F7FA",
  },
  pastelBackground: {
    flex: 1,
    backgroundColor: "#F4F7FA",
  },
  centeredScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  resultScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  centeredWrapper: {
    width: "100%",
    justifyContent: "center",
  },
  appTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#1E3A4C",
    letterSpacing: 0.4,
    textAlign: "center",
  },
  sectionLabel: {
    marginTop: 4,
    fontSize: 12.5,
    fontWeight: "700",
    color: "#6192A4",
    textTransform: "uppercase",
    letterSpacing: 1.3,
    textAlign: "center",
  },
  progressText: {
    marginTop: 10,
    fontSize: 13.5,
    color: "#526D7A",
    fontWeight: "600",
    textAlign: "center",
  },
  questionCard: {
    marginTop: 14,
    padding: 18,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#B3D3DA",
    shadowColor: "#6192A4",
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  questionText: {
    fontSize: 18.5,
    fontWeight: "800",
    color: "#1E3A4C",
    marginBottom: 6,
    lineHeight: 26,
    textAlign: "center",
  },
  subtitleText: {
    fontSize: 13,
    color: "#6192A4",
    marginBottom: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 9,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "#F0F7F9",
    borderWidth: 1,
    borderColor: "#D6E8EE",
  },
  optionCardSelected: {
    borderColor: "#7E83C2",
    backgroundColor: "#EAE8FC",
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 14.5,
    color: "#2C4959",
    fontWeight: "600",
  },
  optionLabelSelected: {
    fontWeight: "800",
    color: "#3F3B7A",
  },
  optionEmoji: {
    fontSize: 22,
    marginLeft: 10,
  },
  primaryButton: {
    width: "100%",
    paddingVertical: 15,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7E83C2",
    marginTop: 16,
    shadowColor: "#7E83C2",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.45,
    shadowOpacity: 0,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14.5,
    letterSpacing: 1.3,
    textTransform: "uppercase",
  },
  resultCard: {
    marginTop: 14,
    padding: 20,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#B3D3DA",
    shadowColor: "#6192A4",
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  typePill: {
    alignSelf: "flex-start",
    backgroundColor: "#EAE8FC",
    color: "#3F3B7A",
    fontSize: 11,
    fontWeight: "800",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  resultScore: {
    fontSize: 14,
    color: "#6192A4",
    marginBottom: 6,
    fontWeight: "700",
  },
  resultTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#1E3A4C",
    marginBottom: 8,
    lineHeight: 26,
  },
  resultDescription: {
    fontSize: 13.5,
    color: "#3A5A6B",
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: "#E2EEF2",
    marginVertical: 14,
  },
  resultBullet: {
    fontSize: 13,
    color: "#2C4959",
    marginTop: 5,
    lineHeight: 19,
    fontWeight: "500",
  },
  learnMoreBtn: {
    marginTop: 14,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "#F0F7F9",
    borderWidth: 1,
    borderColor: "#8BC1D1",
    alignItems: "center",
  },
  learnMoreBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E3A4C",
    textAlign: "center",
  },
  deepGuideBox: {
    marginTop: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#F7FAFC",
    borderWidth: 1,
    borderColor: "#D6E8EE",
  },
  deepSectionHeading: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E3A4C",
    marginBottom: 6,
  },
  deepItemText: {
    fontSize: 12.5,
    color: "#2C4959",
    lineHeight: 18,
    marginTop: 4,
  },
  dimBlock: {
    marginTop: 10,
  },
  dimTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#3F3B7A",
  },
  dimDesc: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 17,
    marginTop: 2,
  },
  tipCard: {
    marginTop: 14,
    padding: 16,
    borderRadius: 20,
    backgroundColor: "#E8F4F7",
    borderWidth: 1,
    borderColor: "#B3D3DA",
  },
  tipTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#1E3A4C",
    marginBottom: 4,
  },
  tipText: {
    fontSize: 12.5,
    color: "#3A5A6B",
    lineHeight: 18,
    fontWeight: "500",
  },
  savedBox: {
    marginTop: 14,
    padding: 16,
    borderRadius: 20,
    backgroundColor: "#EAE8FC",
    borderWidth: 1,
    borderColor: "#CEC7FD",
  },
  savedTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#3F3B7A",
    marginBottom: 4,
  },
  savedText: {
    fontSize: 12.5,
    color: "#4C4785",
    lineHeight: 18,
    fontWeight: "500",
  },
  secondaryButton: {
    marginTop: 12,
    paddingVertical: 13,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#8BC1D1",
    backgroundColor: "#FFFFFF",
  },
  secondaryButtonText: {
    color: "#4A7C8E",
    fontWeight: "700",
    fontSize: 14,
  },
  sourceFootnote: {
    marginTop: 12,
    fontSize: 11,
    color: "#617D8A",
    textAlign: "center",
    lineHeight: 16,
    paddingHorizontal: 6,
  },
});
