import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import {
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

const DETONANTES_SUGERIDOS = [
  {
    id: "trabajo_escuela",
    texto: "Carga laboral o académica",
    icon: "briefcase-outline",
  },
  {
    id: "conversacion",
    texto: "Conversación o conflicto",
    icon: "chatbubbles-outline",
  },
  {
    id: "mensajes",
    texto: "Mensajes o notificaciones",
    icon: "phone-portrait-outline",
  },
  { id: "noche", texto: "Noche / cansancio", icon: "moon-outline" },
  {
    id: "incertidumbre",
    texto: "Incertidumbre o espera",
    icon: "help-circle-outline",
  },
];

const SENALES_TEMPRANAS = [
  { id: "pecho", texto: "Opresión o nudo en el pecho" },
  { id: "hombros", texto: "Hombros o mandíbula tensos" },
  { id: "respiracion", texto: "Respiración agitada o corta" },
  { id: "pensamientos", texto: "Pensamientos acelerados" },
  { id: "inquietud", texto: "Inquietud física" },
];

function obtenerNivelIntensidad(valor) {
  if (valor <= 3) return { etiqueta: "Leve", color: "#0F766E", bg: "#CCFBF1" };
  if (valor <= 7)
    return { etiqueta: "Moderada", color: "#B45309", bg: "#FEF3C7" };
  return { etiqueta: "Alta", color: "#DC2626", bg: "#FEE2E2" };
}

export default function MapaDetonantes({ route, navigation }) {
  const tarea = route?.params?.tarea || null;

  const [detonantesSeleccionados, setDetonantesSeleccionados] = useState([]);
  const [detalleDetonante, setDetalleDetonante] = useState("");

  const [senalesSeleccionadas, setSenalesSeleccionadas] = useState([]);
  const [detalleSenal, setDetalleSenal] = useState("");

  const [intensidad, setIntensidad] = useState(5);
  const [enviando, setEnviando] = useState(false);

  const [modalAviso, setModalAviso] = useState({
    visible: false,
    tipo: "exito",
    badge: "MAPA DE DETONANTES • LAMI",
    titulo: "",
    mensaje: "",
    cerrarPantalla: false,
  });

  const abrirModal = ({
    tipo = "exito",
    badge = "MAPA DE DETONANTES • LAMI",
    titulo = "",
    mensaje = "",
    cerrarPantalla = false,
  }) => {
    setModalAviso({
      visible: true,
      tipo,
      badge,
      titulo,
      mensaje,
      cerrarPantalla,
    });
  };

  const cerrarModal = () => {
    const salir = modalAviso.cerrarPantalla;
    setModalAviso((prev) => ({ ...prev, visible: false }));
    if (salir) {
      navigation.goBack();
    }
  };

  const toggleDetonante = (texto) => {
    setDetonantesSeleccionados((prev) =>
      prev.includes(texto)
        ? prev.filter((item) => item !== texto)
        : [...prev, texto],
    );
  };

  const toggleSenal = (texto) => {
    setSenalesSeleccionadas((prev) =>
      prev.includes(texto)
        ? prev.filter((item) => item !== texto)
        : [...prev, texto],
    );
  };

  const construirResumenDetonante = () => {
    const partes = [...detonantesSeleccionados];
    if (detalleDetonante.trim()) partes.push(detalleDetonante.trim());
    return partes.join(" • ");
  };

  const construirResumenSenales = () => {
    const partes = [...senalesSeleccionadas];
    if (detalleSenal.trim()) partes.push(detalleSenal.trim());
    return partes.join(" • ");
  };

  const handleGuardar = async () => {
    const resumenDet = construirResumenDetonante();
    const resumenSen = construirResumenSenales();

    if (!resumenDet && !resumenSen) {
      abrirModal({
        tipo: "aviso",
        badge: "CAMPOS PENDIENTES",
        titulo: "Selecciona o escribe tu mapa",
        mensaje:
          "Elige o escribe al menos un detonante o señal temprana antes de enviar.",
      });
      return;
    }

    const uid = auth.currentUser?.uid;
    try {
      setEnviando(true);
      if (tarea?.id && uid) {
        await completarEjercicioAsignado(
          uid,
          tarea.id,
          {
            0: resumenDet || "No especificado",
            1: resumenSen || "No especificada",
            2: intensidad,
          },
          tarea,
        );
      }

      abrirModal({
        tipo: "exito",
        badge: "ENVIADO A TU TERAPEUTA",
        titulo: "¡Mapa guardado y compartido!",
        mensaje:
          "Tus detonantes, señales tempranas e intensidad quedaron registrados para que tu terapeuta los revise.",
        cerrarPantalla: true,
      });
    } catch (e) {
      console.log("Error guardando mapa de detonantes:", e);
      abrirModal({
        tipo: "aviso",
        badge: "ERROR DE ENVÍO",
        titulo: "No se pudo guardar el mapa",
        mensaje: "Intenta de nuevo en unos momentos.",
      });
    } finally {
      setEnviando(false);
    }
  };

  const nivelInfo = obtenerNivelIntensidad(intensidad);
  const vistaPreviaDet = construirResumenDetonante();
  const vistaPreviaSen = construirResumenSenales();

  return (
    <LinearGradient
      colors={["#F0F9FF", "#EEF2FF", "#F0FDF4"]}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
        >
          {/* ENCABEZADO */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-back" size={22} color="#1E293B" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerBadge}>
                EXCLUSIVO CON ESPECIALISTA • LAMI
              </Text>
              <Text style={styles.headerTitle}>
                Mapa de detonantes y señales
              </Text>
            </View>
            <Image
              source={LAMI_AVATAR}
              style={styles.headerAvatar}
              resizeMode="contain"
            />
          </View>

          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* BANNER DINÁMICO */}
            <LinearGradient
              colors={["#E0F2FE", "#EEF2FF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.introCard}
            >
              <View style={styles.introIconBox}>
                <Ionicons
                  name="git-network-outline"
                  size={20}
                  color="#1D4ED8"
                />
              </View>
              <Text style={styles.introText}>
                Toca las opciones que identifiques hoy o escribe tus propios
                detalles para armar tu mapa y enviárselo a tu terapeuta.
              </Text>
            </LinearGradient>

            {/* PASO 1: DETONANTES */}
            <View style={styles.card}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepCircle}>1</Text>
                <Text style={styles.stepTitle}>¿Qué activó el malestar?</Text>
              </View>
              <Text style={styles.stepHint}>
                Puedes marcar uno o varios detonantes frecuentes:
              </Text>

              <View style={styles.chipsWrap}>
                {DETONANTES_SUGERIDOS.map((item) => {
                  const activa = detonantesSeleccionados.includes(item.texto);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => toggleDetonante(item.texto)}
                      activeOpacity={0.85}
                      style={[styles.chipBtn, activa && styles.chipBtnActive]}
                    >
                      <Ionicons
                        name={item.icon}
                        size={15}
                        color={activa ? "#FFFFFF" : "#1D4ED8"}
                      />
                      <Text
                        style={[
                          styles.chipText,
                          activa && { color: "#FFFFFF" },
                        ]}
                      >
                        {item.texto}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.subLabel}>
                Detalle adicional o contexto específico (opcional)
              </Text>
              <TextInput
                style={styles.input}
                multiline
                placeholder="Ej: Una conversación pendiente, entrega de proyecto..."
                placeholderTextColor="#94A3B8"
                value={detalleDetonante}
                onChangeText={setDetalleDetonante}
              />
            </View>

            {/* PASO 2: SEÑALES TEMPRANAS */}
            <View style={styles.card}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepCircle}>2</Text>
                <Text style={styles.stepTitle}>
                  ¿Qué señales tempranas notaste?
                </Text>
              </View>
              <Text style={styles.stepHint}>
                Identifica las primeras pistas en tu cuerpo o mente:
              </Text>

              <View style={styles.chipsWrap}>
                {SENALES_TEMPRANAS.map((sen) => {
                  const activa = senalesSeleccionadas.includes(sen.texto);
                  return (
                    <TouchableOpacity
                      key={sen.id}
                      onPress={() => toggleSenal(sen.texto)}
                      activeOpacity={0.85}
                      style={[styles.chipBtn, activa && styles.chipBtnActive]}
                    >
                      <Ionicons
                        name={activa ? "checkmark-circle" : "ellipse-outline"}
                        size={15}
                        color={activa ? "#FFFFFF" : "#0F766E"}
                      />
                      <Text
                        style={[
                          styles.chipText,
                          activa && { color: "#FFFFFF" },
                        ]}
                      >
                        {sen.texto}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.subLabel}>
                Otra señal o nota personal (opcional)
              </Text>
              <TextInput
                style={styles.input}
                multiline
                placeholder="Ej: Me cuesta concentrarme, siento calor en el rostro..."
                placeholderTextColor="#94A3B8"
                value={detalleSenal}
                onChangeText={setDetalleSenal}
              />
            </View>

            {/* PASO 3: INTENSIDAD (1-10) */}
            <View style={styles.card}>
              <View style={styles.intensityHeader}>
                <View style={styles.stepHeader}>
                  <Text style={styles.stepCircle}>3</Text>
                  <Text style={styles.stepTitle}>
                    Intensidad: {intensidad}/10
                  </Text>
                </View>
                <View
                  style={[styles.levelPill, { backgroundColor: nivelInfo.bg }]}
                >
                  <Text
                    style={[styles.levelPillText, { color: nivelInfo.color }]}
                  >
                    {nivelInfo.etiqueta}
                  </Text>
                </View>
              </View>

              <View style={styles.scaleRow}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                  const sel = intensidad === num;
                  return (
                    <TouchableOpacity
                      key={num}
                      onPress={() => setIntensidad(num)}
                      activeOpacity={0.85}
                      style={[styles.scaleChip, sel && styles.scaleChipActive]}
                    >
                      <Text
                        style={[styles.scaleText, sel && { color: "#FFFFFF" }]}
                      >
                        {num}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* RESUMEN EN TIEMPO REAL */}
            <View style={styles.previewCard}>
              <Text style={styles.previewBadge}>VISTA PREVIA DEL MAPA</Text>
              <Text style={styles.previewLine}>
                <Text style={styles.previewBold}>Detonante: </Text>
                {vistaPreviaDet || "Aún por definir"}
              </Text>
              <Text style={styles.previewLine}>
                <Text style={styles.previewBold}>Señales: </Text>
                {vistaPreviaSen || "Aún por definir"}
              </Text>
              <Text style={styles.previewLine}>
                <Text style={styles.previewBold}>Intensidad: </Text>
                {intensidad}/10 ({nivelInfo.etiqueta})
              </Text>
            </View>

            {/* NOTA DE APOYO Y LÍMITES */}
            <View style={styles.supportNote}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color="#0F766E"
              />
              <Text style={styles.supportNoteText}>
                Herramienta de apoyo y registro complementario; no sustituye la
                atención médica, psicológica ni de urgencias profesional.
              </Text>
            </View>

            {/* BOTÓN PRINCIPAL AZUL */}
            <TouchableOpacity
              disabled={enviando}
              onPress={handleGuardar}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={["#2563EB", "#1D4ED8"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitBtn}
              >
                <Ionicons name="send" size={18} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>
                  {enviando
                    ? "Enviando mapa..."
                    : "Guardar y enviar a mi terapeuta"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>

          {/* MODAL CON DISEÑO */}
          <Modal
            visible={modalAviso.visible}
            transparent
            animationType="fade"
            onRequestClose={cerrarModal}
          >
            <View style={styles.modalBackdrop}>
              <View style={styles.modalCard}>
                <View
                  style={[
                    styles.modalBadge,
                    modalAviso.tipo === "exito"
                      ? { backgroundColor: "#CCFBF1" }
                      : { backgroundColor: "#E0F2FE" },
                  ]}
                >
                  <Ionicons
                    name={
                      modalAviso.tipo === "exito"
                        ? "checkmark-circle"
                        : "information-circle"
                    }
                    size={16}
                    color={modalAviso.tipo === "exito" ? "#0F766E" : "#0369A1"}
                  />
                  <Text
                    style={[
                      styles.modalBadgeText,
                      modalAviso.tipo === "exito"
                        ? { color: "#0F766E" }
                        : { color: "#0369A1" },
                    ]}
                  >
                    {modalAviso.badge}
                  </Text>
                </View>

                <Image
                  source={LAMI_AVATAR}
                  style={styles.modalAvatar}
                  resizeMode="contain"
                />

                <Text style={styles.modalTitle}>{modalAviso.titulo}</Text>
                <Text style={styles.modalMsg}>{modalAviso.mensaje}</Text>

                <TouchableOpacity
                  style={{ width: "100%", marginTop: 16 }}
                  onPress={cerrarModal}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={["#2563EB", "#1D4ED8"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.modalBtn}
                  >
                    <Text style={styles.modalBtnText}>Entendido</Text>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 10,
  },
  backBtn: {
    backgroundColor: "#FFFFFF",
    padding: 9,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  headerBadge: {
    fontSize: 10,
    fontWeight: "800",
    color: "#1D4ED8",
    letterSpacing: 0.6,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0F172A",
  },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
  },
  scroll: {
    padding: 16,
    paddingBottom: 120,
  },
  introCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 18,
    padding: 12,
    marginBottom: 14,
  },
  introIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  introText: {
    flex: 1,
    fontSize: 12.5,
    color: "#1E293B",
    lineHeight: 18,
    fontWeight: "500",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#DBEAFE",
    color: "#1D4ED8",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 24,
    overflow: "hidden",
  },
  stepTitle: {
    fontSize: 15.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  stepHint: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
    marginBottom: 10,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chipBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
  },
  chipBtnActive: {
    backgroundColor: "#1D4ED8",
    borderColor: "#1D4ED8",
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#1E293B",
  },
  subLabel: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#334155",
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 14,
    padding: 11,
    minHeight: 62,
    fontSize: 13.5,
    color: "#0F172A",
    textAlignVertical: "top",
  },
  intensityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  levelPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  levelPillText: {
    fontSize: 11.5,
    fontWeight: "800",
  },
  scaleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  scaleChip: {
    width: 30,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignItems: "center",
    justifyContent: "center",
  },
  scaleChipActive: {
    backgroundColor: "#1D4ED8",
    borderColor: "#1D4ED8",
  },
  scaleText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#1D4ED8",
  },
  previewCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    gap: 4,
  },
  previewBadge: {
    fontSize: 10,
    fontWeight: "800",
    color: "#1D4ED8",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  previewLine: {
    fontSize: 12.5,
    color: "#334155",
    lineHeight: 18,
  },
  previewBold: {
    fontWeight: "800",
    color: "#0F172A",
  },
  supportNote: {
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
  supportNoteText: {
    flex: 1,
    fontSize: 11.5,
    color: "#0F766E",
    lineHeight: 16,
    fontWeight: "600",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 999,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 14.5,
    fontWeight: "800",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  modalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  modalBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  modalAvatar: {
    width: 64,
    height: 64,
    marginTop: 10,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#0F172A",
    marginTop: 6,
    textAlign: "center",
  },
  modalMsg: {
    fontSize: 13,
    color: "#475569",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 19,
  },
  modalBtn: {
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13.5,
  },
});
