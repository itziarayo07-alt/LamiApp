import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import {
    collection,
    doc,
    getDocs,
    query,
    serverTimestamp,
    updateDoc,
    where,
} from "firebase/firestore";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { auth, db } from "../config/firebaseConfig";

const PALETTE = {
  tealDeep: "#6192A4",
  tealMid: "#8BC1D1",
  tealSoft: "#B3D3DA",
  lavenderSoft: "#CEC7FD",
  purpleVibrant: "#A374CC",
  indigoMuted: "#7E83C2",
  textDark: "#1E293B",
  textMuted: "#64748B",
};

export default function VincularEspecialistaModal({
  visible,
  onClose,
  onVinculado,
}) {
  const [modo, setModo] = useState("codigo"); // codigo | escaner
  const [codigoInput, setCodigoInput] = useState("");
  const [cargando, setCargando] = useState(false);
  const [escaneado, setEscaneado] = useState(false);

  const [permission, requestPermission] = useCameraPermissions();

  // Vincula el documento del paciente con el psicólogo en Firestore
  const procesarVinculacion = async (valorBruto) => {
    const limpio = valorBruto.trim().toUpperCase();
    if (!limpio) {
      Alert.alert("Código vacío", "Ingresa o escanea el código de tu psicólogo.");
      return;
    }

    // Extraer el código si proviene del formato QR "LAMI-LINK|PSI-492|uid"
    let codigoFinal = limpio;
    if (limpio.startsWith("LAMI-LINK|")) {
      const partes = limpio.split("|");
      codigoFinal = partes[1] || "";
    }

    const pacienteUid = auth.currentUser?.uid;
    if (!pacienteUid) {
      Alert.alert("Sesión requerida", "Inicia sesión para vincular tu cuenta.");
      return;
    }

    try {
      setCargando(true);

      // Buscar al psicólogo por su codigoVinculacion en la colección "psicologos"
      const q = query(
        collection(db, "psicologos"),
        where("codigoVinculacion", "==", codigoFinal)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        Alert.alert(
          "Código no encontrado",
          `No existe ningún especialista registrado con el código ${codigoFinal}. Verifica con tu terapeuta.`
        );
        setEscaneado(false);
        return;
      }

      const psicologoDoc = snapshot.docs[0];
      const psicologoData = psicologoDoc.data();
      const mesActual = new Date().toISOString().slice(0, 7);

      // Actualizar documento del paciente en "usuarios" (o tu colección de pacientes)
      await updateDoc(doc(db, "usuarios", pacienteUid), {
        psicologoId: psicologoDoc.id,
        psicologoNombre: psicologoData.nombre || "Especialista Lami",
        codigoPsicologo: codigoFinal,
        activoEnMes: mesActual,
        vinculadoEn: serverTimestamp(),
      });

      Alert.alert(
        "¡Vinculación exitosa! 💜",
        `Ahora estás conectado con ${
          psicologoData.nombre || "tu especialista"
        }. Tus check-ins y ejercicios se sincronizarán automáticamente.`
      );

      setCodigoInput("");
      setEscaneado(false);
      setModo("codigo");
      onVinculado && onVinculado(psicologoData);
      onClose();
    } catch (error) {
      console.error("Error al vincular especialista:", error);
      Alert.alert("Error", "No se pudo completar la vinculación.");
      setEscaneado(false);
    } finally {
      setCargando(false);
    }
  };

  // Activar cámara para escaneo QR
  const abrirEscaner = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert(
          "Permiso de cámara",
          "Habilita la cámara para escanear el código QR de tu terapeuta."
        );
        return;
      }
    }
    setEscaneado(false);
    setModo("escaner");
  };

  const handleBarCodeScanned = ({ data }) => {
    if (escaneado || cargando) return;
    setEscaneado(true);
    procesarVinculacion(data);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.handle} />

          {/* Encabezado */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.badge}>CONEXIÓN CLÍNICA</Text>
              <Text style={styles.title}>Vincular con mi Psicólogo</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={PALETTE.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Selector de modo: Código vs Escáner QR */}
          <View style={styles.switchRow}>
            <TouchableOpacity
              style={[
                styles.switchBtn,
                modo === "codigo" && styles.switchBtnActive,
              ]}
              onPress={() => setModo("codigo")}
            >
              <Ionicons
                name="keypad-outline"
                size={16}
                color={modo === "codigo" ? "#FFFFFF" : PALETTE.tealDeep}
              />
              <Text
                style={[
                  styles.switchText,
                  modo === "codigo" && styles.switchTextActive,
                ]}
              >
                Ingresar Código
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.switchBtn,
                modo === "escaner" && styles.switchBtnActivePurple,
              ]}
              onPress={abrirEscaner}
            >
              <Ionicons
                name="qr-code-outline"
                size={16}
                color={modo === "escaner" ? "#FFFFFF" : PALETTE.purpleVibrant}
              />
              <Text
                style={[
                  styles.switchText,
                  modo === "escaner" && styles.switchTextActive,
                ]}
              >
                Escanear QR
              </Text>
            </TouchableOpacity>
          </View>

          {/* Vista 1: Ingreso manual del código alfanumérico */}
          {modo === "codigo" ? (
            <View style={styles.bodySection}>
              <Text style={styles.helperText}>
                Escribe el código que aparece en la pantalla de tu especialista
                (ejemplo: <Text style={{ fontWeight: "800" }}>PSI-492</Text>).
              </Text>

              <TextInput
                style={styles.codeInput}
                placeholder="PSI-000"
                placeholderTextColor="#94A3B8"
                autoCapitalize="characters"
                maxLength={10}
                value={codigoInput}
                onChangeText={setCodigoInput}
              />

              <TouchableOpacity
                disabled={cargando}
                activeOpacity={0.9}
                onPress={() => procesarVinculacion(codigoInput)}
              >
                <LinearGradient
                  colors={[PALETTE.tealDeep, PALETTE.indigoMuted]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.confirmBtn}
                >
                  {cargando ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons
                        name="link-outline"
                        size={18}
                        color="#FFFFFF"
                      />
                      <Text style={styles.confirmBtnText}>
                        Vincular cuenta ahora
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            /* Vista 2: Cámara escáner QR en vivo */
            <View style={styles.scannerSection}>
              <View style={styles.cameraFrame}>
                <CameraView
                  style={styles.camera}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                  onBarcodeScanned={escaneado ? undefined : handleBarCodeScanned}
                />
                <View style={styles.scanTargetBox} />
              </View>
              <Text style={styles.scanHint}>
                {cargando
                  ? "Verificando código con Lami..."
                  : "Apunta la cámara al código QR de tu psicólogo"}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 22,
    paddingBottom: 30,
    gap: 14,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: PALETTE.tealSoft,
    alignSelf: "center",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badge: {
    fontSize: 10,
    fontWeight: "800",
    color: PALETTE.purpleVibrant,
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: PALETTE.textDark,
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  switchRow: {
    flexDirection: "row",
    backgroundColor: "#F1F6F9",
    borderRadius: 16,
    padding: 4,
    gap: 6,
  },
  switchBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 13,
  },
  switchBtnActive: {
    backgroundColor: PALETTE.tealDeep,
  },
  switchBtnActivePurple: {
    backgroundColor: PALETTE.purpleVibrant,
  },
  switchText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: PALETTE.textDark,
  },
  switchTextActive: {
    color: "#FFFFFF",
  },
  bodySection: {
    gap: 12,
    marginTop: 4,
  },
  helperText: {
    fontSize: 12.5,
    color: PALETTE.textMuted,
    lineHeight: 18,
  },
  codeInput: {
    borderWidth: 1.5,
    borderColor: PALETTE.tealSoft,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    paddingVertical: 14,
    fontSize: 22,
    fontWeight: "900",
    color: PALETTE.purpleVibrant,
    textAlign: "center",
    letterSpacing: 4,
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
  },
  confirmBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  scannerSection: {
    alignItems: "center",
    gap: 10,
  },
  cameraFrame: {
    width: 240,
    height: 240,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: PALETTE.purpleVibrant,
    justifyContent: "center",
    alignItems: "center",
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  scanTargetBox: {
    width: 150,
    height: 150,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  scanHint: {
    fontSize: 12,
    color: PALETTE.textMuted,
    fontWeight: "600",
    textAlign: "center",
  },
});