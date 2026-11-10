import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';

// Animación de caritas neutrales para resultado MODERADO
function NeutralFaces() {
  const caras = Array.from({ length: 20 }, (_, i) => i);
  return (
    <>
      {caras.map((c) => (
        <AnimatedNeutralFace key={c} />
      ))}
    </>
  );
}

function AnimatedNeutralFace() {
  const animY = useRef(new Animated.Value(-50)).current;
  const animX = useRef(new Animated.Value(Math.random() * 300 - 150)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animY, {
          toValue: 700,
          duration: 4000 + Math.random() * 2000,
          useNativeDriver: true,
        }),
        Animated.timing(animY, {
          toValue: -50,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.Text
      style={{
        position: 'absolute',
        fontSize: 26,
        transform: [{ translateX: animX }, { translateY: animY }],
        zIndex: 20,
      }}
    >
      😐
    </Animated.Text>
  );
}

// Animación de caritas llorando para resultado ALTO 
function CryingFaces() {
  const caras = Array.from({ length: 20 }, (_, i) => i);
  return (
    <>
      {caras.map((c) => (
        <AnimatedCryingFace key={c} />
      ))}
    </>
  );
}

function AnimatedCryingFace() {
  const animY = useRef(new Animated.Value(-50)).current;
  const animX = useRef(new Animated.Value(Math.random() * 300 - 150)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animY, {
          toValue: 700,
          duration: 4000 + Math.random() * 2000,
          useNativeDriver: true,
        }),
        Animated.timing(animY, {
          toValue: -50,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.Text
      style={{
        position: 'absolute',
        fontSize: 26,
        transform: [{ translateX: animX }, { translateY: animY }],
        zIndex: 20,
      }}
    >
      😢
    </Animated.Text>
  );
}

//Loader de 3 puntitos animado
function DotLoader() {
  const a1 = useRef(new Animated.Value(0.25)).current;
  const a2 = useRef(new Animated.Value(0.25)).current;
  const a3 = useRef(new Animated.Value(0.25)).current;

  useEffect(() => {
    const pulse = (anim, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 280, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.25, duration: 280, useNativeDriver: true }),
        ])
      );

    const l1 = pulse(a1, 0);
    const l2 = pulse(a2, 160);
    const l3 = pulse(a3, 320);

    l1.start();
    l2.start();
    l3.start();

    return () => {
      l1.stop();
      l2.stop();
      l3.stop();
    };
  }, []);

  return (
    <View style={styles.dotsRow}>
      <Animated.Text style={[styles.dot, { opacity: a1 }]}>•</Animated.Text>
      <Animated.Text style={[styles.dot, { opacity: a2 }]}>•</Animated.Text>
      <Animated.Text style={[styles.dot, { opacity: a3 }]}>•</Animated.Text>
    </View>
  );
}

// Configurar comportamiento de notificacionws fuera de expo go
if (Constants.executionEnvironment !== 'storeClient') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export default function Test({ navigation }) {
  const preguntas = [
    'Me siento nervioso/a o inquieto/a sin razón aparente.',
    'Me cuesta relajarme o mantenerme tranquilo/a.',
    'Tengo dificultad para concentrarme por preocupación.',
    'Me siento tenso/a o con rigidez muscular (cuello, espalda, hombros).',
    'Me preocupo constantemente por el futuro.',
    'Siento miedo de que algo malo pueda pasar.',
    'Me cuesta dormir o tengo un sueño interrumpido.',
    'Me sobresalto con facilidad ante ruidos o imprevistos.',
    'Siento palpitaciones, sudoración o temblores sin causa médica.',
    'Evito situaciones sociales o actividades por ansiedad.',
  ];

  const opciones = [
    { label: 'Nunca', valor: 0 },
    { label: 'A veces', valor: 1 },
    { label: 'Frecuentemente', valor: 2 },
    { label: 'Casi siempre', valor: 3 },
  ];

  const [respuestas, setRespuestas] = useState(Array(10).fill(null));
  const [indice, setIndice] = useState(0);
  const [resultado, setResultado] = useState(null);
  const progresoAnim = useRef(new Animated.Value(0)).current;

  //Modal flotante
  const [showConfigModal, setShowConfigModal] = useState(false);

  //Para evitar doble toque
  const [isConfiguring, setIsConfiguring] = useState(false);

  //Configurar notificaciones solo fuera de Expo Go
  useEffect(() => {
    if (Constants.executionEnvironment === 'storeClient') return;

    const configurarNotificaciones = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso necesario',
          'Por favor permite las notificaciones para recibir recordatorios 💚'
        );
      }

      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      });
    };

    configurarNotificaciones();
  }, []);

  // Animar barra de progreso
  useEffect(() => {
    const progreso = respuestas.filter((r) => r !== null).length / preguntas.length;
    Animated.timing(progresoAnim, {
      toValue: progreso,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [respuestas]);

  const seleccionarOpcion = (valor) => {
    const nuevas = [...respuestas];
    nuevas[indice] = valor;
    setRespuestas(nuevas);

    if (indice < preguntas.length - 1) {
      setIndice(indice + 1);
    } else {
      calcularResultado(nuevas);
    }
  };

  const calcularResultado = (respuestas) => {
    const total = respuestas.reduce((acc, cur) => acc + (cur || 0), 0);
    let nivel = '';
    let color = '';
    let fondo = [];
    let consejo = '';

    if (total <= 10) {
      nivel = 'LEVE';
      color = '#34D399';
      fondo = ['#FDE68A', '#C4B5FD'];
      consejo =
        'Tu ansiedad está bajo control. Mantén hábitos saludables y cuida tu bienestar emocional.';
    } else if (total <= 20) {
      nivel = 'MODERADO';
      color = '#7C3AED';
      fondo = ['#c2c8f8', '#c6b5fa'];
      consejo = 'Sentir ansiedad no te hace débil, te hace humana.';
    } else {
      nivel = 'ALTO';
      color = '#F87171';
      fondo = ['#F87171', '#9333EA'];
      consejo = 'Tu mente se puede cansar, pero también puede sanar.';
    }

    setResultado({ total, nivel, color, fondo, consejo });
  };

  //MODIFICADO: modal + loader + 7s + evita doble toque
  const iniciarMonitoreo = async () => {
    if (isConfiguring) return;

    try {
      setIsConfiguring(true);
      setShowConfigModal(true);

      const hoy = new Date().toISOString();
      await AsyncStorage.setItem('startDate', hoy);

      if (Constants.executionEnvironment !== 'storeClient') {
        const trigger = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🌱 ¡Primer día completado!',
            body: 'Felicidades, llevas 1 día cuidando tu bienestar mental 💚',
          },
          trigger: { type: 'date', date: trigger },
        });
      }

      // Espera 7s (7000 ms)
      setTimeout(() => {
        setShowConfigModal(false);
        setIsConfiguring(false);
        navigation.navigate('Anxiosimetro');
      }, 7000);
    } catch (error) {
      console.log('Error al iniciar monitoreo:', error);
      setShowConfigModal(false);
      setIsConfiguring(false);
    }
  };

  const widthInterpolada = progresoAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  //  Pantalla de Resultado 
  if (resultado) {
    return (
      <LinearGradient colors={resultado.fondo} style={styles.resultContainer}>
        <SafeAreaView style={{ alignItems: 'center' }}>
       
          <Modal transparent visible={showConfigModal} animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Configurando…</Text>

                <Text style={styles.modalText}>
                  Estamos configurando la app de acuerdo a tus necesidades.
                </Text>

                <Text style={[styles.modalText, { marginTop: 6 }]}>
                  Espera un momento 💜
                </Text>

                <DotLoader />

                <Text style={styles.modalHint}>
                  Esto puede tardar unos segundos…
                </Text>
              </View>
            </View>
          </Modal>

          <View style={styles.resultBox}>
            <Text style={styles.resultTitle}>Resultado</Text>
            <Text style={[styles.levelHighlight, { color: resultado.color }]}>
              {resultado.nivel}
            </Text>
            <Text style={[styles.scoreText, { color: resultado.color }]}>
              {resultado.total} / 30
            </Text>
            {resultado.consejo ? (
              <Text style={styles.consejo}>{resultado.consejo}</Text>
            ) : null}

            <TouchableOpacity
              style={styles.monitorButton}
              onPress={iniciarMonitoreo}
              activeOpacity={0.85}
              disabled={isConfiguring}
            >
              <Text style={styles.monitorText}>Iniciar Monitoreo</Text>
            </TouchableOpacity>
          </View>

          {resultado.nivel === 'LEVE' && (
            <ConfettiCannon
              count={150}
              origin={{ x: 200, y: 0 }}
              fadeOut={true}
              autoStart={true}
            />
          )}

          {resultado.nivel === 'MODERADO' && <NeutralFaces />}

          {resultado.nivel === 'ALTO' && <CryingFaces />}

          {resultado.nivel === 'LEVE' && (
            <ConfettiCannon
              count={150}
              origin={{ x: 200, y: 0 }}
              fadeOut={true}
              autoStart={true}
            />
          )}
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // Pantalla de Preguntas 
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#a6c1ee', '#fbc2eb']} style={styles.background}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={26} color="#4C1D95" />
        </TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.subtitle}>
            Pregunta {indice + 1} de {preguntas.length}
          </Text>

          <View style={styles.progressBarBackground}>
            <Animated.View style={[styles.progressBarFill, { width: widthInterpolada }]} />
          </View>

          <Text style={styles.question}>{preguntas[indice]}</Text>

          <FlatList
            data={opciones}
            keyExtractor={(item) => item.label}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.optionButton}
                onPress={() => seleccionarOpcion(item.valor)}
              >
                <Text style={styles.optionText}>{item.label}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1, justifyContent: 'center', padding: 20 },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 25,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.8)',
    padding: 8,
    borderRadius: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 25,
    padding: 30,
    elevation: 8,
  },
  subtitle: {
    textAlign: 'center',
    color: '#555',
    marginBottom: 15,
    fontWeight: '500',
  },
  progressBarBackground: {
    height: 10,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
    marginBottom: 20,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#7C3AED',
    borderRadius: 6,
  },
  question: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    marginBottom: 25,
  },
  optionButton: {
    backgroundColor: '#DDD6FE',
    paddingVertical: 14,
    borderRadius: 25,
    marginVertical: 8,
    alignItems: 'center',
  },
  optionText: { fontSize: 16, color: '#4C1D95', fontWeight: '600' },

  resultContainer: { flex: 1, justifyContent: 'center' },
  resultBox: {
    backgroundColor: '#EDE9FE',
    padding: 40,
    borderRadius: 25,
    width: '85%',
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
    marginBottom: 10,
  },
  levelHighlight: {
    fontSize: 26,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  scoreText: {
    fontSize: 32,
    fontWeight: '700',
    marginVertical: 10,
  },
  consejo: {
    fontSize: 16,
    textAlign: 'center',
    color: '#4C1D95',
    marginVertical: 20,
  },
  monitorButton: {
    backgroundColor: '#7C3AED',
    padding: 15,
    borderRadius: 30,
    width: '80%',
    alignItems: 'center',
  },
  monitorText: { color: 'white', fontWeight: '600', fontSize: 16 },

  //MODAL MÁS GRANDE
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.40)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: 'white',
    borderRadius: 22,
    paddingVertical: 28,
    paddingHorizontal: 22,
    width: '95%',          // más grande
    maxWidth: 520,         // más grande
    minHeight: 220,        // más alto
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#4C1D95',
    marginBottom: 10,
  },
  modalText: {
    fontSize: 15,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 22,
  },
  modalHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 10,
    textAlign: 'center',
  },

  // cargando...
  dotsRow: {
    flexDirection: 'row',
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    fontSize: 42,
    marginHorizontal: 6,
    color: '#7C3AED',
    fontWeight: '900',
  },
});
