import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  Line,
  Path,
  Rect,
  Stop,
  LinearGradient as SvgLinearGradient,
} from "react-native-svg";

const AnimatedView = Animated.createAnimatedComponent(View);

const FASES = [
  {
    key: "inhale",
    etiqueta: "Inhala",
    segundos: 4,
    mensaje: "Inhala en 4s… Toma aire suave por la nariz.",
    escalaX: 1.13,
    escalaY: 1.17,
    flotarY: -12,
    brazoRotDeg: "-18deg",
    ojoY: -3,
    ojoEscalaY: 1.1,
    haloEscala: 1.24,
    haloOpacidad: 0.45,
    colorAcento: "#1D4ED8",
  },
  {
    key: "hold",
    etiqueta: "Mantén",
    segundos: 4,
    mensaje: "Sostén en 4s… Mantén el aire con calma y sin tensión.",
    escalaX: 1.15,
    escalaY: 1.18,
    flotarY: -10,
    brazoRotDeg: "-14deg",
    ojoY: -1.5,
    ojoEscalaY: 1.0,
    haloEscala: 1.28,
    haloOpacidad: 0.55,
    colorAcento: "#6D28D9",
  },
  {
    key: "exhale",
    etiqueta: "Exhala",
    segundos: 6,
    mensaje: "Exhala en 6s… Expulsa el aire despacio y relaja los hombros.",
    escalaX: 0.94,
    escalaY: 0.92,
    flotarY: 6,
    brazoRotDeg: "12deg",
    ojoY: 2.5,
    ojoEscalaY: 0.68,
    haloEscala: 0.88,
    haloOpacidad: 0.18,
    colorAcento: "#0F766E",
  },
];

const TOTAL_CICLOS = 4;

function PaisajeYogaPantallaCompleta({
  faseKey = "inhale",
  duracionSegundos = 4,
  activa = false,
  escalaX = 1,
  escalaY = 1,
  flotarY = 0,
  brazoRotDeg = "0deg",
  ojoY = 0,
  ojoEscalaY = 1,
  haloEscala = 1,
  haloOpacidad = 0.25,
}) {
  const animScaleX = useRef(new Animated.Value(1)).current;
  const animScaleY = useRef(new Animated.Value(1)).current;
  const animFlotarY = useRef(new Animated.Value(0)).current;
  const animBrazo = useRef(new Animated.Value(0)).current;
  const animOjoY = useRef(new Animated.Value(0)).current;
  const animOjoEscalaY = useRef(new Animated.Value(1)).current;
  const animHaloEscala = useRef(new Animated.Value(1)).current;
  const animHaloOpacidad = useRef(new Animated.Value(0.25)).current;
  const animParpadeo = useRef(new Animated.Value(1)).current;
  const animRioX = useRef(new Animated.Value(0)).current;
  const animAireExhala = useRef(new Animated.Value(0)).current;
  const animSolRayos = useRef(new Animated.Value(0)).current;

  // Ondas suaves del río
  useEffect(() => {
    const loopRio = Animated.loop(
      Animated.sequence([
        Animated.timing(animRioX, {
          toValue: 14,
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(animRioX, {
          toValue: -14,
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loopRio.start();
    return () => loopRio.stop();
  }, [animRioX]);

  // Pulso sutil de los rayitos del sol
  useEffect(() => {
    const loopSol = Animated.loop(
      Animated.sequence([
        Animated.timing(animSolRayos, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(animSolRayos, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loopSol.start();
    return () => loopSol.stop();
  }, [animSolRayos]);

  // Parpadeo natural de Lami
  useEffect(() => {
    const timerParpadeo = setInterval(() => {
      Animated.sequence([
        Animated.timing(animParpadeo, {
          toValue: 0.08,
          duration: 90,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(animParpadeo, {
          toValue: 1,
          duration: 110,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }, 3300);

    return () => clearInterval(timerParpadeo);
  }, [animParpadeo]);

  // Animación del soplo de aire cuando está exhalando
  useEffect(() => {
    animAireExhala.stopAnimation();
    if (activa && faseKey === "exhale") {
      animAireExhala.setValue(0);
      const loopAire = Animated.loop(
        Animated.timing(animAireExhala, {
          toValue: 1,
          duration: 1500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      );
      loopAire.start();
      return () => loopAire.stop();
    } else {
      animAireExhala.setValue(0);
    }
  }, [activa, faseKey, animAireExhala]);

  // Movimiento de inhalar / sostener / exhalar sincronizado con los segundos de la fase
  useEffect(() => {
    const ms = activa ? Math.max(400, duracionSegundos * 1000) : 650;
    const brazoDestino = activa ? parseFloat(brazoRotDeg) : 0;

    Animated.parallel([
      Animated.timing(animScaleX, {
        toValue: activa ? escalaX : 1,
        duration: ms,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
      Animated.timing(animScaleY, {
        toValue: activa ? escalaY : 1,
        duration: ms,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
      Animated.timing(animFlotarY, {
        toValue: activa ? flotarY : 0,
        duration: ms,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
      Animated.timing(animBrazo, {
        toValue: brazoDestino,
        duration: ms,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
      Animated.timing(animOjoY, {
        toValue: activa ? ojoY : 0,
        duration: ms,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
      Animated.timing(animOjoEscalaY, {
        toValue: activa ? ojoEscalaY : 1,
        duration: ms,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
      Animated.timing(animHaloEscala, {
        toValue: activa ? haloEscala : 1,
        duration: ms,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
      Animated.timing(animHaloOpacidad, {
        toValue: activa ? haloOpacidad : 0.25,
        duration: ms,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
    ]).start();
  }, [
    activa,
    duracionSegundos,
    escalaX,
    escalaY,
    flotarY,
    brazoRotDeg,
    ojoY,
    ojoEscalaY,
    haloEscala,
    haloOpacidad,
    animScaleX,
    animScaleY,
    animFlotarY,
    animBrazo,
    animOjoY,
    animOjoEscalaY,
    animHaloEscala,
    animHaloOpacidad,
  ]);

  const brazoRotInterpolada = animBrazo.interpolate({
    inputRange: [-30, 0, 30],
    outputRange: ["-30deg", "0deg", "30deg"],
  });

  const brazoIzqRotInterpolada = animBrazo.interpolate({
    inputRange: [-30, 0, 30],
    outputRange: ["30deg", "0deg", "-30deg"],
  });

  const aireTranslateX = animAireExhala.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 22],
  });

  const aireOpacity = animAireExhala.interpolate({
    inputRange: [0, 0.25, 0.85, 1],
    outputRange: [0, 0.85, 0.45, 0],
  });

  const rayosScale = animSolRayos.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1.08],
  });

  const esInhalando = activa && faseKey === "inhale";
  const esExhalando = activa && faseKey === "exhale";

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* PAISAJE NATURAL CON MONTAÑAS, RAYITOS DEL SOL, RÍO Y TAPETE DE YOGA */}
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 390 844"
        preserveAspectRatio="xMidYMid slice"
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <SvgLinearGradient id="cieloFull" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#93E5F8" />
            <Stop offset="50%" stopColor="#E0F2FE" />
            <Stop offset="100%" stopColor="#ECFDF5" />
          </SvgLinearGradient>
          <SvgLinearGradient
            id="montanaLejana"
            x1="0%"
            y1="0%"
            x2="0%"
            y2="100%"
          >
            <Stop offset="0%" stopColor="#A5B4FC" />
            <Stop offset="100%" stopColor="#C7D2FE" />
          </SvgLinearGradient>
          <SvgLinearGradient
            id="montanaCercana"
            x1="0%"
            y1="0%"
            x2="0%"
            y2="100%"
          >
            <Stop offset="0%" stopColor="#6EE7B7" />
            <Stop offset="100%" stopColor="#A7F3D0" />
          </SvgLinearGradient>
          <SvgLinearGradient id="rioFull" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#38BDF8" />
            <Stop offset="50%" stopColor="#7DD3FC" />
            <Stop offset="100%" stopColor="#2DD4BF" />
          </SvgLinearGradient>
          <SvgLinearGradient id="praderaFull" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#86EFAC" />
            <Stop offset="100%" stopColor="#4ADE80" />
          </SvgLinearGradient>
        </Defs>

        {/* Cielo */}
        <Rect x="0" y="0" width="390" height="844" fill="url(#cieloFull)" />

        {/* Cordillera / montañas al fondo para llenar el horizonte */}
        <Path
          d="M-20 395 L68 255 L148 355 L235 235 L325 348 L410 265 L410 440 L-20 440 Z"
          fill="url(#montanaLejana)"
          opacity="0.55"
        />
        <Path
          d="M-20 420 Q85 335 185 398 T395 360 L410 460 L-20 460 Z"
          fill="url(#montanaCercana)"
          opacity="0.72"
        />

        {/* Río serpenteante */}
        <Path
          d="M-10 432 Q115 406 205 432 T400 422 L400 482 Q285 496 190 472 T-10 486 Z"
          fill="url(#rioFull)"
          opacity="0.88"
        />

        {/* Pradera */}
        <Path
          d="M0 462 Q195 446 390 466 L390 844 L0 844 Z"
          fill="url(#praderaFull)"
        />

        {/* Arbustos a los lados */}
        <Circle cx="36" cy="460" r="28" fill="#34D399" />
        <Circle cx="66" cy="468" r="20" fill="#6EE7B7" />
        <Circle cx="354" cy="460" r="28" fill="#34D399" />
        <Circle cx="324" cy="468" r="20" fill="#6EE7B7" />

        {/* Tapete de yoga */}
        <Path d="M66 548 L324 548 L354 584 L36 584 Z" fill="#8B5CF6" />
        <Path d="M74 551 L316 551 L340 578 L50 578 Z" fill="#C4B5FD" />
        <Rect x="192" y="553" width="7" height="24" rx="3" fill="#EDE9FE" />
      </Svg>

      {/* SOL CON RAYITOS ANIMADOS ARRIBA A LA DERECHA */}
      <AnimatedView
        style={[styles.sunRaysBox, { transform: [{ scale: rayosScale }] }]}
      >
        <Svg width={130} height={130} viewBox="0 0 130 130">
          <Circle cx="76" cy="54" r="26" fill="#FDE047" opacity="0.92" />
          <Line
            x1="76"
            y1="8"
            x2="76"
            y2="20"
            stroke="#FACC15"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <Line
            x1="42"
            y1="20"
            x2="50"
            y2="29"
            stroke="#FACC15"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <Line
            x1="110"
            y1="20"
            x2="102"
            y2="29"
            stroke="#FACC15"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <Line
            x1="30"
            y1="54"
            x2="42"
            y2="54"
            stroke="#FACC15"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <Line
            x1="44"
            y1="88"
            x2="53"
            y2="79"
            stroke="#FACC15"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <Line
            x1="76"
            y1="88"
            x2="76"
            y2="100"
            stroke="#FACC15"
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity="0.65"
          />
        </Svg>
      </AnimatedView>

      {/* Ondas del río en movimiento */}
      <AnimatedView
        style={[styles.rioWaves, { transform: [{ translateX: animRioX }] }]}
      >
        <Svg width={310} height={36} viewBox="0 0 310 36">
          <Path
            d="M15 12 Q60 4 105 12 T195 12"
            stroke="#FFFFFF"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
            opacity="0.78"
          />
          <Path
            d="M120 26 Q165 18 210 26 T295 26"
            stroke="#FFFFFF"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
            opacity="0.72"
          />
        </Svg>
      </AnimatedView>

      {/* HALO DE RESPIRACIÓN */}
      <AnimatedView
        style={[
          styles.breathHalo,
          {
            opacity: animHaloOpacidad,
            transform: [{ scale: animHaloEscala }],
          },
        ]}
      />

      {/* LAMI CON EXPRESIÓN FACIAL DE INHALAR / SOSTENER / EXHALAR */}
      <AnimatedView
        style={[
          styles.lamiFullContainer,
          {
            transform: [
              { translateY: animFlotarY },
              { scaleX: animScaleX },
              { scaleY: animScaleY },
            ],
          },
        ]}
      >
        <Svg width={186} height={186} viewBox="0 0 186 186">
          <Defs>
            <SvgLinearGradient
              id="lamiBody2"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <Stop offset="0%" stopColor="#99F6E4" />
              <Stop offset="55%" stopColor="#5EEAD4" />
              <Stop offset="100%" stopColor="#2DD4BF" />
            </SvgLinearGradient>
          </Defs>

          <Ellipse
            cx="93"
            cy="172"
            rx="46"
            ry="8"
            fill="#0F172A"
            opacity="0.16"
          />

          <Path
            d="M93 20 C124 20, 138 46, 143 76 C148 106, 166 130, 152 152 C140 170, 110 163, 93 152 C76 163, 46 170, 34 152 C20 130, 38 106, 43 76 C48 46, 62 20, 93 20 Z"
            fill="url(#lamiBody2)"
          />

          <Ellipse
            cx="64"
            cy="100"
            rx="9"
            ry="5.5"
            fill="#FDA4AF"
            opacity="0.65"
          />
          <Ellipse
            cx="122"
            cy="100"
            rx="9"
            ry="5.5"
            fill="#FDA4AF"
            opacity="0.65"
          />

          {/* Cejas según fase */}
          {esInhalando ? (
            <>
              <Path
                d="M65 68 Q73 62 81 67"
                stroke="#0F3D42"
                strokeWidth="3.2"
                strokeLinecap="round"
                fill="none"
              />
              <Path
                d="M105 67 Q113 62 121 68"
                stroke="#0F3D42"
                strokeWidth="3.2"
                strokeLinecap="round"
                fill="none"
              />
            </>
          ) : (
            <>
              <Path
                d="M65 72 Q73 68 81 71"
                stroke="#0F3D42"
                strokeWidth="3.2"
                strokeLinecap="round"
                fill="none"
              />
              <Path
                d="M105 71 Q113 68 121 72"
                stroke="#0F3D42"
                strokeWidth="3.2"
                strokeLinecap="round"
                fill="none"
              />
            </>
          )}

          {/* Boca: inhalando toma aire, exhalando expulsa aire suavemente */}
          {esInhalando ? (
            <Ellipse cx="93" cy="110" rx="7.5" ry="6" fill="#0F3D42" />
          ) : esExhalando ? (
            <Ellipse cx="93" cy="110" rx="5.5" ry="7" fill="#0F3D42" />
          ) : (
            <Path
              d="M81 108 Q93 118 105 108"
              stroke="#0F3D42"
              strokeWidth="3.6"
              strokeLinecap="round"
              fill="none"
            />
          )}
        </Svg>

        {/* Líneas de aire expulsado al exhalar */}
        {esExhalando && (
          <AnimatedView
            style={[
              styles.exhaleAirStream,
              {
                opacity: aireOpacity,
                transform: [{ translateX: aireTranslateX }],
              },
            ]}
          >
            <Svg width={44} height={28} viewBox="0 0 44 28">
              <Path
                d="M4 9 Q16 5 28 9"
                stroke="#FFFFFF"
                strokeWidth="2.6"
                strokeLinecap="round"
                fill="none"
              />
              <Path
                d="M6 16 Q20 12 34 16"
                stroke="#E0F2FE"
                strokeWidth="2.4"
                strokeLinecap="round"
                fill="none"
              />
              <Path
                d="M4 23 Q15 20 25 23"
                stroke="#FFFFFF"
                strokeWidth="2.2"
                strokeLinecap="round"
                fill="none"
              />
            </Svg>
          </AnimatedView>
        )}

        {/* Brazo izquierdo */}
        <AnimatedView
          style={[
            styles.armLeft,
            { transform: [{ rotate: brazoIzqRotInterpolada }] },
          ]}
        >
          <Svg width={36} height={36} viewBox="0 0 36 36">
            <Path
              d="M30 12 Q10 14 12 27 Q15 33 26 26"
              fill="#5EEAD4"
              stroke="#14B8A6"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </Svg>
        </AnimatedView>

        {/* Brazo derecho */}
        <AnimatedView
          style={[
            styles.armRight,
            { transform: [{ rotate: brazoRotInterpolada }] },
          ]}
        >
          <Svg width={36} height={36} viewBox="0 0 36 36">
            <Path
              d="M6 12 Q26 14 24 27 Q21 33 10 26"
              fill="#5EEAD4"
              stroke="#14B8A6"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </Svg>
        </AnimatedView>

        {/* Ojos animados al ritmo */}
        <AnimatedView
          style={[
            styles.eyesLayer,
            {
              transform: [
                { translateY: animOjoY },
                { scaleY: Animated.multiply(animOjoEscalaY, animParpadeo) },
              ],
            },
          ]}
        >
          <Svg width={74} height={28} viewBox="0 0 74 28">
            <Circle cx="21" cy="14" r="7.5" fill="#0F3D42" />
            <Circle cx="18.5" cy="11.5" r="2.6" fill="#FFFFFF" />
            <Circle cx="53" cy="14" r="7.5" fill="#0F3D42" />
            <Circle cx="50.5" cy="11.5" r="2.6" fill="#FFFFFF" />
          </Svg>
        </AnimatedView>
      </AnimatedView>
    </View>
  );
}

export default function Respiracion({ navigation }) {
  const [faseIdx, setFaseIdx] = useState(0);
  const [segundosRestantes, setSegundosRestantes] = useState(FASES[0].segundos);
  const [cicloActual, setCicloActual] = useState(1);
  const [activo, setActivo] = useState(false);
  const [completado, setCompletado] = useState(false);

  const timerRef = useRef(null);
  const faseActual = FASES[faseIdx];

  useEffect(() => {
    if (!activo || completado) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setSegundosRestantes((prev) => {
        if (prev > 1) return prev - 1;

        if (faseIdx < FASES.length - 1) {
          const siguiente = faseIdx + 1;
          setFaseIdx(siguiente);
          return FASES[siguiente].segundos;
        }

        if (cicloActual < TOTAL_CICLOS) {
          setCicloActual((c) => c + 1);
          setFaseIdx(0);
          return FASES[0].segundos;
        }

        setCompletado(true);
        setActivo(false);
        return 0;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activo, completado, faseIdx, cicloActual]);

  const alternarInicioPausa = () => {
    if (completado) {
      reiniciar(true);
      return;
    }
    setActivo((prev) => !prev);
  };

  const reiniciar = (iniciarAhora = false) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setFaseIdx(0);
    setSegundosRestantes(FASES[0].segundos);
    setCicloActual(1);
    setCompletado(false);
    setActivo(iniciarAhora);
  };

  const volver = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setActivo(false);
    navigation.goBack();
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      <PaisajeYogaPantallaCompleta
        faseKey={faseActual.key}
        duracionSegundos={faseActual.segundos}
        activa={activo}
        escalaX={faseActual.escalaX}
        escalaY={faseActual.escalaY}
        flotarY={faseActual.flotarY}
        brazoRotDeg={faseActual.brazoRotDeg}
        ojoY={faseActual.ojoY}
        ojoEscalaY={faseActual.ojoEscalaY}
        haloEscala={faseActual.haloEscala}
        haloOpacidad={faseActual.haloOpacidad}
      />

      <SafeAreaView style={styles.overlaySafeArea}>
        {/* BARRA SUPERIOR CON BUEN MARGEN PARA QUE SE VEA CLARA */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={volver}
            style={styles.iconBtn}
            activeOpacity={0.85}
          >
            <Ionicons name="chevron-back" size={22} color="#0F3D42" />
          </TouchableOpacity>

          <View style={styles.topPill}>
            <Text style={styles.topPillText}>
              Ciclo {cicloActual}/{TOTAL_CICLOS} · 4·4·6
            </Text>
          </View>

          <View style={styles.licenseBadge}>
            <Text style={styles.licenseBadgeText}>Lami</Text>
          </View>
        </View>

        {completado ? (
          <View style={styles.bottomPanel}>
            <Text style={styles.panelTitle}>¡Ciclos completados!</Text>
            <Text style={styles.panelDesc}>
              Completaste los {TOTAL_CICLOS} ciclos junto a Lami. Tomar estas
              pausas de apoyo ayuda a regular tu ritmo diario.
            </Text>

            <TouchableOpacity
              onPress={() => reiniciar(true)}
              activeOpacity={0.9}
              style={{ marginTop: 10 }}
            >
              <LinearGradient
                colors={["#6192A4", "#7E83C2"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.mainBtn}
              >
                <Text style={styles.mainBtnText}>Repetir ejercicio</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={volver}
              activeOpacity={0.85}
              style={styles.ghostBtn}
            >
              <Text style={styles.ghostBtnText}>Volver</Text>
            </TouchableOpacity>

            <Text style={styles.helpFootnote}>
              Ejercicio de licencia libre y con fines de ayuda / bienestar (No
              sustituye atención médica o psicológica).
            </Text>
          </View>
        ) : (
          <View style={styles.bottomPanel}>
            <View style={styles.phaseHeaderRow}>
              <Text
                style={[styles.phaseTitle, { color: faseActual.colorAcento }]}
              >
                {faseActual.etiqueta}
              </Text>
              <Text style={styles.secondsBig}>
                {String(segundosRestantes).padStart(2, "0")}s
              </Text>
            </View>

            <Text style={styles.phaseHint}>{faseActual.mensaje}</Text>

            <View style={styles.dotsRow}>
              {Array.from({ length: TOTAL_CICLOS }).map((_, idx) => {
                const num = idx + 1;
                const active = num === cicloActual && activo;
                const done = num < cicloActual;
                return (
                  <View
                    key={num}
                    style={[
                      styles.cycleDot,
                      active && { backgroundColor: faseActual.colorAcento },
                      done && { backgroundColor: "#0F766E" },
                    ]}
                  />
                );
              })}
            </View>

            <View style={styles.btnRow}>
              <TouchableOpacity
                onPress={alternarInicioPausa}
                activeOpacity={0.9}
                style={{ flex: 1 }}
              >
                <LinearGradient
                  colors={["#6192A4", "#7E83C2"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.mainBtn}
                >
                  <Text style={styles.mainBtnText}>
                    {activo ? "Pausar" : "Iniciar"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => reiniciar(false)}
                activeOpacity={0.85}
                style={styles.restartBtn}
              >
                <Ionicons name="refresh" size={18} color="#0F3D42" />
                <Text style={styles.restartBtnText}>Reiniciar</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.helpFootnote}>
              Técnica de licencia libre y con fines de ayuda / bienestar (No
              sustituye atención médica o psicológica).
            </Text>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#E0F2FE",
  },
  overlaySafeArea: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 19,
    paddingTop: 40,
    paddingBottom: 16,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 6,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
  topPill: {
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 999,
    elevation: 2,
  },
  topPillText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F3D42",
  },
  licenseBadge: {
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    elevation: 2,
  },
  licenseBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#1E3A4C",
  },
  sunRaysBox: {
    position: "absolute",
    top: 72,
    right: 12,
  },
  rioWaves: {
    position: "absolute",
    top: "52%",
    alignSelf: "center",
  },
  breathHalo: {
    position: "absolute",
    top: "54%",
    alignSelf: "center",
    width: 196,
    height: 196,
    borderRadius: 98,
    backgroundColor: "#5EEAD4",
  },
  lamiFullContainer: {
    position: "absolute",
    top: "53%",
    alignSelf: "center",
    width: 186,
    height: 186,
    alignItems: "center",
    justifyContent: "center",
  },
  exhaleAirStream: {
    position: "absolute",
    right: 18,
    top: 96,
  },
  armLeft: {
    position: "absolute",
    left: 16,
    top: 86,
  },
  armRight: {
    position: "absolute",
    right: 16,
    top: 86,
  },
  eyesLayer: {
    position: "absolute",
    top: 65,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomPanel: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(179, 211, 218, 0.9)",
  },
  phaseHeaderRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  phaseTitle: {
    fontSize: 22,
    fontWeight: "900",
  },
  secondsBig: {
    fontSize: 32,
    fontWeight: "900",
    color: "#0F3D42",
  },
  phaseHint: {
    fontSize: 13,
    color: "#334155",
    lineHeight: 18,
    marginTop: 2,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    marginBottom: 10,
  },
  cycleDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#CBD5E1",
  },
  btnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  mainBtn: {
    paddingVertical: 13,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  mainBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  restartBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F1F5F9",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  restartBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F3D42",
  },
  panelTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F3D42",
  },
  panelDesc: {
    fontSize: 13,
    color: "#334155",
    lineHeight: 19,
    marginTop: 4,
  },
  ghostBtn: {
    marginTop: 8,
    paddingVertical: 11,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#94A3B8",
    alignItems: "center",
  },
  ghostBtnText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#1E293B",
  },
  helpFootnote: {
    marginTop: 8,
    fontSize: 10.5,
    color: "#475569",
    textAlign: "center",
    lineHeight: 14,
  },
});
