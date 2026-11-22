import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
    Animated,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "../config/firebaseConfig";
import { completarEjercicioAsignado } from "../services/lamiSyncService";

const LAMI_AVATAR = require("../assets/lami_1.png");

const PASOS_CONTENCION = [
  {
    id: "agua",
    titulo: "Agua fría despacio",
    detalle: "Beber un vaso de agua poco a poco para volver al cuerpo.",
    icono: "water-outline",
  },
  {
    id: "pies",
    titulo: "Pies firmes + hombros abajo",
    detalle:
      "Sentir el apoyo en el suelo y soltar tensión en hombros y mandíbula.",
    icono: "body-outline",
  },
  {
    id: "espacio",
    titulo: "Cambio de aire o lugar",
    detalle: "Ir 2–3 minutos a un espacio ventilado o con menos estímulos.",
    icono: "leaf-outline",
  },
  {
    id: "anclaje",
    titulo: "Mirar 3 objetos cercanos",
    detalle: "Nombrar en silencio 3 cosas que ves a tu alrededor ahora mismo.",
    icono: "eye-outline",
  },
];

const SEGUNDOS_PAUSA = 20;

export default function PlanCalmaCrisis({ route, navigation }) {
  const tarea = route?.params?.tarea || null;

  const [seccionActiva, setSeccionActiva] = useState("pasos"); // "pasos" | "apoyo" | "ficha"
  const [pasosElegidos, setPasosElegidos] = useState([
    PASOS_CONTENCION[0].titulo,
    PASOS_CONTENCION[1].titulo,
  ]);
  const [recursoApoyo, setRecursoApoyo] = useState("");
  const [fraseCalma, setFraseCalma] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Pulso suave de pausa guiada (sin videos ni audio pesado)
  const [cuentaPausa, setCuentaPausa] = useState(SEGUNDOS_PAUSA);
  const [pausandoAhora, setPausandoAhora] = useState(false);
  const escalaPulso = useRef(new Animated.Value(1)).current;

  const [modalAviso, setModalAviso] = useState({
    visible: false,
    tipo: "exito",
    badge: "PLAN DE CALMA • LAMI",
    titulo: "",
    mensaje: "",
    cerrarAlSalir: false,
  });

  useEffect(() => {
    if (!pausandoAhora) {
      escalaPulso.setValue(1);
      return;
    }

    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(escalaPulso, {
          toValue: 1.12,
          duration: 2400,
          useNativeDriver: true,
        }),
        Animated.timing(escalaPulso, {
          toValue: 1,
          duration: 2800,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();

    const intervalo = setInterval(() => {
      setCuentaPausa((prev) => {
        if (prev <= 1) {
          setPausandoAhora(false);
          anim.stop();
          return SEGUNDOS_PAUSA;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      anim.stop();
      clearInterval(intervalo);
    };
  }, [pausandoAhora, escalaPulso]);

  const abrirModal = ({
    tipo = "exito",
    badge = "PLAN DE CALMA • LAMI",
    titulo = "",
    mensaje = "",
    cerrarAlSalir = false,
  }) => {
    setModalAviso({
      visible: true,
      tipo,
      badge,
      titulo,
      mensaje,
      cerrarAlSalir,
    });
  };

  const cerrarModal = () => {
    const salir = modalAviso.cerrarAlSalir;
    setModalAviso((prev) => ({ ...prev, visible: false }));
    if (salir) {
      navigation.goBack();
    }
  };

  const alternarPaso = (tituloPaso) => {
    setPasosElegidos((prev) =>
      prev.includes(tituloPaso)
        ? prev.filter((item) => item !== tituloPaso)
        : [...prev, tituloPaso],
    );
  };

  const handleGuardar = async () => {
    if (pasosElegidos.length === 0 && !recursoApoyo.trim()) {
      abrirModal({
        tipo: "aviso",
        badge: "FALTA UN DATO",
        titulo: "Completa tu plan",
        mensaje:
          "Elige al menos un paso de cuidado o escribe tu recurso de apoyo antes de guardar.",
      });
      return;
    }

    const uid = auth.currentUser?.uid;
    const textoPasos =
      pasosElegidos.length > 0
        ? pasosElegidos.join(" • ")
        : "Sin paso rápido seleccionado";
    const textoApoyo = recursoApoyo.trim() || "Recurso personal de apoyo";
    const textoFrase = fraseCalma.trim() || "Estoy aquí, voy paso a paso.";

    try {
      setEnviando(true);
      setPausandoAhora(false);

      if (tarea?.id && uid) {
        await completarEjercicioAsignado(
          uid,
          tarea.id,
          {
            0: textoPasos,
            1: textoApoyo,
            2: textoFrase,
          },
          tarea,
        );
      }

      abrirModal({
        tipo: "exito",
        badge: "GUARDADO",
        titulo: "¡Plan de calma guardado!",
        mensaje:
          "Tu ficha de calma quedó registrada para tu seguimiento y disponible para cuando la necesites.",
        cerrarAlSalir: true,
      });
    } catch (e) {
      console.log("Error guardando PlanCalmaCrisis:", e);
      abrirModal({
        tipo: "aviso",
        badge: "ERROR",
        titulo: "No se pudo guardar",
        mensaje: "Intenta nuevamente en un momento.",
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <LinearGradient
      colors={["#F4F7FA", "#EAE8FC", "#EAF4F7"]}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
        >
          {/* CABECERA COMPACTA */}
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.iconBack}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={20} color="#1E293B" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.kicker}>EXCLUSIVO CON ESPECIALISTA</Text>
              <Text style={styles.screenTitle}>
                Plan de calma para momentos difíciles
              </Text>
            </View>
            <Image source={LAMI_AVATAR} style={styles.lamiMini} />
          </View>

          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* SELECTOR DE VISTA TIPO ESTACIÓN (PASOS | APOYO | FICHA) */}
            <View style={styles.segmentBar}>
              {[
                { key: "pasos", label: "1. Pasos", icon: "footsteps-outline" },
                { key: "apoyo", label: "2. Apoyo", icon: "heart-outline" },
                { key: "ficha", label: "3. Mi ficha", icon: "id-card-outline" },
              ].map((tab) => {
                const activa = seccionActiva === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    onPress={() => setSeccionActiva(tab.key)}
                    activeOpacity={0.85}
                    style={[
                      styles.segmentBtn,
                      activa && styles.segmentBtnActive,
                    ]}
                  >
                    <Ionicons
                      name={tab.icon}
                      size={15}
                      color={activa ? "#FFFFFF" : "#334155"}
                    />
                    <Text
                      style={[
                        styles.segmentText,
                        activa && { color: "#FFFFFF" },
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* BLOQUE 1: PASOS CORTOS + CÍRCULO DE PAUSA */}
            {seccionActiva === "pasos" && (
              <View style={styles.panelCard}>
                <Text style={styles.panelHeading}>
                  Pasos breves para bajar revoluciones
                </Text>
                <Text style={styles.panelDesc}>
                  Marca los gestos simples que puedes hacer en pocos minutos:
                </Text>

                <View style={{ gap: 10, marginTop: 10 }}>
                  {PASOS_CONTENCION.map((paso) => {
                    const marcada = pasosElegidos.includes(paso.titulo);
                    return (
                      <TouchableOpacity
                        key={paso.id}
                        onPress={() => alternarPaso(paso.titulo)}
                        activeOpacity={0.85}
                        style={[
                          styles.stepTile,
                          marcada && styles.stepTileSelected,
                        ]}
                      >
                        <View
                          style={[
                            styles.tileIconCircle,
                            marcada && { backgroundColor: "#1D4ED8" },
                          ]}
                        >
                          <Ionicons
                            name={paso.icono}
                            size={18}
                            color={marcada ? "#FFFFFF" : "#1D4ED8"}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.tileTitle}>{paso.titulo}</Text>
                          <Text style={styles.tileSub}>{paso.detalle}</Text>
                        </View>
                        <Ionicons
                          name={
                            marcada ? "checkmark-circle" : "add-circle-outline"
                          }
                          size={22}
                          color={marcada ? "#1D4ED8" : "#94A3B8"}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* CÍRCULO DE PAUSA SUAVE */}
                <View style={styles.breathZone}>
                  <Animated.View
                    style={[
                      styles.breathRing,
                      { transform: [{ scale: escalaPulso }] },
                    ]}
                  >
                    <Text style={styles.breathNumber}>{cuentaPausa}s</Text>
                    <Text style={styles.breathCaption}>
                      {pausandoAhora ? "Pausa activa" : "Pausa 20s"}
                    </Text>
                  </Animated.View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.breathTitle}>
                      Probar pausa tranquila
                    </Text>
                    <Text style={styles.breathText}>
                      Inhala suave y exhala más lento de lo normal si necesitas
                      un respiro ahora mismo.
                    </Text>
                    <View style={styles.breathBtns}>
                      <TouchableOpacity
                        onPress={() => setPausandoAhora((p) => !p)}
                        style={styles.smallAction}
                      >
                        <Text style={styles.smallActionText}>
                          {pausandoAhora ? "Pausar" : "Iniciar"}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          setPausandoAhora(false);
                          setCuentaPausa(SEGUNDOS_PAUSA);
                        }}
                        style={styles.smallGhostAction}
                      >
                        <Text style={styles.smallGhostText}>Reiniciar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => setSeccionActiva("apoyo")}
                  style={styles.nextStepLink}
                >
                  <Text style={styles.nextStepLinkText}>
                    Siguiente: Red de apoyo y frase →
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* BLOQUE 2: RED DE APOYO Y FRASE */}
            {seccionActiva === "apoyo" && (
              <View style={styles.panelCard}>
                <Text style={styles.panelHeading}>
                  ¿A quién o qué acudir primero?
                </Text>
                <Text style={styles.panelDesc}>
                  Ten claro tu primer punto de apoyo cuando sientas que sube el
                  malestar:
                </Text>

                <Text style={styles.fieldCaption}>
                  Persona de confianza, espacio o recurso inicial
                </Text>
                <TextInput
                  style={styles.inputBox}
                  multiline
                  placeholder="Ej: Llamar a alguien de confianza, ir a mi cuarto, abrir ejercicio de respiración..."
                  placeholderTextColor="#94A3B8"
                  value={recursoApoyo}
                  onChangeText={setRecursoApoyo}
                />

                <Text style={[styles.fieldCaption, { marginTop: 14 }]}>
                  Tu frase recordatorio para momentos difíciles
                </Text>
                <TextInput
                  style={[styles.inputBox, { minHeight: 60 }]}
                  placeholder="Ej: Es un momento difícil, no dura para siempre..."
                  placeholderTextColor="#94A3B8"
                  value={fraseCalma}
                  onChangeText={setFraseCalma}
                />

                <TouchableOpacity
                  onPress={() => setSeccionActiva("ficha")}
                  style={styles.nextStepLink}
                >
                  <Text style={styles.nextStepLinkText}>
                    Ver mi ficha completa antes de guardar →
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* BLOQUE 3: FICHA DE BOLSILLO */}
            {seccionActiva === "ficha" && (
              <View style={styles.pocketCard}>
                <View style={styles.pocketHeader}>
                  <Ionicons name="shield-checkmark" size={20} color="#0F766E" />
                  <Text style={styles.pocketTitle}>
                    FICHA DE RESPALDO • MOMENTOS DIFÍCILES
                  </Text>
                </View>

                <Text style={styles.pocketLabel}>Mis pasos elegidos:</Text>
                {pasosElegidos.length === 0 ? (
                  <Text style={styles.pocketValueMuted}>
                    Ningún paso seleccionado aún.
                  </Text>
                ) : (
                  pasosElegidos.map((p, i) => (
                    <Text key={i} style={styles.pocketBullet}>
                      • {p}
                    </Text>
                  ))
                )}

                <Text style={[styles.pocketLabel, { marginTop: 12 }]}>
                  Mi primer apoyo:
                </Text>
                <Text style={styles.pocketValue}>
                  {recursoApoyo.trim() || "Por definir"}
                </Text>

                <Text style={[styles.pocketLabel, { marginTop: 12 }]}>
                  Mi frase de calma:
                </Text>
                <Text style={styles.pocketQuote}>
                  {`“${fraseCalma.trim() || "Estoy aquí, voy paso a paso."}”`}
                </Text>
              </View>
            )}

            {/* NOTA ACLARATORIA DE APOYO Y NO SUSTITUCIÓN PROFESIONAL */}
            <View style={styles.disclaimerBox}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color="#0F766E"
              />
              <Text style={styles.disclaimerText}>
                Este plan es una herramienta de apoyo y autocuidado; no
                sustituye la atención médica, psicológica ni de urgencias
                profesional.
              </Text>
            </View>

            {/* BOTÓN DE GUARDADO EN AZUL */}
            <TouchableOpacity
              disabled={enviando}
              onPress={handleGuardar}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={["#2563EB", "#1D4ED8"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveBtn}
              >
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>
                  {enviando ? "Guardando plan..." : "Guardar plan de calma"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>

          {/* MODAL */}
          <Modal
            visible={modalAviso.visible}
            transparent
            animationType="fade"
            onRequestClose={cerrarModal}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalBox}>
                <View
                  style={[
                    styles.modalTag,
                    modalAviso.tipo === "exito"
                      ? { backgroundColor: "#CCFBF1" }
                      : { backgroundColor: "#E0F2FE" },
                  ]}
                >
                  <Text
                    style={[
                      styles.modalTagText,
                      modalAviso.tipo === "exito"
                        ? { color: "#0F766E" }
                        : { color: "#0369A1" },
                    ]}
                  >
                    {modalAviso.badge}
                  </Text>
                </View>

                <Image source={LAMI_AVATAR} style={styles.modalLami} />
                <Text style={styles.modalHeading}>{modalAviso.titulo}</Text>
                <Text style={styles.modalBody}>{modalAviso.mensaje}</Text>

                <TouchableOpacity
                  style={{ width: "100%", marginTop: 16 }}
                  onPress={cerrarModal}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={["#2563EB", "#1D4ED8"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.modalConfirmBtn}
                  >
                    <Text style={styles.modalConfirmText}>Entendido</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 10,
  },
  iconBack: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  kicker: {
    fontSize: 10,
    fontWeight: "800",
    color: "#1D4ED8",
    letterSpacing: 0.6,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  lamiMini: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  scroll: {
    padding: 16,
    paddingBottom: 120,
  },
  segmentBar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 4,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    marginBottom: 14,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 10,
    borderRadius: 14,
  },
  segmentBtnActive: {
    backgroundColor: "#1E293B",
  },
  segmentText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#334155",
  },
  panelCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 12,
  },
  panelHeading: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  panelDesc: {
    fontSize: 12.5,
    color: "#64748B",
    marginTop: 4,
  },
  stepTile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    padding: 12,
  },
  stepTileSelected: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
  },
  tileIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  tileTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  tileSub: {
    fontSize: 11.5,
    color: "#475569",
    marginTop: 2,
    lineHeight: 16,
  },
  breathZone: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 20,
    padding: 14,
    marginTop: 16,
  },
  breathRing: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: "#FFFFFF",
    borderWidth: 2.5,
    borderColor: "#0F766E",
    alignItems: "center",
    justifyContent: "center",
  },
  breathNumber: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F766E",
  },
  breathCaption: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#475569",
  },
  breathTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  breathText: {
    fontSize: 11.5,
    color: "#475569",
    marginTop: 3,
    lineHeight: 16,
  },
  breathBtns: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  smallAction: {
    backgroundColor: "#1D4ED8",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  smallActionText: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "800",
  },
  smallGhostAction: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  smallGhostText: {
    color: "#334155",
    fontSize: 11.5,
    fontWeight: "700",
  },
  nextStepLink: {
    marginTop: 14,
    alignItems: "flex-end",
  },
  nextStepLinkText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#1D4ED8",
  },
  fieldCaption: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1E293B",
    marginTop: 12,
    marginBottom: 6,
  },
  inputBox: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 16,
    padding: 12,
    minHeight: 74,
    fontSize: 13.5,
    color: "#0F172A",
    textAlignVertical: "top",
  },
  pocketCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1.5,
    borderColor: "#99F6E4",
    marginBottom: 12,
  },
  pocketHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  pocketTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: "#0F766E",
    letterSpacing: 0.5,
  },
  pocketLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#475569",
    marginBottom: 4,
  },
  pocketBullet: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 3,
  },
  pocketValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    lineHeight: 20,
  },
  pocketValueMuted: {
    fontSize: 13,
    color: "#94A3B8",
    fontStyle: "italic",
  },
  pocketQuote: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1D4ED8",
    fontStyle: "italic",
    lineHeight: 20,
  },
  disclaimerBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#F0FDFA",
    borderWidth: 1,
    borderColor: "#99F6E4",
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11.5,
    color: "#0F766E",
    lineHeight: 16,
    fontWeight: "600",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 999,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 14.5,
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalBox: {
    width: "100%",
    maxWidth: 370,
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  modalTag: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  modalTagText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  modalLami: {
    width: 64,
    height: 64,
    marginTop: 10,
  },
  modalHeading: {
    fontSize: 19,
    fontWeight: "900",
    color: "#0F172A",
    marginTop: 8,
    textAlign: "center",
  },
  modalBody: {
    fontSize: 13,
    color: "#475569",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 19,
  },
  modalConfirmBtn: {
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  modalConfirmText: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "800",
  },
});
