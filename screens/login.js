import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { auth, db } from "../config/firebaseConfig";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const isSmallDevice = SCREEN_HEIGHT < 700;

export default function Login({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const [modalAcceso, setModalAcceso] = useState({
    visible: false,
    tipo: "usuario", // "profesional" | "usuario" | "aviso"
    badge: "",
    titulo: "",
    mensaje: "",
    rutaDestino: null,
  });

  const cerrarModalAcceso = () => {
    const destino = modalAcceso.rutaDestino;
    setModalAcceso((prev) => ({
      ...prev,
      visible: false,
      rutaDestino: null,
    }));
    if (destino) {
      navigation.replace(destino);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setModalAcceso({
        visible: true,
        tipo: "aviso",
        badge: "DATOS INCOMPLETOS",
        titulo: "Ingresa correo y contraseña",
        mensaje: "Completa ambos campos para iniciar sesión de forma segura.",
        rutaDestino: null,
      });
      return;
    }

    try {
      setLoading(true);
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );
      const uid = userCredential.user.uid;

      // Revisamos si este usuario está registrado como especialista en Firestore
      const psicologoSnap = await getDoc(doc(db, "psicologos", uid));

      if (psicologoSnap.exists()) {
        setModalAcceso({
          visible: true,
          tipo: "profesional",
          badge: "PANEL PROFESIONAL • LAMI",
          titulo: "Accediste a tu panel profesional",
          mensaje:
            "Bienvenido/a. Tu espacio clínico, pacientes y seguimiento están listos.",
          rutaDestino: "PsicologoDashboard",
        });
      } else {
        setModalAcceso({
          visible: true,
          tipo: "usuario",
          badge: "TU ESPACIO EN LAMI",
          titulo: "¡Qué bueno verte de nuevo!",
          mensaje:
            "Accediste a tu perfil y espacio de seguimiento para continuar a tu ritmo.",
          rutaDestino: "Test",
        });
      }
    } catch (error) {
      setModalAcceso({
        visible: true,
        tipo: "aviso",
        badge: "ERROR DE ACCESO",
        titulo: "No se pudo iniciar sesión",
        mensaje: error?.message || "Verifica tu correo y contraseña.",
        rutaDestino: null,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={["#ECFDF5", "#E0F2FE", "#F0FDFA", "#FFFFFF"]}
      locations={[0, 0.35, 0.75, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.background}
    >
      <StatusBar backgroundColor="#ECFDF5" barStyle="dark-content" />

      {/* Orbes decorativos atmosféricos */}
      <View style={styles.orbTopRight} />
      <View style={styles.orbMiddleLeft} />
      <View style={styles.orbBottomRight} />

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <ScrollView
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* PÍLDORA DE MARCA SUPERIOR */}
            <View style={styles.brandBadge}>
              <View style={styles.brandDot} />
              <Text style={styles.appName}>LAMI • BIENESTAR</Text>
            </View>

            {/* ENCABEZADO */}
            <Text style={styles.title}>Qué bueno que estás aquí</Text>
            <Text style={styles.subtitle}>
              Este es tu espacio seguro para respirar y sentirte mejor.
            </Text>

            {/* CHIPS MOTIVACIONALES */}
            <View style={styles.chipsRow}>
              <View style={[styles.chip, styles.chipMint]}>
                <Ionicons name="leaf-outline" size={13} color="#0F766E" />
                <Text style={[styles.chipText, { color: "#0F766E" }]}>
                  Respira profundo
                </Text>
              </View>
              <View style={[styles.chip, styles.chipSky]}>
                <Ionicons name="water-outline" size={13} color="#0369A1" />
                <Text style={[styles.chipText, { color: "#0369A1" }]}>
                  Ten paciencia
                </Text>
              </View>
            </View>

            {/* TARJETA DEL FORMULARIO */}
            <View style={styles.card}>
              <LinearGradient
                colors={["#6EE7B7", "#14B8A6", "#0284C7"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.cardTopAccent}
              />

              {/* MASCOTA LAMI_1 CON HALO AQUA-MENTA */}
              <View style={styles.mascotShowcase}>
                <LinearGradient
                  colors={["#D1FAE5", "#CCFBF1", "#E0F2FE"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.mascotHaloOuter}
                >
                  <View style={styles.mascotHaloInner}>
                    <Image
                      source={require("../assets/lami_1.png")}
                      style={styles.image}
                    />
                  </View>
                </LinearGradient>

                <View style={styles.floatingSparkleLeft}>
                  <Ionicons name="sparkles" size={13} color="#14B8A6" />
                </View>
                <View style={styles.floatingSparkleRight}>
                  <Ionicons name="heart" size={11} color="#0284C7" />
                </View>
              </View>

              {/* TÍTULO DENTRO DEL CARD */}
              <View style={styles.cardHeaderBlock}>
                <Text style={styles.cardTitle}>Iniciar sesión</Text>
                <Text style={styles.cardSubtitle}>
                  Ingresa tus datos para continuar con tu proceso de calma.
                </Text>
              </View>

              {/* Input correo */}
              <View
                style={[
                  styles.inputBox,
                  focusedField === "email" && styles.inputBoxFocused,
                ]}
              >
                <View style={styles.inputIconWrap}>
                  <MaterialIcons name="email" size={18} color="#0D9488" />
                </View>
                <TextInput
                  placeholder="Correo electrónico o número"
                  placeholderTextColor="#94A3B8"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.input}
                  returnKeyType="next"
                />
              </View>

              {/* Input contraseña */}
              <View
                style={[
                  styles.inputBox,
                  focusedField === "password" && styles.inputBoxFocused,
                ]}
              >
                <View style={styles.inputIconWrap}>
                  <MaterialIcons name="lock" size={18} color="#0D9488" />
                </View>
                <TextInput
                  placeholder="Contraseña"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  style={styles.input}
                  returnKeyType="done"
                />
              </View>

              {/* Botón iniciar sesión */}
              <TouchableOpacity
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.9}
                style={[styles.buttonContainer, loading && { opacity: 0.75 }]}
              >
                <LinearGradient
                  colors={["#10B981", "#0D9488", "#0284C7"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.button}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.buttonText}>INICIAR SESIÓN</Text>
                      <Ionicons
                        name="arrow-forward-circle"
                        size={20}
                        color="#FFFFFF"
                      />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Footer registrar */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  ¿Aún no tienes una cuenta?{" "}
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate("Registro")}
                >
                  <Text style={styles.register}>Registrarse</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.cardDivider} />

              {/* Enlace especialista */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => navigation.navigate("RegistroPsicologo")}
                style={styles.specialistPillBtn}
              >
                <Ionicons name="medkit-outline" size={14} color="#0F766E" />
                <Text style={styles.specialistText}>
                  ¿Eres especialista en salud mental? Registra tu consultorio
                  aquí
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* TARJETA MODAL DE ACCESO / AVISO */}
        <Modal
          visible={modalAcceso.visible}
          transparent
          animationType="fade"
          onRequestClose={cerrarModalAcceso}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <LinearGradient
                colors={["#6EE7B7", "#14B8A6", "#0284C7"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.cardTopAccent}
              />

              <View
                style={[
                  styles.modalBadge,
                  modalAcceso.tipo === "profesional"
                    ? { backgroundColor: "#E0F2FE", borderColor: "#BAE6FD" }
                    : modalAcceso.tipo === "aviso"
                      ? { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" }
                      : { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" },
                ]}
              >
                <Ionicons
                  name={
                    modalAcceso.tipo === "profesional"
                      ? "medkit"
                      : modalAcceso.tipo === "aviso"
                        ? "alert-circle"
                        : "sparkles"
                  }
                  size={15}
                  color={
                    modalAcceso.tipo === "profesional"
                      ? "#0369A1"
                      : modalAcceso.tipo === "aviso"
                        ? "#B45309"
                        : "#0F766E"
                  }
                />
                <Text
                  style={[
                    styles.modalBadgeText,
                    modalAcceso.tipo === "profesional"
                      ? { color: "#0369A1" }
                      : modalAcceso.tipo === "aviso"
                        ? { color: "#B45309" }
                        : { color: "#0F766E" },
                  ]}
                >
                  {modalAcceso.badge}
                </Text>
              </View>

              <Image
                source={require("../assets/lami_1.png")}
                style={styles.modalAvatar}
                resizeMode="contain"
              />

              <Text style={styles.modalTitle}>{modalAcceso.titulo}</Text>
              <Text style={styles.modalMessage}>{modalAcceso.mensaje}</Text>

              <TouchableOpacity
                onPress={cerrarModalAcceso}
                activeOpacity={0.9}
                style={styles.modalBtnWrap}
              >
                <LinearGradient
                  colors={["#10B981", "#0D9488", "#0284C7"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalBtn}
                >
                  <Text style={styles.modalBtnText}>
                    {modalAcceso.rutaDestino ? "Continuar" : "Entendido"}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  orbTopRight: {
    position: "absolute",
    top: -60,
    right: -45,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: "rgba(110, 231, 183, 0.25)",
  },
  orbMiddleLeft: {
    position: "absolute",
    top: SCREEN_HEIGHT * 0.28,
    left: -70,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(125, 211, 252, 0.24)",
  },
  orbBottomRight: {
    position: "absolute",
    bottom: -50,
    right: -30,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "rgba(94, 234, 212, 0.22)",
  },
  container: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
    paddingVertical: isSmallDevice ? 18 : 28,
    paddingBottom: 38,
  },

  // TEXTOS SUPERIORES
  brandBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 13,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    marginBottom: 8,
  },
  brandDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#10B981",
  },
  appName: {
    fontSize: 11.5,
    fontWeight: "900",
    color: "#0F766E",
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    color: "#475569",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 13,
    paddingHorizontal: 12,
    lineHeight: 18,
  },

  // CHIPS SUPERIORES
  chipsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 16,
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipMint: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  chipSky: {
    backgroundColor: "#F0F9FF",
    borderColor: "#BAE6FD",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "700",
  },

  // TARJETA PRINCIPAL
  card: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: isSmallDevice ? 18 : 22,
    borderWidth: 1.2,
    borderColor: "#CCFBF1",
    overflow: "hidden",
    shadowColor: "#0F766E",
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  cardTopAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 5,
  },

  // PROTAGONISTA LAMI_1
  mascotShowcase: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: isSmallDevice ? 10 : 14,
    position: "relative",
  },
  mascotHaloOuter: {
    width: isSmallDevice ? 136 : 158,
    height: isSmallDevice ? 136 : 158,
    borderRadius: isSmallDevice ? 68 : 79,
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#14B8A6",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  mascotHaloInner: {
    width: "100%",
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#99F6E4",
    overflow: "hidden",
  },
  image: {
    width: isSmallDevice ? 108 : 126,
    height: isSmallDevice ? 108 : 126,
    resizeMode: "contain",
  },
  floatingSparkleLeft: {
    position: "absolute",
    top: 10,
    left: SCREEN_WIDTH * 0.2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#F0FDFA",
    borderWidth: 1,
    borderColor: "#99F6E4",
    alignItems: "center",
    justifyContent: "center",
  },
  floatingSparkleRight: {
    position: "absolute",
    bottom: 10,
    right: SCREEN_WIDTH * 0.2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    alignItems: "center",
    justifyContent: "center",
  },

  cardHeaderBlock: {
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#0F172A",
    marginBottom: 3,
    textAlign: "left",
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 12.5,
    color: "#64748B",
    lineHeight: 18,
  },

  // INPUTS
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    backgroundColor: "#F8FAFC",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1.3,
    borderColor: "#E2E8F0",
  },
  inputBoxFocused: {
    backgroundColor: "#F0FDFA",
    borderColor: "#14B8A6",
  },
  inputIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "#CCFBF1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "500",
  },

  // BOTÓN PRINCIPAL
  buttonContainer: {
    width: "100%",
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 20,
    shadowColor: "#0D9488",
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  button: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 14.5,
    letterSpacing: 0.6,
  },

  // FOOTER Y ESPECIALISTA
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  footerText: {
    color: "#64748B",
    fontSize: 13,
  },
  register: {
    color: "#0D9488",
    fontWeight: "800",
    fontSize: 13,
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 13,
  },
  specialistPillBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F0FDFA",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CCFBF1",
  },
  specialistText: {
    flex: 1,
    color: "#0F766E",
    fontWeight: "700",
    fontSize: 11.5,
    textAlign: "center",
    lineHeight: 16,
  },

  // MODAL DE ACCESO CON DISEÑO
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 22,
  },
  modalCard: {
    width: "100%",
    maxWidth: 370,
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 22,
    alignItems: "center",
    borderWidth: 1.2,
    borderColor: "#CCFBF1",
    overflow: "hidden",
    elevation: 8,
  },
  modalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  modalBadgeText: {
    fontSize: 10.5,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  modalAvatar: {
    width: 82,
    height: 82,
    marginTop: 12,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
    marginTop: 8,
  },
  modalMessage: {
    fontSize: 13,
    color: "#475569",
    textAlign: "center",
    lineHeight: 19,
    marginTop: 6,
  },
  modalBtnWrap: {
    width: "100%",
    marginTop: 18,
    borderRadius: 18,
    overflow: "hidden",
  },
  modalBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 18,
  },
  modalBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
