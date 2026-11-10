
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const IMAGEN_CONEJO = require("../assets/conejo.png");
const IMAGEN_SILUETA = require("../assets/videos/silueta.png");
const AUDIO_LLUVIA = require("../assets/videos/lluvia.mp3");

const SECCIONES = [
  {
    key: "cabeza",
    titulo: "Cabeza y rostro",
    descripcion:
      "Lleva tu atención a tu frente, ojos, mandíbula y cuero cabelludo. Nota si hay tensión, gestos apretados o cansancio.",
    sugerencia:
      "Si encuentras rigidez, imagina que cada exhalación suaviza un poquito los músculos de tu cara.",
    audio: require("../assets/videos/Au1.mp3"),
  },
  {
    key: "hombros",
    titulo: "Cuello y hombros",
    descripcion:
      "Dirige ahora tu atención al cuello, la nuca y los hombros. Suelen ser zonas donde acumulamos muchas cargas del día.",
    sugerencia:
      "Al inhalar, percibe el peso que llevas ahí. Al exhalar, permite que los hombros caigan un poco más hacia abajo.",
    audio: require("../assets/videos/Au2.mp3"),
  },
  {
    key: "pecho",
    titulo: "Pecho y respiración",
    descripcion:
      "Observa el movimiento de tu pecho al respirar. No intentes cambiar nada, solo sé testigo del ritmo que ya tienes.",
    sugerencia:
      "Si te ayuda, coloca una mano sobre el pecho y nota el subir y bajar con cada respiración.",
    audio: require("../assets/videos/Au3.mp3"),
  },
  {
    key: "abdomen",
    titulo: "Abdomen, piernas y pies",
    descripcion:
      "Lleva la atención a tu abdomen, caderas, piernas y pies. Nota la temperatura, el contacto con la superficie y cualquier cosquilleo.",
    sugerencia:
      "Imagina que cada exhalación viaja desde la cabeza hasta los pies, como una ola suave que va relajando tu cuerpo.",
    audio: require("../assets/videos/Au4.mp3"),
  },
];

export default function EscaneoCorporal({ navigation }) {
  const [indice, setIndice] = useState(0);

  const soundRef = useRef(null);              // audio por zona
  const lluviaSoundRef = useRef(null);        // audio lluvia fondo
  const autoAdvanceTimeout = useRef(null);

  const highlightOpacity = useRef(new Animated.Value(0)).current;

  const seccionActual = SECCIONES[indice];
  const imagenActual = indice === 0 ? IMAGEN_CONEJO : IMAGEN_SILUETA;

  // Animación de la zona iluminada
  useEffect(() => {
    highlightOpacity.setValue(0);
    Animated.timing(highlightOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [indice]);

  // Audio de lluvia de fondo (40%) durante TODO el ejercicio
  useEffect(() => {
    let cancelled = false;

    const startLluvia = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(AUDIO_LLUVIA, {
          volume: 0.4,
          isLooping: true,
          shouldPlay: true,
        });

        if (cancelled) {
          await sound.unloadAsync();
          return;
        }

        lluviaSoundRef.current = sound;
      } catch (e) {
        console.log("Error cargando audio de lluvia:", e);
      }
    };

    startLluvia();

    return () => {
      cancelled = true;
      if (lluviaSoundRef.current) {
        lluviaSoundRef.current.unloadAsync();
        lluviaSoundRef.current = null;
      }
    };
  }, []);

  const stopLluvia = async () => {
    if (lluviaSoundRef.current) {
      try {
        await lluviaSoundRef.current.stopAsync();
        await lluviaSoundRef.current.unloadAsync();
      } catch (e) {
        console.log("Error deteniendo lluvia:", e);
      }
      lluviaSoundRef.current = null;
    }
  };

  // Limpieza general al salir de la pantalla
  useEffect(() => {
    return () => {
      if (autoAdvanceTimeout.current) {
        clearTimeout(autoAdvanceTimeout.current);
      }
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
      if (lluviaSoundRef.current) {
        lluviaSoundRef.current.unloadAsync();
      }
    };
  }, []);

  // Helper: limpia audio actual de la sección
  const clearCurrentAudio = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch (e) {
        console.log("Error al descargar audio:", e);
      }
      soundRef.current = null;
    }
  };

  // Helper: pasa a la siguiente zona (lo usa botón y auto-avance)
  const goToNextSection = async () => {
    if (autoAdvanceTimeout.current) {
      clearTimeout(autoAdvanceTimeout.current);
      autoAdvanceTimeout.current = null;
    }

    await clearCurrentAudio();

    if (indice < SECCIONES.length - 1) {
      setIndice((prev) => prev + 1);
    } else {
      // Terminó TODO el escaneo → detenemos lluvia y volvemos
      await stopLluvia();
      navigation.goBack();
    }
  };

  const esUltima = indice === SECCIONES.length - 1;

  // Reproducir audio de la sección automáticamente + auto-avance a 1.5 min
  useEffect(() => {
    let cancelled = false;

    const setupSection = async () => {
      // limpiar timer previo
      if (autoAdvanceTimeout.current) {
        clearTimeout(autoAdvanceTimeout.current);
      }

      // limpiar audio previo
      await clearCurrentAudio();

      // autoplay del audio de esta sección
      const audioSource = SECCIONES[indice].audio;
      if (audioSource) {
        try {
          const { sound } = await Audio.Sound.createAsync(audioSource);
          if (cancelled) {
            await sound.unloadAsync();
            return;
          }
          soundRef.current = sound;
          await sound.playAsync();
        } catch (e) {
          console.log("Error cargando audio de sección:", e);
        }
      }

      // auto-avance interno a los 90s (1.5 min)
      autoAdvanceTimeout.current = setTimeout(() => {
        goToNextSection();
      }, 90 * 1000);
    };

    setupSection();

    return () => {
      cancelled = true;
      if (autoAdvanceTimeout.current) {
        clearTimeout(autoAdvanceTimeout.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indice]);

  // Botón "Siguiente zona"
  const handleSiguiente = () => {
    goToNextSection();
  };

  // Salir manualmente → limpia todo y te lleva a Anxiosimetro
  const handleSalir = async () => {
    if (autoAdvanceTimeout.current) {
      clearTimeout(autoAdvanceTimeout.current);
      autoAdvanceTimeout.current = null;
    }
    await clearCurrentAudio();
    await stopLluvia();
    navigation.navigate("Anxiosimetro");
  };

  return (
    <LinearGradient
      colors={["#FFE9D6", "#FBCFE8", "#EDE9FE"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.root}
    >
      <SafeAreaView style={{ flex: 1 }}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleSalir}
          >
            <Ionicons name="chevron-back" size={24} color="#4B2E83" />
          </TouchableOpacity>

          <View style={styles.headerTextBlock}>
            <Text style={styles.headerLabel}>Ejercicio guiado</Text>
            <Text style={styles.headerTitle}>Escaneo corporal</Text>
          </View>

          <View style={{ width: 24 }} />
        </View>

        {/* CARD */}
        <View style={styles.cardShell}>
          <View style={styles.topRow}>
            <View style={styles.pill}>
              <Ionicons
                name="body-outline"
                size={14}
                color="#4B5563"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.pillText}>Duración sugerida: 5–10 min</Text>
            </View>
          </View>

          <Text style={styles.cardTitle}>
            Lleva tu atención por todo tu cuerpo
          </Text>
          <Text style={styles.cardSubtitle}>
            Ve recorriendo cada zona con calma. No tienes que cambiar nada, solo
            observar lo que ya está ahí.
          </Text>

          {/* SILUETA / CONEJITO */}
          <View style={styles.silhouetteWrapper}>
            <Image
              source={imagenActual}
              style={styles.silhouetteImage}
              resizeMode="contain"
            />

            {/* Zonas iluminadas */}
            <Animated.View
              style={[
                styles.highlightZone,
                styles.zoneCabeza,
                seccionActual.key === "cabeza"
                  ? { opacity: highlightOpacity }
                  : { opacity: 0 },
              ]}
            />

            <Animated.View
              style={[
                styles.highlightZone,
                styles.zoneHombros,
                seccionActual.key === "hombros"
                  ? { opacity: highlightOpacity }
                  : { opacity: 0 },
              ]}
            />

            <Animated.View
              style={[
                styles.highlightZone,
                styles.zonePecho,
                seccionActual.key === "pecho"
                  ? { opacity: highlightOpacity }
                  : { opacity: 0 },
              ]}
            />

            <Animated.View
              style={[
                styles.highlightZone,
                styles.zoneAbdomen,
                seccionActual.key === "abdomen"
                  ? { opacity: highlightOpacity }
                  : { opacity: 0 },
              ]}
            />
          </View>

          {/* PUNTITOS */}
          <View style={styles.dotsRow}>
            {SECCIONES.map((sec, i) => (
              <View
                key={sec.key}
                style={[styles.dot, i === indice && styles.dotActive]}
              />
            ))}
          </View>

          {/* TEXTO (sin controles de audio) */}
          <View style={styles.textBlock}>
            <Text style={styles.sectionLabel}>
              Zona {indice + 1} de {SECCIONES.length}
            </Text>

            <Text style={styles.sectionTitle}>{seccionActual.titulo}</Text>

            <Text style={styles.paragraph}>{seccionActual.descripcion}</Text>

            <View style={styles.tipBox}>
              <Ionicons
                name="sparkles-outline"
                size={18}
                color="#7C3AED"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.tipText}>{seccionActual.sugerencia}</Text>
            </View>
          </View>

          {/* BOTONES */}
          <View style={styles.buttonsRow}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleSalir}
            >
              <Text style={styles.secondaryButtonText}>Salir</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleSiguiente}
            >
              <Text style={styles.primaryButtonText}>
                {esUltima ? "Finalizar" : "Siguiente zona"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 10,
  },
  backButton: { padding: 4, marginRight: 8 },
  headerTextBlock: { flex: 1 },
  headerLabel: {
    fontSize: 11,
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },

  cardShell: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 26,
    backgroundColor: "#FFF7ED",
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },

  topRow: { flexDirection: "row", marginBottom: 8 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#EDE9FE",
  },
  pillText: { fontSize: 11, color: "#4B5563", fontWeight: "600" },

  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  cardSubtitle: { fontSize: 13, color: "#4B5563", marginBottom: 10 },

  silhouetteWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 6,
  },
  silhouetteImage: {
    width: "80%",
    height: "70%",
  },

  highlightZone: {
    position: "absolute",
    left: "20%",
    right: "20%",
    borderRadius: 999,
    backgroundColor: "rgba(124,58,237,0.16)",
  },
  zoneCabeza: { top: "8%", height: "13%" },
  zoneHombros: { top: "22%", height: "15%" },
  zonePecho: { top: "37%", height: "16%" },
  zoneAbdomen: { top: "54%", height: "30%" },

  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: "#7C3AED",
    width: 14,
  },

  textBlock: { marginBottom: 12 },
  sectionLabel: { fontSize: 12, color: "#6B7280" },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 22,
    marginBottom: 6,
  },
  tipBox: {
    flexDirection: "row",
    backgroundColor: "#F3E8FF",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  tipText: { fontSize: 13, color: "#4B5563", flex: 1 },

  buttonsRow: {
    flexDirection: "row",
    marginTop: 4,
  },
  secondaryButton: {
    flex: 1,
    marginRight: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingVertical: 10,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 14,
    color: "#4B5563",
    fontWeight: "600",
  },
  primaryButton: {
    flex: 1,
    marginLeft: 8,
    borderRadius: 999,
    backgroundColor: "#7C3AED",
    paddingVertical: 10,
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
