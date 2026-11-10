
import { useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const TOTAL_FIELDS = 5 + 4 + 3 + 2 + 1; // 15

const AnchorageSensesScreen = ({ navigation }) => {
  const [see, setSee] = useState(Array(5).fill(""));
  const [touch, setTouch] = useState(Array(4).fill(""));
  const [hear, setHear] = useState(Array(3).fill(""));
  const [smell, setSmell] = useState(Array(2).fill(""));
  const [taste, setTaste] = useState(Array(1).fill(""));

  const [saved, setSaved] = useState(false);

  const filledCount = useMemo(() => {
    const countFilled = (arr) =>
      arr.filter((item) => item && item.trim().length > 0).length;

    return (
      countFilled(see) +
      countFilled(touch) +
      countFilled(hear) +
      countFilled(smell) +
      countFilled(taste)
    );
  }, [see, touch, hear, smell, taste]);

  const progress = filledCount / TOTAL_FIELDS;

  const handleChange = (index, value, sense, setter) => {
    const copy = [...sense];
    copy[index] = value;
    setter(copy);
    setSaved(false);
  };

  const handleSave = () => {
    setSaved(true);
  };

  const handleReset = () => {
    setSee(Array(5).fill(""));
    setTouch(Array(4).fill(""));
    setHear(Array(3).fill(""));
    setSmell(Array(2).fill(""));
    setTaste(Array(1).fill(""));
    setSaved(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerCard}>
          <Text style={styles.badge}>Ejercicio de Anclaje</Text>
          <Text style={styles.title}>Anclaje con los sentidos</Text>
          <Text style={styles.subtitle}>
            Conecta con el presente nombrando lo que ves, tocas, oyes, hueles y
            saboreas.
          </Text>
        </View>

        {/* Progreso */}
        <View style={styles.card}>
          <View style={styles.progressHeader}>
            <Text style={styles.sectionTitle}>Tu progreso</Text>
            <Text style={styles.progressText}>
              {Math.round(progress * 100)}%
            </Text>
          </View>
          <View style={styles.progressBarBackground}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${progress * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.progressHint}>
            {filledCount} de {TOTAL_FIELDS} elementos completados
          </Text>
        </View>

        {/* 5 cosas que ves */}
        <SenseSection
          title="5 cosas que ves"
          description="Mira alrededor y escribe cinco cosas que puedas ver ahora."
          color="#FFC8DD"
          icon="👀"
          items={see}
          onChange={(i, val) => handleChange(i, val, see, setSee)}
        />

        {/* 4 cosas que tocas */}
        <SenseSection
          title="4 cosas que puedes tocar"
          description="Observa las sensaciones físicas: textura, temperatura, peso."
          color="#BDE0FE"
          icon="✋"
          items={touch}
          onChange={(i, val) => handleChange(i, val, touch, setTouch)}
        />

        {/* 3 cosas que oyes */}
        <SenseSection
          title="3 cosas que oyes"
          description="Presta atención a los sonidos cercanos y lejanos."
          color="#CDEBC0"
          icon="👂"
          items={hear}
          onChange={(i, val) => handleChange(i, val, hear, setHear)}
        />

        {/* 2 cosas que hueles */}
        <SenseSection
          title="2 cosas que hueles"
          description="Si no hueles nada fuerte, puedes nombrar olores sutiles."
          color="#FFF1BF"
          icon="👃"
          items={smell}
          onChange={(i, val) => handleChange(i, val, smell, setSmell)}
        />

        {/* 1 cosa que saboreas */}
        <SenseSection
          title="1 cosa que saboreas"
          description="Puede ser el sabor que tienes ahora mismo en la boca."
          color="#FFD6A5"
          icon="👅"
          items={taste}
          onChange={(i, val) => handleChange(i, val, taste, setTaste)}
        />

        {/* Sugerencia rápida */}
        <View style={[styles.card, styles.aiCard]}>
          <Text style={styles.sectionTitle}>Sugerencia rápida de calma</Text>
          <Text style={styles.aiText}>
            • 1 min de respiración profunda{"\n"}
            • 30 s de estiramiento suave{"\n"}
            • Observa cómo cambió tu estado al finalizar ✨
          </Text>
        </View>

        {/* Botones finales */}
        <View style={styles.footerButtons}>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleReset}>
            <Text style={styles.secondaryButtonText}>Repetir ejercicio</Text>
          </TouchableOpacity>

          {/* botón Anxiosímetro */}
          <TouchableOpacity
            style={styles.anxioButton}
            activeOpacity={0.7}
            onPress={() => navigation.navigate("Anxiosimetro")}
          >
            <Text style={styles.anxioButtonText}>💟 Anxiosímetro</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.primaryButton} onPress={handleSave}>
            <Text style={styles.primaryButtonText}>Guardar reflexión</Text>
          </TouchableOpacity>
        </View>

        {saved && (
          <Text style={styles.savedText}>Reflexión guardada 💚</Text>
        )}
      </ScrollView>
    </View>
  );
};

const SenseSection = ({ title, description, color, icon, items, onChange }) => {
  return (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <View style={[styles.iconCircle, { backgroundColor: color }]}>
          <Text style={styles.iconText}>{icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionDescription}>{description}</Text>
        </View>
      </View>

      <View style={styles.chipsContainer}>
        {items.map((value, index) => (
          <View style={styles.chip} key={index}>
            <TextInput
              value={value}
              onChangeText={(text) => onChange(index, text)}
              placeholder="Escribe aquí..."
              placeholderTextColor="#C0C0C0"
              style={styles.chipInput}
            />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7EFFF",
  },
  scroll: {
    padding: 16,
    paddingBottom: 32,
  },
  headerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#FDE1FF",
    color: "#A54AA5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 12,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F1147",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#7A6F9B",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#22163B",
  },
  progressText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6A4C93",
  },
  progressBarBackground: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "#F2E7FF",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#FFAFCC",
  },
  progressHint: {
    fontSize: 12,
    color: "#8B7EA6",
    marginTop: 6,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  iconText: {
    fontSize: 22,
  },
  sectionDescription: {
    fontSize: 13,
    color: "#8B7EA6",
    marginTop: 2,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#F7F3FF",
    borderRadius: 999,
    marginRight: 6,
    marginBottom: 8,
    minWidth: "45%",
  },
  chipInput: {
    fontSize: 13,
    color: "#332C52",
  },
  aiCard: {
    backgroundColor: "#FFF7FD",
  },
  aiText: {
    fontSize: 13,
    color: "#7A6F9B",
    marginTop: 6,
    lineHeight: 18,
  },
  footerButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 4,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D4C2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6A4C93",
  },
  anxioButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "#E7C8FF", // lavanda pastel
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#A56BD4",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  anxioButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3F2459",
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "#FFAFCC",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3A233A",
  },
  savedText: {
    marginTop: 10,
    fontSize: 13,
    color: "#3A7A3A",
    textAlign: "center",
  },
});

export default AnchorageSensesScreen;


