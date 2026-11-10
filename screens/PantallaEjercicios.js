import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';


const { width, height } = Dimensions.get("window");

// Crear estrellas
const createStars = () => {
  return Array.from({ length: 50 }).map(() => ({
    left: Math.random() * width,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 6000 + 4000,
    delay: Math.random() * 3000,
    anim: new Animated.Value(0),
  }));
};

export default function PantallaEjercicios() {
  const navigation = useNavigation();

  const [sound, setSound] = useState(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [showMeditacionBtn, setShowMeditacionBtn] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  // Estrellas
  const [stars] = useState(createStars());

  useEffect(() => {
    stars.forEach(star => {
      const loop = () => {
        star.anim.setValue(0);
        Animated.timing(star.anim, {
          toValue: 1,
          duration: star.duration,
          delay: star.delay,
          useNativeDriver: true,
        }).start(loop);
      };
      loop();
    });
  }, []);

  // FRASES DINÁMICAS
  const frases = [
    "Inhala lentamente…",
    "Exhala… suéltalo",
    "Tu cuerpo está a salvo",
    "Respira… vuelve a tu centro",
    "Todo está bien",
    "Eres fuerte",
    "Sigue respirando…"
  ];

  const [fraseActual, setFraseActual] = useState(frases[0]);

  useEffect(() => {
    if (showVideo) return;

    const interval = setInterval(() => {
      setFraseActual(f => {
        const index = frases.indexOf(f);
        return frases[(index + 1) % frases.length];
      });
    }, 7000);

    return () => clearInterval(interval);
  }, [showVideo]);

  // AUDIO
  async function playSound() {
    const { sound } = await Audio.Sound.createAsync(
      require('../assets/sounds/inhale.mp3'),
      { volume: 1.0, isLooping: true }
    );

    setSound(sound);
    await sound.setStatusAsync({ rate: 0.4 });
    await sound.playAsync();
  }

  useEffect(() => {
    playSound();
    return () => { if (sound) sound.unloadAsync(); };
  }, []);

  // CRONÓMETRO
  useEffect(() => {
    if (timeLeft === 0) {
      setShowMeditacionBtn(true);
      return;
    }

    const interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  // VOLVER
  const volver = async () => {
    try {
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
      }
    } catch {}

    setShowVideo(false);
    setShowMeditacionBtn(false);
    setTimeLeft(0);

    navigation.navigate("Anxiosimetro");
  };

  // ACTIVAR VIDEO
  const iniciarMeditacion = async () => {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
    }
    setShowVideo(true);
  };

  return (
    <View style={styles.container}>

      {/* FONDO: LLUVIA DE ESTRELLAS */}
      {stars.map((star, index) => {
        const translateY = star.anim.interpolate({
          inputRange: [0, 1],
          outputRange: [-20, height + 20],
        });

        return (
          <Animated.View
            key={index}
            style={{
              position: 'absolute',
              top: -10,
              left: star.left,
              width: star.size,
              height: star.size,
              borderRadius: star.size,
              backgroundColor: '#bcd0ff',
              opacity: 0.8,
              transform: [{ translateY }],
            }}
          />
        );
      })}

      {/* BOTÓN VOLVER */}
      <TouchableOpacity style={styles.backButton} onPress={volver}>
        <Ionicons name="arrow-back" size={32} color="#fff" />
      </TouchableOpacity>

      {/* TÍTULO */}
      <Text style={styles.title}>
        {showVideo ? "Meditación Guiada" : "Respiración Controlada"}
      </Text>

      {/* SUBTEXTO */}
      <Text style={styles.subText}>
        {showVideo ? "Concéntrate" : fraseActual}
      </Text>

      {/* GIF O VIDEO */}
      {!showVideo ? (
        <Image 
          source={require('../assets/respirar.gif')}
          style={styles.gif}
          resizeMode="contain"
        />
      ) : (
        <Video
          source={require('../assets/meditacion.mp4')}
          style={styles.video}
          resizeMode="cover"
          shouldPlay
          isLooping
        />
      )}

      {/* TIEMPO */}
      {!showVideo && <Text style={styles.timer}>{timeLeft}s</Text>}

      {/* BOTÓN MEDITAR */}
      {showMeditacionBtn && !showVideo && (
        <TouchableOpacity style={styles.btnMeditar} onPress={iniciarMeditacion}>
          <Text style={styles.btnText}>¿Meditamos?</Text>
        </TouchableOpacity>
      )}

    </View>
  );
}


// ESTILOS
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020312',
    alignItems: 'center',
    justifyContent: 'center',
  },

  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
  },

  title: {
    fontSize: 28,
    color: '#ffffff',
    fontWeight: '700',
    marginBottom: 10,
    textShadowColor: '#6ab7ff',
    textShadowRadius: 10,
  },

  subText: {
    fontSize: 18,
    color: '#b3c7ff',
    marginBottom: 20,
  },

  gif: {
    width: 280,
    height: 280,
    marginBottom: 20,
  },

  video: {
    width: '90%',
    height: 300,
    borderRadius: 20,
    marginTop: 10,
  },

  timer: {
    fontSize: 40,
    color: '#ffffff',
    marginTop: 10,
  },

  btnMeditar: {
    backgroundColor: '#7a4cff',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 20,
    marginTop: 20,
    shadowColor: '#b388ff',
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },

  btnText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '600',
  },
});

