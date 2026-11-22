import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "../config/firebaseConfig";

const LAMI_AVATAR = require("../assets/lami_1.png");
const TOTAL_FIELDS = 5 + 4 + 3 + 2 + 1; // 15

const SECCIONES_SENTIDOS = [
  {
    key: "see",
    tabLabel: "5 Ver",
    numberBadge: "05",
    title: "Cosas que ves",
    description: "Mira con calma y anota cinco cosas visibles a tu alrededor.",
    badgeBg: "#DCEEE2",
    badgeText: "#1B3B2E",
    accent: "#2E6F58",
    icon: "eye-outline",
  },
  {
    key: "touch",
    tabLabel: "4 Tocar",
    numberBadge: "04",
    title: "Cosas que puedes tocar",
    description: "Siente texturas, temperatura o el apoyo de tu cuerpo.",
    badgeBg: "#E6EFE2",
    badgeText: "#234232",
    accent: "#477A61",
    icon: "hand-left-outline",
  },
  {
    key: "hear",
    tabLabel: "3 Oír",
    numberBadge: "03",
    title: "Cosas que oyes",
    description: "Escucha sonidos cercanos o del ambiente sin forzar.",
    badgeBg: "#D4ECE3",
    badgeText: "#163E32",
    accent: "#1F6350",
    icon: "ear-outline",
  },
  {
    key: "smell",
    tabLabel: "2 Oler",
    numberBadge: "02",
    title: "Cosas que hueles",
    description: "Percibe aromas sutiles presentes en el lugar.",
    badgeBg: "#EBF1DC",
    badgeText: "#364624",
    accent: "#657B45",
    icon: "flower-outline",
  },
  {
    key: "taste",
    tabLabel: "1 Saborear",
    numberBadge: "01",
    title: "Cosa que saboreas",
    description: "Nota el sabor presente o toma un sorbo de agua.",
    badgeBg: "#DFECE6",
    badgeText: "#1F3F36",
    accent: "#396859",
    icon: "water-outline",
  },
];

function obtenerFechaClaveLocal(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const AnchorageSensesScreen = ({ navigation }) => {
  const scrollRef = useRef(null);
  const sectionOffsets = useRef({});

  const [see, setSee] = useState(Array(5).fill(""));
  const [touch, setTouch] = useState(Array(4).fill(""));
  const [hear, setHear] = useState(Array(3).fill(""));
  const [smell, setSmell] = useState(Array(2).fill(""));
  const [taste, setTaste] = useState(Array(1).fill(""));

  const [sentidoActivo, setSentidoActivo] = useState("see");
  const [saved, setSaved] = useState(false);
  const [modalGuardado, setModalGuardado] = useState(false);
  const [modalVacio, setModalVacio] = useState(false);

  const obtenerUid = () => auth.currentUser?.uid || "invitado";
  const obtenerStorageKey = () => `anclajeSentidos_${obtenerUid()}`;
  const obtenerAvancesKey = () => `avancesCalendarioLami_${obtenerUid()}`;

  useEffect(() => {
    const cargarGuardado = async () => {
      try {
        const raw = await AsyncStorage.getItem(obtenerStorageKey());
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (parsed?.see) setSee(parsed.see);
        if (parsed?.touch) setTouch(parsed.touch);
        if (parsed?.hear) setHear(parsed.hear);
        if (parsed?.smell) setSmell(parsed.smell);
        if (parsed?.taste) setTaste(parsed.taste);
        if (parsed?.saved) setSaved(true);
      } catch (e) {
        console.log("Error cargando anclaje con sentidos:", e);
      }
    };
    cargarGuardado();
  }, []);

  const countsBySense = useMemo(() => {
    const countFilled = (arr) =>
      arr.filter((item) => item && item.trim().length > 0).length;
    return {
      see: countFilled(see),
      touch: countFilled(touch),
      hear: countFilled(hear),
      smell: countFilled(smell),
      taste: countFilled(taste),
    };
  }, [see, touch, hear, smell, taste]);

  const filledCount = useMemo(
    () =>
      countsBySense.see +
      countsBySense.touch +
      countsBySense.hear +
      countsBySense.smell +
      countsBySense.taste,
    [countsBySense],
  );

  const progress = filledCount / TOTAL_FIELDS;

  const getDataByKey = (key) => {
    switch (key) {
      case "see":
        return { items: see, setter: setSee, count: countsBySense.see };
      case "touch":
        return { items: touch, setter: setTouch, count: countsBySense.touch };
      case "hear":
        return { items: hear, setter: setHear, count: countsBySense.hear };
      case "smell":
        return { items: smell, setter: setSmell, count: countsBySense.smell };
      case "taste":
      default:
        return { items: taste, setter: setTaste, count: countsBySense.taste };
    }
  };

  const handleChange = (index, value, sense, setter) => {
    const copy = [...sense];
    copy[index] = value;
    setter(copy);
    setSaved(false);
  };

  const irASentido = (key) => {
    setSentidoActivo(key);
    const y = sectionOffsets.current[key];
    if (typeof y === "number" && scrollRef.current) {
      scrollRef.current.scrollTo({ y: Math.max(0, y - 10), animated: true });
    }
  };

  const registrarAvanceEnHistorial = async () => {
    try {
      const avancesKey = obtenerAvancesKey();
      const raw = await AsyncStorage.getItem(avancesKey);
      const lista = raw ? JSON.parse(raw) : [];
      const ahora = new Date();

      const nuevoAvance = {
        id: `sentidos_${Date.now()}`,
        ejercicio: "Sentidos",
        tituloEjercicio: "Anclaje con los sentidos",
        fechaClave: obtenerFechaClaveLocal(ahora),
        fecha: ahora.toISOString(),
        elementosCompletados: filledCount,
        totalElementos: TOTAL_FIELDS,
      };

      await AsyncStorage.setItem(
        avancesKey,
        JSON.stringify([nuevoAvance, ...lista]),
      );
    } catch (e) {
      console.log("Error registrando avance de sentidos:", e);
    }
  };

  const handleSave = async () => {
    if (filledCount === 0) {
      setModalVacio(true);
      return;
    }

    try {
      await AsyncStorage.setItem(
        obtenerStorageKey(),
        JSON.stringify({
          see,
          touch,
          hear,
          smell,
          taste,
          saved: true,
          updatedAt: new Date().toISOString(),
        }),
      );
      await registrarAvanceEnHistorial();
      setSaved(true);
      setModalGuardado(true);
    } catch (e) {
      console.log("Error guardando anclaje con sentidos:", e);
      setSaved(true);
      setModalGuardado(true);
    }
  };

  const handleReset = async () => {
    setSee(Array(5).fill(""));
    setTouch(Array(4).fill(""));
    setHear(Array(3).fill(""));
    setSmell(Array(2).fill(""));
    setTaste(Array(1).fill(""));
    setSaved(false);
    try {
      await AsyncStorage.removeItem(obtenerStorageKey());
    } catch (e) {
      console.log("Error limpiando anclaje con sentidos:", e);
    }
  };

  const handleSalir = () => {
    navigation.navigate("Anxiosimetro");
  };

  return (
    <LinearGradient
      colors={["#EEF6F0", "#E3EFE7", "#F3F6EC"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Barra superior */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleSalir}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={22} color="#1B3B2E" />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.topLabel}>GROUNDING 5-4-3-2-1 • CALMA</Text>
            <Text style={styles.topTitle}>Anclaje con los sentidos</Text>
          </View>

          <View style={styles.counterPill}>
            <Text style={styles.counterPillText}>
              {filledCount}/{TOTAL_FIELDS}
            </Text>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Tarjeta principal oscura en verde bosque para contraste alto */}
          <LinearGradient
            colors={["#1E4336", "#2B5B4A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroDarkCard}
          >
            <View style={styles.heroRow}>
              <View style={styles.lamiHalo}>
                <Image
                  source={LAMI_AVATAR}
                  style={styles.lamiImg}
                  resizeMode="contain"
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.heroTag}>EXPLORACIÓN SENSORIAL</Text>
                <Text style={styles.heroTitle}>Vuelve a tu entorno</Text>
                <Text style={styles.heroDesc}>
                  Recorre cada sentido sin prisa. Toca un número para bajar
                  directo a ese paso.
                </Text>
              </View>
            </View>

            <View style={styles.heroProgressWrap}>
              <View style={styles.heroProgressLabels}>
                <Text style={styles.heroProgressText}>
                  {filledCount} de {TOTAL_FIELDS} completados
                </Text>
                <Text style={styles.heroProgressPct}>
                  {Math.round(progress * 100)}%
                </Text>
              </View>
              <View style={styles.heroTrack}>
                <View
                  style={[styles.heroFill, { width: `${progress * 100}%` }]}
                />
              </View>
            </View>
          </LinearGradient>

          {/* Barra de navegación rápida por sentidos */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickNavRow}
          >
            {SECCIONES_SENTIDOS.map((sec) => {
              const active = sentidoActivo === sec.key;
              const done = countsBySense[sec.key];
              return (
                <TouchableOpacity
                  key={sec.key}
                  onPress={() => irASentido(sec.key)}
                  activeOpacity={0.85}
                  style={[
                    styles.quickNavBtn,
                    active && styles.quickNavBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.quickNavLabel,
                      active && styles.quickNavLabelActive,
                    ]}
                  >
                    {sec.tabLabel}
                  </Text>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: done > 0 ? "#10B981" : "#9BB7A9" },
                    ]}
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Secciones con número destacado y líneas de escritura */}
          {SECCIONES_SENTIDOS.map((sec) => {
            const { items, setter, count } = getDataByKey(sec.key);
            const isFocusedSection = sentidoActivo === sec.key;

            return (
              <View
                key={sec.key}
                onLayout={(e) => {
                  sectionOffsets.current[sec.key] = e.nativeEvent.layout.y;
                }}
              >
                <SenseStationCard
                  section={sec}
                  items={items}
                  count={count}
                  isFocusedSection={isFocusedSection}
                  onFocusSection={() => setSentidoActivo(sec.key)}
                  onChange={(i, val) => handleChange(i, val, items, setter)}
                />
              </View>
            );
          })}

          {/* Pausa breve final */}
          <View style={styles.pauseBanner}>
            <View style={styles.pauseHeader}>
              <Ionicons name="leaf" size={17} color="#1F6350" />
              <Text style={styles.pauseTitle}>Cierre en 90 segundos</Text>
            </View>
            <Text style={styles.pauseText}>
              • 60 s de respiración pausada exhalando largo{"\n"}• 30 s soltando
              hombros y mandíbula{"\n"}• Nota cómo se siente tu cuerpo al
              terminar
            </Text>
          </View>

          {/* Botones Repetir y Guardar */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={handleReset}
              activeOpacity={0.85}
            >
              <Text style={styles.resetBtnText}>Repetir</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSave}
              activeOpacity={0.9}
              style={{ flex: 1.35 }}
            >
              <LinearGradient
                colors={["#2E6F58", "#1B4738"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveBtn}
              >
                <Text style={styles.saveBtnText}>Guardar</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {saved && (
            <Text style={styles.savedNote}>
              Reflexión guardada y registrada en tu avance ✓
            </Text>
          )}

          {/* Respaldo psicológico y atribución */}
          <View style={styles.referenceFooter}>
            <Text style={styles.referenceTitle}>
              Respaldo psicológico y atribución
            </Text>
            <Text style={styles.referenceText}>
              Basado en la técnica de anclaje sensorial / grounding (5-4-3-2-1)
              utilizada en psicología de atención plena y regulación emocional
              para dirigir la atención hacia estímulos presentes.
            </Text>
            <Text style={styles.referenceDisclaimer}>
              Redacción original de uso libre con fines educativos y de
              autocuidado en Lami; no sustituye valoración ni tratamiento
              psicológico o médico profesional.
            </Text>
          </View>
        </ScrollView>

        {/* Modal cuando no hay elementos */}
        <Modal
          visible={modalVacio}
          transparent
          animationType="fade"
          onRequestClose={() => setModalVacio(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.warningBadge}>
                <Ionicons name="sparkles" size={15} color="#1B3B2E" />
                <Text style={styles.warningBadgeText}>
                  REFLEXIÓN SIN ELEMENTOS
                </Text>
              </View>

              <Image
                source={LAMI_AVATAR}
                style={styles.modalImg}
                resizeMode="contain"
              />

              <Text style={styles.modalTitle}>Escribe al menos un sentido</Text>
              <Text style={styles.modalDesc}>
                Anota al menos una cosa que veas, toques, oigas, huelas o
                saborees para guardar tu práctica de anclaje.
              </Text>

              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={() => setModalVacio(false)}
                activeOpacity={0.9}
              >
                <Text style={styles.modalPrimaryText}>Entendido</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Modal al guardar */}
        <Modal
          visible={modalGuardado}
          transparent
          animationType="fade"
          onRequestClose={() => setModalGuardado(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#1B4738" />
                <Text style={styles.modalBadgeText}>LAMI • GUARDADO</Text>
              </View>

              <Image
                source={LAMI_AVATAR}
                style={styles.modalImg}
                resizeMode="contain"
              />

              <Text style={styles.modalTitle}>Reflexión guardada</Text>
              <Text style={styles.modalDesc}>
                Registraste{" "}
                <Text style={{ fontWeight: "800", color: "#1B3B2E" }}>
                  {filledCount} de {TOTAL_FIELDS}
                </Text>{" "}
                elementos sensoriales. Tu práctica quedó guardada para tu
                seguimiento diario.
              </Text>

              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={() => setModalGuardado(false)}
                activeOpacity={0.9}
              >
                <Text style={styles.modalPrimaryText}>Seguir aquí</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSecondaryBtn}
                onPress={() => {
                  setModalGuardado(false);
                  handleSalir();
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.modalSecondaryText}>Salir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
};

const SenseStationCard = ({
  section,
  items,
  count,
  isFocusedSection,
  onFocusSection,
  onChange,
}) => {
  return (
    <View
      style={[
        styles.stationCard,
        isFocusedSection && {
          borderColor: section.accent,
          backgroundColor: "#FAFDFB",
        },
      ]}
    >
      <View style={styles.stationTop}>
        <View
          style={[styles.bigNumberBox, { backgroundColor: section.badgeBg }]}
        >
          <Text style={[styles.bigNumberText, { color: section.badgeText }]}>
            {section.numberBadge}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <View style={styles.stationTitleRow}>
            <Ionicons name={section.icon} size={17} color={section.accent} />
            <Text style={styles.stationTitle}>{section.title}</Text>
          </View>
          <Text style={styles.stationDesc}>{section.description}</Text>
        </View>

        <Text style={[styles.stationCount, { color: section.accent }]}>
          {count}/{items.length}
        </Text>
      </View>

      <View style={styles.linesContainer}>
        {items.map((value, index) => {
          const hasText = Boolean(value && value.trim().length > 0);
          return (
            <View
              key={index}
              style={[
                styles.underlineRow,
                hasText && { borderBottomColor: section.accent },
              ]}
            >
              <View
                style={[
                  styles.checkDot,
                  hasText
                    ? {
                        backgroundColor: section.accent,
                        borderColor: section.accent,
                      }
                    : { borderColor: "#9AB7A8" },
                ]}
              >
                {hasText && (
                  <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                )}
              </View>

              <TextInput
                value={value}
                onFocus={onFocusSection}
                onChangeText={(text) => onChange(index, text)}
                placeholder={`Elemento ${index + 1}...`}
                placeholderTextColor="#7F988B"
                style={styles.underlineInput}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 10,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#BCD6C5",
    alignItems: "center",
    justifyContent: "center",
  },
  topLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#2E6F58",
    letterSpacing: 0.6,
  },
  topTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#1B3B2E",
  },
  counterPill: {
    backgroundColor: "#1E4336",
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
  },
  counterPillText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#EAF6EE",
  },
  scroll: {
    padding: 16,
    paddingBottom: 36,
    gap: 12,
  },
  heroDarkCard: {
    borderRadius: 24,
    padding: 18,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  lamiHalo: {
    width: 74,
    height: 74,
    borderRadius: 24,
    backgroundColor: "#EAF6EE",
    alignItems: "center",
    justifyContent: "center",
  },
  lamiImg: {
    width: 56,
    height: 56,
  },
  heroTag: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(234, 246, 238, 0.16)",
    color: "#D7EFE2",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  heroDesc: {
    fontSize: 12.5,
    color: "#D3E8DC",
    lineHeight: 17.5,
  },
  heroProgressWrap: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.14)",
  },
  heroProgressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  heroProgressText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#E2F2E8",
  },
  heroProgressPct: {
    fontSize: 12.5,
    fontWeight: "900",
    color: "#9CE0BE",
  },
  heroTrack: {
    height: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
    overflow: "hidden",
  },
  heroFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#7FD1A9",
  },
  quickNavRow: {
    gap: 8,
    paddingVertical: 2,
  },
  quickNavBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#BCD6C5",
  },
  quickNavBtnActive: {
    backgroundColor: "#1E4336",
    borderColor: "#1E4336",
  },
  quickNavLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#234737",
  },
  quickNavLabelActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  stationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1.2,
    borderColor: "#C8DEC9",
  },
  stationTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  bigNumberBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  bigNumberText: {
    fontSize: 16,
    fontWeight: "900",
  },
  stationTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  stationTitle: {
    fontSize: 15.5,
    fontWeight: "900",
    color: "#1B3B2E",
  },
  stationDesc: {
    fontSize: 12,
    color: "#4A6357",
    lineHeight: 16.5,
    marginTop: 2,
  },
  stationCount: {
    fontSize: 12.5,
    fontWeight: "900",
  },
  linesContainer: {
    gap: 6,
  },
  underlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: "#DCEAE0",
    paddingVertical: 6,
  },
  checkDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  underlineInput: {
    flex: 1,
    fontSize: 13.5,
    color: "#1B3B2E",
    paddingVertical: 2,
  },
  pauseBanner: {
    backgroundColor: "#DCEEE2",
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: "#A9CEB7",
  },
  pauseHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  pauseTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#1B3B2E",
  },
  pauseText: {
    fontSize: 12.5,
    color: "#294B3C",
    lineHeight: 19,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#477A61",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  resetBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1B3B2E",
  },
  saveBtn: {
    paddingVertical: 13,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  savedNote: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#1F6350",
    textAlign: "center",
  },
  referenceFooter: {
    marginTop: 4,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#C8DEC9",
  },
  referenceTitle: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#1B3B2E",
    marginBottom: 4,
  },
  referenceText: {
    fontSize: 11,
    color: "#4A6357",
    lineHeight: 16,
    marginBottom: 6,
  },
  referenceDisclaimer: {
    fontSize: 10.5,
    color: "#698175",
    lineHeight: 15,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(20, 42, 33, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 22,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#B8D6C3",
  },
  warningBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#DCEEE2",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  warningBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#1B3B2E",
    letterSpacing: 0.4,
  },
  modalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#D4ECE3",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  modalBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#1B4738",
  },
  modalImg: {
    width: 74,
    height: 74,
    marginTop: 10,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#1B3B2E",
    marginTop: 6,
    textAlign: "center",
  },
  modalDesc: {
    fontSize: 13,
    color: "#4A6357",
    textAlign: "center",
    lineHeight: 19,
    marginTop: 6,
  },
  modalPrimaryBtn: {
    width: "100%",
    marginTop: 14,
    paddingVertical: 13,
    borderRadius: 999,
    backgroundColor: "#2E6F58",
    alignItems: "center",
  },
  modalPrimaryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  modalSecondaryBtn: {
    width: "100%",
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#8DBB9E",
    backgroundColor: "#EEF6F0",
    alignItems: "center",
  },
  modalSecondaryText: {
    color: "#1B3B2E",
    fontSize: 13.5,
    fontWeight: "700",
  },
});

export default AnchorageSensesScreen;
