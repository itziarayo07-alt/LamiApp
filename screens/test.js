import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';

const ES_EXPO_GO =
  Constants.executionEnvironment === 'storeClient' ||
  Constants.appOwnership === 'expo';

// Configurar notificaciones solo fuera de Expo Go para evitar Uncaught Promise Error
if (!ES_EXPO_GO) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (_) {}
}

// Preguntas oficiales cortas de la escala clínica GAD-7 (Spitzer et al. / OMS / APA)
const PREGUNTAS_GAD7 = [
  {
    id: 1,
    texto: 'Sentirte nervioso/a, ansioso/a o con los nervios de punta.',
    tag: 'Inquietud',
    icono: 'pulse-outline',
  },
  {
    id: 2,
    texto: 'No poder dejar de preocuparte o controlar la preocupación.',
    tag: 'Control mental',
    icono: 'cloud-outline',
  },
  {
    id: 3,
    texto: 'Preocuparte demasiado por diferentes cosas.',
    tag: 'Sobrepensar',
    icono: 'sync-outline',
  },
  {
    id: 4,
    texto: 'Tener dificultad para relajarte.',
    tag: 'Tensión',
    icono: 'body-outline',
  },
  {
    id: 5,
    texto: 'Estar tan inquieto/a que te cuesta quedarte quieto/a.',
    tag: 'Agitación',
    icono: 'walk-outline',
  },
  {
    id: 6,
    texto: 'Molestarte o irritarte con facilidad.',
    tag: 'Irritabilidad',
    icono: 'flash-outline',
  },
  {
    id: 7,
    texto: 'Sentir miedo, como si algo terrible pudiera pasar.',
    tag: 'Alerta',
    icono: 'shield-outline',
  },
];

const OPCIONES_GAD7 = [
  {
    label: 'Nunca',
    sublabel: 'Ningún día',
    valor: 0,
    emoji: '🌿',
    bg: '#ECFDF5',
    border: '#6EE7B7',
    text: '#065F46',
    activeBg: '#10B981',
  },
  {
    label: 'Varios días',
    sublabel: 'Menos de la mitad',
    valor: 1,
    emoji: '🌤️',
    bg: '#F3E8FF',
    border: '#D8B4FE',
    text: '#5B21B6',
    activeBg: '#8B5CF6',
  },
  {
    label: 'Más de la mitad de los días',
    sublabel: 'Con frecuencia',
    valor: 2,
    emoji: '🌥️',
    bg: '#FEF3C7',
    border: '#FCD34D',
    text: '#92400E',
    activeBg: '#F59E0B',
  },
  {
    label: 'Casi todos los días',
    sublabel: 'De forma constante',
    valor: 3,
    emoji: '🌧️',
    bg: '#FFE4E6',
    border: '#FDA4AF',
    text: '#9F1239',
    activeBg: '#F43F5E',
  },
];

// Orbe animado que respira suavemente en la cabecera de la tarjeta
function BreathingOrb({ valorActual }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.12,
            duration: 2400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.96,
            duration: 2400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 0.7,
            duration: 2400,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.3,
            duration: 2400,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scaleAnim, glowAnim]);

  const orbColors =
    valorActual === 3
      ? ['#FB7185', '#A855F7']
      : valorActual === 2
      ? ['#FBBF24', '#A855F7']
      : valorActual === 1
      ? ['#A78BFA', '#60A5FA']
      : ['#6EE7B7', '#818CF8'];

  const orbEmoji =
    valorActual === 3
      ? '🫂'
      : valorActual === 2
      ? '🫧'
      : valorActual === 1
      ? '✨'
      : '🪷';

  return (
    <View style={styles.orbWrapper}>
      <Animated.View
        style={[
          styles.orbHalo,
          {
            opacity: glowAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      />
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <LinearGradient colors={orbColors} style={styles.orbCore}>
          <Text style={styles.orbEmoji}>{orbEmoji}</Text>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

// Partículas flotantes suaves para resultado MODERADO
function FloatingParticles({ emoji = '🫧' }) {
  const items = Array.from({ length: 14 }, (_, i) => i);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {items.map((idx) => (
        <SingleParticle key={idx} emoji={emoji} index={idx} />
      ))}
    </View>
  );
}

function SingleParticle({ emoji, index }) {
  const animY = useRef(new Animated.Value(-40)).current;
  const startX = useRef(((index * 53) % 320) - 160).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(index * 220),
        Animated.timing(animY, {
          toValue: 740,
          duration: 4200 + (index % 4) * 600,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(animY, {
          toValue: -40,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animY, index]);

  return (
    <Animated.Text
      style={{
        position: 'absolute',
        left: '50%',
        fontSize: 24,
        opacity: 0.85,
        transform: [{ translateX: startX }, { translateY: animY }],
      }}
    >
      {emoji}
    </Animated.Text>
  );
}

// Loader de 3 puntitos animado
function DotLoader() {
  const a1 = useRef(new Animated.Value(0.25)).current;
  const a2 = useRef(new Animated.Value(0.25)).current;
  const a3 = useRef(new Animated.Value(0.25)).current;

  useEffect(() => {
    const pulse = (anim, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 280,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.25,
            duration: 280,
            useNativeDriver: true,
          }),
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
  }, [a1, a2, a3]);

  return (
    <View style={styles.dotsRow}>
      <Animated.Text style={[styles.dot, { opacity: a1 }]}>•</Animated.Text>
      <Animated.Text style={[styles.dot, { opacity: a2 }]}>•</Animated.Text>
      <Animated.Text style={[styles.dot, { opacity: a3 }]}>•</Animated.Text>
    </View>
  );
}

export default function Test({ navigation }) {
  const [respuestas, setRespuestas] = useState(
    Array(PREGUNTAS_GAD7.length).fill(null)
  );
  const [indice, setIndice] = useState(0);
  const [opcionTocada, setOpcionTocada] = useState(null);
  const [resultado, setResultado] = useState(null);

  const progresoAnim = useRef(new Animated.Value(0)).current;
  const cardSlideAnim = useRef(new Animated.Value(0)).current;
  const cardFadeAnim = useRef(new Animated.Value(1)).current;

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);

  // Configurar notificaciones solo fuera de Expo Go con try/catch seguro
  useEffect(() => {
    if (ES_EXPO_GO) return;

    const configurarNotificaciones = async () => {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status === 'granted') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
          });
        }
      } catch (_) {}
    };

    configurarNotificaciones();
  }, []);

  // Animar barra de progreso
  useEffect(() => {
    const respondidas = respuestas.filter((r) => r !== null).length;
    const progreso = respondidas / PREGUNTAS_GAD7.length;
    Animated.timing(progresoAnim, {
      toValue: progreso,
      duration: 380,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [respuestas, progresoAnim]);

  const animarCambioPregunta = (nuevoIndice, direccion = 1) => {
    Animated.parallel([
      Animated.timing(cardFadeAnim, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(cardSlideAnim, {
        toValue: -18 * direccion,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIndice(nuevoIndice);
      setOpcionTocada(null);
      cardSlideAnim.setValue(18 * direccion);
      Animated.parallel([
        Animated.timing(cardFadeAnim, {
          toValue: 1,
          duration: 210,
          useNativeDriver: true,
        }),
        Animated.spring(cardSlideAnim, {
          toValue: 0,
          friction: 7,
          tension: 65,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const seleccionarOpcion = (valor) => {
    if (opcionTocada !== null) return; // Evita doble toque rápido
    setOpcionTocada(valor);

    const nuevas = [...respuestas];
    nuevas[indice] = valor;
    setRespuestas(nuevas);

    setTimeout(() => {
      if (indice < PREGUNTAS_GAD7.length - 1) {
        animarCambioPregunta(indice + 1, 1);
      } else {
        setOpcionTocada(null);
        calcularResultado(nuevas);
      }
    }, 220);
  };

  // Puntos de corte clínicos oficiales GAD-7 (0 a 21 pts)
  const calcularResultado = (respuestasFinales) => {
    const total = respuestasFinales.reduce((acc, cur) => acc + (cur || 0), 0);
    let nivel = '';
    let subnivel = '';
    let color = '';
    let fondo = [];
    let consejo = '';
    let emojiResultado = '🌿';

    if (total <= 4) {
      nivel = 'MÍNIMA / LEVE';
      subnivel = 'Equilibrio emocional estable';
      color = '#059669';
      fondo = ['#D1FAE5', '#DDD6FE'];
      emojiResultado = '🌿';
      consejo =
        'Tu nivel de ansiedad se encuentra en rango mínimo. Sigue cultivando tus espacios de calma y autocuidado.';
    } else if (total <= 9) {
      nivel = 'LEVE';
      subnivel = 'Inquietud cotidiana manejable';
      color = '#0D9488';
      fondo = ['#CCFBF1', '#E9D5FF'];
      emojiResultado = '🌤️';
      consejo =
        'Presentas señales leves de tensión. Ejercicios breves de respiración y pausas activas te ayudarán mucho.';
    } else if (total <= 14) {
      nivel = 'MODERADO';
      subnivel = 'Sobrecarga emocional presente';
      color = '#7C3AED';
      fondo = ['#C7D2FE', '#E9D5FF'];
      emojiResultado = '💜';
      consejo =
        'Sentir ansiedad no te hace débil, te hace humana. Vamos a acompañarte paso a paso para bajar esa carga.';
    } else {
      nivel = 'ALTO';
      subnivel = 'Alta activación y alerta';
      color = '#E11D48';
      fondo = ['#FECDD3', '#DDD6FE'];
      emojiResultado = '🫂';
      consejo =
        'Tu mente se puede cansar, pero también puede sanar. Tu psicólogo y las herramientas de calma están contigo.';
    }

    setResultado({
      total,
      nivel,
      subnivel,
      color,
      fondo,
      consejo,
      emojiResultado,
    });
  };

  const iniciarMonitoreo = async () => {
    if (isConfiguring) return;

    try {
      setIsConfiguring(true);
      setShowConfigModal(true);

      const hoy = new Date().toISOString();
      await AsyncStorage.setItem('startDate', hoy);

      if (resultado) {
        await AsyncStorage.setItem(
          'ultimoResultadoGAD7',
          JSON.stringify({
            total: resultado.total,
            nivel: resultado.nivel,
            fecha: hoy,
          })
        );
      }

      if (!ES_EXPO_GO) {
        try {
          const trigger = new Date(Date.now() + 24 * 60 * 60 * 1000);
          await Notifications.scheduleNotificationAsync({
            content: {
              title: '🌱 ¡Primer día completado!',
              body: 'Felicidades, llevas 1 día cuidando tu bienestar mental 💚',
            },
            trigger: { type: 'date', date: trigger },
          });
        } catch (_) {}
      }

      setTimeout(() => {
        setShowConfigModal(false);
        setIsConfiguring(false);
        navigation.navigate('Anxiosimetro');
      }, 4500);
    } catch (_) {
      setShowConfigModal(false);
      setIsConfiguring(false);
    }
  };

  const widthInterpolada = progresoAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // ================== PANTALLA DE RESULTADO ==================
  if (resultado) {
    return (
      <LinearGradient colors={resultado.fondo} style={styles.resultContainer}>
        <SafeAreaView style={styles.resultSafeArea}>
          <Modal transparent visible={showConfigModal} animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <LinearGradient
                  colors={['#EDE9FE', '#E0F2FE']}
                  style={styles.modalIconCircle}
                >
                  <Ionicons name="sparkles" size={28} color="#7C3AED" />
                </LinearGradient>
                <Text style={styles.modalTitle}>Personalizando Lami…</Text>
                <Text style={styles.modalText}>
                  Adaptando tus ejercicios de respiración y monitoreo según tu
                  nivel actual.
                </Text>
                <DotLoader />
                <Text style={styles.modalHint}>Un momento por favor 💜</Text>
              </View>
            </View>
          </Modal>

          <View style={styles.resultBox}>
            <View style={styles.clinicalSealPill}>
              <Ionicons name="shield-checkmark" size={13} color="#6D28D9" />
              <Text style={styles.clinicalSealText}>
                ESCALA CLÍNICA GAD-7 • OMS / APA
              </Text>
            </View>

            <Text style={styles.resultEmojiBig}>{resultado.emojiResultado}</Text>

            <Text style={styles.resultTitle}>Nivel de Ansiedad</Text>
            <Text style={[styles.levelHighlight, { color: resultado.color }]}>
              {resultado.nivel}
            </Text>
            <Text style={styles.subnivelText}>{resultado.subnivel}</Text>

            <View style={styles.scoreBadge}>
              <Text style={[styles.scoreText, { color: resultado.color }]}>
                {resultado.total}
              </Text>
              <Text style={styles.scoreMaxText}> / 21 pts</Text>
            </View>

            <Text style={styles.consejo}>{resultado.consejo}</Text>

            <TouchableOpacity
              style={styles.monitorButtonWrapper}
              onPress={iniciarMonitoreo}
              activeOpacity={0.88}
              disabled={isConfiguring}
            >
              <LinearGradient
                colors={['#7C3AED', '#6192A4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.monitorButton}
              >
                <Ionicons name="heart" size={18} color="#FFFFFF" />
                <Text style={styles.monitorText}>Iniciar Monitoreo</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {(resultado.nivel === 'MÍNIMA / LEVE' ||
            resultado.nivel === 'LEVE') && (
            <ConfettiCannon
              count={130}
              origin={{ x: 190, y: 0 }}
              fadeOut={true}
              autoStart={true}
            />
          )}

          {resultado.nivel === 'MODERADO' && <FloatingParticles emoji="💜" />}

          {resultado.nivel === 'ALTO' && <FloatingParticles emoji="🫂" />}
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // ================== PANTALLA DE PREGUNTAS DINÁMICA ==================
  const preguntaActual = PREGUNTAS_GAD7[indice];
  const respuestaPrevia = respuestas[indice];

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#B8C6F8', '#D8B4FE', '#F5D0FE']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.background}
      >
        {/* Cabecera superior con botón regresar y sello clínico */}
        <View style={styles.topHeaderBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (indice > 0) {
                animarCambioPregunta(indice - 1, -1);
              } else {
                navigation.goBack();
              }
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-back" size={22} color="#4C1D95" />
          </TouchableOpacity>

          <View style={styles.clinicalHeaderBadge}>
            <Ionicons name="medkit-outline" size={13} color="#4C1D95" />
            <Text style={styles.clinicalHeaderText}>
              GAD-7 • Avalado OMS & APA
            </Text>
          </View>

          <View style={styles.counterPill}>
            <Text style={styles.counterPillText}>
              {indice + 1}/{PREGUNTAS_GAD7.length}
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollCenter}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.card,
              {
                opacity: cardFadeAnim,
                transform: [{ translateX: cardSlideAnim }],
              },
            ]}
          >
            {/* Orbe animado que respira */}
            <BreathingOrb
              valorActual={
                opcionTocada !== null ? opcionTocada : respuestaPrevia ?? 0
              }
            />

            {/* Indicador por pasos (7 cápsulas interactivas) */}
            <View style={styles.stepDotsContainer}>
              {PREGUNTAS_GAD7.map((p, idx) => {
                const completada = respuestas[idx] !== null;
                const actual = idx === indice;
                return (
                  <View
                    key={p.id}
                    style={[
                      styles.stepCapsule,
                      completada && styles.stepCapsuleDone,
                      actual && styles.stepCapsuleActive,
                    ]}
                  />
                );
              })}
            </View>

            {/* Barra fluida de progreso */}
            <View style={styles.progressBarBackground}>
              <Animated.View
                style={[styles.progressBarFill, { width: widthInterpolada }]}
              />
            </View>

            {/* Contexto temporal oficial GAD-7 */}
            <View style={styles.contextTagRow}>
              <Ionicons
                name={preguntaActual.icono}
                size={14}
                color="#7C3AED"
              />
              <Text style={styles.contextTagText}>
                En las últimas 2 semanas • {preguntaActual.tag}
              </Text>
            </View>

            <Text style={styles.question}>{preguntaActual.texto}</Text>

            {/* Botones de respuesta dinámicos con intensidad de color */}
            <View style={styles.optionsList}>
              {OPCIONES_GAD7.map((item) => {
                const seleccionada =
                  opcionTocada === item.valor ||
                  (opcionTocada === null && respuestaPrevia === item.valor);

                return (
                  <TouchableOpacity
                    key={item.valor}
                    activeOpacity={0.86}
                    onPress={() => seleccionarOpcion(item.valor)}
                    style={[
                      styles.optionCard,
                      {
                        backgroundColor: seleccionada
                          ? item.activeBg
                          : item.bg,
                        borderColor: seleccionada
                          ? item.activeBg
                          : item.border,
                      },
                    ]}
                  >
                    <Text style={styles.optionEmoji}>{item.emoji}</Text>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.optionTitle,
                          { color: seleccionada ? '#FFFFFF' : item.text },
                        ]}
                      >
                        {item.label}
                      </Text>
                      <Text
                        style={[
                          styles.optionSublabel,
                          {
                            color: seleccionada
                              ? 'rgba(255,255,255,0.9)'
                              : '#64748B',
                          },
                        ]}
                      >
                        {item.sublabel}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.optionRadio,
                        {
                          borderColor: seleccionada ? '#FFFFFF' : item.border,
                          backgroundColor: seleccionada
                            ? 'rgba(255,255,255,0.25)'
                            : '#FFFFFF',
                        },
                      ]}
                    >
                      {seleccionada && (
                        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Nota de fuente científica al pie de la tarjeta */}
            <Text style={styles.sourceFooterText}>
              Basado en Generalized Anxiety Disorder-7 (Spitzer et al.) •
              Referencia clínica OMS / APA / NICE
            </Text>
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  topHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  clinicalHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  clinicalHeaderText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#4C1D95',
  },
  counterPill: {
    backgroundColor: '#4C1D95',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
  },
  counterPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  scrollCenter: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 24,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 30,
    padding: 22,
    elevation: 8,
    shadowColor: '#4C1D95',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  orbWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    height: 62,
  },
  orbHalo: {
    position: 'absolute',
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#DDD6FE',
  },
  orbCore: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  orbEmoji: {
    fontSize: 22,
  },
  stepDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 10,
  },
  stepCapsule: {
    height: 5,
    width: 22,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
  },
  stepCapsuleDone: {
    backgroundColor: '#A78BFA',
  },
  stepCapsuleActive: {
    width: 34,
    backgroundColor: '#7C3AED',
  },
  progressBarBackground: {
    height: 7,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    marginBottom: 14,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#7C3AED',
    borderRadius: 6,
  },
  contextTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F5F3FF',
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 10,
  },
  contextTagText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#6D28D9',
  },
  question: {
    fontSize: 18.5,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
    lineHeight: 25,
    marginBottom: 18,
  },
  optionsList: {
    gap: 10,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12.5,
    paddingHorizontal: 15,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  optionEmoji: {
    fontSize: 21,
  },
  optionTitle: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  optionSublabel: {
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 1,
  },
  optionRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceFooterText: {
    fontSize: 10.5,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 14,
  },

  // Resultado
  resultContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  resultSafeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  resultBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 28,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    elevation: 10,
  },
  clinicalSealPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 12,
  },
  clinicalSealText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#6D28D9',
    letterSpacing: 0.4,
  },
  resultEmojiBig: {
    fontSize: 44,
    marginBottom: 6,
  },
  resultTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  levelHighlight: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
  },
  subnivelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 16,
    marginVertical: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  scoreText: {
    fontSize: 30,
    fontWeight: '900',
  },
  scoreMaxText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748B',
  },
  consejo: {
    fontSize: 14.5,
    textAlign: 'center',
    color: '#334155',
    lineHeight: 21,
    marginBottom: 22,
  },
  monitorButtonWrapper: {
    width: '100%',
  },
  monitorButton: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monitorText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 16,
  },

  // Modal de configuración
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: 'white',
    borderRadius: 26,
    paddingVertical: 28,
    paddingHorizontal: 22,
    width: '92%',
    maxWidth: 420,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
  },
  modalIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#4C1D95',
    marginBottom: 8,
  },
  modalText: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    fontSize: 38,
    marginHorizontal: 5,
    color: '#7C3AED',
    fontWeight: '900',
  },
});