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

const VIDEO_1 = require("../assets/videos/video1.mp4");
const VIDEO_2 = require("../assets/videos/video2.mp4");
const VIDEO_3 = require("../assets/videos/video3.mp4");
const AUDIO_2 = require("../assets/videos/audioVoz.mp3");
const IMAGEN_TARJETA = require("../assets/conejo.png");

export default function PantallaEjercicios2({ navigation }) {
  // step = lo que pasa dentro de la tarjeta grande
  // idle = carta grande vacía
  const [step, setStep] = useState("idle"); // idle | video1 | countdown | video2 | silence | video3
  const [video1Count, setVideo1Count] = useState(0);
  const [countdown, setCountdown] = useState(3);

  // Intro flotante del conejito
  const [showIntroCard, setShowIntroCard] = useState(true);
  const introOpacity = useRef(new Animated.Value(0)).current;
  const introScale = useRef(new Animated.Value(0.92)).current;

  // Animaciones internas
  const countdownScale = useRef(new Animated.Value(1)).current;
  const silenceOpacity = useRef(new Animated.Value(0)).current;

  const video1Ref = useRef(null);
  const video2Ref = useRef(null);
  const video3Ref = useRef(null);
  const audioRef = useRef(null);

  // ------- ANIMACIÓN TARJETA FLOTANTE (CONEJO) ---------
  useEffect(() => {
    if (showIntroCard) {
      introOpacity.setValue(0);
      introScale.setValue(0.92);
      Animated.parallel([
        Animated.timing(introOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.spring(introScale, {
          toValue: 1,
          friction: 6,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showIntroCard, introOpacity, introScale]);

  const handleStart = () => {
    // Ocultar tarjeta flotante y ahí arrancar toda la secuencia
    Animated.timing(introOpacity, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowIntroCard(false);
      setStep("video1");
    });
  };

  // ------- VIDEO 1: 2 REPETICIONES ---------
  const handleVideo1Status = (status) => {
    if (!status.isLoaded || step !== "video1") return;

    if (status.didJustFinish) {
      setVideo1Count((prev) => {
        const next = prev + 1;
        if (next < 2) {
          if (video1Ref.current) {
            video1Ref.current.replayAsync();
          }
        } else {
          setStep("countdown");
        }
        return next;
      });
    }
  };

  // ------- COUNTDOWN 3s CON ZOOM-IN ---------
  useEffect(() => {
    if (step !== "countdown") return;

    setCountdown(3);

    // animación para el primer número
    countdownScale.setValue(0.6);
    Animated.spring(countdownScale, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setStep("video2");
          return 0;
        }

        // animación para cada cambio de número
        countdownScale.setValue(0.6);
        Animated.spring(countdownScale, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        }).start();

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [step, countdownScale]);

  // ------- VIDEO2 + AUDIO 15s ---------
  useEffect(() => {
    const startAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });

        const { sound } = await Audio.Sound.createAsync(AUDIO_2, {
          shouldPlay: true,
        });

        audioRef.current = sound;

        sound.setOnPlaybackStatusUpdate((status) => {
          if (!status.isLoaded) return;

          if (status.didJustFinish || status.positionMillis >= 15000) {
            endAllSequence();
          }
        });
      } catch (e) {
        console.log("Error iniciando audio:", e);
      }
    };

    if (step === "video2") {
      startAudio();
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.unloadAsync();
        audioRef.current = null;
      }
    };
  }, [step]);

  const endAllSequence = async () => {
    try {
      if (audioRef.current) {
        await audioRef.current.stopAsync();
        await audioRef.current.unloadAsync();
        audioRef.current = null;
      }
      if (video2Ref.current && video2Ref.current.stopAsync) {
        await video2Ref.current.stopAsync();
      }
    } catch (e) {
      console.log("Error al detener medios:", e);
    }

    // Silencio suave primero
    setStep("silence");
    silenceOpacity.setValue(0);
    Animated.timing(silenceOpacity, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();

    // Después del silencio, pasamos al VIDEO_3
    setTimeout(() => {
      setStep("video3");
    }, 2500);
  };

  // manejar fin del VIDEO_3, volver a TestDiario
  const handleVideo3Status = (status) => {
    if (!status.isLoaded || step !== "video3") return;

    if (status.didJustFinish) {
      navigation.replace("TestDiario", {
        desdePantallaEjercicios2: true,
      });
    }
  };

  // limpieza general al salir
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.unloadAsync();
      }
    };
  }, []);

  // -------- RENDERS --------
  const renderFloatingIntroCard = () => (
    <Animated.View
      style={[
        styles.cardOverlay,
        { opacity: introOpacity, transform: [{ scale: introScale }] },
      ]}
    >
      <View style={styles.floatingCard}>
        {/* Pin en la esquina */}
        <View style={styles.pinWrapper}>
          <Ionicons name="pin-outline" size={18} color="#9CA3AF" />
        </View>

        <Image
          source={IMAGEN_TARJETA}
          style={styles.floatingImage}
          resizeMode="contain"
        />

        <Text style={styles.floatingTitle}>Vamos a respirar</Text>
        <Text style={styles.floatingSubtitle}>
          Tranquila, este espacio es solo para ti. Tómate unos momentos para que
          tu cuerpo y tu mente bajen un poquito la velocidad.
        </Text>

        <TouchableOpacity
          style={styles.floatingButton}
          onPress={handleStart}
          activeOpacity={0.9}
        >
          <Text style={styles.floatingButtonText}>Empezar ejercicio</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderVideo1 = () => (
    <View style={styles.mediaContainer}>
      <Video
        ref={video1Ref}
        source={VIDEO_1}
        style={styles.video}
        resizeMode="cover"
        shouldPlay={step === "video1"}
        isLooping={false}
        onPlaybackStatusUpdate={handleVideo1Status}
      />
    </View>
  );

  const renderCountdown = () => (
    <View style={styles.centerContainer}>
      <Text style={styles.countdownLabel}>
        Prepárate para el siguiente paso...
      </Text>
      <Animated.Text
        style={[
          styles.countdownNumber,
          { transform: [{ scale: countdownScale }] },
        ]}
      >
        {countdown}
      </Animated.Text>
    </View>
  );

  const renderVideo2 = () => (
    <View style={styles.mediaContainer}>
      <Video
        ref={video2Ref}
        source={VIDEO_2}
        style={styles.video}
        resizeMode="cover"
        shouldPlay={step === "video2"}
        isLooping
      />
    </View>
  );

  const renderSilence = () => (
    <Animated.View
      style={[styles.centerContainer, { opacity: silenceOpacity }]}
    >
      <Text style={styles.silenceText}>
        Cargando...Un momento
      </Text>
    </Animated.View>
  );

  const renderVideo3 = () => (
    <View style={styles.mediaContainer}>
      <Video
        ref={video3Ref}
        source={VIDEO_3}
        style={styles.video}
        resizeMode="cover"
        shouldPlay={step === "video3"}
        isLooping={false}
        onPlaybackStatusUpdate={handleVideo3Status}
      />
    </View>
  );

  const renderIdle = () => (
    <View style={styles.centerContainer}>
      <Text style={styles.idleText}>
        Cuando estés lista, toca “Empezar ejercicio” 🌱
      </Text>
    </View>
  );

    return (
    <LinearGradient
      colors={["#FFE9D6", "#FBCFE8", "#EDE9FE"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.root}
    >
      <SafeAreaView style={{ flex: 1 }}>
        {/* */}
        {!showIntroCard && (
          <View style={styles.cardShell}>
            {step === "idle" && renderIdle()}
            {step === "video1" && renderVideo1()}
            {step === "countdown" && renderCountdown()}
            {step === "video2" && renderVideo2()}
            {step === "silence" && renderSilence()}
            {step === "video3" && renderVideo3()}
          </View>
        )}

        {/* Tarjeta flotante encima de todo al inicio */}
        {showIntroCard && renderFloatingIntroCard()}
      </SafeAreaView>
    </LinearGradient>
  );

}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },


  cardShell: {
    flex: 1,
    marginHorizontal: 16,
    marginVertical: 18,
    borderRadius: 26,
    backgroundColor: "#FFF7ED",
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
    overflow: "hidden",
  },

  // Tarjeta flotante inicial (conejito)
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  floatingCard: {
    width: "100%",
    borderRadius: 22,
    backgroundColor: "#FEFCE8",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
    borderWidth: 1,
    borderColor: "#FDE68A",
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
    position: "relative",
  },
  pinWrapper: {
    position: "absolute",
    top: 10,
    right: 12,
  },
  floatingImage: {
    width: "100%",
    height: 140,
    marginBottom: 10,
  },
  floatingTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#14532D",
    textAlign: "center",
    marginBottom: 6,
  },
  floatingSubtitle: {
    fontSize: 14,
    color: "#374151",
    textAlign: "center",
    marginBottom: 14,
  },
  floatingButton: {
    alignSelf: "center",
    backgroundColor: "#16A34A",
    borderRadius: 999,
    paddingHorizontal: 26,
    paddingVertical: 10,
  },
  floatingButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },

  // videos dentro de la tarjeta grande
  mediaContainer: {
    flex: 1,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  video: {
    width: "100%",
    height: "100%",
  },

  // Countdown, silencio e idle dentro de la tarjeta grande
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  countdownLabel: {
    fontSize: 16,
    color: "#374151",
    marginBottom: 8,
    textAlign: "center",
  },
  countdownNumber: {
    fontSize: 60,
    fontWeight: "800",
    color: "#111827",
  },
  silenceText: {
    fontSize: 18,
    textAlign: "center",
    color: "#111827",
  },
  idleText: {
    fontSize: 16,
    textAlign: "center",
    color: "#6B7280",
  },
});
