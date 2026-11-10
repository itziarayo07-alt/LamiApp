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


const QUESTIONS = [
  // SECCIÓN 1 — Personalidad
  {
    id: 1,
    section: "Personalidad",
    question: "¿Cómo describes tu energía diaria?",
    options: [
      { label: "Muy baja", emoji: "🛏️", value: 1 },
      { label: "Baja", emoji: "😴", value: 2 },
      { label: "Normal", emoji: "🙂", value: 3 },
      { label: "Buena", emoji: "🌸", value: 4 },
      { label: "Muy alta", emoji: "✨", value: 5 },
    ],
  },
  {
    id: 2,
    section: "Personalidad",
    question: "¿Qué tan rápido te adaptas a cambios?",
    options: [
      { label: "Muy lento", emoji: "🐢", value: 1 },
      { label: "Lento", emoji: "🍂", value: 2 },
      { label: "Bien", emoji: "🙂", value: 3 },
      { label: "Rápido", emoji: "🏃‍♀️", value: 4 },
      { label: "Muy rápido", emoji: "🚀", value: 5 },
    ],
  },
  {
    id: 3,
    section: "Personalidad",
    question: "¿Cómo manejas discusiones?",
    options: [
      { label: "Me cierro", emoji: "🚪", value: 1 },
      { label: "Me enciendo", emoji: "😡", value: 2 },
      { label: "Intento escuchar", emoji: "👂", value: 3 },
      { label: "Busco solución", emoji: "🧠", value: 4 },
      { label: "Muy calmada", emoji: "🧘‍♀️", value: 5 },
    ],
  },
  {
    id: 4,
    section: "Personalidad",
    question: "¿Qué emoción sientes MÁS seguido?",
    subtitle: "Elige la que más se parezca a ti.",
    options: [
      { label: "Muy triste", emoji: "😭", value: 1 },
      { label: "Triste", emoji: "😢", value: 2 },
      { label: "Neutral", emoji: "😐", value: 3 },
      { label: "Feliz", emoji: "😊", value: 4 },
      { label: "Muy feliz / Éxtasis", emoji: "🤩", value: 5 },
    ],
  },
  {
    id: 5,
    section: "Personalidad",
    question: "¿Qué tanto te afecta lo que piensan los demás?",
    options: [
      { label: "Muchísimo", emoji: "😰", value: 1 },
      { label: "Bastante", emoji: "😟", value: 2 },
      { label: "Algo", emoji: "😕", value: 3 },
      { label: "Poco", emoji: "🙂", value: 4 },
      { label: "Muy poco", emoji: "😎", value: 5 },
    ],
  },

  // SECCIÓN 2 — Romance y relaciones
  {
    id: 6,
    section: "Romance y relaciones",
    question: "¿Cómo demuestras cariño?",
    options: [
      { label: "Me cuesta mucho", emoji: "😶", value: 1 },
      { label: "Muy poco", emoji: "🙈", value: 2 },
      { label: "De forma moderada", emoji: "😊", value: 3 },
      { label: "Bastante", emoji: "🤗", value: 4 },
      { label: "Muchísimo", emoji: "🥰", value: 5 },
    ],
  },
  {
    id: 7,
    section: "Romance y relaciones",
    question: "¿Cómo te enamoras normalmente?",
    options: [
      { label: "Me cierro", emoji: "🧱", value: 1 },
      { label: "Muy despacio", emoji: "🐌", value: 2 },
      { label: "Con calma", emoji: "🌷", value: 3 },
      { label: "Rápido", emoji: "⚡", value: 4 },
      { label: "Muy rápido e intenso", emoji: "🔥", value: 5 },
    ],
  },
  {
    id: 8,
    section: "Romance y relaciones",
    question: "¿Qué emoción predomina cuando estás enamorada?",
    subtitle: "Elige la que más se parezca a ti.",
    options: [
      { label: "Miedo / tristeza", emoji: "😖", value: 1 },
      { label: "Insegura", emoji: "😟", value: 2 },
      { label: "Neutral", emoji: "😐", value: 3 },
      { label: "Feliz", emoji: "😊", value: 4 },
      { label: "Muy feliz / Éxtasis", emoji: "🤍", value: 5 },
    ],
  },
  {
    id: 9,
    section: "Romance y relaciones",
    question: "¿Qué tan leal eres en una relación?",
    options: [
      { label: "Poco", emoji: "🤷‍♀️", value: 1 },
      { label: "Algo", emoji: "🙂", value: 2 },
      { label: "Normal", emoji: "😌", value: 3 },
      { label: "Muy", emoji: "🤝", value: 4 },
      { label: "Totalmente", emoji: "💍", value: 5 },
    ],
  },
  {
    id: 10,
    section: "Romance y relaciones",
    question: "¿Cómo reaccionas si te lastiman emocionalmente?",
    options: [
      { label: "Me cierro por completo", emoji: "🚪", value: 1 },
      { label: "Me alejo", emoji: "🚶‍♀️", value: 2 },
      { label: "Me pongo neutral", emoji: "😐", value: 3 },
      { label: "Hablo las cosas", emoji: "🗣️", value: 4 },
      { label: "Intento reparar la relación", emoji: "🧩", value: 5 },
    ],
  },

  // SECCIÓN 3 — Pasado y experiencias
  {
    id: 11,
    section: "Pasado y experiencias",
    question: "¿Sientes que el pasado influye en tu comportamiento actual?",
    options: [
      { label: "Muy poco", emoji: "🌱", value: 1 },
      { label: "Un poco", emoji: "🍃", value: 2 },
      { label: "Moderadamente", emoji: "🌿", value: 3 },
      { label: "Bastante", emoji: "🌳", value: 4 },
      { label: "Mucho", emoji: "🌋", value: 5 },
    ],
  },
  {
    id: 12,
    section: "Pasado y experiencias",
    question: "¿Te cuesta confiar por experiencias anteriores?",
    options: [
      { label: "No", emoji: "🙂", value: 1 },
      { label: "Un poco", emoji: "🤔", value: 2 },
      { label: "A veces", emoji: "😕", value: 3 },
      { label: "Bastante", emoji: "😟", value: 4 },
      { label: "Mucho", emoji: "😣", value: 5 },
    ],
  },
  {
    id: 13,
    section: "Pasado y experiencias",
    question: "Pensando en tu pasado, ¿qué emoción lo describe mejor?",
    subtitle: "Elige la que más se parezca a ti.",
    options: [
      { label: "Muy triste", emoji: "😭", value: 1 },
      { label: "Triste", emoji: "😢", value: 2 },
      { label: "Neutral", emoji: "😐", value: 3 },
      { label: "Feliz", emoji: "😊", value: 4 },
      { label: "Muy feliz / Éxtasis", emoji: "🤩", value: 5 },
    ],
  },
  {
    id: 14,
    section: "Pasado y experiencias",
    question: "¿Qué tanto has sanado emocionalmente?",
    options: [
      { label: "Nada", emoji: "🩹", value: 1 },
      { label: "Un poco", emoji: "🌧️", value: 2 },
      { label: "Mitad", emoji: "⛅", value: 3 },
      { label: "Avanzado", emoji: "🌤️", value: 4 },
      { label: "Casi todo", emoji: "☀️", value: 5 },
    ],
  },
  {
    id: 15,
    section: "Pasado y experiencias",
    question: "¿Te cuesta soltar situaciones antiguas?",
    options: [
      { label: "Nada", emoji: "🕊️", value: 1 },
      { label: "Muy poco", emoji: "🍂", value: 2 },
      { label: "Algo", emoji: "🪵", value: 3 },
      { label: "Bastante", emoji: "🧱", value: 4 },
      { label: "Mucho", emoji: "⛓️", value: 5 },
    ],
  },
];

//  TEXTO DE RESULTADOS 
const getResultText = (score) => {
  if (score <= 25) {
    return {
      title: "Personalidad sensible + pasado aún pesado",
      bullets: [
        "Muy emocional y perceptiva.",
        "Románticamente cautelosa.",
        "El pasado sigue influyendo fuerte.",
        "Necesitas seguridad y contención afectiva.",
      ],
    };
  } else if (score <= 45) {
    return {
      title: "Personalidad equilibrada + romanticismo moderado",
      bullets: [
        "Expresas emociones con medida.",
        "Te enamoras con estabilidad.",
        "El pasado influye, pero no te domina.",
        "Buscas relaciones tranquilas y sanas.",
      ],
    };
  } else if (score <= 60) {
    return {
      title: "Personalidad intensa + romance fuerte",
      bullets: [
        "Emocional, leal y profunda.",
        "Te entregas con pasión.",
        "Buen manejo emocional en general.",
        "Transformas lo que viviste en aprendizaje.",
      ],
    };
  } else {
    return {
      title: "Personalidad segura + amor maduro",
      bullets: [
        "Alta fortaleza emocional.",
        "Estilo de amor estable y claro.",
        "Buen autocontrol y autoconocimiento.",
        "Tu pasado te dio sabiduría y madurez.",
      ],
    };
  }
};

//  APP 
export default function App() {
  const navigation = useNavigation(); 
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResult, setShowResult] = useState(false);
  const [savedResult, setSavedResult] = useState(null); // guarda info del test

  const currentQuestion = QUESTIONS[currentIndex];

  const handleSelectOption = (option) => {
    if (savedResult) return; // si ya se guardó, no deja cambiar
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

  const score = Object.values(answers).reduce((acc, v) => acc + (v || 0), 0);
  const resultInfo = getResultText(score);

  const handleSave = async () => {
  if (savedResult) return;

  const dataToSave = {
    score,
    answers,
    createdAt: new Date().toISOString(),
    title: resultInfo.title, // usamos el título del perfil
  };

  try {
    // 1) marcar que el test YA se hizo
    await AsyncStorage.setItem("testPersonalidadHecho", "SI");

    // 2) guardar resumen de resultado para Calendario
    await AsyncStorage.setItem(
      "testPersonalidadResultado_v1",
      JSON.stringify({
        score: dataToSave.score,
        title: dataToSave.title,
      })
    );

    setSavedResult(dataToSave);
    console.log("Resultado guardado:", dataToSave);
  } catch (e) {
    console.log("Error guardando test personalidad:", e);
  }
};


  const handleGoBackToAnxiosimetro = () => {
    navigation.navigate("Anxiosimetro"); 
  };

  // PANTALLA RESULTADO 
  if (showResult || savedResult) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />

        <View style={styles.pastelBackground}>
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 24,
              paddingBottom: 32,
            }}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.appTitle}>Test Personalidad</Text>
            <Text style={styles.sectionLabel}>Resultado final</Text>

            <View style={styles.resultCard}>
              <Text style={styles.resultScore}>Tu puntaje: {score} / 75</Text>
              <Text style={styles.resultTitle}>{resultInfo.title}</Text>
              {resultInfo.bullets.map((b, i) => (
                <Text key={i} style={styles.resultBullet}>
                  • {b}
                </Text>
              ))}
            </View>

            <View style={styles.tipCard}>
              <Text style={styles.tipTitle}>Tip para ti 🌷</Text>
              <Text style={styles.tipText}>
                Lee tu resultado con calma. Observa cómo te hace sentir y, si lo
                necesitas, platica de esto con alguien de confianza o con una
                persona profesional.
              </Text>
            </View>

            <View style={styles.savedBox}>
              {savedResult ? (
                <>
                  <Text style={styles.savedTitle}>Resultado guardado ✅</Text>
                  <Text style={styles.savedText}>
                    Ya guardaste tu información. Por cuidado emocional, este
                    test solo se responde una vez.
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.savedTitle}>Guarda tu resultado 💌</Text>
                  <Text style={styles.savedText}>
                    Al presionar GUARDAR, almacenaremos tu puntaje y no podrás
                    volver a realizar el test.
                  </Text>
                </>
              )}
            </View>

            {/* BOTÓN GUARDAR */}
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

            {/* NUEVO BOTÓN PARA SALIR Y VOLVER A CHECKING */}
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleGoBackToAnxiosimetro}
            >
              <Text style={styles.secondaryButtonText}>
                Salir y volver a Anxiosimetro
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  //  PANTALLA PREGUNTAS 
  const selectedValue = answers[currentQuestion.id];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.pastelBackground}>
        <View style={styles.content}>
          <View>
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
        </View>
      </View>
    </SafeAreaView>
  );
}

//  ESTILOS 
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDECEF",
  },
  pastelBackground: {
    flex: 1,
    backgroundColor: "#FDECEF",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    justifyContent: "space-between",
  },

  // TIPOGRAFÍA GENERAL 
  appTitle: {
    fontSize: 30,
    fontWeight: "900",
    color: "#2B223D",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  sectionLabel: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "700",
    color: "#A889B9",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    textAlign: "center",
  },
  progressText: {
    marginTop: 18,
    fontSize: 15,
    color: "#9A9AAC",
    fontWeight: "500",
    textAlign: "center",
  },

  // CARD DE PREGUNTA
  questionCard: {
    marginTop: 26,
    padding: 24,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    shadowColor: "#E1BDD7",
    shadowOpacity: 0.7,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 5,
  },
  questionText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2B223D",
    marginBottom: 10,
    lineHeight: 30,
    textAlign: "center",
  },
  subtitleText: {
    fontSize: 14,
    color: "#9A9AAC",
    marginBottom: 18,
    lineHeight: 20,
    textAlign: "center",
  },

  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: "#F9F3FF",
    borderWidth: 1,
    borderColor: "transparent",
  },
  optionCardSelected: {
    borderColor: "#F4A6B9",
    backgroundColor: "#FFE4EE",
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    color: "#4D4768",
    fontWeight: "600",
  },
  optionLabelSelected: {
    fontWeight: "800",
    color: "#2B223D",
  },
  optionEmoji: {
    fontSize: 26,
    marginLeft: 12,
  },

  //  BOTÓN PRINCIPAL
  primaryButton: {
    width: "100%",
    paddingVertical: 18,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F49AB3",
    marginTop: 26,
    shadowColor: "#E08AA8",
    shadowOpacity: 0.5,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.4,
    shadowOpacity: 0,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  //  RESULTADO 
  resultCard: {
    marginTop: 16,
    padding: 22,
    borderRadius: 26,
    backgroundColor: "#FFFFFF",
    shadowColor: "#E1BDD7",
    shadowOpacity: 0.7,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 5,
  },
  resultScore: {
    fontSize: 16,
    color: "#B285C6",
    marginBottom: 10,
    fontWeight: "700",
  },
  resultTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#2B223D",
    marginBottom: 10,
    lineHeight: 28,
  },
  resultBullet: {
    fontSize: 14,
    color: "#4D4768",
    marginTop: 4,
    lineHeight: 20,
    fontWeight: "500",
  },

  // NUEVA TARJETA TIP 
  tipCard: {
    marginTop: 18,
    padding: 18,
    borderRadius: 22,
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

  //  BOX DE GUARDAR
  savedBox: {
    marginTop: 18,
    padding: 18,
    borderRadius: 22,
    backgroundColor: "#E6F6F3",
  },
  savedTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#2F6D5C",
    marginBottom: 4,
  },
  savedText: {
    fontSize: 13,
    color: "#4F7267",
    lineHeight: 18,
    fontWeight: "500",
  },

  // BOTÓN SECUNDARIO (SALIR)
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