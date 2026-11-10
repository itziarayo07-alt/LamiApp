import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function IntroArticuloAnsiedad({ navigation }) {
  const progress = useRef(new Animated.Value(0)).current;
  const animationRef = useRef(null);
  const [currentValue, setCurrentValue] = useState(0);

  const TOTAL_DURATION = 8000; // 8 segundos

  const startAnimation = (fromValue = 0) => {
    const remaining = (1 - fromValue) * TOTAL_DURATION;

    animationRef.current = Animated.timing(progress, {
      toValue: 1,
      duration: remaining,
      useNativeDriver: false,
    });

    animationRef.current.start(({ finished }) => {
      if (finished) {
        navigation.replace("InfoAnsiedad");
      }
    });
  };

  useEffect(() => {
    startAnimation(0);
  }, []);

  const handlePause = () => {
    progress.stopAnimation((value) => {
      setCurrentValue(value);
    });
  };

  const handleResume = () => {
    startAnimation(currentValue);
  };

  const widthInterpolated = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  // Opacidades para cruzar entre dos gradientes rosa–lila
  const gradient1Opacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const gradient2Opacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <View style={styles.root}>
      {/* CAPA 1: GRADIENTE INICIAL (durazno → rosa) */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: gradient1Opacity }]}
      >
        <LinearGradient
          colors={["#FFE9D6", "#FBCFE8"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* CAPA 2: GRADIENTE FINAL (rosa → lila) */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: gradient2Opacity }]}
      >
        <LinearGradient
          colors={["#FBCFE8", "#EDE9FE"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* CONTENIDO INTERACTIVO */}
      <Pressable
        style={styles.container}
        onPressIn={handlePause}
        onPressOut={handleResume}
      >
        <SafeAreaView style={{ flex: 1 }}>
          {/* BARRA DE PROGRESO */}
          <View style={styles.progressBarBackground}>
            <Animated.View
              style={[styles.progressBarFill, { width: widthInterpolated }]}
            />
          </View>

          {/* TEXTO */}
          <View style={styles.textBlock}>
            <Text style={styles.helloText}>Hola.</Text>

            <Text style={styles.mainText}>
              ¿Sabías que{" "}
              <Text style={styles.boldText}>
                tu cuerpo no es tu enemigo cuando sientes ansiedad
              </Text>
              ?
            </Text>

            <Text style={styles.secondaryText}>
              En realidad está intentando cuidarte, solo que a veces reacciona
              con más fuerza de la que necesitas. Conocer lo que te pasa es una
              forma de abrazarte a ti misma. ❤️ 🩹
            </Text>
          </View>

          {/* IMAGEN */}
          <View style={styles.imageContainer}>
            <Image
              source={require("../assets/conejo.png")} // tu imagen
              style={styles.image}
              resizeMode="contain"
            />
          </View>
        </SafeAreaView>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },

  progressBarBackground: {
    height: 6,
    backgroundColor: "#FED7AA",
    borderRadius: 999,
    marginHorizontal: 24,
    marginTop: 16,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 6,
    backgroundColor: "#FB923C",
    borderRadius: 999,
  },

  textBlock: {
    paddingHorizontal: 24,
    marginTop: 40,
  },

  helloText: {
    fontSize: 22,
    fontWeight: "600",
    color: "#3F2A1C",
    marginBottom: 8,
  },

  mainText: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "700",
    color: "#3F2A1C",
    marginBottom: 12,
  },

  boldText: {
    fontWeight: "800",
  },

  secondaryText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#5B4634",
    marginBottom: 10,
  },

  imageContainer: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 40,
  },
  image: {
    width: "110%",
    height: "100%",
  },
});
