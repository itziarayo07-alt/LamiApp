import { Ionicons } from "@expo/vector-icons";
import { Camera } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { auth, db } from "../../config/firebaseConfig";

// Paleta oficial Lami
const PALETTE = {
  tealDeep: "#6192A4",
  tealMid: "#8BC1D1",
  tealSoft: "#B3D3DA",
  lavenderSoft: "#CEC7FD",
  purpleVibrant: "#A374CC",
  indigoMuted: "#7E83C2",
  bgDark: "#131C26",
  surfaceDark: "#1C2836",
  textLight: "#F8FAFC",
};

export default function SalaTeleconsulta({ route, navigation }) {
  const paciente = route?.params?.paciente || null;
  const psicologoId = auth.currentUser?.uid || "PSI-DEMO-492";
  const nombreEspecialista =
    auth.currentUser?.displayName || "Especialista Lami";

  // Permisos nativos de cámara y micrófono
  const [permisosEstado, setPermisosEstado] = useState("verificando"); // verificando | concedido | denegado
  const [cargandoSala, setCargandoSala] = useState(true);

  // Cronómetro de sesión
  const [segundos, setSegundos] = useState(0);

  // Apunte clínico rápido durante la llamada
  const [apunteRapido, setApunteRapido] = useState("");
  const [guardandoApunte, setGuardandoApunte] = useState(false);

  // Solicitar permisos nativos al abrir la pantalla

  const solicitarPermisos = async () => {
    try {
      setPermisosEstado("verificando");
      const camRes = await Camera.requestCameraPermissionsAsync();
      const micRes = await Camera.requestMicrophonePermissionsAsync();

      if (camRes.status === "granted" && micRes.status === "granted") {
        setPermisosEstado("concedido");
      } else {
        setPermisosEstado("denegado");
      }
    } catch (error) {
      console.error("Error al solicitar permisos de teleconsulta:", error);
      setPermisosEstado("denegado");
    }
  };

  useEffect(() => {
    solicitarPermisos();
  }, []);

  // Contador de tiempo de llamada
  useEffect(() => {
    if (permisosEstado !== "concedido") return;
    const interval = setInterval(() => {
      setSegundos((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [permisosEstado]);

  const tiempoFormateado = useMemo(() => {
    const mins = String(Math.floor(segundos / 60)).padStart(2, "0");
    const secs = String(segundos % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  }, [segundos]);

  // URL única y limpia de la sala embebida (sin app externa)
  const salaUrl = useMemo(() => {
    const idPaciente = paciente?.uid ? paciente.uid.slice(0, 10) : "General";
    const roomName = `LamiConsulta_${psicologoId.slice(0, 6)}_${idPaciente}`;
    const displayName = encodeURIComponent(nombreEspecialista);

    const configParams = [
      "config.prejoinPageEnabled=false",
      "config.startWithAudioMuted=false",
      "config.startWithVideoMuted=false",
      "config.disableDeepLinking=true",
      "interfaceConfig.SHOW_JITSI_WATERMARK=false",
      "interfaceConfig.SHOW_WATERMARK_FOR_GUESTS=false",
      "interfaceConfig.SHOW_BRAND_WATERMARK=false",
      "interfaceConfig.MOBILE_APP_PROMO=false",
      `userInfo.displayName="${displayName}"`,
    ].join("&");

    return `https://meet.jit.si/${roomName}#${configParams}`;
  }, [paciente, psicologoId, nombreEspecialista]);

  // Guardar nota clínica privada en Firestore sin salir de la llamada
  const handleGuardarApunte = async () => {
    const texto = apunteRapido.trim();
    if (!texto) return;

    setGuardandoApunte(true);
    try {
      await addDoc(collection(db, "notasClinicas"), {
        psicologoId,
        pacienteId: paciente?.uid || "sin-paciente",
        pacienteNombre: paciente?.nombre || "Consulta General",
        titulo: `Apunte en Teleconsulta (${tiempoFormateado})`,
        contenido: texto,
        privada: true,
        creadoEn: serverTimestamp(),
      });

      setApunteRapido("");
      Alert.alert(
        "Nota guardada",
        "Tu observación clínica quedó registrada de forma privada en el expediente."
      );
    } catch (error) {
      console.error("Error guardando nota en sesión:", error);
      Alert.alert("Error", "No se pudo guardar el apunte en este momento.");
    } finally {
      setGuardandoApunte(false);
    }
  };

  // Finalizar llamada con confirmación
  const handleFinalizarLlamada = () => {
    Alert.alert(
      "Finalizar Teleconsulta",
      `Duración registrada: ${tiempoFormateado}. ¿Deseas salir de la sala?`,
      [
        { text: "Continuar", style: "cancel" },
        {
          text: "Finalizar sesión",
          style: "destructive",
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* ============================================================ */}
        {/* BARRA SUPERIOR DE LA TELECONSULTA                            */}
        {/* ============================================================ */}
        <View style={styles.topBar}>
          <View style={styles.topLeft}>
            <View style={styles.timerPill}>
              <View style={styles.recDot} />
              <Text style={styles.timerText}>{tiempoFormateado}</Text>
            </View>
            <View style={styles.e2eBadge}>
              <Ionicons
                name="shield-checkmark"
                size={12}
                color={PALETTE.tealMid}
              />
              <Text style={styles.e2eText}>Sala Lami</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.hangupTopBtn}
            onPress={handleFinalizarLlamada}
            activeOpacity={0.85}
          >
            <Ionicons name="call" size={16} color="#FFFFFF" />
            <Text style={styles.hangupTopText}>Salir</Text>
          </TouchableOpacity>
        </View>

        {/* ============================================================ */}
        {/* TARJETA DE CONTEXTO CLÍNICO DEL PACIENTE                     */}
        {/* ============================================================ */}
        <LinearGradient
          colors={[PALETTE.tealDeep, PALETTE.indigoMuted]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.patientContextBar}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.contextPatientName} numberOfLines={1}>
              {paciente?.nombre ||
                paciente?.correo ||
                "Sala de Teleconsulta Activa"}
            </Text>
            <Text style={styles.contextPatientMeta} numberOfLines={1}>
              {paciente
                ? `Protocolo: ${
                    paciente.protocoloClinico || "Ansiedad"
                  } • Último ánimo: ${paciente.ultimoAnimo ?? "-"}/10`
                : "Esperando conexión del paciente"}
            </Text>
          </View>

          {paciente && (
            <TouchableOpacity
              style={styles.quickTaskChip}
              onPress={() =>
                navigation.navigate("EjerciciosPsicologo", {
                  pacientePreseleccionado: paciente,
                })
              }
            >
              <Ionicons name="barbell-outline" size={14} color="#FFFFFF" />
              <Text style={styles.quickTaskText}>Ejercicio</Text>
            </TouchableOpacity>
          )}
        </LinearGradient>

        {/* ============================================================ */}
        {/* CONTENEDOR DE VIDEO EMBEBIDO (WEBVIEW + PERMISOS NATIVOS)    */}
        {/* ============================================================ */}
        <View style={styles.videoWrapper}>
          {permisosEstado === "verificando" && (
            <View style={styles.centerStateBox}>
              <ActivityIndicator size="large" color={PALETTE.tealMid} />
              <Text style={styles.stateTitle}>
                Preparando cámara y micrófono...
              </Text>
              <Text style={styles.stateSub}>
                Acepta los permisos del teléfono para iniciar la videollamada.
              </Text>
            </View>
          )}

          {permisosEstado === "denegado" && (
            <View style={styles.centerStateBox}>
              <View style={styles.deniedIconBox}>
                <Ionicons
                  name="videocam-off-outline"
                  size={30}
                  color={PALETTE.lavenderSoft}
                />
              </View>
              <Text style={styles.stateTitle}>
                Permisos de cámara o audio requeridos
              </Text>
              <Text style={styles.stateSub}>
                Para realizar la teleconsulta dentro de Lami necesitamos acceso
                a tu cámara y micrófono.
              </Text>
              <TouchableOpacity
                onPress={solicitarPermisos}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[PALETTE.purpleVibrant, PALETTE.indigoMuted]}
                  style={styles.retryPermBtn}
                >
                  <Text style={styles.retryPermText}>Conceder permisos</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {permisosEstado === "concedido" && (
            <>
              <WebView
                source={{ uri: salaUrl }}
                style={styles.webview}
                javaScriptEnabled
                domStorageEnabled
                mediaPlaybackRequiresUserAction={false}
                allowsInlineMediaPlayback
                originWhitelist={["*"]}
                userAgent="Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
                onLoadEnd={() => setCargandoSala(false)}
                onPermissionRequest={(event) => {
                  event.grant(event.resources);
                }}
              />

              {cargandoSala && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color={PALETTE.tealMid} />
                  <Text style={styles.loadingOverlayText}>
                    Conectando sala segura de Lami...
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* ============================================================ */}
        {/* BARRA INFERIOR DE APUNTE CLÍNICO RÁPIDO EN SESIÓN            */}
        {/* ============================================================ */}
        <View style={styles.notesBar}>
          <View style={styles.noteInputBox}>
            <Ionicons
              name="lock-closed-outline"
              size={15}
              color={PALETTE.lavenderSoft}
              style={{ marginRight: 6 }}
            />
            <TextInput
              style={styles.noteInput}
              placeholder="Apunte clínico privado en sesión..."
              placeholderTextColor="#94A3B8"
              value={apunteRapido}
              onChangeText={setApunteRapido}
            />
          </View>

          <TouchableOpacity
            style={styles.saveNoteBtn}
            onPress={handleGuardarApunte}
            disabled={guardandoApunte}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[PALETTE.tealDeep, PALETTE.tealMid]}
              style={styles.saveNoteGradient}
            >
              {guardandoApunte ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveNoteText}>Guardar</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PALETTE.bgDark,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: PALETTE.bgDark,
  },
  topLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: PALETTE.surfaceDark,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(139, 193, 209, 0.25)",
  },
  recDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#EF4444",
  },
  timerText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  e2eBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(97, 146, 164, 0.22)",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  e2eText: {
    color: PALETTE.tealMid,
    fontSize: 11,
    fontWeight: "700",
  },
  hangupTopBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#DC2626",
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
  },
  hangupTopText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  patientContextBar: {
    marginHorizontal: 14,
    marginBottom: 10,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  contextPatientName: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "800",
  },
  contextPatientMeta: {
    color: "#E2F1F5",
    fontSize: 11,
    marginTop: 1,
  },
  quickTaskChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 11,
  },
  quickTaskText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  videoWrapper: {
    flex: 1,
    marginHorizontal: 14,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: PALETTE.surfaceDark,
    borderWidth: 1,
    borderColor: "rgba(179, 211, 218, 0.2)",
  },
  webview: {
    flex: 1,
    backgroundColor: PALETTE.surfaceDark,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: PALETTE.surfaceDark,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingOverlayText: {
    color: PALETTE.tealSoft,
    fontSize: 13,
    fontWeight: "600",
  },
  centerStateBox: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  deniedIconBox: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: "rgba(163, 116, 204, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  stateTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
  stateSub: {
    color: "#94A3B8",
    fontSize: 12.5,
    textAlign: "center",
    lineHeight: 18,
  },
  retryPermBtn: {
    marginTop: 6,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 14,
  },
  retryPermText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  notesBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: PALETTE.bgDark,
  },
  noteInputBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PALETTE.surfaceDark,
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(206, 199, 253, 0.25)",
  },
  noteInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 12.5,
    paddingVertical: 0,
  },
  saveNoteBtn: {
    borderRadius: 14,
    overflow: "hidden",
  },
  saveNoteGradient: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  saveNoteText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
});